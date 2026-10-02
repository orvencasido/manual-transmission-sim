'use client';

import React from 'react';

export interface ControlsCheatsheetProps {
  className?: string;
  compact?: boolean;
}

export function ControlsCheatsheet({ className = '', compact = false }: ControlsCheatsheetProps) {
  const items = [
    { key: 'W', label: 'Throttle', color: 'text-emerald-300' },
    { key: 'S', label: 'Foot Brake', color: 'text-rose-300' },
    { key: 'Space', label: 'Clutch Pedal', color: 'text-amber-300' },
    { key: 'A / D', label: 'Steering', color: 'text-cyan-300' },
    { key: 'E / Q', label: 'Shift Up/Dn', color: 'text-slate-200' },
    { key: 'N', label: 'Neutral', color: 'text-teal-300' },
    { key: 'R', label: 'Reverse', color: 'text-rose-300' },
    { key: 'P', label: 'Handbrake', color: 'text-rose-400' },
    { key: 'Hold I', label: 'Starter', color: 'text-amber-400' },
    { key: 'ESC', label: 'Pause', color: 'text-slate-300' },
  ];

  return (
    <div className={`p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Keyboard Cheatsheet
        </span>
        <span className="text-[10px] text-slate-500 font-mono">Controls</span>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1.5'} text-xs`}>
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between bg-slate-900/90 px-2 py-1.5 rounded-lg border border-slate-800/70"
          >
            <kbd className={`font-mono text-[11px] font-bold ${item.color}`}>
              {item.key}
            </kbd>
            <span className="text-[11px] text-slate-400 truncate ml-1">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
