'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getLessonById, LESSONS } from '../curriculumData';
import { useLessonRunner } from '../useLessonRunner';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { useKeyboardControls } from '@/components/controls/useKeyboardControls';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LessonTracker } from '@/components/instructor/LessonTracker';
import { LessonCompletionModal } from '@/components/instructor/LessonCompletionModal';
import { LessonFailureModal } from '@/components/instructor/LessonFailureModal';

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const lessonId = rawId ? parseInt(rawId as string, 10) : 1;

  const lesson = getLessonById(lessonId) || LESSONS[0];

  const { resetSimulation, setGrade, resumeAudio } = useKeyboardControls();
  const { vehicleState, isPaused, togglePause, isMuted, toggleMute } = useSimulatorStore();

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Header Navigation */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/lessons"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Return to Curriculum"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {lesson.title}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Curriculum Module {lesson.id} of 5 — Interactive Guided Trainer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 ${
              isMuted
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/50 hover:bg-rose-900/40'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            <span>{isMuted ? '🔇 Muted' : '🔊 Audio Active'}</span>
          </button>

          <button
            onClick={togglePause}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition border ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>

          <button
            onClick={resetLesson}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 transition"
          >
            Reset Lesson
          </button>

          <Link
            href="/lessons"
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
          >
            Curriculum
          </Link>
        </div>
      </header>

      {/* Main Lesson Workspace */}
      <main className="flex-1 flex flex-col items-center justify-start max-w-5xl w-full mx-auto space-y-6">
        {/* Step Progression & Objective HUD Tracker */}
        <LessonTracker
          lesson={lesson}
          currentStepIndex={currentStepIndex}
          stepHoldProgress={stepHoldProgress}
          vehicleState={vehicleState}
          onResetLesson={resetLesson}
        />

        {/* Dashboard Instrumentation (Gauges, Pedals & Instructor Diagnostics) */}
        <Dashboard state={vehicleState} />

        {/* Manual Controls Reference Cheatsheet */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 w-full shadow-lg">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Trainer Pedal & Shifter Controls
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200 font-bold">W</kbd>
              <span className="ml-2 text-slate-300">Throttle (Gas)</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200 font-bold">S</kbd>
              <span className="ml-2 text-slate-300">Foot Brake</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300 font-bold">Space</kbd>
              <span className="ml-2 text-slate-300">Clutch Pedal</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200 font-bold">E / Q</kbd>
              <span className="ml-2 text-slate-300">Shift Up / Down</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-rose-300 font-bold">P</kbd>
              <span className="ml-2 text-slate-300">Handbrake</span>
            </div>
          </div>
        </div>
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
  );
}
