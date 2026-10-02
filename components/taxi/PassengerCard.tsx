'use client';

import React from 'react';
import { useTaxiStore } from '@/stores/taxiStore';

export interface PassengerCardProps {
  className?: string;
}

export function PassengerCard({ className = '' }: PassengerCardProps) {
  const {
    currentMission,
    missionPhase,
    currentComfort,
    remainingPatienceSeconds,
    dialogueMessage,
    isTargetZoneReached,
    boardingTimer,
  } = useTaxiStore();

  if (!currentMission) {
    return (
      <div
        className={`p-4 rounded-3xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-2xl flex items-center gap-3 text-slate-400 select-none ${className}`}
      >
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl animate-pulse">
          📡
        </div>
        <div>
          <div className="text-xs font-bold text-slate-200">Searching for Fares...</div>
          <div className="text-[11px] text-slate-500 font-mono">
            Cruising Lucena &bull; Tayabas Road Network
          </div>
        </div>
      </div>
    );
  }

  const { passenger, pickupPOI, dropoffPOI } = currentMission;
  const maxPatience = passenger.maxPatienceSeconds || 120;
  const patiencePercent = Math.min(100, Math.max(0, (remainingPatienceSeconds / maxPatience) * 100));

  // Comfort color
  let comfortColor = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
  let comfortText = 'text-emerald-400';
  if (currentComfort < 40) {
    comfortColor = 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
    comfortText = 'text-rose-400 animate-pulse';
  } else if (currentComfort < 70) {
    comfortColor = 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    comfortText = 'text-amber-400';
  }

  return (
    <div
      className={`p-4 rounded-3xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-3.5 select-none relative ${className}`}
    >
      {/* Passenger Profile & Status Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
            {passenger.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-100">
                {passenger.name}
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {passenger.archetype}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span>{missionPhase === 'dispatched' ? 'Pickup at:' : 'Destination:'}</span>
              <span className="text-cyan-300 font-semibold truncate max-w-[160px]">
                {missionPhase === 'dispatched' ? pickupPOI.name : dropoffPOI.name}
              </span>
            </div>
          </div>
        </div>

        {/* City Badge */}
        <div className="text-right">
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-slate-900 text-cyan-400 border-slate-800">
            {missionPhase === 'dispatched' ? pickupPOI.city : dropoffPOI.city}
          </span>
        </div>
      </div>

      {/* Target Zone Stop Condition Banner */}
      {isTargetZoneReached && (missionPhase === 'dispatched' || missionPhase === 'in_transit') && (
        <div className="p-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/70 text-amber-200 text-xs font-semibold flex items-center gap-2 animate-bounce shadow-lg shadow-amber-950/50">
          <span className="text-base">🛑</span>
          <div>
            <div className="font-bold text-amber-300 uppercase tracking-wide text-[11px]">
              Target Zone Reached!
            </div>
            <div className="text-[10px] text-amber-100 font-mono">
              Full stop (|v| &lt; 0.4 km/h) &bull; Shift to Neutral (N) or hold Clutch &bull; Handbrake (P)
            </div>
          </div>
        </div>
      )}

      {/* Boarding / Deboarding Timer Action Banner */}
      {(missionPhase === 'boarding' || missionPhase === 'deboarding') && (
        <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span>🚪</span>
            <span>{missionPhase === 'boarding' ? 'Passenger Boarding...' : 'Passenger Deboarding...'}</span>
          </div>
          <span className="font-mono text-cyan-300 font-bold">
            {boardingTimer.toFixed(1)}s
          </span>
        </div>
      )}

      {/* Real-time Comfort Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Passenger Comfort (Clutch & Shifting)
          </span>
          <span className={`font-mono text-xs font-bold ${comfortText}`}>
            {currentComfort}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className={`h-full transition-all duration-300 ${comfortColor}`}
            style={{ width: `${currentComfort}%` }}
          />
        </div>
      </div>

      {/* Patience Countdown Bar */}
      {missionPhase === 'in_transit' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Patience Timer
            </span>
            <span
              className={`font-mono text-xs font-bold ${
                remainingPatienceSeconds < 25 ? 'text-rose-400 animate-pulse' : 'text-slate-300'
              }`}
            >
              {Math.ceil(remainingPatienceSeconds)}s
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
            <div
              className={`h-full transition-all duration-300 ${
                remainingPatienceSeconds < 25 ? 'bg-rose-500' : 'bg-cyan-400'
              }`}
              style={{ width: `${patiencePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Real-Time Speech Bubble Subtitle */}
      {dialogueMessage && (
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-xs shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1">
            <span>{dialogueMessage.avatar}</span>
            <span>{dialogueMessage.speaker}:</span>
          </div>
          <div className="text-slate-200 italic font-medium leading-relaxed">
            &ldquo;{dialogueMessage.text}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
