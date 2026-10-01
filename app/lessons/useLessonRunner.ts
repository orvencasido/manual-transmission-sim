'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { LessonDefinition } from './curriculumData';
import { VehicleState, EngineStatus } from '@/lib/simulation/types';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';

export type LessonStatus = 'active' | 'completed' | 'failed';

export interface UseLessonRunnerReturn {
  currentStepIndex: number;
  stepHoldProgress: number;
  status: LessonStatus;
  failureReason: string;
  stallsCount: number;
  maxRollbackMeters: number;
  smoothnessScore: number;
  elapsedTime: number;
  stars: number;
  resetLesson: () => void;
}

export function useLessonRunner(
  lesson: LessonDefinition,
  vehicleState: VehicleState,
  onResetVehicle: () => void
): UseLessonRunnerReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepHoldProgress, setStepHoldProgress] = useState(0);
  const [status, setStatus] = useState<LessonStatus>('active');
  const [failureReason, setFailureReason] = useState('');
  const [stallsCount, setStallsCount] = useState(0);
  const [maxRollbackMeters, setMaxRollbackMeters] = useState(0);
  const [smoothnessScore, setSmoothnessScore] = useState(100);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stars, setStars] = useState(1);

  const saveResult = useLessonProgressStore((s) => s.saveResult);

  // References for continuous tracking across frames
  const lastTimestampRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);
  const stepHoldTimeRef = useRef<number>(0);
  const initialDistanceRef = useRef<number | null>(null);
  const minDistanceRef = useRef<number | null>(null);
  const lastEngineStatusRef = useRef<EngineStatus>('RUNNING');
  const smoothnessPenaltyRef = useRef<number>(0);
  const luggingTimeRef = useRef<number>(0);
  const totalStallsRef = useRef<number>(0);
  const maxRollbackRef = useRef<number>(0);
  const isStartedRef = useRef<boolean>(false);

  const onResetVehicleRef = useRef(onResetVehicle);
  useEffect(() => {
    onResetVehicleRef.current = onResetVehicle;
  }, [onResetVehicle]);

  // Restart lesson
  const resetLesson = useCallback(() => {
    setCurrentStepIndex(0);
    setStepHoldProgress(0);
    setStatus('active');
    setFailureReason('');
    setStallsCount(0);
    setMaxRollbackMeters(0);
    setSmoothnessScore(100);
    setElapsedTime(0);
    setStars(1);

    lastTimestampRef.current = performance.now();
    elapsedTimeRef.current = 0;
    stepHoldTimeRef.current = 0;
    initialDistanceRef.current = null;
    minDistanceRef.current = null;
    lastEngineStatusRef.current = 'RUNNING';
    smoothnessPenaltyRef.current = 0;
    luggingTimeRef.current = 0;
    totalStallsRef.current = 0;
    maxRollbackRef.current = 0;
    isStartedRef.current = false;

    onResetVehicleRef.current();
  }, []);

  const handleLessonSuccess = useCallback(
    (finalSmoothness: number) => {
      setStatus('completed');
      const finalDuration = Math.round(elapsedTimeRef.current * 10) / 10;
      setElapsedTime(finalDuration);
      setMaxRollbackMeters(Math.round(maxRollbackRef.current * 100) / 100);

      // Calculate earned stars
      let earnedStars = 1;
      if (
        totalStallsRef.current === 0 &&
        finalSmoothness >= 85 &&
        maxRollbackRef.current <= 0.05
      ) {
        earnedStars = 3;
      } else if (totalStallsRef.current <= 1 && finalSmoothness >= 70) {
        earnedStars = 2;
      }
      setStars(earnedStars);

      // Save to persistent progress store
      saveResult(lesson.id, {
        stars: earnedStars,
        smoothnessScore: finalSmoothness,
        stalls: totalStallsRef.current,
        maxRollbackMeters: Math.round(maxRollbackRef.current * 100) / 100,
        timeSeconds: finalDuration,
      });
    },
    [lesson.id, saveResult]
  );

  // Main evaluation effect hooked to vehicleState updates
  useEffect(() => {
    if (status !== 'active') return;

    const now = performance.now();
    if (lastTimestampRef.current === 0) {
      lastTimestampRef.current = now;
      return;
    }

    const dt = Math.min(0.1, (now - lastTimestampRef.current) / 1000);
    lastTimestampRef.current = now;
    elapsedTimeRef.current += dt;

    // Track initial distance reference
    if (initialDistanceRef.current === null) {
      initialDistanceRef.current = vehicleState.dynamics.distanceTraveled;
      minDistanceRef.current = vehicleState.dynamics.distanceTraveled;
      isStartedRef.current = true;
    }

    // Rollback evaluation
    const currentDistance = vehicleState.dynamics.distanceTraveled;
    if (minDistanceRef.current !== null && currentDistance < minDistanceRef.current) {
      minDistanceRef.current = currentDistance;
    }
    if (initialDistanceRef.current !== null && minDistanceRef.current !== null) {
      const rollback = Math.max(0, initialDistanceRef.current - minDistanceRef.current);
      if (rollback > maxRollbackRef.current) {
        maxRollbackRef.current = rollback;
      }
    }

    // Engine stall event tracking
    if (
      vehicleState.engine.status === 'STALLED' &&
      lastEngineStatusRef.current !== 'STALLED'
    ) {
      totalStallsRef.current += 1;
      smoothnessPenaltyRef.current += 20;
      setStallsCount(totalStallsRef.current);
    }
    lastEngineStatusRef.current = vehicleState.engine.status;

    // Engine lugging penalty
    if (vehicleState.engine.isLugging) {
      luggingTimeRef.current += dt;
      if (luggingTimeRef.current > 1.0) {
        smoothnessPenaltyRef.current = Math.min(50, smoothnessPenaltyRef.current + 5);
        luggingTimeRef.current = 0;
      }
    }

    // Compute real-time smoothness
    const currentSmoothness = Math.max(
      45,
      Math.min(100, Math.round(100 - smoothnessPenaltyRef.current))
    );
    setSmoothnessScore((prev) => (prev !== currentSmoothness ? currentSmoothness : prev));

    // 1. Evaluate failure rules
    for (const rule of lesson.failureRules) {
      const result = rule.isTriggered(vehicleState, currentStepIndex, {
        stalls: totalStallsRef.current,
        maxRollbackMeters: maxRollbackRef.current,
        attemptDuration: elapsedTimeRef.current,
      });

      if (result.failed) {
        setStatus('failed');
        setFailureReason(result.reason || 'Step requirements were not met.');
        setElapsedTime(Math.round(elapsedTimeRef.current * 10) / 10);
        setMaxRollbackMeters(Math.round(maxRollbackRef.current * 100) / 100);
        return;
      }
    }

    // 2. Evaluate current step
    const currentStep = lesson.steps[currentStepIndex];
    if (!currentStep) return;

    const requiredHoldTime = currentStep.holdDurationSeconds || 0;

    if (requiredHoldTime > 0) {
      // Evaluate whether the step condition is currently holding
      const isHoldingCondition = currentStep.isCompleted(
        vehicleState,
        stepHoldTimeRef.current
      );

      if (isHoldingCondition) {
        stepHoldTimeRef.current += dt;
        const progress = Math.min(1, stepHoldTimeRef.current / requiredHoldTime);
        setStepHoldProgress((prev) =>
          Math.abs(prev - progress) > 0.02 || progress === 1 ? progress : prev
        );

        if (stepHoldTimeRef.current >= requiredHoldTime) {
          // Advance to next step or complete lesson
          stepHoldTimeRef.current = 0;
          setStepHoldProgress(0);

          if (currentStepIndex + 1 < lesson.steps.length) {
            setCurrentStepIndex((prev) => prev + 1);
          } else {
            // Lesson successfully finished!
            handleLessonSuccess(currentSmoothness);
          }
        }
      } else {
        // Reset hold progress if condition broken
        if (stepHoldTimeRef.current > 0) {
          stepHoldTimeRef.current = Math.max(0, stepHoldTimeRef.current - dt * 2);
          const progress = requiredHoldTime > 0 ? stepHoldTimeRef.current / requiredHoldTime : 0;
          setStepHoldProgress((prev) =>
            Math.abs(prev - progress) > 0.02 || progress === 0 ? progress : prev
          );
        }
      }
    } else {
      // Instantaneous step completion condition
      const isDone = currentStep.isCompleted(vehicleState, 0);
      if (isDone) {
        stepHoldTimeRef.current = 0;
        setStepHoldProgress(0);

        if (currentStepIndex + 1 < lesson.steps.length) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          // Lesson successfully finished!
          handleLessonSuccess(currentSmoothness);
        }
      }
    }
  }, [
    vehicleState,
    lesson,
    currentStepIndex,
    status,
    handleLessonSuccess,
  ]);

  return {
    currentStepIndex,
    stepHoldProgress,
    status,
    failureReason,
    stallsCount,
    maxRollbackMeters,
    smoothnessScore,
    elapsedTime,
    stars,
    resetLesson,
  };
}
