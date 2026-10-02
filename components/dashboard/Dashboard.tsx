'use client';

import React from 'react';
import { VehicleState, InstructorFeedback } from '@/lib/simulation/types';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { SpeedometerGauge } from './SpeedometerGauge';
import { TachometerGauge } from './TachometerGauge';
import { StatusCluster } from './StatusCluster';
import { PedalCluster } from './PedalCluster';
import { InstructorBanner } from '@/components/instructor/InstructorBanner';
import { PowertrainInspector } from './PowertrainInspector';
import { ClutchSlipGraph } from './ClutchSlipGraph';

export interface DashboardProps {
  state?: VehicleState;
  feedback?: InstructorFeedback | null;
  onSelectGrade?: (pct: number) => void;
  showGradientControls?: boolean;
  showCheatsheet?: boolean;
  leftExtra?: React.ReactNode;
  rightExtra?: React.ReactNode;
  className?: string;
}

/**
 * Center Column: Primary Automotive Instrument Cluster
 * Displays the Instructor HUD Banner, Analog Gauge Binnacle, and Vertical Pedals.
 */
export function CenterInstrumentCluster({
  state,
  feedback,
  className = '',
}: {
  state: VehicleState;
  feedback?: InstructorFeedback | null;
  className?: string;
}) {
  const { engine, transmission, dynamics, controls, clutch } = state;

  return (
    <div className={`flex flex-col gap-5 w-full select-none ${className}`}>
      {/* Real-Time Rule-Based Driving Instructor HUD Banner */}
      <InstructorBanner feedback={feedback} />

      {/* Primary Analog Gauge Binnacle & Center Status Cluster */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center justify-around gap-4 sm:gap-6">
        {/* Speedometer (Left Dial) */}
        <div className="flex-1 flex justify-center">
          <SpeedometerGauge
            speedKmh={dynamics.speedKmh}
            maxSpeed={220}
            isRollingBackward={dynamics.isRollingBackward}
          />
        </div>

        {/* Center Transmission & Status Tell-Tales */}
        <div className="flex-1 flex justify-center w-full">
          <StatusCluster
            currentGear={transmission.currentGear}
            engineStatus={engine.status}
            isStarterEngaged={controls.isStarterEngaged}
            isLugging={engine.isLugging}
            parkingBrake={controls.parkingBrake}
            isRollingBackward={dynamics.isRollingBackward}
            netTorque={engine.netTorque}
            grade={dynamics.grade}
            distanceTraveled={dynamics.distanceTraveled}
          />
        </div>

        {/* Tachometer (Right Dial) */}
        <div className="flex-1 flex justify-center">
          <TachometerGauge
            rpm={engine.rpm}
            redlineRpm={6500}
            maxRpm={8000}
            isLugging={engine.isLugging}
          />
        </div>
      </div>

      {/* Vertical Pedal Cluster & Steering Angle Indicator */}
      <div className="w-full">
        <PedalCluster
          clutch={controls.clutch}
          brake={controls.brake}
          throttle={controls.throttle}
          steering={controls.steering}
          clutchEngagement={clutch.engagement}
        />
      </div>
    </div>
  );
}

/**
 * Pro-Grade 3-Column Cockpit Dashboard
 * - Left (3 cols): PowertrainInspector (Torque flow, pitch attitude, trip stats)
 * - Center (6 cols): CenterInstrumentCluster (Instructor banner, gauges, pedals)
 * - Right (3 cols): ClutchSlipGraph (Dual-trace 60fps graph, clamping bar, gradient, cheatsheet)
 */
export function Dashboard({
  state,
  feedback,
  onSelectGrade,
  showGradientControls = true,
  showCheatsheet = true,
  leftExtra,
  rightExtra,
  className = '',
}: DashboardProps) {
  const storeState = useSimulatorStore((s) => s.vehicleState);
  const vehicleState = state || storeState;

  return (
    <div className={`w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${className}`}>
      {/* Left Column (3 cols): Powertrain & Telemetry Inspector */}
      <div className="lg:col-span-3 w-full order-2 lg:order-1">
        <PowertrainInspector
          vehicleState={vehicleState}
          extraContent={leftExtra}
        />
      </div>

      {/* Center Column (6 cols): Primary Automotive Instrument Cluster */}
      <div className="lg:col-span-6 w-full order-1 lg:order-2">
        <CenterInstrumentCluster
          state={vehicleState}
          feedback={feedback}
        />
      </div>

      {/* Right Column (3 cols): Clutch Slip Graph, Gradient Controls & Cheatsheet */}
      <div className="lg:col-span-3 w-full order-3">
        <ClutchSlipGraph
          rpm={vehicleState.engine.rpm}
          inputShaftRpm={vehicleState.transmission.inputShaftRpm}
          clutchEngagement={vehicleState.clutch.engagement}
          clutchPedal={vehicleState.controls.clutch}
          isLocked={vehicleState.clutch.isLocked}
          currentGrade={vehicleState.dynamics.grade}
          onSelectGrade={onSelectGrade}
          showGradientControls={showGradientControls}
          showCheatsheet={showCheatsheet}
        />
        {rightExtra && <div className="mt-4 w-full">{rightExtra}</div>}
      </div>
    </div>
  );
}

export default Dashboard;
