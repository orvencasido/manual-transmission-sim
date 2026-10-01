/**
 * Zustand Simulator Store
 * Manual Driving Trainer
 */

import { create } from 'zustand';
import { VehicleState, InstructorFeedback } from '@/lib/simulation/types';

const INITIAL_VEHICLE_STATE: VehicleState = {
  timestamp: 0,
  engine: {
    rpm: 800,
    angularVelocity: (800 * 2 * Math.PI) / 60,
    netTorque: 0,
    status: 'OFF',
    isLugging: false,
  },
  clutch: {
    pedalPosition: 0.0,
    engagement: 1.0,
    slipTorque: 0.0,
    isLocked: false,
    slipSpeed: 0.0,
  },
  transmission: {
    currentGear: 0,
    gearRatio: 0,
    inputShaftRpm: 0,
    inputShaftSpeed: 0,
    wheelTorque: 0,
  },
  dynamics: {
    speed: 0.0,
    speedKmh: 0.0,
    acceleration: 0.0,
    distanceTraveled: 0.0,
    steeringAngle: 0.0,
    grade: 0.0,
    isRollingBackward: false,
  },
  controls: {
    throttle: 0.0,
    brake: 0.0,
    clutch: 0.0,
    steering: 0.0,
    gear: 0,
    parkingBrake: true,
    isStarterEngaged: false,
  },
};

interface SimulatorStore {
  vehicleState: VehicleState;
  feedbacks: InstructorFeedback[];
  isPaused: boolean;
  updateVehicleState: (state: VehicleState) => void;
  addFeedback: (feedback: InstructorFeedback) => void;
  clearFeedback: () => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  reset: () => void;
}

export const useSimulatorStore = create<SimulatorStore>((set) => ({
  vehicleState: INITIAL_VEHICLE_STATE,
  feedbacks: [],
  isPaused: false,
  updateVehicleState: (state) => set({ vehicleState: state }),
  addFeedback: (feedback) =>
    set((s) => ({
      feedbacks: [feedback, ...s.feedbacks.slice(0, 4)],
    })),
  clearFeedback: () => set({ feedbacks: [] }),
  setPaused: (paused) => set({ isPaused: paused }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  reset: () =>
    set({
      vehicleState: INITIAL_VEHICLE_STATE,
      feedbacks: [],
      isPaused: false,
    }),
}));
