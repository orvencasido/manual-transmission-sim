'use client';

import React from 'react';
import { VehicleState } from '@/lib/simulation/types';

export interface MapHUDProps {
  state: VehicleState;
  stallCount?: number;
  className?: string;
}

export function MapHUD({ state, stallCount = 0, className = '' }: MapHUDProps) {
  const { engine, transmission, dynamics, controls, kinematics } = state;

  const clutchPct = Math.round(controls.clutch * 100);
  const brakePct = Math.round(controls.brake * 100);
  const throttlePct = Math.round(controls.throttle * 100);
  const steeringPct = Math.round(controls.steering * 100);

  const speedKmh = Math.abs(dynamics.speedKmh);
  const rpm = Math.round(engine.rpm);
  const isRedlining = rpm >= 6000;
  const isStalled = engine.status === 'STALLED';
  const isRunning = engine.status === 'RUNNING';

  // Clutch zone calculation (bite point between 40% and 65%)
  const isInBiteZone = controls.clutch >= 0.4 && controls.clutch <= 0.65;

  // Gear label
  let gearLabel = 'N';
  let gearColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
  if (transmission.currentGear === -1) {
    gearLabel = 'R';
    gearColor = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
  } else if (transmission.currentGear > 0) {
    gearLabel = transmission.currentGear.toString();
    gearColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';
  }

  // Engine status styling
  let engineStatusBadge = 'bg-slate-800 text-slate-400 border-slate-700';
  if (isStalled) {
    engineStatusBadge = 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse';
  } else if (engine.status === 'STARTING') {
    engineStatusBadge = 'bg-amber-950/80 text-amber-300 border-amber-500 animate-pulse';
  } else if (isRunning) {
    engineStatusBadge = 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60';
  }

  // Format distance
  const distanceFormatted =
    dynamics.distanceTraveled >= 1000
      ? `${(dynamics.distanceTraveled / 1000).toFixed(2)} km`
      : `${Math.round(dynamics.distanceTraveled)} m`;

  return (
    <div
      className={`w-full max-w-5xl mx-auto bg-slate-950/85 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-3.5 sm:p-5 shadow-2xl select-none transition-all ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* ================= 1. SPEEDOMETER & GEAR ================= */}
        <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-3.5">
          {/* Large Gear Indicator */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Gear
            </span>
            <div
              className={`w-12 h-14 rounded-xl border flex items-center justify-center font-mono font-black text-2xl shadow-inner ${gearColor}`}
            >
              {gearLabel}
            </div>
          </div>

          {/* Speed Value & Meter Bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black font-mono tracking-tight text-white">
                {Math.round(speedKmh)}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono uppercase">
                km/h
              </span>
            </div>

            {/* Speed Bar (0 to 180 km/h) */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, (speedKmh / 160) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>0</span>
              <span>{(speedKmh * 0.621371).toFixed(0)} mph</span>
              <span>160</span>
            </div>
          </div>
        </div>

        {/* ================= 2. TACHOMETER & ENGINE STATUS ================= */}
        <div className="flex flex-col justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning
                    ? 'bg-emerald-400 animate-pulse'
                    : isStalled
                    ? 'bg-rose-500 animate-ping'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Engine RPM
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${engineStatusBadge}`}
            >
              {engine.status}
            </span>
          </div>

          {/* RPM Readout */}
          <div className="flex items-baseline justify-between my-1">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                isRedlining ? 'text-rose-500 animate-pulse' : 'text-slate-100'
              }`}
            >
              {rpm}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 7000</span>
          </div>

          {/* RPM Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isRedlining
                  ? 'bg-rose-500'
                  : rpm >= 4500
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, (rpm / 7000) * 100)}%` }}
            />
          </div>

          {engine.isLugging && (
            <div className="text-[10px] text-amber-400 font-bold tracking-wide mt-1 animate-pulse flex items-center gap-1">
              ⚠️ Engine Lugging — Downshift!
            </div>
          )}
        </div>

        {/* ================= 3. COMPACT VERTICAL PEDALS ================= */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Pedal Cluster</span>
            {isInBiteZone && (
              <span className="text-amber-400 font-bold animate-pulse text-[9px]">
                ⚡ BITE ZONE
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 items-end pt-1">
            {/* Clutch Pedal */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold text-amber-300">Clutch</span>
              <div className="relative w-8 h-16 bg-slate-950 rounded-lg border border-slate-800 p-0.5 flex items-end overflow-hidden my-1">
                {/* Bite Point Highlight Zone [40% to 65%] */}
                <div
                  className="absolute inset-x-0 bg-amber-500/25 border-y border-amber-400/50 pointer-events-none z-10"
                  style={{ bottom: '40%', height: '25%' }}
                  title="Friction Bite Zone (40%-65%)"
                />
                {/* Active Level Bar */}
                <div
                  className={`w-full rounded-sm transition-all duration-75 ${
                    isInBiteZone ? 'bg-amber-400 shadow-lg shadow-amber-500/50' : 'bg-amber-500/80'
                  }`}
                  style={{ height: `${clutchPct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400">
                {clutchPct}%
              </span>
            </div>

            {/* Foot Brake Pedal */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold text-rose-300">Brake</span>
              <div className="w-8 h-16 bg-slate-950 rounded-lg border border-slate-800 p-0.5 flex items-end overflow-hidden my-1">
                <div
                  className="w-full bg-rose-500 rounded-sm transition-all duration-75 shadow-lg shadow-rose-500/30"
                  style={{ height: `${brakePct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-400">
                {brakePct}%
              </span>
            </div>

            {/* Throttle Pedal */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold text-emerald-300">Gas</span>
              <div className="w-8 h-16 bg-slate-950 rounded-lg border border-slate-800 p-0.5 flex items-end overflow-hidden my-1">
                <div
                  className="w-full bg-emerald-500 rounded-sm transition-all duration-75 shadow-lg shadow-emerald-500/30"
                  style={{ height: `${throttlePct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                {throttlePct}%
              </span>
            </div>
          </div>
        </div>

        {/* ================= 4. MINI LIVE TELEMETRY ================= */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between text-xs font-mono">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
            <span>GPS Telemetry</span>
            {controls.parkingBrake && (
              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[9px] font-bold">
                [P] BRAKE
              </span>
            )}
          </div>

          <div className="space-y-1 my-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Coords:</span>
              <span className="text-cyan-400 font-medium">
                {kinematics.latitude.toFixed(4)}°, {kinematics.longitude.toFixed(4)}°
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Heading:</span>
              <span className="text-slate-200">
                {Math.round(kinematics.headingDegrees)}° ({kinematics.headingDegrees < 90 ? 'NE' : kinematics.headingDegrees < 180 ? 'SE' : kinematics.headingDegrees < 270 ? 'SW' : 'NW'})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Distance:</span>
              <span className="text-slate-200">{distanceFormatted}</span>
            </div>

            {kinematics.collision && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Road:</span>
                <span
                  className={`text-[11px] font-semibold truncate max-w-[120px] ${
                    kinematics.collision.curbContact
                      ? 'text-rose-400 animate-pulse font-bold'
                      : 'text-emerald-400'
                  }`}
                  title={kinematics.collision.roadName || 'Free Roam'}
                >
                  {kinematics.collision.roadName || 'Free Roam'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Steering:</span>
              <span className="text-slate-200">
                {steeringPct > 0 ? `+${steeringPct}% R` : steeringPct < 0 ? `${steeringPct}% L` : '0°'}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-sans">Stalls:</span>
            <span
              className={`font-bold ${
                stallCount > 0 ? 'text-rose-400 font-mono' : 'text-slate-400 font-mono'
              }`}
            >
              {stallCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
