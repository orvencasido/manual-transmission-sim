'use client';

import React, { useEffect, useRef } from 'react';
import { RoadGradientSelector } from './RoadGradientSelector';
import { ControlsCheatsheet } from './ControlsCheatsheet';

export interface ClutchSlipGraphProps {
  rpm: number;
  inputShaftRpm: number;
  clutchEngagement: number; // 0.0 (open/slip) to 1.0 (fully clamped)
  clutchPedal?: number; // 0.0 (released) to 1.0 (depressed)
  isLocked: boolean;
  currentGrade?: number;
  onSelectGrade?: (pct: number) => void;
  showGradientControls?: boolean;
  showCheatsheet?: boolean;
  className?: string;
}

const MAX_SAMPLES = 240; // 4 seconds at 60 FPS
const MAX_RPM = 8000;

export function ClutchSlipGraph({
  rpm,
  inputShaftRpm,
  clutchEngagement,
  clutchPedal = 0,
  isLocked,
  currentGrade = 0,
  onSelectGrade,
  showGradientControls = true,
  showCheatsheet = true,
  className = '',
}: ClutchSlipGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<{ flywheel: number; inputShaft: number }[]>([]);
  const latestDataRef = useRef({ rpm, inputShaftRpm });

  // Update latest values continuously without restarting render loops
  useEffect(() => {
    latestDataRef.current = { rpm, inputShaftRpm };
  }, [rpm, inputShaftRpm]);

  // 60 FPS Canvas rendering loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      // 1. Push latest sample into rolling buffer
      const hist = historyRef.current;
      hist.push({
        flywheel: latestDataRef.current.rpm,
        inputShaft: latestDataRef.current.inputShaftRpm,
      });
      if (hist.length > MAX_SAMPLES) {
        hist.shift();
      }

      // 2. Draw to Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear background
          ctx.fillStyle = '#020617'; // slate-950
          ctx.fillRect(0, 0, width, height);

          // Grid lines & labels
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)'; // slate-700
          ctx.font = '9px monospace';
          ctx.fillStyle = '#64748b'; // slate-500

          const rpmSteps = [2000, 4000, 6000, 8000];
          rpmSteps.forEach((step) => {
            const y = height - (step / MAX_RPM) * (height - 16) - 8;
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.moveTo(30, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.fillText(`${step / 1000}k`, 6, y + 3);
          });
          ctx.setLineDash([]); // Reset line dash

          // Draw Input Shaft RPM (Cyan trace)
          if (hist.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#06b6d4'; // cyan-500
            ctx.lineWidth = 2;
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 4;

            for (let i = 0; i < hist.length; i++) {
              const x = (i / (MAX_SAMPLES - 1)) * (width - 36) + 32;
              const clampedVal = Math.min(MAX_RPM, Math.max(0, hist[i].inputShaft));
              const y = height - (clampedVal / MAX_RPM) * (height - 16) - 8;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Draw Flywheel RPM (Amber trace)
            ctx.beginPath();
            ctx.strokeStyle = '#f59e0b'; // amber-500
            ctx.lineWidth = 2;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 4;

            for (let i = 0; i < hist.length; i++) {
              const x = (i / (MAX_SAMPLES - 1)) * (width - 36) + 32;
              const clampedVal = Math.min(MAX_RPM, Math.max(0, hist[i].flywheel));
              const y = height - (clampedVal / MAX_RPM) * (height - 16) - 8;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Reset shadow
            ctx.shadowBlur = 0;
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const deltaRpm = Math.round(Math.abs(rpm - inputShaftRpm));
  const isSynchronized = isLocked || (deltaRpm <= 50 && rpm > 500);
  const clampPct = Math.round(clutchEngagement * 100);

  return (
    <div className={`flex flex-col gap-4 w-full select-none ${className}`}>
      {/* Real-time Dual Trace RPM & Clutch Slip Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Clutch Slip & RPM Sync
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            4-Second Window
          </span>
        </div>

        {/* Sync Status Badge & Trace Legend */}
        <div className="flex items-center justify-between mb-2">
          {/* Traces Legend */}
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              <span className="text-amber-400">Flywheel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              <span className="text-cyan-400">Input Shaft</span>
            </div>
          </div>

          {/* Sync status pill */}
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
              isSynchronized
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : deltaRpm < 400
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {isSynchronized
              ? '✔ SYNCHRONIZED'
              : `Δ ${deltaRpm} RPM`}
          </div>
        </div>

        {/* HTML5 Canvas Waveform Container */}
        <div className="relative w-full h-36 bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={340}
            height={144}
            className="w-full h-full block"
          />
        </div>

        {/* Hermite Clutch Clamping Force Bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-mono uppercase text-slate-400">
              Clutch Clamping Force (Hermite Curve)
            </span>
            <span className="font-mono text-xs font-bold text-amber-400">
              {clampPct}% Clamped
            </span>
          </div>

          {/* Dual Bar: Outer track with bite zone bracket */}
          <div className="relative w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            {/* Clamping fill */}
            <div
              className={`h-full transition-all duration-75 ${
                isLocked
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                  : clampPct > 0
                  ? 'bg-gradient-to-r from-amber-500 to-cyan-500'
                  : 'bg-slate-800'
              }`}
              style={{ width: `${clampPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>0% (Open)</span>
            <span className="text-amber-400/90 font-semibold">Friction Bite Zone (40%-65%)</span>
            <span>100% (Clamped)</span>
          </div>
        </div>
      </div>

      {/* Road Gradient Quick Selector (if enabled and callback provided) */}
      {showGradientControls && onSelectGrade && (
        <RoadGradientSelector
          currentGrade={currentGrade}
          onSelectGrade={onSelectGrade}
        />
      )}

      {/* Keyboard Controls Cheatsheet (if enabled) */}
      {showCheatsheet && <ControlsCheatsheet compact />}
    </div>
  );
}
