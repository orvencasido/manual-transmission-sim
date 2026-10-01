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
}

export function LessonTracker({
  lesson,
  currentStepIndex,
  stepHoldProgress,
  vehicleState,
  onResetLesson,
}: LessonTrackerProps) {
  const currentStep: LessonStep | undefined = lesson.steps[currentStepIndex];
  const telemetry = currentStep ? currentStep.getTelemetryStatus(vehicleState) : null;
  const progressPercent = Math.round(((currentStepIndex) / lesson.steps.length) * 100);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-5">
      {/* Top Bar: Lesson Identifier & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Lesson {lesson.id}
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              {lesson.title}
              <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                — {lesson.subtitle}
              </span>
            </h2>
            <p className="text-xs text-slate-400 line-clamp-1">{lesson.objective}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {lesson.initialGradePct > 0 && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span>▲</span> {lesson.initialGradePct}% Incline
            </span>
          )}
          <button
            onClick={onResetLesson}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition flex items-center gap-1.5"
            title="Restart this lesson from step 1"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Step Stepper Navigation Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            Step <span className="text-cyan-400 font-bold font-mono">{currentStepIndex + 1}</span> of{' '}
            <span className="font-mono">{lesson.steps.length}</span>: {currentStep?.title}
          </span>
          <span className="font-mono text-slate-400 text-[11px]">{progressPercent}% Completed</span>
        </div>

        {/* Multi-Segment Step Indicator */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${lesson.steps.length}, minmax(0, 1fr))` }}>
          {lesson.steps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.id} className="flex flex-col gap-1.5">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : isCurrent
                      ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse'
                      : 'bg-slate-800'
                  }`}
                />
                <span
                  className={`text-[10px] truncate hidden md:inline font-mono ${
                    isDone
                      ? 'text-emerald-400 font-medium'
                      : isCurrent
                      ? 'text-cyan-300 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {idx + 1}. {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Step Hero Card */}
      {currentStep && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 relative overflow-hidden">
          {/* Subtle colored accent edge */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-500 to-emerald-500" />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  Current Objective
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-100">{currentStep.description}</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                👉 {currentStep.instruction}
              </p>
            </div>

            {/* Real-time Telemetry Badge */}
            {telemetry && (
              <div
                className={`shrink-0 px-3.5 py-2.5 rounded-xl border text-xs flex flex-col items-start sm:items-end justify-center transition-all ${
                  telemetry.isTargetMet
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900 text-slate-300 border-slate-700/60'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                  {telemetry.label}
                </span>
                <span className="text-sm font-bold font-mono flex items-center gap-1.5 mt-0.5">
                  {telemetry.value}
                  {telemetry.isTargetMet && (
                    <span className="text-emerald-400 font-bold">✔</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Hold Countdown Progress Bar (if holding condition required) */}
          {currentStep.holdDurationSeconds && currentStep.holdDurationSeconds > 0 && (
            <div className="pt-2 border-t border-slate-800/80 pl-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-mono text-[11px] flex items-center gap-1.5">
                  <span>⏱</span> Hold Target Steadily:
                </span>
                <span className="font-mono font-semibold text-cyan-300 text-[11px]">
                  {Math.round(stepHoldProgress * currentStep.holdDurationSeconds * 10) / 10}s /{' '}
                  {currentStep.holdDurationSeconds}s
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-100 ease-out"
                  style={{ width: `${Math.min(100, Math.round(stepHoldProgress * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Telemetry Hint Pill */}
          <div className="text-[11px] text-slate-400 flex items-center gap-2 pl-2">
            <span className="text-slate-500 font-mono">Target:</span>
            <code className="text-cyan-300/90 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {currentStep.telemetryHint}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
