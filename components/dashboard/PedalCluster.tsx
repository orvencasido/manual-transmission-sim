'use client';

import React from 'react';

interface PedalClusterProps {
  clutch: number; // 0.0 (released) to 1.0 (fully depressed)
  brake: number; // 0.0 to 1.0
  throttle: number; // 0.0 to 1.0
  steering: number; // -1.0 to 1.0
  clutchEngagement?: number; // 0.0 (disengaged/slip) to 1.0 (clamped)
}

export function PedalCluster({
  clutch,
  brake,
  throttle,
  steering,
  clutchEngagement,
}: PedalClusterProps) {
  const clutchPct = Math.round(clutch * 100);
  const brakePct = Math.round(brake * 100);
  const throttlePct = Math.round(throttle * 100);
  const steeringPct = Math.round(steering * 100);

  const isInBiteZone = clutch >= 0.4 && clutch <= 0.65;
  const isFullyEngaged = clutch < 0.4;
  const isDisengaged = clutch > 0.65;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-slate-300">
            Pedal Instrumentation & Steering
          </h3>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Travel: <span className="text-slate-200">0% (Rest) → 100% (Depressed)</span>
        </div>
      </div>

      {/* Vertical Pedals Grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end justify-items-center pt-1">
        {/* ================= CLUTCH PEDAL ================= */}
        <div className="flex flex-col items-center w-full max-w-[150px]">
          {/* Label & Value */}
          <div className="text-center mb-2 w-full">
            <div className="text-xs font-semibold text-amber-300">Clutch (Space)</div>
            <div className="font-mono text-lg font-bold text-amber-400">{clutchPct}%</div>
          </div>

          {/* Vertical Bar Column */}
          <div className="relative w-14 sm:w-16 h-44 bg-slate-950 rounded-xl border border-slate-800 p-1 flex items-end justify-center overflow-hidden shadow-inner">
            {/* Graduation lines */}
            <div className="absolute inset-x-0 top-0 h-full pointer-events-none flex flex-col justify-between py-2 px-1 z-10 opacity-30">
              <div className="border-t border-slate-400 w-full" />
              <div className="border-t border-slate-400 w-2/3" />
              <div className="border-t border-slate-400 w-full" />
              <div className="border-t border-slate-400 w-2/3" />
              <div className="border-t border-slate-400 w-full" />
            </div>

            {/* BITE POINT ZONE HIGHLIGHT (40% to 65% from bottom) */}
            <div
              className={`absolute left-0 right-0 z-20 pointer-events-none border-y-2 border-dashed transition-all duration-150 ${
                isInBiteZone
                  ? 'bg-amber-500/35 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-amber-500/15 border-amber-500/50'
              }`}
              style={{
                bottom: '40%',
                height: '25%', // 65% - 40%
              }}
            >
              <div className="absolute right-1 top-0 text-[8px] font-mono text-amber-400/80 -translate-y-1/2">
                65%
              </div>
              <div className="absolute right-1 bottom-0 text-[8px] font-mono text-amber-400/80 translate-y-1/2">
                40%
              </div>
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[9px] font-black text-amber-300 tracking-wider bg-slate-950/80 px-1 py-0.5 rounded shadow">
                  BITE
                </span>
              </div>
            </div>

            {/* Filled Travel Level */}
            <div
              className="w-full rounded-lg bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 transition-all duration-75 relative z-10"
              style={{ height: `${clutchPct}%` }}
            />
          </div>

          {/* Clutch Bite Status Feedback Badge */}
          <div className="mt-2.5 w-full text-center">
            {isInBiteZone ? (
              <div className="px-1.5 py-1 rounded bg-amber-500/20 border border-amber-400/80 text-amber-300 text-[10px] font-bold tracking-tight animate-pulse shadow-sm">
                ⚡ BITE POINT ACTIVE
                <div className="text-[8px] font-normal text-amber-200">Friction Transferred</div>
              </div>
            ) : isFullyEngaged ? (
              <div className="px-1.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-medium">
                CLUTCH ENGAGED
                <div className="text-[8px] text-slate-400">
                  {clutchPct === 0 ? 'Fully Locked' : 'Pre-Bite Travel'}
                </div>
              </div>
            ) : (
              <div className="px-1.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-medium">
                DISENGAGED
                <div className="text-[8px] text-slate-500">Free Flywheel Slip</div>
              </div>
            )}
            {clutchEngagement !== undefined && (
              <div className="text-[9px] text-slate-500 font-mono mt-1">
                Plate Clamp: {(clutchEngagement * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* ================= BRAKE PEDAL ================= */}
        <div className="flex flex-col items-center w-full max-w-[150px]">
          {/* Label & Value */}
          <div className="text-center mb-2 w-full">
            <div className="text-xs font-semibold text-rose-300">Brake (S)</div>
            <div className="font-mono text-lg font-bold text-rose-400">{brakePct}%</div>
          </div>

          {/* Vertical Bar Column */}
          <div className="relative w-14 sm:w-16 h-44 bg-slate-950 rounded-xl border border-slate-800 p-1 flex items-end justify-center overflow-hidden shadow-inner">
            {/* Graduation lines */}
            <div className="absolute inset-x-0 top-0 h-full pointer-events-none flex flex-col justify-between py-2 px-1 z-10 opacity-30">
              <div className="border-t border-slate-400 w-full" />
              <div className="border-t border-slate-400 w-2/3" />
              <div className="border-t border-slate-400 w-full" />
              <div className="border-t border-slate-400 w-2/3" />
              <div className="border-t border-slate-400 w-full" />
            </div>

            {/* Filled Travel Level */}
            <div
              className="w-full rounded-lg bg-gradient-to-t from-rose-700 via-rose-500 to-rose-400 transition-all duration-75 relative z-10"
              style={{ height: `${brakePct}%` }}
            />
          </div>

          {/* Status Badge */}
          <div className="mt-2.5 w-full text-center">
            {brakePct > 0 ? (
              <div className="px-1.5 py-1 rounded bg-rose-500/20 border border-rose-500/70 text-rose-300 text-[10px] font-bold">
                BRAKING
                <div className="text-[8px] font-normal text-rose-200">Hydraulic Pressure</div>
              </div>
            ) : (
              <div className="px-1.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-medium">
                RELEASED
                <div className="text-[8px] text-slate-500">Free Wheel Spin</div>
              </div>
            )}
            <div className="text-[9px] text-slate-500 font-mono mt-1">Foot Brake</div>
          </div>
        </div>

        {/* ================= THROTTLE PEDAL ================= */}
        <div className="flex flex-col items-center w-full max-w-[150px]">
          {/* Label & Value */}
          <div className="text-center mb-2 w-full">
            <div className="text-xs font-semibold text-emerald-300">Throttle (W)</div>
            <div className="font-mono text-lg font-bold text-emerald-400">{throttlePct}%</div>
          </div>

          {/* Vertical Bar Column */}
          <div className="relative w-14 sm:w-16 h-44 bg-slate-950 rounded-xl border border-slate-800 p-1 flex items-end justify-center overflow-hidden shadow-inner">
            {/* Graduation lines */}
            <div className="absolute inset-x-0 top-0 h-full pointer-events-none flex flex-col justify-between py-2 px-1 z-10 opacity-30">
              <div className="border-t border-slate-400 w-full" />
              <div className="border-t border-slate-400 w-2/3" />
              <div className="border-t border-slate-400 w-full" />
              <div className="border-t border-slate-400 w-2/3" />
              <div className="border-t border-slate-400 w-full" />
            </div>

            {/* Filled Travel Level */}
            <div
              className="w-full rounded-lg bg-gradient-to-t from-emerald-700 via-emerald-500 to-emerald-400 transition-all duration-75 relative z-10"
              style={{ height: `${throttlePct}%` }}
            />
          </div>

          {/* Status Badge */}
          <div className="mt-2.5 w-full text-center">
            {throttlePct > 0 ? (
              <div className="px-1.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/70 text-emerald-300 text-[10px] font-bold">
                ACCELERATING
                <div className="text-[8px] font-normal text-emerald-200">Throttle Open</div>
              </div>
            ) : (
              <div className="px-1.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-medium">
                IDLE
                <div className="text-[8px] text-slate-500">Idle Air Control</div>
              </div>
            )}
            <div className="text-[9px] text-slate-500 font-mono mt-1">Accelerator</div>
          </div>
        </div>
      </div>

      {/* ================= BI-DIRECTIONAL STEERING INDICATOR ================= */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span>Steering Angle</span>
            <span className="text-[10px] text-slate-500 font-normal">(A / D)</span>
          </span>
          <span className="font-mono text-xs font-bold text-cyan-400">
            {steeringPct < -1
              ? `◄ ${Math.abs(steeringPct)}% LEFT`
              : steeringPct > 1
              ? `RIGHT ${steeringPct}% ►`
              : '● CENTER 0%'}
          </span>
        </div>

        {/* Bi-directional horizontal track */}
        <div className="relative h-4 bg-slate-950 rounded-full border border-slate-800 overflow-hidden flex items-center shadow-inner">
          {/* Left half track */}
          <div className="w-1/2 h-full flex justify-end relative">
            {steering < 0 && (
              <div
                className="h-full bg-gradient-to-l from-cyan-400 to-cyan-600 rounded-l-full transition-all duration-75"
                style={{ width: `${Math.abs(steering) * 100}%` }}
              />
            )}
          </div>

          {/* Center Divider & Zero Marker */}
          <div className="w-1 h-full bg-slate-300 z-20 shadow-sm" />

          {/* Right half track */}
          <div className="w-1/2 h-full flex justify-start relative">
            {steering > 0 && (
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-r-full transition-all duration-75"
                style={{ width: `${steering * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
          <span>-100% (L)</span>
          <span>-50%</span>
          <span className="text-slate-300 font-bold">0°</span>
          <span>+50%</span>
          <span>+100% (R)</span>
        </div>
      </div>
    </div>
  );
}
