'use client';

import Link from 'next/link';
import { useSimulatorStore } from '@/stores/simulatorStore';

export default function SimulatorPage() {
  const { vehicleState, isPaused, togglePause, reset } = useSimulatorStore();
  const { engine, transmission, dynamics, controls } = vehicleState;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manual Driving Trainer</h1>
          <p className="text-xs text-slate-400">Free Drive Mode — Phase 1 Foundation</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={togglePause}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 transition"
          >
            {isPaused ? 'Resume (ESC)' : 'Pause (ESC)'}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-950/60 text-red-300 border border-red-800/40 hover:bg-red-900/60 transition"
          >
            Reset Vehicle
          </button>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto space-y-6">
        {/* Core Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {/* Speed */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Speed</div>
            <div className="text-3xl font-mono font-bold text-white mt-1">
              {dynamics.speedKmh.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase mt-0.5">km/h</div>
          </div>

          {/* RPM */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Tachometer</div>
            <div className="text-3xl font-mono font-bold text-emerald-400 mt-1">
              {engine.rpm.toFixed(0)}
            </div>
            <div className="text-[10px] text-slate-500 uppercase mt-0.5">RPM</div>
          </div>

          {/* Gear */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Gear</div>
            <div className="text-3xl font-mono font-bold text-cyan-400 mt-1">
              {transmission.currentGear === -1
                ? 'R'
                : transmission.currentGear === 0
                ? 'N'
                : transmission.currentGear}
            </div>
            <div className="text-[10px] text-slate-500 uppercase mt-0.5">Transmission</div>
          </div>

          {/* Engine Status */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <div className="text-xs uppercase text-slate-400 tracking-wider">Engine</div>
            <div
              className={`text-xl font-bold mt-2 ${
                engine.status === 'RUNNING'
                  ? 'text-emerald-400'
                  : engine.status === 'STALLED'
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}
            >
              {engine.status}
            </div>
            <div className="text-[10px] text-slate-500 uppercase mt-1">
              {controls.parkingBrake ? 'Handbrake ON' : 'Handbrake OFF'}
            </div>
          </div>
        </div>

        {/* Pedal Travel Gauges (Placeholder Preview) */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 w-full space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Virtual Pedals & Timed Controls (Phase 2 Preview)
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Clutch */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Clutch (Space)</span>
                <span className="font-mono">{(controls.clutch * 100).toFixed(0)}%</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative">
                {/* Bite point marker */}
                <div className="absolute left-[40%] w-[25%] h-full bg-amber-500/20 border-x border-amber-500/40" />
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-75"
                  style={{ width: `${controls.clutch * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-amber-500/80">Bite Zone: 40% - 65%</div>
            </div>

            {/* Brake */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Brake (S)</span>
                <span className="font-mono">{(controls.brake * 100).toFixed(0)}%</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-75"
                  style={{ width: `${controls.brake * 100}%` }}
                />
              </div>
            </div>

            {/* Throttle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Throttle (W)</span>
                <span className="font-mono">{(controls.throttle * 100).toFixed(0)}%</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ width: `${controls.throttle * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls Cheatsheet */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 w-full flex flex-wrap justify-between gap-2">
          <span><strong className="text-slate-200">W:</strong> Throttle</span>
          <span><strong className="text-slate-200">S:</strong> Brake</span>
          <span><strong className="text-slate-200">Space:</strong> Clutch</span>
          <span><strong className="text-slate-200">E/Q:</strong> Shift Up/Down</span>
          <span><strong className="text-slate-200">N:</strong> Neutral</span>
          <span><strong className="text-slate-200">R:</strong> Reverse</span>
          <span><strong className="text-slate-200">P:</strong> Handbrake</span>
        </div>
      </main>
    </div>
  );
}
