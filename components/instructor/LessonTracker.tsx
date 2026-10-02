'use client';

import React from 'react';
import { LessonDefinition, LessonStep } from '@/app/lessons/curriculumData';
import { VehicleState } from '@/lib/simulation/types';

interface LessonTrackerProps {
  lesson: LessonDefinition;
  currentStepIndex: number;
  stepHoldProgress: number; // 0 to 1
  vehicleState: VehicleState;
  onResetLesson: () => void;
  className?: string;
}

/**
 * Streamlined Panoramic Objective HUD Banner
 * Spans horizontally above the 3-column cockpit with minimal vertical profile.
 */
export function LessonTracker({
  lesson,
  currentStepIndex,
  stepHoldProgress,
  vehicleState,
  onResetLesson,
  className = '',
}: LessonTrackerProps) {
  const currentStep: LessonStep | undefined = lesson.steps[currentStepIndex];
  const telemetry = currentStep ? currentStep.getTelemetryStatus(vehicleState) : null;
  const progressPercent = Math.round((currentStepIndex / lesson.steps.length) * 100);

  return (
    <div
      className={`w-full bg-slate-900/85 border border-slate-800 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md shadow-xl flex flex-col gap-3 mb-6 select-none ${className}`}
    >
      {/* Top Bar: Progress Stepper & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Lesson {lesson.id}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
            {lesson.title}
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-xs text-slate-400 hidden md:inline truncate">
            Step <span className="text-cyan-400 font-mono font-bold">{currentStepIndex + 1}</span> of{' '}
            <span className="font-mono">{lesson.steps.length}</span>: {currentStep?.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lesson.initialGradePct > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span>▲</span> {lesson.initialGradePct}% Slope
            </span>
          )}

          <span className="font-mono text-xs text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            {progressPercent}% Done
          </span>

          <button
            type="button"
            onClick={onResetLesson}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition flex items-center gap-1.5"
            title="Restart this lesson from step 1"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Segmented Step Indicator */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${lesson.steps.length}, minmax(0, 1fr))` }}>
        {lesson.steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isDone
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : isCurrent
                  ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse'
                  : 'bg-slate-800'
              }`}
              title={`${idx + 1}. ${step.title}`}
            />
          );
        })}
      </div>

      {/* Streamlined Objective Bar & Telemetry Status */}
      {currentStep && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
          {/* Objective Description & Instruction */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                Active Objective
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {currentStep.description}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
              <span>👉 {currentStep.instruction}</span>
              <span className="text-slate-500 font-mono hidden sm:inline">|</span>
              <span className="text-slate-400 font-mono text-[11px]">
                Target: <code className="text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{currentStep.telemetryHint}</code>
              </span>
            </div>
          </div>

          {/* Real-time Telemetry & Hold Progress Badge */}
          <div className="flex items-center gap-3 shrink-0">
            {currentStep.holdDurationSeconds && currentStep.holdDurationSeconds > 0 && (
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono text-[10px] text-slate-400">
                  Hold: <span className="text-cyan-300 font-bold">{Math.round(stepHoldProgress * currentStep.holdDurationSeconds * 10) / 10}s / {currentStep.holdDurationSeconds}s</span>
                </span>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-100 ease-out"
                    style={{ width: `${Math.min(100, Math.round(stepHoldProgress * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {telemetry && (
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                  telemetry.isTargetMet
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-900 text-slate-300 border-slate-700/60'
                }`}
              >
                <div className="flex flex-col text-right">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">
                    {telemetry.label}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {telemetry.value}
                  </span>
                </div>
                {telemetry.isTargetMet && (
                  <span className="text-emerald-400 font-bold text-sm">✔</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Left-Column Step Criteria Checklist Card for Guided Lessons
 */
export function LessonStepChecklist({
  lesson,
  currentStepIndex,
  stepHoldProgress,
  vehicleState,
}: {
  lesson: LessonDefinition;
  currentStepIndex: number;
  stepHoldProgress: number;
  vehicleState: VehicleState;
}) {
  const currentStep: LessonStep | undefined = lesson.steps[currentStepIndex];
  if (!currentStep) return null;

  const telemetry = currentStep.getTelemetryStatus(vehicleState);

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-md space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Step Validation
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          Step {currentStepIndex + 1}/{lesson.steps.length}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">Requirement</span>
          <span className="font-mono text-[11px] text-slate-200 font-medium">
            {currentStep.telemetryHint}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">Active Telemetry</span>
          <span
            className={`font-mono text-xs font-bold flex items-center gap-1 ${
              telemetry.isTargetMet ? 'text-emerald-400' : 'text-slate-300'
            }`}
          >
            {telemetry.value}
            {telemetry.isTargetMet ? ' ✔' : ''}
          </span>
        </div>

        {currentStep.holdDurationSeconds && currentStep.holdDurationSeconds > 0 && (
          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Hold Steadily</span>
              <span className="font-mono text-cyan-300 font-bold">
                {Math.round(stepHoldProgress * currentStep.holdDurationSeconds * 10) / 10}s /{' '}
                {currentStep.holdDurationSeconds}s
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-100 ease-out"
                style={{ width: `${Math.min(100, Math.round(stepHoldProgress * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LessonTracker;
