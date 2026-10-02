'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { EngineStatus } from '@/lib/simulation/types';

export interface CockpitHeaderProps {
  title?: string;
  subtitle?: string;
  engineStatus?: EngineStatus;
  isPaused: boolean;
  isMuted: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onReset: () => void;
  resetLabel?: string;
  backHref?: string;
  backLabel?: string;
  elapsedSeconds?: number;
  showMapLink?: boolean;
  className?: string;
}

export function CockpitHeader({
  title = 'Manual Driving Trainer',
  subtitle = 'Professional Powertrain Telemetry & Dynamics Active',
  engineStatus = 'RUNNING',
  isPaused,
  isMuted,
  onTogglePause,
  onToggleMute,
  onReset,
  resetLabel = 'Reset Vehicle',
  backHref = '/',
  backLabel = 'Home',
  elapsedSeconds,
  showMapLink = true,
  className = '',
}: CockpitHeaderProps) {
  // If elapsedSeconds is not provided, manage an internal stopwatch
  const [internalSeconds, setInternalSeconds] = useState(0);

  useEffect(() => {
    if (elapsedSeconds !== undefined) return;
    if (isPaused) return;

    const timer = setInterval(() => {
      setInternalSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, elapsedSeconds]);

  const handleResetClick = () => {
    setInternalSeconds(0);
    onReset();
  };

  const totalSecs = elapsedSeconds !== undefined ? Math.floor(elapsedSeconds) : internalSeconds;
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Engine status indicator styling
  let statusDotColor = 'bg-slate-500';
  let statusText = 'ENGINE OFF';
  if (isPaused) {
    statusDotColor = 'bg-amber-400 animate-pulse';
    statusText = 'PAUSED';
  } else if (engineStatus === 'RUNNING') {
    statusDotColor = 'bg-emerald-500 animate-pulse';
    statusText = 'RUNNING';
  } else if (engineStatus === 'STARTING') {
    statusDotColor = 'bg-amber-500 animate-pulse';
    statusText = 'CRANKING';
  } else if (engineStatus === 'STALLED') {
    statusDotColor = 'bg-rose-500 animate-pulse';
    statusText = 'STALLED';
  }

  return (
    <header
      className={`w-full bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3 sm:px-6 sm:py-3.5 backdrop-blur-md shadow-2xl flex flex-wrap items-center justify-between gap-4 mb-6 ${className}`}
    >
      {/* Left: Brand Identity & Session Mode */}
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition"
            title={`Back to ${backLabel}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDotColor}`} />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
              {title}
            </h1>
            <span className="hidden sm:inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-slate-800 bg-slate-950 text-slate-400 font-semibold">
              {statusText}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Controls & Instrumentation Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Session Stopwatch */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-slate-300">
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Session</span>
          <span className="text-cyan-400 font-bold tracking-wider">{formattedTime}</span>
        </div>

        {/* Prominent Street Map Driving Route Link */}
        {showMapLink && (
          <Link
            href="/map"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/70 hover:border-cyan-700 transition flex items-center gap-1.5 shadow-lg shadow-cyan-950/30"
            title="Switch to 2D Top-Down OpenStreetMap Driving Simulator"
          >
            <span>🗺️</span>
            <span className="hidden md:inline font-bold">Street Map Driving</span>
            <span className="md:hidden">Map</span>
          </Link>
        )}

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition border flex items-center gap-1.5 ${
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
          onClick={onTogglePause}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition border flex items-center gap-1.5 ${
            isPaused
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
              : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
          }`}
          title="Pause / Resume Simulation [ESC]"
        >
          <span>{isPaused ? '▶ Resume' : '⏸ Pause'}</span>
          <kbd className="hidden sm:inline font-mono text-[10px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
            ESC
          </kbd>
        </button>

        {/* Reset Vehicle */}
        <button
          type="button"
          onClick={handleResetClick}
          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-950/50 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 transition flex items-center gap-1"
          title="Reset Simulation State"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{resetLabel}</span>
        </button>

        {/* Navigation Link */}
        {backHref && (
          <Link
            href={backHref}
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-950/80 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
