'use client';

import React, { useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getLessonById, LESSONS } from '../curriculumData';
import { useLessonRunner } from '../useLessonRunner';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { useKeyboardControls } from '@/components/controls/useKeyboardControls';
import { CockpitHeader } from '@/components/dashboard/CockpitHeader';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LessonTracker, LessonStepChecklist } from '@/components/instructor/LessonTracker';
import { LessonCompletionModal } from '@/components/instructor/LessonCompletionModal';
import { LessonFailureModal } from '@/components/instructor/LessonFailureModal';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function LessonDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const lessonId = rawId ? parseInt(rawId as string, 10) : 1;

  const lesson = getLessonById(lessonId) || LESSONS[0];

  const { resetSimulation, setGrade, resumeAudio } = useKeyboardControls();
  const { vehicleState, activeFeedback, isPaused, togglePause, isMuted, toggleMute } =
    useSimulatorStore();

  // Reset vehicle to lesson starting conditions (road incline and stationary engine)
  const handleResetVehicle = useCallback(() => {
    resetSimulation();
    if (lesson.initialGradePct !== undefined) {
      setGrade(lesson.initialGradePct);
    }
  }, [resetSimulation, setGrade, lesson.initialGradePct]);

  // Synchronize initial grade when lesson changes or mounts
  useEffect(() => {
    handleResetVehicle();
  }, [lesson.id, handleResetVehicle]);

  // Interactive step runner and telemetry evaluator
  const {
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
  } = useLessonRunner(lesson, vehicleState, handleResetVehicle);

  const handleToggleMute = () => {
    resumeAudio();
    toggleMute();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:px-8 w-full max-w-[1800px] mx-auto">
      {/* Top Header Navigation */}
      <CockpitHeader
        title={lesson.title}
        subtitle={`Lesson ${lesson.id} of ${LESSONS.length} — ${lesson.subtitle}`}
        engineStatus={vehicleState.engine.status}
        isPaused={isPaused}
        isMuted={isMuted}
        onTogglePause={togglePause}
        onToggleMute={handleToggleMute}
        onReset={resetLesson}
        resetLabel="Restart Lesson"
        backHref="/lessons"
        backLabel="Curriculum"
        elapsedSeconds={elapsedTime}
      />

      {/* Main Lesson Workspace */}
      <main className="flex-1 w-full flex flex-col gap-5">
        {/* Step Progression & Objective Panoramic HUD Tracker */}
        <LessonTracker
          lesson={lesson}
          currentStepIndex={currentStepIndex}
          stepHoldProgress={stepHoldProgress}
          vehicleState={vehicleState}
          onResetLesson={resetLesson}
        />

        {/* 3-Column Ergonomic Cockpit with Step Criteria Checklist in Left Column */}
        <Dashboard
          state={vehicleState}
          feedback={activeFeedback}
          onSelectGrade={setGrade}
          showGradientControls={false}
          showCheatsheet={true}
          leftExtra={
            <LessonStepChecklist
              lesson={lesson}
              currentStepIndex={currentStepIndex}
              stepHoldProgress={stepHoldProgress}
              vehicleState={vehicleState}
            />
          }
        />
      </main>

      {/* Completion Modal */}
      {status === 'completed' && (
        <LessonCompletionModal
          lesson={lesson}
          stars={stars}
          smoothnessScore={smoothnessScore}
          stalls={stallsCount}
          maxRollbackMeters={maxRollbackMeters}
          timeSeconds={elapsedTime}
          onRetry={resetLesson}
        />
      )}

      {/* Failure Diagnostic Modal */}
      {status === 'failed' && (
        <LessonFailureModal
          lesson={lesson}
          reason={failureReason}
          stepIndex={currentStepIndex}
          onRetry={resetLesson}
        />
      )}
      </div>
    </AuthGuard>
  );
}
