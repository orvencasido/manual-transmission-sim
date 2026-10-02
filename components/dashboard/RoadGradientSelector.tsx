'use client';

import React from 'react';

export interface RoadGradientSelectorProps {
  currentGrade: number; // can be radians or percentage
  onSelectGrade: (pct: number) => void;
  className?: string;
}

export function RoadGradientSelector({
  currentGrade,
  onSelectGrade,
  className = '',
}: RoadGradientSelectorProps) {
  // If currentGrade is small (e.g. < 0.5), it's likely in radians; otherwise percent
  const currentGradePct = Math.abs(currentGrade) < 0.5
    ? Math.round(Math.tan(currentGrade) * 100)
    : Math.round(currentGrade);

  return (
    <div className={`p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Road Gradient
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          {currentGradePct}% Incline
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onSelectGrade(0)}
          className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition border flex flex-col items-center justify-center gap-0.5 ${
            currentGradePct === 0
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <span>Flat</span>
          <span className="text-[10px] font-mono opacity-80">0%</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectGrade(6)}
          className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition border flex flex-col items-center justify-center gap-0.5 ${
            currentGradePct === 6
              ? 'bg-amber-950/70 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <span>Gentle</span>
          <span className="text-[10px] font-mono opacity-80">6%</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectGrade(12)}
          className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition border flex flex-col items-center justify-center gap-0.5 ${
            currentGradePct === 12
              ? 'bg-rose-950/70 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <span>Steep</span>
          <span className="text-[10px] font-mono opacity-80">12%</span>
        </button>
      </div>
    </div>
  );
}
