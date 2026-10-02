'use client';

import React from 'react';
import { useTaxiStore } from '@/stores/taxiStore';

export interface WaypointCompassProps {
  currentLat: number;
  currentLon: number;
  headingDegrees: number;
  className?: string;
}

export function WaypointCompass({
  currentLat,
  currentLon,
  headingDegrees,
  className = '',
}: WaypointCompassProps) {
  const { currentMission, missionPhase } = useTaxiStore();

  if (!currentMission || (missionPhase !== 'dispatched' && missionPhase !== 'in_transit')) {
    return null;
  }

  const isPickup = missionPhase === 'dispatched';
  const targetPOI = isPickup ? currentMission.pickupPOI : currentMission.dropoffPOI;

  // Calculate forward distance in meters
  const METERS_PER_DEGREE_LAT = 111139;
  const METERS_PER_DEGREE_LON =
    111139 * Math.cos(((currentLat + targetPOI.latitude) / 2) * (Math.PI / 180));

  const dy = (targetPOI.latitude - currentLat) * METERS_PER_DEGREE_LAT;
  const dx = (targetPOI.longitude - currentLon) * METERS_PER_DEGREE_LON;
  const distanceMeters = Math.round(Math.sqrt(dx * dx + dy * dy));

  // Calculate bearing to target (0-360 degrees, 0 = North, 90 = East)
  let bearingToTarget = (Math.atan2(dx, dy) * 180) / Math.PI;
  if (bearingToTarget < 0) bearingToTarget += 360;

  // Relative angle to vehicle forward heading
  const relativeAngle = (bearingToTarget - headingDegrees + 360) % 360;

  const formattedDistance =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(2)} km`
      : `${distanceMeters} m`;

  return (
    <div
      className={`px-3.5 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-xl flex items-center gap-3 select-none ${className}`}
    >
      {/* Rotating Arrow Indicator */}
      <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
        <svg
          className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] transition-transform duration-100 ease-out"
          style={{ transform: `rotate(${relativeAngle}deg)` }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2L4 20L12 16L20 20L12 2Z" />
        </svg>
      </div>

      {/* Target Landmark & Distance Display */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>{isPickup ? 'Navigate to Passenger:' : 'Navigate to Drop-Off:'}</span>
        </div>
        <div className="text-xs font-bold text-slate-100 flex items-center gap-2 mt-0.5">
          <span className="truncate max-w-[140px] sm:max-w-[180px]">{targetPOI.name}</span>
          <span className="font-mono text-cyan-300 font-extrabold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 text-[11px]">
            {formattedDistance}
          </span>
        </div>
      </div>
    </div>
  );
}
