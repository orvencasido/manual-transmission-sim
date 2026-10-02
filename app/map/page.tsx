'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { useKeyboardControls } from '@/components/controls/useKeyboardControls';
import { LocationSelector } from '@/components/map/LocationSelector';
import { MapHUD } from '@/components/map/MapHUD';
import { MapSearchBar } from '@/components/map/MapSearchBar';

// Client-only dynamic import of Leaflet MapView to guarantee zero SSR/window errors
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider">Loading OpenStreetMap Canvas...</span>
      </div>
    </div>
  ),
});

interface LocationToast {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function StreetMapDrivingPage() {
  const { resetSimulation, setGrade, resumeAudio, setGeoPosition } = useKeyboardControls();
  const { vehicleState, activeFeedback, isPaused, togglePause, isMuted, toggleMute } =
    useSimulatorStore();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  // Real-time Geolocation Detection states
  const [isLocating, setIsLocating] = useState(false);
  const [showGeoBanner, setShowGeoBanner] = useState(false);
  const [locationToast, setLocationToast] = useState<LocationToast | null>(null);

  // Check on initial visit if real location detection prompt should be presented
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDismissed = sessionStorage.getItem('street_map_geo_prompt_dismissed');
    if (!isDismissed && 'geolocation' in navigator) {
      setShowGeoBanner(true);
    }
  }, []);

  // Auto-dismiss feedback toast after 4 seconds
  useEffect(() => {
    if (!locationToast) return;
    const timer = setTimeout(() => {
      setLocationToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [locationToast]);

  const handleToggleMute = () => {
    resumeAudio();
    toggleMute();
  };

  const handleSelectLocation = (
    lat: number,
    lon: number,
    heading?: number,
    grade?: number
  ) => {
    setGeoPosition(lat, lon, heading);
    if (grade !== undefined) {
      setGrade(grade);
    }
  };

  // Real Location Detection using HTML5 navigator.geolocation
  const handleRequestMyLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationToast({
        type: 'error',
        message: 'HTML5 Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setGeoPosition(latitude, longitude, 0);
        setLocationToast({
          type: 'success',
          message: '📍 Spawned at your current location!',
        });
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to detect your location. Please check browser permissions.';
        if (error.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === 2) {
          msg = 'Location unavailable from device sensors.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationToast({
          type: 'error',
          message: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [setGeoPosition]);

  const handleAcceptGeoPrompt = () => {
    setShowGeoBanner(false);
    sessionStorage.setItem('street_map_geo_prompt_dismissed', 'true');
    handleRequestMyLocation();
  };

  const handleDismissGeoPrompt = () => {
    setShowGeoBanner(false);
    sessionStorage.setItem('street_map_geo_prompt_dismissed', 'true');
  };

  const handleSearchResultSelect = (lat: number, lon: number, displayName: string) => {
    setGeoPosition(lat, lon, 0);
    const shortName = displayName.split(',')[0];
    setLocationToast({
      type: 'success',
      message: `📍 Teleported to ${shortName}! Following car...`,
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* ================= TOP NAVIGATION & QUICK ACTIONS BAR ================= */}
      <header className="absolute top-0 inset-x-0 z-[1100] bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-3 shadow-xl">
        {/* Left: Brand Identity & Back link */}
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
              <span className="text-base">🗺️</span>
              <h1 className="text-xs sm:text-base font-bold text-slate-100 tracking-tight">
                Street Map Driving
              </h1>
              <span className="hidden lg:inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 font-semibold">
                OpenStreetMap 2D
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Location Modal, Controls & Audio Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Real Location Quick Detection Button */}
          <button
            type="button"
            onClick={handleRequestMyLocation}
            disabled={isLocating}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/70 text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-cyan-950/30 disabled:opacity-50"
            title="Spawn vehicle at your real GPS coordinates"
          >
            {isLocating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Locating...</span>
              </>
            ) : (
              <>
                <span>📍</span>
                <span className="hidden sm:inline">My Location</span>
                <span className="sm:hidden">GPS</span>
              </>
            )}
          </button>

          {/* Teleport / Location Preset Selector Button */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition flex items-center gap-1.5 shadow-lg"
          >
            <span>🌐</span>
            <span className="hidden sm:inline">Presets</span>
          </button>

          {/* Controls Cheatsheet Modal Toggle */}
          <button
            type="button"
            onClick={() => setShowControlsHint((prev) => !prev)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1"
            title="Keyboard Driving Controls"
          >
            <span>⌨️</span>
            <span className="hidden md:inline">Keys</span>
          </button>

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
        </div>
      </header>

      {/* ================= FLOATING ON-MAP DIRECT SEARCH BAR ================= */}
      <div className="absolute top-16 left-4 sm:left-6 z-[1050] w-[calc(100%-2rem)] sm:w-96 max-w-md pointer-events-auto">
        <MapSearchBar onSelectLocation={handleSearchResultSelect} />
      </div>

      {/* ================= GEOLOCATION FIRST-VISIT ONBOARDING PROMPT BANNER ================= */}
      {showGeoBanner && (
        <div className="absolute top-16 right-4 sm:right-6 z-[1060] max-w-sm w-[calc(100%-2rem)] sm:w-auto animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="p-4 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-lg shrink-0">
                📍
              </div>
              <div className="flex-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Start driving at your real location?
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Spawn your manual car outside your door using browser GPS. Coordinates remain local on your device.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleDismissGeoPrompt}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleAcceptGeoPrompt}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-cyan-950/50"
              >
                <span>📍</span>
                <span>Use My Location</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TEMPORARY FEEDBACK NOTIFICATION TOAST ================= */}
      {locationToast && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[1150] max-w-md w-full px-4 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 text-xs font-semibold ${
              locationToast.type === 'error'
                ? 'bg-rose-950/95 text-rose-200 border-rose-600'
                : locationToast.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500'
                : 'bg-cyan-950/95 text-cyan-200 border-cyan-500'
            }`}
          >
            <span className="text-base">
              {locationToast.type === 'error' ? '⚠️' : locationToast.type === 'success' ? '✅' : '📍'}
            </span>
            <span className="flex-1">{locationToast.message}</span>
            <button
              type="button"
              onClick={() => setLocationToast(null)}
              className="pointer-events-auto text-slate-400 hover:text-slate-200 text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ================= MAIN 2D TOP-DOWN LEAFLET CANVAS ================= */}
      <main className="w-full h-full relative z-0">
        <MapView
          latitude={vehicleState.kinematics.latitude}
          longitude={vehicleState.kinematics.longitude}
          headingDegrees={vehicleState.kinematics.headingDegrees}
          speedKmh={vehicleState.dynamics.speedKmh}
          onTeleport={(lat, lon, heading) => setGeoPosition(lat, lon, heading)}
          className="w-full h-full"
        />
      </main>

      {/* ================= ACTIVE INSTRUCTOR FEEDBACK TOAST ================= */}
      {activeFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1040] max-w-lg w-full px-4 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs font-semibold ${
              activeFeedback.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-600'
                : activeFeedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600'
                : 'bg-amber-950/90 text-amber-200 border-amber-600'
            }`}
          >
            <span className="text-base">
              {activeFeedback.type === 'error' ? '⚠️' : activeFeedback.type === 'success' ? '✅' : 'ℹ️'}
            </span>
            <span className="flex-1">{activeFeedback.message}</span>
          </div>
        </div>
      )}

      {/* ================= KEYBOARD DRIVING CONTROLS DRAWER ================= */}
      {showControlsHint && (
        <div className="absolute top-16 right-4 z-[1150] w-80 bg-slate-900/95 border border-slate-800 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Manual Driving Controls
            </h3>
            <button
              type="button"
              onClick={() => setShowControlsHint(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-400">Throttle:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">W / ↑</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-400">Foot Brake:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-rose-400 font-bold">S / ↓</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-400">Clutch Pedal:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold">SPACE</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-400">Steering:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 font-bold">A / D</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-400">Gears:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200 font-bold">0..5, R</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-400">Handbrake:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200 font-bold">P</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-400">Starter Motor:</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200 font-bold">I (hold)</kbd>
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING HUD COLLAPSE TOGGLE ================= */}
      <div className="absolute bottom-2 right-4 z-[1050]">
        <button
          type="button"
          onClick={() => setIsHudCollapsed((prev) => !prev)}
          className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 backdrop-blur-md transition flex items-center gap-1 shadow-lg"
        >
          <span>{isHudCollapsed ? '▲ Show HUD' : '▼ Hide HUD'}</span>
        </button>
      </div>

      {/* ================= FLOATING SEMI-TRANSPARENT BOTTOM HUD ================= */}
      {!isHudCollapsed && (
        <div className="absolute bottom-4 inset-x-4 z-[1000] pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
          <MapHUD state={vehicleState} />
        </div>
      )}

      {/* ================= LOCATION TELEPORT MODAL ================= */}
      <LocationSelector
        currentLat={vehicleState.kinematics.latitude}
        currentLon={vehicleState.kinematics.longitude}
        onSelectLocation={handleSelectLocation}
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onMyLocationSuccess={(_lat, _lon) => {
          setLocationToast({
            type: 'success',
            message: '📍 Spawned at your current location!',
          });
        }}
        onMyLocationError={(err) => {
          setLocationToast({
            type: 'error',
            message: err,
          });
        }}
      />
    </div>
  );
}
