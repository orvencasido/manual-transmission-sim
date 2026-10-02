'use client';

import React from 'react';
import { VehicleState } from '@/lib/simulation/types';

export interface DrivelineFlowProps {
  vehicleState: VehicleState;
  className?: string;
}

export function DrivelineFlow({ vehicleState, className = '' }: DrivelineFlowProps) {
  const { engine, clutch, transmission, dynamics } = vehicleState;

  // Clutch coupling badge
  let clutchStatusText = 'DISENGAGED';
  let clutchBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
  let flowLineClass = 'border-slate-800 text-slate-600';

  if (clutch.isLocked) {
    clutchStatusText = 'LOCKED (100%)';
    clutchBadgeClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    flowLineClass = 'border-emerald-500/60 text-emerald-400';
  } else if (clutch.engagement > 0.05) {
    clutchStatusText = `SLIPPING (${Math.round(clutch.engagement * 100)}%)`;
    clutchBadgeClass = 'bg-amber-950/70 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    flowLineClass = 'border-amber-500/60 text-amber-400';
  }

  // Gear label
  const gearLabel =
    transmission.currentGear === -1
      ? 'R'
      : transmission.currentGear === 0
      ? 'N'
      : `G${transmission.currentGear}`;

  // Delta RPM
  const deltaRpm = Math.round(Math.abs(engine.rpm - transmission.inputShaftRpm));

  return (
    <div className={`p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Driveline Torque Flow
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          Engine ➔ Wheels
        </span>
      </div>

      {/* Sequential Flow Nodes */}
      <div className="flex flex-col gap-2.5">
        {/* Node 1: Engine Flywheel */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs font-mono">
              Te
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300">Engine Flywheel</div>
              <div className="text-[10px] font-mono text-slate-400">
                {Math.round(engine.rpm)} RPM
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-amber-400">
              {engine.netTorque >= 0 ? `+${Math.round(engine.netTorque)}` : Math.round(engine.netTorque)} <span className="text-[10px] font-normal text-slate-400">Nm</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">Flywheel Torque</div>
          </div>
        </div>

        {/* Transfer Indicator 1 */}
        <div className={`flex items-center justify-center py-0.5 text-xs transition-colors ${flowLineClass}`}>
          <span className="text-[11px] font-mono">▼</span>
        </div>

        {/* Node 2: Clutch Disc */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs font-mono">
              Cl
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300">Clutch Disc</div>
              <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border mt-0.5 ${clutchBadgeClass}`}>
                {clutchStatusText}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-cyan-400">
              {Math.round(clutch.slipTorque)} <span className="text-[10px] font-normal text-slate-400">Nm</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Δ {deltaRpm} RPM
            </div>
          </div>
        </div>

        {/* Transfer Indicator 2 */}
        <div className={`flex items-center justify-center py-0.5 text-xs transition-colors ${flowLineClass}`}>
          <span className="text-[11px] font-mono">▼</span>
        </div>

        {/* Node 3: Transmission Gearbox */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-xs font-mono">
              {gearLabel}
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300">Gearbox Ratio</div>
              <div className="text-[10px] font-mono text-slate-400">
                ig: {transmission.gearRatio > 0 ? `${transmission.gearRatio.toFixed(2)}x` : '0.00x'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-teal-300">
              {Math.round(transmission.inputShaftRpm)} <span className="text-[10px] font-normal text-slate-400">RPM</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">Input Shaft</div>
          </div>
        </div>

        {/* Transfer Indicator 3 */}
        <div className={`flex items-center justify-center py-0.5 text-xs transition-colors ${flowLineClass}`}>
          <span className="text-[11px] font-mono">▼</span>
        </div>

        {/* Node 4: Driven Wheels */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs font-mono">
              Tw
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-300">Driven Wheels</div>
              <div className="text-[10px] font-mono text-slate-400">
                {dynamics.speedKmh.toFixed(1)} km/h
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-indigo-300">
              {Math.round(transmission.wheelTorque)} <span className="text-[10px] font-normal text-slate-400">Nm</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">Tractive Torque</div>
          </div>
        </div>
      </div>
    </div>
  );
}
