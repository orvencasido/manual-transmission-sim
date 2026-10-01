'use client';

import React from 'react';
import { EngineStatus } from '@/lib/simulation/types';

interface StatusClusterProps {
  currentGear: number;
  engineStatus: EngineStatus;
  isStarterEngaged: boolean;
  isLugging: boolean;
  parkingBrake: boolean;
  isRollingBackward: boolean;
  netTorque?: number;
  grade?: number;
  distanceTraveled?: number;
}

export function StatusCluster({
  currentGear,
  engineStatus,
  isStarterEngaged,
  isLugging,
  parkingBrake,
  isRollingBackward,
  netTorque = 0,
  grade = 0,
  distanceTraveled = 0,
}: StatusClusterProps) {
  // Gear display formatted string
  const gearLabel =
    currentGear === -1 ? 'R' : currentGear === 0 ? 'N' : currentGear.toString();

  const gearColorClass =
    currentGear === -1
      ? 'text-rose-500 border-rose-500/50 shadow-rose-950/50'
      : currentGear === 0
      ? 'text-teal-400 border-teal-500/50 shadow-teal-950/50'
      : 'text-cyan-400 border-cyan-500/50 shadow-cyan-950/50';

  const gearText =
    currentGear === -1
      ? 'REVERSE'
      : currentGear === 0
      ? 'NEUTRAL'
      : `GEAR ${currentGear}`;

  // Engine status text and appearance
  const isStalled = engineStatus === 'STALLED';
  const isRunning = engineStatus === 'RUNNING';

  return (
    <div className="flex flex-col items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl select-none w-full max-w-sm">
      {/* Top Header: Warning Tell-Tales Bar */}
      <div className="w-full flex items-center justify-center gap-3 pb-3 border-b border-slate-800/80">
        {/* PARKING BRAKE LAMP (P) */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-150 ${
            parkingBrake
              ? 'bg-rose-950/80 border-rose-500/80 text-rose-400 shadow-md shadow-rose-950/60'
              : 'bg-slate-950/50 border-slate-800/60 text-slate-600'
          }`}
          title="Parking / Handbrake (Toggle with P)"
        >
          {/* Circular (P) Lamp Icon */}
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
              parkingBrake ? 'border-rose-400 animate-pulse' : 'border-slate-600'
            }`}
          >
            P
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase">
            {parkingBrake ? 'PARK BRAKE' : 'BRAKE OFF'}
          </span>
        </div>

        {/* ENGINE STATUS LAMP */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-150 ${
            isStarterEngaged
              ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-md animate-pulse'
              : isStalled
              ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-md animate-bounce'
              : isLugging
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
              : isRunning
              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400'
              : 'bg-slate-950/50 border-slate-800/60 text-slate-600'
          }`}
        >
          {/* Engine Silhouette Icon */}
          <svg
            className="w-4 h-4 fill-current shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M7 4V2H17V4H20V9H22V14H20V19H17V21H15V19H9V21H7V19H4V14H2V9H4V4H7ZM6 6V17H18V6H6ZM8 8H16V10H8V8ZM8 12H16V15H8V12Z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider uppercase">
            {isStarterEngaged
              ? 'CRANKING'
              : isStalled
              ? 'STALLED'
              : isLugging
              ? 'LUGGING'
              : isRunning
              ? 'RUNNING'
              : 'ENGINE OFF'}
          </span>
        </div>
      </div>

      {/* Center: Large Gear Indicator Quadrant */}
      <div className="flex flex-col items-center my-3.5">
        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-widest mb-1.5">
          Transmission Gear
        </div>

        <div
          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950 border-2 flex flex-col items-center justify-center shadow-lg transition-all duration-150 ${gearColorClass}`}
        >
          <span className="text-5xl sm:text-6xl font-mono font-black tracking-tight leading-none">
            {gearLabel}
          </span>
          <span className="text-[9px] font-bold tracking-widest uppercase mt-1 opacity-90">
            {gearText}
          </span>
        </div>

        {/* Miniature H-Pattern Shift Gate Guide */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-mono font-semibold text-slate-500 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800/60">
          <span className={currentGear === 1 ? 'text-cyan-400 font-bold' : ''}>1</span>
          <span>·</span>
          <span className={currentGear === 2 ? 'text-cyan-400 font-bold' : ''}>2</span>
          <span>·</span>
          <span className={currentGear === 3 ? 'text-cyan-400 font-bold' : ''}>3</span>
          <span>·</span>
          <span className={currentGear === 4 ? 'text-cyan-400 font-bold' : ''}>4</span>
          <span>·</span>
          <span className={currentGear === 5 ? 'text-cyan-400 font-bold' : ''}>5</span>
          <span className="text-slate-700">|</span>
          <span className={currentGear === -1 ? 'text-rose-400 font-bold' : ''}>R</span>
        </div>
      </div>

      {/* Dynamic Alert Banner: Rollback Warning or Stall Guidance */}
      <div className="w-full min-h-[46px] flex items-center justify-center">
        {isRollingBackward ? (
          <div className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-200 text-xs font-bold animate-pulse shadow-lg shadow-amber-950/50">
            <span className="text-base">⚠️</span>
            <div>
              <div>ROLLBACK WARNING!</div>
              <div className="text-[9px] font-normal text-amber-300">
                Vehicle rolling downhill — Apply brake or find bite point!
              </div>
            </div>
          </div>
        ) : isStalled ? (
          <div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs font-medium">
            <span>ℹ️</span>
            <div>
              <span className="font-bold text-rose-100">Engine Stalled.</span> Press{' '}
              <kbd className="px-1 py-0.5 bg-rose-900 rounded font-mono text-[10px] text-white">
                Space
              </kbd>{' '}
              + Hold{' '}
              <kbd className="px-1 py-0.5 bg-rose-900 rounded font-mono text-[10px] text-white">
                I
              </kbd>{' '}
              to start.
            </div>
          </div>
        ) : isLugging ? (
          <div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/70 text-amber-200 text-xs font-medium">
            <span>⚠️</span>
            <div>
              <span className="font-bold text-amber-100">Engine Lugging.</span> Downshift gear
              (Q) or apply clutch.
            </div>
          </div>
        ) : (
          <div className="w-full grid grid-cols-2 gap-2 text-center text-[10px] text-slate-400 font-mono bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
            <div>
              <span className="text-slate-500 block uppercase text-[8px]">Distance</span>
              <span className="text-slate-200 font-semibold">
                {distanceTraveled < 1000
                  ? `${distanceTraveled.toFixed(1)} m`
                  : `${(distanceTraveled / 1000).toFixed(2)} km`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[8px]">Incline</span>
              <span className="text-cyan-400 font-semibold">
                {(Math.tan(grade) * 100).toFixed(0)}% Grade
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Live Torque Output */}
      <div className="w-full pt-2.5 mt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Flywheel Torque:</span>
        <span className="font-bold text-slate-200">{netTorque.toFixed(0)} Nm</span>
      </div>
    </div>
  );
}
