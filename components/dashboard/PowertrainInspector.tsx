'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VehicleState } from '@/lib/simulation/types';
import { DrivelineFlow } from './DrivelineFlow';

export interface PowertrainInspectorProps {
  vehicleState: VehicleState;
  extraContent?: React.ReactNode;
  className?: string;
}

export function PowertrainInspector({
  vehicleState,
  extraContent,
  className = '',
}: PowertrainInspectorProps) {
  const { engine, clutch, dynamics, controls } = vehicleState;

  // Track Peak Speed and Stalls for trip stats
  const [peakSpeed, setPeakSpeed] = useState(0);
  const [stalls, setStalls] = useState(0);
  const [smoothStarts, setSmoothStarts] = useState(0);

  const prevEngineStatusRef = useRef(engine.status);
  const wasStationaryRef = useRef(true);

  useEffect(() => {
    if (dynamics.speedKmh > peakSpeed) {
      setPeakSpeed(Math.round(dynamics.speedKmh * 10) / 10);
    }
  }, [dynamics.speedKmh, peakSpeed]);

  useEffect(() => {
    if (engine.status === 'STALLED' && prevEngineStatusRef.current !== 'STALLED') {
      setStalls((s) => s + 1);
    }
    prevEngineStatusRef.current = engine.status;

    if (dynamics.speedKmh < 0.5) {
      wasStationaryRef.current = true;
    } else if (
      wasStationaryRef.current &&
      dynamics.speedKmh > 5 &&
      clutch.isLocked &&
      engine.status === 'RUNNING'
    ) {
      wasStationaryRef.current = false;
      setSmoothStarts((s) => s + 1);
    }
  }, [engine.status, dynamics.speedKmh, clutch.isLocked]);

  // Road grade calculations (presentation only)
  const gradeDeg = (dynamics.grade * 180) / Math.PI;
  const gradePct = Math.round(Math.tan(dynamics.grade) * 100);
  const rollbackForceN = Math.round(1200 * 9.81 * Math.sin(dynamics.grade));

  // Engine load calculation (0-100% of rated 175 Nm peak)
  const engineLoadPct = Math.min(100, Math.max(0, Math.round((Math.abs(engine.netTorque) / 175) * 100)));

  // Distance formatting
  const formattedDistance =
    dynamics.distanceTraveled < 1000
      ? `${dynamics.distanceTraveled.toFixed(1)} m`
      : `${(dynamics.distanceTraveled / 1000).toFixed(2)} km`;

  // Rollback hazard alert conditions
  const isStoppedOnIncline =
    gradePct > 1 &&
    Math.abs(dynamics.speedKmh) < 0.5 &&
    controls.brake < 0.1 &&
    !controls.parkingBrake &&
    clutch.engagement < 0.4;

  return (
    <div className={`flex flex-col gap-4 w-full select-none ${className}`}>
      {/* Optional Top Slot: e.g. Lesson Criteria Checklist in guided mode */}
      {extraContent && (
        <div className="w-full">
          {extraContent}
        </div>
      )}

      {/* Card 1: Driveline Torque Flow */}
      <DrivelineFlow vehicleState={vehicleState} />

      {/* Card 2: Pitch & Incline Attitude Graphic */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Pitch & Incline Attitude
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {gradePct > 0 ? `+${gradePct}%` : `${gradePct}%`} Grade
          </span>
        </div>

        {/* Chassis Attitude Tilt Visual */}
        <div className="h-24 bg-slate-900/90 rounded-xl border border-slate-800/70 relative overflow-hidden flex items-center justify-center">
          {/* Horizon grid line */}
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-700/40 pointer-events-none" />

          {/* Road Surface and Chassis Silhouette tilting dynamically */}
          <div
            className="w-48 h-12 relative flex items-center justify-center transition-transform duration-200 ease-out"
            style={{ transform: `rotate(${-gradeDeg}deg)` }}
          >
            {/* Road Plane Line */}
            <div className="absolute bottom-2 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent" />

            {/* Vehicle Chassis Silhouette SVG */}
            <svg
              className="w-24 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              viewBox="0 0 100 35"
              fill="currentColor"
            >
              {/* Car Body Profile */}
              <path d="M 5 22 L 20 22 L 28 10 L 68 10 L 78 22 L 95 22 Q 98 22 98 25 L 98 27 L 2 27 L 2 25 Q 2 22 5 22 Z" opacity="0.9" />
              {/* Cabin Windows */}
              <path d="M 31 12 L 48 12 L 48 20 L 26 20 Z" fill="#0f172a" />
              <path d="M 52 12 L 66 12 L 74 20 L 52 20 Z" fill="#0f172a" />
              {/* Wheels */}
              <circle cx="22" cy="27" r="5" fill="#334155" stroke="#06b6d4" strokeWidth="1.5" />
              <circle cx="78" cy="27" r="5" fill="#334155" stroke="#06b6d4" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Attitude Readout Pill */}
          <div className="absolute bottom-1.5 right-2 font-mono text-[10px] text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
            θ = {gradeDeg.toFixed(1)}°
          </div>
        </div>

        {/* Gravity Rollback Force & Warnings */}
        <div className="mt-2.5 space-y-1.5">
          {dynamics.isRollingBackward ? (
            <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs font-bold flex items-center gap-2 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <span>⚠️</span>
              <span>ROLLING BACKWARD ({Math.abs(dynamics.speedKmh).toFixed(1)} km/h)</span>
            </div>
          ) : isStoppedOnIncline ? (
            <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-600/70 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 animate-pulse">
              <span>⚠️</span>
              <span>Rollback Hazard! Apply brake or hold bite point</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 font-mono">
              <span className="text-[11px]">Gravity Resistance:</span>
              <span className={`font-bold ${rollbackForceN > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {rollbackForceN > 0 ? `~${rollbackForceN} N Downward` : '0 N (Level)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Trip Telemetry & Stats */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Trip Telemetry & Stats
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Live Diagnostics</span>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Distance</span>
            <span className="font-mono text-sm font-bold text-slate-100">{formattedDistance}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Peak Speed</span>
            <span className="font-mono text-sm font-bold text-cyan-400">{peakSpeed} km/h</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Engine Stalls</span>
            <span className={`font-mono text-sm font-bold ${stalls > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {stalls}
            </span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-medium">Smooth Starts</span>
            <span className="font-mono text-sm font-bold text-emerald-400">{smoothStarts}</span>
          </div>
        </div>

        {/* Engine Load Meter */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
              Engine Load
            </span>
            <span className="font-mono text-xs font-bold text-slate-200">{engineLoadPct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-150 ${
                engineLoadPct > 80
                  ? 'bg-rose-500'
                  : engineLoadPct > 50
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${engineLoadPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
