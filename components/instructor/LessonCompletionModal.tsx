'use client';

import React from 'react';
import Link from 'next/link';
import { LessonDefinition } from '@/app/lessons/curriculumData';

interface LessonCompletionModalProps {
  lesson: LessonDefinition;
  stars: number;
  smoothnessScore: number;
  stalls: number;
  maxRollbackMeters: number;
  timeSeconds: number;
  onRetry: () => void;
}

export function LessonCompletionModal({
  lesson,
  stars,
  smoothnessScore,
  stalls,
  maxRollbackMeters,
  timeSeconds,
  onRetry,
}: LessonCompletionModalProps) {
  const hasNextLesson = lesson.id < 5;
  const nextLessonId = lesson.id + 1;

  // Feedback commentary based on metrics
  const getCommentary = () => {
    if (stalls === 0 && smoothnessScore >= 90) {
      return 'Outstanding vehicle control! Clutch modulation and throttle balance were textbook perfect.';
    }
    if (stalls === 0 && smoothnessScore >= 75) {
      return 'Great run! You successfully completed all lesson requirements with smooth transitions.';
    }
    if (stalls > 0) {
      return `Objective completed! You overcame ${stalls} ${
        stalls === 1 ? 'stall' : 'stalls'
      }. Try practicing again to achieve a zero-stall run.`;
    }
    return 'Lesson passed! Keep practicing to refine your footwork and elevate your smoothness rating.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-emerald-950/50 space-y-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.8)]" />

        {/* Header Badge & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span>🎉</span> Lesson {lesson.id} Passed
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{lesson.title}</h2>
          <p className="text-xs text-slate-400">{lesson.subtitle}</p>
        </div>

        {/* Star Rating Display */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[1, 2, 3].map((starIdx) => {
            const isEarned = starIdx <= stars;
            return (
              <span
                key={starIdx}
                className={`text-3xl sm:text-4xl transition-all duration-300 transform ${
                  isEarned
                    ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)] scale-110'
                    : 'text-slate-700'
                }`}
              >
                ★
              </span>
            );
          })}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Smoothness Score
            </span>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {smoothnessScore}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {smoothnessScore >= 90 ? 'Exceptional' : smoothnessScore >= 75 ? 'Competent' : 'Developing'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Engine Stalls
            </span>
            <div
              className={`text-xl font-mono font-bold mt-1 ${
                stalls === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stalls}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {stalls === 0 ? 'Flawless recovery' : 'Stall occurrences'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Max Rollback
            </span>
            <div
              className={`text-xl font-mono font-bold mt-1 ${
                maxRollbackMeters <= 0.05 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {maxRollbackMeters.toFixed(2)}m
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {lesson.initialGradePct > 0 ? 'On 10% slope' : 'Level ground'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Time Elapsed
            </span>
            <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
              {timeSeconds.toFixed(1)}s
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Completion time</div>
          </div>
        </div>

        {/* Instructor Summary Commentary */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <span className="text-emerald-400 text-base leading-none">💬</span>
          <p className="leading-relaxed">{getCommentary()}</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {hasNextLesson ? (
            <Link
              href={`/lessons/${nextLessonId}`}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition"
            >
              Next: Lesson {nextLessonId} →
            </Link>
          ) : (
            <Link
              href="/lessons"
              className="w-full sm:flex-1 py-3 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition"
            >
              Curriculum Complete! 🎓
            </Link>
          )}

          <button
            onClick={onRetry}
            className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Retry Lesson
          </button>

          <Link
            href="/lessons"
            className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition text-center"
          >
            Curriculum
          </Link>
        </div>
      </div>
    </div>
  );
}
