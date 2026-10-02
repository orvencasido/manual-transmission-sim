'use client';

import React from 'react';
import Link from 'next/link';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { useKeyboardControls } from '@/components/controls/useKeyboardControls';
import { CockpitHeader } from '@/components/dashboard/CockpitHeader';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function SimulatorPage() {
  const { resetSimulation, setGrade, resumeAudio } = useKeyboardControls();
  const { vehicleState, activeFeedback, isPaused, togglePause, isMuted, toggleMute } =
    useSimulatorStore();

  const handleToggleMute = () => {
    resumeAudio();
    toggleMute();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:px-8 w-full max-w-[1800px] mx-auto">
      {/* Modern Cockpit Automotive Header */}
      <CockpitHeader
        title="Manual Driving Trainer"
        subtitle="Free Drive Simulation — Live Powertrain, Dual-Trace Slip Waveform & Dynamics"
        engineStatus={vehicleState.engine.status}
        isPaused={isPaused}
        isMuted={isMuted}
        onTogglePause={togglePause}
        onToggleMute={handleToggleMute}
        onReset={resetSimulation}
        resetLabel="Reset Vehicle"
        backHref="/"
        backLabel="Home"
        showMapLink={true}
      />

      {/* Prominent Real-World Street Map Driving Quick Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/60 border border-cyan-800/40 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-xl shadow-inner">
            🗺️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                Pure 2D Top-Down OpenStreetMap Driving Mode
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                New Feature
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Practice clutch modulation, hill starts, and gear shifting across Tokyo, San Francisco, the Nürburgring, or any street worldwide.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/taxi"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <span>🚖</span>
            <span>Taxi Simulator</span>
          </Link>

          <Link
            href="/map"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <span>Launch Street Map</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Main Simulation 3-Column Ergonomic Cockpit */}
      <main className="flex-1 w-full">
        <Dashboard
          state={vehicleState}
          feedback={activeFeedback}
          onSelectGrade={setGrade}
          showGradientControls={true}
          showCheatsheet={true}
        />
      </main>
      </div>
    </AuthGuard>
  );
}
