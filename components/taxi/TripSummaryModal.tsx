'use client';

import React from 'react';
import { useTaxiStore } from '@/stores/taxiStore';

export interface TripSummaryModalProps {
  onAcceptNext: () => void;
  onEndShift?: () => void;
}

export function TripSummaryModal({ onAcceptNext, onEndShift }: TripSummaryModalProps) {
  const { currentMission, missionPhase, fareMeter, currentComfort, shiftStats } =
    useTaxiStore();

  if (missionPhase !== 'completed' || !currentMission) {
    return null;
  }

  const { passenger, pickupPOI, dropoffPOI } = currentMission;
  const fare = currentMission.fareBreakdown || fareMeter;

  const durationMin = Math.round((currentMission.elapsedSeconds / 60) * 10) / 10;
  const distanceKm = Math.round(currentMission.estimatedDistanceKm * 10) / 10;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden select-none">
        {/* Receipt Header Strip */}
        <div className="bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 p-1" />

        <div className="p-6 space-y-5">
          {/* Header Title & Passenger Avatar */}
          <div className="text-center space-y-1.5">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {passenger.avatar}
            </div>
            <h2 className="text-xl font-extrabold text-slate-100">
              Trip Completed!
            </h2>
            <p className="text-xs text-slate-400">
              {passenger.name} reached their destination safely
            </p>
          </div>

          {/* Route POI Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">From:</span>
              <span className="font-semibold text-slate-200">{pickupPOI.name} ({pickupPOI.city})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">To:</span>
              <span className="font-semibold text-cyan-300">{dropoffPOI.name} ({dropoffPOI.city})</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>{distanceKm} km traveled</span>
              <span>{durationMin} mins driving</span>
            </div>
          </div>

          {/* Itemized Fare Receipt */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Base Flag-down:</span>
              <span className="text-slate-200">₱ {fare.baseFare.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Distance Fare:</span>
              <span className="text-slate-200">₱ {fare.distanceFare.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Time Fare:</span>
              <span className="text-slate-200">₱ {fare.timeFare.toFixed(2)}</span>
            </div>
            {fare.tip > 0 && (
              <div className="flex items-center justify-between text-emerald-400 font-semibold">
                <span>Passenger Tip ({currentComfort}% Comfort):</span>
                <span>+ ₱ {fare.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-base font-bold text-amber-400">
              <span>TOTAL PAYOUT:</span>
              <span className="text-lg">₱ {fare.totalFare.toFixed(2)}</span>
            </div>
          </div>

          {/* Shift Running Total */}
          <div className="flex items-center justify-between text-xs px-2 text-slate-400 font-mono">
            <span>Shift Total: ₱{shiftStats.totalEarnings.toFixed(2)}</span>
            <span>Trips: {shiftStats.completedTrips} done</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onAcceptNext}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2"
            >
              <span>Accept Next Fare</span>
              <span className="font-mono">→</span>
            </button>

            {onEndShift && (
              <button
                type="button"
                onClick={onEndShift}
                className="w-full py-2 px-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs transition"
              >
                Clock Out & Save Shift
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
