'use client';

import React from 'react';
import Link from 'next/link';
import { LessonDefinition } from '@/app/lessons/curriculumData';

interface LessonFailureModalProps {
  lesson: LessonDefinition;
  reason: string;
  stepIndex: number;
  onRetry: () => void;
}

export function LessonFailureModal({
  lesson,
  reason,
  stepIndex,
  onRetry,
}: LessonFailureModalProps) {
  const failedStep = lesson.steps[stepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-rose-950/50 space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1.5 bg-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.9)]" />

        {/* Diagnostic Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <span>⚠️</span> Lesson Attempt Interrupted
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Criteria Not Met</h2>
          <p className="text-xs text-slate-400">
            {lesson.title} — Step {stepIndex + 1}: {failedStep?.title}
          </p>
        </div>

        {/* Diagnostic Explanation Card */}
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-xs space-y-2">
          <div className="font-semibold text-rose-300 flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Instructor Diagnostic</span>
          </div>
          <p className="text-rose-100 leading-relaxed pl-6">{reason}</p>
        </div>

        {/* Coach Recommendation */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider">
            💡 Coach Tip
          </span>
          <p className="text-slate-300 leading-relaxed">
            {lesson.id === 1 &&
              'Move the clutch in tiny millimeter increments. Once you hear the engine pitch change, freeze your foot completely until the car starts rolling.'}
            {lesson.id === 2 &&
              'Keep the throttle pedal steady at ~1,800 RPM before letting the clutch up. Coordinate your feet simultaneously.'}
            {lesson.id === 3 &&
              'Ensure you push the clutch all the way down before moving the shifter into the next gear.'}
            {lesson.id === 4 &&
              'Wait until you feel the rear suspension squat and clutch torque reach 35+ Nm against the handbrake before lowering the lever.'}
            {lesson.id === 5 &&
              'Brake down to 25 km/h first, depress clutch, and give a distinct tap on the gas pedal to raise revs before engaging 2nd.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Try Again</span>
          </button>

          <Link
            href="/lessons"
            className="py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Curriculum
          </Link>
        </div>
      </div>
    </div>
  );
}
