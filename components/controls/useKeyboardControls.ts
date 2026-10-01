'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ControlsManager, DEFAULT_CONTROL_RATES } from '@/lib/simulation/controls';
import { Simulation } from '@/lib/simulation/simulation';
import { InstructorEvaluator } from '@/components/instructor/instructorEvaluator';
import { EngineAudioSystem } from '@/lib/audio/engineAudio';
import { useSimulatorStore } from '@/stores/simulatorStore';

const FIXED_DT = 1 / 120; // 120 Hz physics tick
const MAX_FRAME_TIME = 0.1; // Clamp frame spikes

export function useKeyboardControls() {
  const controlsManagerRef = useRef<ControlsManager | null>(null);
  const simulationRef = useRef<Simulation | null>(null);
  const evaluatorRef = useRef<InstructorEvaluator | null>(null);
  const audioRef = useRef<EngineAudioSystem | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  const { updateVehicleState, togglePause, setActiveFeedback, addFeedback } = useSimulatorStore();

  useEffect(() => {
    const manager = new ControlsManager(DEFAULT_CONTROL_RATES, {
      onPauseToggle: () => togglePause(),
    });
    controlsManagerRef.current = manager;
    manager.attach();

    const simulation = new Simulation();
    simulationRef.current = simulation;

    const evaluator = new InstructorEvaluator((feedback) => {
      addFeedback(feedback);
    });
    evaluatorRef.current = evaluator;

    const audio = new EngineAudioSystem();
    audioRef.current = audio;
    audio.init().catch(() => {});

    // Browser Autoplay Policy: resume AudioContext on first user interaction (key or click)
    const unlockAudio = () => {
      audio.resume().catch(() => {});
    };
    window.addEventListener('keydown', unlockAudio, { passive: true });
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

      const paused = useSimulatorStore.getState().isPaused;
      if (!paused) {
        accumulatorRef.current += frameTime;
        while (accumulatorRef.current >= FIXED_DT) {
          simulation.tick(currentControls, FIXED_DT);
          accumulatorRef.current -= FIXED_DT;
        }
      }

      // Publish state snapshot to Zustand store for UI rendering
      const stateSnapshot = simulation.getState(currentControls);
      updateVehicleState(stateSnapshot);

      // Synthesize procedural powertrain audio
      if (audioRef.current) {
        const storeState = useSimulatorStore.getState();
        audioRef.current.setMuted(storeState.isMuted || storeState.isPaused);
        audioRef.current.update(stateSnapshot);
      }

      // Evaluate instructor rules on vehicle snapshot
      if (evaluatorRef.current) {
        const activeFeedbacks = evaluatorRef.current.evaluate(stateSnapshot, frameTime);
        const primaryFeedback = activeFeedbacks.length > 0 ? activeFeedbacks[0] : null;
        setActiveFeedback(primaryFeedback);
      }

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
    };
  }, [updateVehicleState, togglePause, setActiveFeedback, addFeedback]);

  const resetSimulation = useCallback(() => {
    controlsManagerRef.current?.reset();
    simulationRef.current?.reset();
    evaluatorRef.current?.reset();
    useSimulatorStore.getState().reset();
  }, []);

  const setGrade = useCallback((gradeInPercent: number) => {
    const radians = Math.atan(gradeInPercent / 100);
    simulationRef.current?.setGrade(radians);
  }, []);

  const resumeAudio = useCallback(() => {
    audioRef.current?.resume().catch(() => {});
  }, []);

  return {
    controlsManager: controlsManagerRef.current,
    simulation: simulationRef.current,
    engineAudio: audioRef.current,
    resetSimulation,
    setGrade,
    resumeAudio,
  };
}
