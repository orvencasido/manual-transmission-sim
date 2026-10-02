'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthProfilePill } from '@/components/auth/AuthProfilePill';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { useKeyboardControls } from '@/components/controls/useKeyboardControls';
import { useTaxiStore } from '@/stores/taxiStore';
import { TaxiMeterHUD } from '@/components/taxi/TaxiMeterHUD';
import { PassengerCard } from '@/components/taxi/PassengerCard';
import { WaypointCompass } from '@/components/taxi/WaypointCompass';
import { TripSummaryModal } from '@/components/taxi/TripSummaryModal';
import { MapHUD } from '@/components/map/MapHUD';

// Client-only dynamic import of Leaflet MapView to guarantee zero SSR errors
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider">Loading Taxi Corridor Map...</span>
      </div>
    </div>
  ),
});

function TaxiModeContent() {
  const { resetSimulation, resumeAudio, setGeoPosition } = useKeyboardControls();
  const { vehicleState, isPaused, togglePause, isMuted, toggleMute } = useSimulatorStore();

  const {
    isShiftActive,
    shiftStats,
    startShift,
    endShift,
    tick,
    acceptNextFare,
    missionPhase,
  } = useTaxiStore();

  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [shiftDurationSeconds, setShiftDurationSeconds] = useState(0);

  const lastTickTimeRef = useRef<number>(Date.now());
  const animFrameRef = useRef<number | null>(null);

  // Initialize Shift on mount
  useEffect(() => {
    const lat = vehicleState.kinematics.latitude || 13.9355;
    const lon = vehicleState.kinematics.longitude || 121.6145;

    if (!isShiftActive) {
      startShift(lat, lon);
    }
  }, [isShiftActive, startShift, vehicleState.kinematics.latitude, vehicleState.kinematics.longitude]);

  // Track active shift timer
  useEffect(() => {
    if (!isShiftActive || isPaused) return;

    const timer = setInterval(() => {
      setShiftDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isShiftActive, isPaused]);

  // Main high-frequency evaluation loop for taxi meter and passenger comfort
  useEffect(() => {
    lastTickTimeRef.current = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.1, (now - lastTickTimeRef.current) / 1000);
      lastTickTimeRef.current = now;

      if (!isPaused && isShiftActive) {
        const curLat = vehicleState.kinematics.latitude;
        const curLon = vehicleState.kinematics.longitude;
        const curbContact = vehicleState.collision?.isColliding;

        tick(vehicleState, dt, curLat, curLon, curbContact);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPaused, isShiftActive, vehicleState, tick]);

  const handleToggleMute = () => {
    resumeAudio();
    toggleMute();
  };

  const handleAcceptNextFare = () => {
    acceptNextFare(vehicleState.kinematics.latitude, vehicleState.kinematics.longitude);
  };

  const shiftMinutes = Math.floor(shiftDurationSeconds / 60);
  const shiftSeconds = shiftDurationSeconds % 60;
  const formattedShiftTime = `${String(shiftMinutes).padStart(2, '0')}:${String(
    shiftSeconds
  ).padStart(2, '0')}`;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* ================= TOP NAVIGATION & QUICK ACTIONS BAR ================= */}
      <header className="relative z-[1000] flex items-center justify-between px-3 sm:px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md shadow-2xl">
        {/* Left: Brand & Return Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/simulator"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
            title="Return to Cockpit Simulator"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden md:inline">Cockpit Simulator</span>
          </Link>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg">🚖</span>
              <h1 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
                Taxi Simulator
              </h1>
              <span className="hidden lg:inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-amber-800/60 bg-amber-950/40 text-amber-300 font-semibold">
                Lucena &bull; Tayabas Corridor
              </span>
            </div>
          </div>
        </div>

        {/* Center: Shift Earnings & Live Shift Timer */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Shift Earnings Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <span className="text-xs">💰</span>
            <div className="text-right">
              <span className="hidden sm:inline text-[9px] font-mono uppercase text-amber-400/80 mr-1.5">
                Shift Earnings:
              </span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-300">
                ₱{shiftStats.totalEarnings.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Shift Stopwatch */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
            <span className="text-cyan-400">⏱</span>
            <span className="text-slate-400 text-[10px] uppercase font-sans">Shift:</span>
            <span className="text-cyan-300 font-bold">{formattedShiftTime}</span>
          </div>

          {/* Completed Trips Badge */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
            <span>✅</span>
            <span>{shiftStats.completedTrips} Trips</span>
          </div>
        </div>

        {/* Right: Controls, Audio & Profile Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio Engine Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl transition border flex items-center gap-1 ${
              isMuted
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/50 hover:bg-rose-900/50'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50'
            }`}
            title={isMuted ? 'Unmute Audio Engine' : 'Mute Audio Engine'}
          >
            <span>{isMuted ? '🔇 Muted' : '🔊 Audio'}</span>
          </button>

          {/* Pause Toggle */}
          <button
            type="button"
            onClick={togglePause}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl transition border flex items-center gap-1.5 ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Pause / Resume Simulation [ESC]"
          >
            <span>{isPaused ? '▶ Resume' : '⏸ Pause'}</span>
          </button>

          {/* Reset Vehicle */}
          <button
            type="button"
            onClick={resetSimulation}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-950/50 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 transition flex items-center gap-1"
            title="Reset Vehicle to Spawn Position"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* User Auth Profile Pill */}
          <AuthProfilePill />
        </div>
      </header>

      {/* ================= MAIN 2D TOP-DOWN LEAFLET CANVAS ================= */}
      <main className="w-full h-full relative z-0">
        <MapView
          latitude={vehicleState.kinematics.latitude}
          longitude={vehicleState.kinematics.longitude}
          headingDegrees={vehicleState.kinematics.headingDegrees}
          speedKmh={vehicleState.dynamics.speedKmh}
          onTeleport={(lat, lon, heading) => setGeoPosition(lat, lon, heading)}
          boundaryMode="soft"
          collision={vehicleState.collision}
        />
      </main>

      {/* ================= FLOATING PASSENGER CARD (TOP-LEFT) ================= */}
      <div className="absolute top-16 left-4 sm:left-6 z-[1050] w-[calc(100%-2rem)] sm:w-80 pointer-events-auto">
        <PassengerCard />
      </div>

      {/* ================= FLOATING GPS WAYPOINT COMPASS (TOP-CENTER) ================= */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1040] pointer-events-auto hidden md:block">
        <WaypointCompass
          currentLat={vehicleState.kinematics.latitude}
          currentLon={vehicleState.kinematics.longitude}
          headingDegrees={vehicleState.kinematics.headingDegrees}
        />
      </div>

      {/* ================= FLOATING TAXIMETER HUD (TOP-RIGHT) ================= */}
      <div className="absolute top-16 right-4 sm:right-6 z-[1050] w-[calc(100%-2rem)] sm:w-72 pointer-events-auto">
        <TaxiMeterHUD />
      </div>

      {/* ================= FLOATING BOTTOM TELEMETRY HUD ================= */}
      <div className="absolute bottom-4 inset-x-0 z-[1050] px-4 pointer-events-none flex flex-col items-center gap-2">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsHudCollapsed((prev) => !prev)}
            className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-white transition shadow-lg backdrop-blur-md mb-1"
          >
            {isHudCollapsed ? '▲ Show Instrument Gauges' : '▼ Collapse Gauges'}
          </button>
        </div>

        {!isHudCollapsed && (
          <div className="pointer-events-auto w-full max-w-5xl">
            <MapHUD
              state={vehicleState}
              stallCount={shiftStats.stallsCount}
            />
          </div>
        )}
      </div>

      {/* ================= TRIP SUMMARY & PAYOUT MODAL ================= */}
      {missionPhase === 'completed' && (
        <TripSummaryModal
          onAcceptNext={handleAcceptNextFare}
          onEndShift={endShift}
        />
      )}
    </div>
  );
}

export default function TaxiSimulatorPage() {
  return (
    <AuthGuard>
      <TaxiModeContent />
    </AuthGuard>
  );
}
