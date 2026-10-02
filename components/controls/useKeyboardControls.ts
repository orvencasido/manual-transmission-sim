'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ControlsManager, DEFAULT_CONTROL_RATES } from '@/lib/simulation/controls';
import { Simulation } from '@/lib/simulation/simulation';
import { DEFAULT_VEHICLE_CONFIG } from '@/lib/simulation/physics';
import { RoadBoundaryMode } from '@/lib/simulation/types';
import { InstructorEvaluator } from '@/components/instructor/instructorEvaluator';
import { EngineAudioSystem } from '@/lib/audio/engineAudio';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { saveDrivingSession } from '@/lib/supabase/queries';

const FIXED_DT = 1 / 120; // 120 Hz physics tick
const MAX_FRAME_TIME = 0.1; // Clamp frame spikes

export interface KeyboardControlsOptions {
  defaultBoundaryMode?: RoadBoundaryMode;
}

export function useKeyboardControls(options?: KeyboardControlsOptions) {
  const defaultBoundaryMode = options?.defaultBoundaryMode ?? 'off';
  const boundaryModeRef = useRef<RoadBoundaryMode>(defaultBoundaryMode);
  boundaryModeRef.current = defaultBoundaryMode;

  const controlsManagerRef = useRef<ControlsManager | null>(null);
  const simulationRef = useRef<Simulation | null>(null);
  const evaluatorRef = useRef<InstructorEvaluator | null>(null);
  const audioRef = useRef<EngineAudioSystem | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  // Session telemetry refs (for async persistence on reset/exit)
  const sessionStartTimeRef = useRef<number>(Date.now());
  const sessionStallsRef = useRef<number>(0);
  const sessionSmoothStartsRef = useRef<number>(0);
  const sessionMaxSpeedRef = useRef<number>(0);
  const sessionDistanceRef = useRef<number>(0);
  const lastEngineStatusRef = useRef<string>('OFF');

  useEffect(() => {
    const manager = new ControlsManager(DEFAULT_CONTROL_RATES, {
      onPauseToggle: () => useSimulatorStore.getState().togglePause(),
    });
    controlsManagerRef.current = manager;
    manager.attach(typeof window !== 'undefined' ? window : undefined, { passive: false });

    const simulation = new Simulation(DEFAULT_VEHICLE_CONFIG, defaultBoundaryMode);
    simulationRef.current = simulation;

    const evaluator = new InstructorEvaluator((feedback) => {
      useSimulatorStore.getState().addFeedback(feedback);
    });
    evaluatorRef.current = evaluator;

    const audio = new EngineAudioSystem();
    audioRef.current = audio;
    audio.init().catch(() => {});

    // Browser Autoplay Policy: resume AudioContext on first user interaction (key or click)
    const unlockAudio = () => {
      audio.resume().catch(() => {});
    };
    window.addEventListener('keydown', unlockAudio, { passive: false });
    window.addEventListener('pointerdown', unlockAudio, { passive: true });

    const loop = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      let frameTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (frameTime > MAX_FRAME_TIME) {
        frameTime = MAX_FRAME_TIME;
      }

      // Update controls ramping with actual frame delta time
      manager.update(frameTime);
      const currentControls = manager.getState();

      const storeState = useSimulatorStore.getState();
      const paused = storeState.isPaused;
      if (!paused) {
        accumulatorRef.current += frameTime;
        // Cap accumulator to avoid spiraling on frame spikes or background tab resumes
        if (accumulatorRef.current > 0.15) {
          accumulatorRef.current = 0.15;
        }
        while (accumulatorRef.current >= FIXED_DT) {
          simulation.tick(currentControls, FIXED_DT);
          accumulatorRef.current -= FIXED_DT;
        }
      }

      // Publish state snapshot to Zustand store for UI rendering
      const stateSnapshot = simulation.getState(currentControls);
      storeState.updateVehicleState(stateSnapshot);

      // Synthesize procedural powertrain audio
      if (audioRef.current) {
        audioRef.current.setMuted(storeState.isMuted || storeState.isPaused);
        audioRef.current.update(stateSnapshot);
      }

      // Evaluate instructor rules on vehicle snapshot
      if (evaluatorRef.current) {
        const activeFeedbacks = evaluatorRef.current.evaluate(stateSnapshot, frameTime);
        const primaryFeedback = activeFeedbacks.length > 0 ? activeFeedbacks[0] : null;
        storeState.setActiveFeedback(primaryFeedback);

        // Track smooth start feedback events
        if (primaryFeedback?.id === 'FEEDBACK_SMOOTH_START') {
          sessionSmoothStartsRef.current += 1;
        }
      }

      // Track session metrics in memory (pure numerical updates, NO db calls in loop)
      if (
        stateSnapshot.engine.status === 'STALLED' &&
        lastEngineStatusRef.current !== 'STALLED'
      ) {
        sessionStallsRef.current += 1;
      }
      lastEngineStatusRef.current = stateSnapshot.engine.status;

      if (stateSnapshot.dynamics.speedKmh > sessionMaxSpeedRef.current) {
        sessionMaxSpeedRef.current = stateSnapshot.dynamics.speedKmh;
      }
      sessionDistanceRef.current = stateSnapshot.dynamics.distanceTraveled;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      manager.detach();
      audio.destroy();

      // Asynchronously flush session summary on unmount if meaningful activity occurred
      const durationSeconds = (Date.now() - sessionStartTimeRef.current) / 1000;
      if (
        durationSeconds >= 5 &&
        (sessionDistanceRef.current >= 5 || sessionStallsRef.current > 0)
      ) {
        saveDrivingSession({
          durationSeconds,
          stallCount: sessionStallsRef.current,
          smoothStarts: sessionSmoothStartsRef.current,
          maxSpeedKmh: sessionMaxSpeedRef.current,
          distanceMeters: sessionDistanceRef.current,
        }).catch((err) => {
          console.warn('Background session flush skipped:', err);
        });
      }
    };
  }, [defaultBoundaryMode]);

  const resetSimulation = useCallback(() => {
    // 1. Flush previous session stats asynchronously to Supabase
    const durationSeconds = (Date.now() - sessionStartTimeRef.current) / 1000;
    if (
      durationSeconds >= 3 &&
      (sessionDistanceRef.current >= 2 || sessionStallsRef.current > 0)
    ) {
      saveDrivingSession({
        durationSeconds,
        stallCount: sessionStallsRef.current,
        smoothStarts: sessionSmoothStartsRef.current,
        maxSpeedKmh: sessionMaxSpeedRef.current,
        distanceMeters: sessionDistanceRef.current,
      }).catch((err) => {
        console.warn('Background session save skipped:', err);
      });
    }

    // 2. Reset session telemetry timers
    sessionStartTimeRef.current = Date.now();
    sessionStallsRef.current = 0;
    sessionSmoothStartsRef.current = 0;
    sessionMaxSpeedRef.current = 0;
    sessionDistanceRef.current = 0;
    lastEngineStatusRef.current = 'OFF';

    // 3. Reset physics simulation components
    controlsManagerRef.current?.reset();
    simulationRef.current?.reset();
    simulationRef.current?.setBoundaryMode(boundaryModeRef.current);
    evaluatorRef.current?.reset();
    useSimulatorStore.getState().reset();
    if (simulationRef.current) {
      const currentControls = controlsManagerRef.current?.getState();
      useSimulatorStore.getState().updateVehicleState(simulationRef.current.getState(currentControls));
    }
  }, []);

  const setGrade = useCallback((gradeInPercent: number) => {
    const radians = Math.atan(gradeInPercent / 100);
    simulationRef.current?.setGrade(radians);
  }, []);

  const resumeAudio = useCallback(() => {
    audioRef.current?.resume().catch(() => {});
  }, []);

  const setGeoPosition = useCallback((lat: number, lon: number, heading?: number) => {
    if (simulationRef.current) {
      simulationRef.current.setGeoPosition(lat, lon, heading);
      const currentControls = controlsManagerRef.current?.getState();
      useSimulatorStore.getState().updateVehicleState(simulationRef.current.getState(currentControls));

      // Asynchronously fetch vector road corridors for this new region if outside Lucena
      simulationRef.current.getRoadNetwork().fetchRoadsAround(lat, lon).catch(() => {});
    }
  }, []);

  const setBoundaryMode = useCallback((mode: RoadBoundaryMode) => {
    boundaryModeRef.current = mode;
    if (simulationRef.current) {
      simulationRef.current.setBoundaryMode(mode);
      const currentControls = controlsManagerRef.current?.getState();
      useSimulatorStore.getState().updateVehicleState(simulationRef.current.getState(currentControls));
    }
  }, []);

  return {
    controlsManager: controlsManagerRef.current,
    simulation: simulationRef.current,
    engineAudio: audioRef.current,
    resetSimulation,
    setGrade,
    resumeAudio,
    setGeoPosition,
    setBoundaryMode,
  };
}
