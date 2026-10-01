'use client';

import React from 'react';
import Link from 'next/link';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { useKeyboardControls } from '@/components/controls/useKeyboardControls';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function SimulatorPage() {
  const { resetSimulation, setGrade, resumeAudio } = useKeyboardControls();
  const { vehicleState, isPaused, togglePause, isMuted, toggleMute } = useSimulatorStore();
  const { dynamics } = vehicleState;

  // Grade in percentage for UI state matching
  const currentGradePct = Math.round(Math.tan(dynamics.grade) * 100);

  const handleToggleMute = () => {
    resumeAudio();
    toggleMute();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6 max-w-5xl w-full mx-auto">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Manual Driving Trainer</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Free Drive Simulation — Powertrain, Clutch Friction & Dynamics Active
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 ${
              isMuted
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/50 hover:bg-rose-900/40'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            <span>{isMuted ? '🔇 Audio Muted' : '🔊 Audio Active'}</span>
          </button>

          <button
            onClick={togglePause}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition border ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {isPaused ? '▶ Resume (ESC)' : '⏸ Pause (ESC)'}
          </button>

          <button
            onClick={resetSimulation}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 transition"
          >
            Reset Vehicle
          </button>

          <Link
            href="/"
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main Simulation Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto space-y-6">
        {/* Road Grade / Hill Start Environment Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 w-full text-xs shadow-md">
          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="font-semibold text-slate-200">Road Gradient:</span>
            <span className="font-mono text-cyan-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {currentGradePct}% Incline
            </span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              {dynamics.grade === 0 ? '(Level road)' : '(Gravity rollback active on slope)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setGrade(0)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                currentGradePct === 0
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Flat (0%)
            </button>
            <button
              onClick={() => setGrade(6)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                currentGradePct === 6
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Gentle Hill (6%)
            </button>
            <button
              onClick={() => setGrade(12)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                currentGradePct === 12
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Steep Hill (12%)
            </button>
          </div>
        </div>

        {/* Cohesive Automotive Instrument Cluster */}
        <Dashboard state={vehicleState} />

        {/* Controls Cheatsheet */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 w-full shadow-lg">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
            Manual Controls Cheatsheet
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200 font-bold">W</kbd>
              <span className="ml-2 text-slate-300">Throttle</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200 font-bold">S</kbd>
              <span className="ml-2 text-slate-300">Foot Brake</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300 font-bold">Space</kbd>
              <span className="ml-2 text-slate-300">Clutch</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-cyan-300 font-bold">A / D</kbd>
              <span className="ml-2 text-slate-300">Steering</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-200 font-bold">E / Q</kbd>
              <span className="ml-2 text-slate-300">Shift Up / Down</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-teal-300 font-bold">N</kbd>
              <span className="ml-2 text-slate-300">Neutral</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-rose-300 font-bold">R</kbd>
              <span className="ml-2 text-slate-300">Reverse</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-rose-300 font-bold">P</kbd>
              <span className="ml-2 text-slate-300">Handbrake</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300 font-bold">Hold I</kbd>
              <span className="ml-2 text-slate-300">Starter Crank</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300 font-bold">ESC</kbd>
              <span className="ml-2 text-slate-300">Pause</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
