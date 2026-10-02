'use client';

import React from 'react';
import { useTaxiStore } from '@/stores/taxiStore';

export interface TaxiMeterHUDProps {
  className?: string;
}

export function TaxiMeterHUD({ className = '' }: TaxiMeterHUDProps) {
  const { fareMeter, missionPhase, tripDistanceKm, currentMission } = useTaxiStore();

  const elapsedSeconds = currentMission?.elapsedSeconds || 0;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let meterStatusText = 'VACANT';
  let meterStatusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

  if (missionPhase === 'dispatched') {
    meterStatusText = 'DISPATCHED';
    meterStatusColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse';
  } else if (missionPhase === 'boarding') {
    meterStatusText = 'BOARDING';
    meterStatusColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
  } else if (missionPhase === 'in_transit') {
    meterStatusText = 'HIRED (RUNNING)';
    meterStatusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  } else if (missionPhase === 'deboarding' || missionPhase === 'completed') {
    meterStatusText = 'PAYING FARE';
    meterStatusColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
  } else if (missionPhase === 'abandoned') {
    meterStatusText = 'TRIP CANCELLED';
    meterStatusColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-3xl bg-slate-950/90 border border-amber-500/30 backdrop-blur-xl shadow-2xl shadow-amber-950/30 select-none ${className}`}
    >
      {/* Top Header / Meter Brand */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-400">
            Digital TaxiMeter
          </span>
        </div>
        <span
          className={`font-mono text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${meterStatusColor}`}
        >
          {meterStatusText}
        </span>
      </div>

      {/* Main Glowing LED Fare Display */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 text-center shadow-inner relative overflow-hidden mb-3">
        <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider">
          Total Fare (PHP)
        </div>
        <div className="font-mono text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          ₱ {fareMeter.totalFare.toFixed(2)}
        </div>
        {fareMeter.tip > 0 && (
          <div className="text-[11px] font-mono text-emerald-400 font-semibold mt-1">
            + ₱{fareMeter.tip.toFixed(2)} Comfort Tip Included
          </div>
        )}
      </div>

      {/* Secondary Metrics: Trip Distance & Elapsed Driving Time */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/80 border border-slate-800 p-2 sm:p-2.5 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Distance</span>
          <span className="font-mono text-sm sm:text-base font-bold text-slate-100">
            {tripDistanceKm.toFixed(2)} <span className="text-xs font-normal text-slate-400">km</span>
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2 sm:p-2.5 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Trip Time</span>
          <span className="font-mono text-sm sm:text-base font-bold text-cyan-300">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Tariff Rate Micro-Legend */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400">
        <span>Flagdown: ₱45.00</span>
        <span>₱13.50/km</span>
        <span>₱2.00/min</span>
      </div>
    </div>
  );
}
