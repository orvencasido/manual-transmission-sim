'use client';

import React from 'react';
import Link from 'next/link';
import { LESSONS } from './curriculumData';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';

export default function LessonsPage() {
  const records = useLessonProgressStore((s) => s.records);
  const resetAll = useLessonProgressStore((s) => s.resetAll);

  // Calculate curriculum summary metrics
  const completedCount = LESSONS.filter((l) => records[l.id]?.completed).length;
  const totalStars = Object.values(records).reduce((acc, r) => acc + (r.stars || 0), 0);
  const maxPossibleStars = LESSONS.length * 3;
  const progressPercent = Math.round((completedCount / LESSONS.length) * 100);

  // Determine the next recommended lesson to tackle
  const nextLesson = LESSONS.find((l) => !records[l.id]?.completed) || LESSONS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full mx-auto space-y-8">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Driving Curriculum
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Structured progressive masterclasses for manual transmission proficiency
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/simulator"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            >
              Free Drive Simulator
            </Link>
            <Link
              href="/"
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              Home
            </Link>
          </div>
        </header>

        {/* Curriculum Progress Overview Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
                Training Progress
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {completedCount === LESSONS.length
                  ? 'Curriculum Completed! 🏆'
                  : `Module ${completedCount + 1} of ${LESSONS.length}: ${nextLesson.title}`}
              </h2>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <span className="text-slate-400">Lessons:</span>
                <span className="text-emerald-400 font-bold">
                  {completedCount} / {LESSONS.length}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <span className="text-slate-400">Stars:</span>
                <span className="text-amber-400 font-bold">
                  ★ {totalStars} / {maxPossibleStars}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>{progressPercent}% Total Curriculum Completion</span>
              {completedCount > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Reset all curriculum lesson progress?')) {
                      resetAll();
                    }
                  }}
                  className="text-slate-500 hover:text-rose-400 transition underline lowercase"
                >
                  reset progress
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 5 Lesson Cards */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Interactive Lesson Modules
          </div>

          <div className="grid gap-4">
            {LESSONS.map((lesson) => {
              const record = records[lesson.id];
              const isCompleted = !!record?.completed;

              const getDifficultyColor = (diff: string) => {
                switch (diff) {
                  case 'Beginner':
                    return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                  case 'Intermediate':
                    return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
                  case 'Advanced':
                    return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                  default:
                    return 'bg-slate-800 text-slate-300 border-slate-700';
                }
              };

              return (
                <div
                  key={lesson.id}
                  className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 ${
                    isCompleted
                      ? 'bg-slate-900/90 border-emerald-500/30 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Lesson Information */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-950 text-slate-300 border border-slate-800">
                          Lesson {lesson.id}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold border ${getDifficultyColor(
                            lesson.difficulty
                          )}`}
                        >
                          {lesson.difficulty}
                        </span>

                        <span className="text-slate-500 text-xs font-mono">
                          ⏱ {lesson.estimatedDuration}
                        </span>

                        {lesson.initialGradePct > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ▲ {lesson.initialGradePct}% Slope
                          </span>
                        )}

                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <span>✔</span> Completed
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {lesson.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{lesson.subtitle}</p>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                        {lesson.objective}
                      </p>

                      {/* Best Recorded Score if completed */}
                      {isCompleted && (
                        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono border-t border-slate-800/80">
                          <span className="text-amber-400 flex items-center gap-0.5">
                            {[1, 2, 3].map((star) => (
                              <span
                                key={star}
                                className={star <= record.stars ? 'text-amber-400' : 'text-slate-700'}
                              >
                                ★
                              </span>
                            ))}
                          </span>
                          <span className="text-slate-400">
                            Smoothness:{' '}
                            <span className="text-emerald-400 font-bold">
                              {record.smoothnessScore}%
                            </span>
                          </span>
                          <span className="text-slate-400">
                            Stalls:{' '}
                            <span
                              className={`font-bold ${
                                record.stalls === 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {record.stalls}
                            </span>
                          </span>
                          <span className="text-slate-400">
                            Best Time:{' '}
                            <span className="text-cyan-400 font-bold">
                              {record.bestTimeSeconds}s
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Launch Action Button */}
                    <div className="flex md:flex-col items-center justify-end gap-2 shrink-0">
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className={`w-full md:w-36 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-center transition shadow-lg ${
                          isCompleted
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                        }`}
                      >
                        {isCompleted ? 'Practice Again' : 'Start Lesson →'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
