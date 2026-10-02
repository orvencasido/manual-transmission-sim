'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchDriverSummary,
  fetchRecentSessions,
  DriverStatsSummary,
} from '@/lib/supabase/queries';
import { DrivingSessionRow } from '@/lib/supabase/types';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import { LESSONS } from '@/app/lessons/curriculumData';
import { AuthProfilePill } from '@/components/auth/AuthProfilePill';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ProgressPage() {
  const [summary, setSummary] = useState<DriverStatsSummary | null>(null);
  const [sessions, setSessions] = useState<DrivingSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const lessonRecords = useLessonProgressStore((state) => state.records);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [sumRes, sessRes] = await Promise.all([
          fetchDriverSummary(),
          fetchRecentSessions(5),
        ]);

        if (isMounted) {
          if (sumRes.data) {
            setSummary(sumRes.data);
          }
          if (sessRes.data) {
            setSessions(sessRes.data);
          }
        }
      } catch (err) {
        console.warn('Failed loading progress data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalDrivenMinutes = summary
    ? Math.round(summary.totalDurationSeconds / 60)
    : 0;

  const totalCompletedLessons = Object.values(lessonRecords).filter(
    (l) => l.completed
  ).length;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Statistics & Progress</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cloud persistence and session history powered by Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AuthProfilePill />
          <Link
            href="/simulator"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition shadow-sm"
          >
            Free Drive
          </Link>
          <Link
            href="/lessons"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
          >
            Curriculum
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total Stalls</div>
          <div className="text-3xl font-bold font-mono text-red-400 mt-2">
            {isLoading ? '...' : summary?.totalStalls ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Powertrain stall events</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Smooth Starts</div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-2">
            {isLoading ? '...' : summary?.totalSmoothStarts ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Clean bite engagements</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Time Driven</div>
          <div className="text-3xl font-bold font-mono text-cyan-400 mt-2">
            {isLoading ? '...' : `${totalDrivenMinutes}m`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cumulative session time</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Lessons Mastered</div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-2">
            {totalCompletedLessons} / {LESSONS.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Curriculum progress</div>
        </div>
      </div>

      {/* Curriculum Mastery Breakdown */}
      <section className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Curriculum Performance</h2>
            <p className="text-xs text-slate-400">Detailed scores per training module</p>
          </div>
          <Link
            href="/lessons"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Go to Lessons &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {LESSONS.map((l) => {
            const rec = lessonRecords[l.id];
            const isCompleted = rec?.completed;
            const stars = rec?.stars || 0;

            return (
              <div
                key={l.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-cyan-400">Lesson {l.id}</span>
                    <span className="text-xs font-mono">
                      {'★'.repeat(stars)}
                      <span className="text-slate-700">{'★'.repeat(3 - stars)}</span>
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-200">{l.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{l.subtitle}</div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {isCompleted ? (
                      <span className="text-emerald-400 font-medium">✓ Completed</span>
                    ) : (
                      <span className="text-slate-500">Not completed</span>
                    )}
                  </span>
                  {rec && (
                    <span className="font-mono text-slate-300">
                      Score: {rec.smoothnessScore}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Driving Sessions from Supabase */}
      <section className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Recent Free Drive Sessions</h2>
          <p className="text-xs text-slate-400">Telemetry logs synced to Supabase</p>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/50">
            {isLoading ? 'Loading session telemetry...' : 'No driving sessions logged yet. Head to Free Drive to practice!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="pb-2">Date / Time</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Distance</th>
                  <th className="pb-2">Max Speed</th>
                  <th className="pb-2">Stalls</th>
                  <th className="pb-2">Smooth Starts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 text-slate-300">
                      {new Date(s.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 text-slate-300">{Math.round(s.duration_seconds)}s</td>
                    <td className="py-2.5 text-slate-300">{Math.round(s.distance_meters)}m</td>
                    <td className="py-2.5 text-cyan-400">{s.max_speed_kmh} km/h</td>
                    <td className="py-2.5">
                      <span className={s.stall_count > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                        {s.stall_count}
                      </span>
                    </td>
                    <td className="py-2.5 text-emerald-400 font-semibold">{s.smooth_starts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </AuthGuard>
  );
}
