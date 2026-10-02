'use client';

import React from 'react';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { useKeyboardControls } from '@/components/controls/useKeyboardControls';
import { CockpitHeader } from '@/components/dashboard/CockpitHeader';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function SimulatorPage() {
  const { resetSimulation, setGrade, resumeAudio } = useKeyboardControls();
  const { vehicleState, activeFeedback, isPaused, togglePause, isMuted, toggleMute } =
    useSimulatorStore();

  const handleToggleMute = () => {
    resumeAudio();
    toggleMute();
  };

  return (
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
      />

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
  );
}
