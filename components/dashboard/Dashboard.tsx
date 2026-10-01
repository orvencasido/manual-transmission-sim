'use client';

import React from 'react';
import { VehicleState, InstructorFeedback } from '@/lib/simulation/types';
import { useSimulatorStore } from '@/stores/simulatorStore';
import { SpeedometerGauge } from './SpeedometerGauge';
import { TachometerGauge } from './TachometerGauge';
import { StatusCluster } from './StatusCluster';
import { PedalCluster } from './PedalCluster';
import { InstructorBanner } from '@/components/instructor/InstructorBanner';

interface DashboardProps {
  state?: VehicleState;
  feedback?: InstructorFeedback | null;
}

export function Dashboard({ state, feedback }: DashboardProps) {
  const storeState = useSimulatorStore((s) => s.vehicleState);
  const vehicleState = state || storeState;

  const { engine, transmission, dynamics, controls, clutch } = vehicleState;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Real-Time Rule-Based Driving Instructor HUD Banner */}
      <InstructorBanner feedback={feedback} />

      {/* Upper Binnacle: Primary Analog Gauges & Center Status */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-2xl flex flex-col lg:flex-row items-center justify-around gap-6">
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

      {/* Lower Section: Real-Time Vertical Pedals & Steering Indicator */}
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

export default Dashboard;
