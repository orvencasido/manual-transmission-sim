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
  kinematics: {
    latitude: 13.9314,
    longitude: 121.6172,
    headingDegrees: 0,
    headingRadians: 0,
    yawRate: 0,
    worldX: 0,
    worldY: 0,
    collision: {
      isColliding: false,
      curbContact: false,
      roadName: 'Quezon Avenue',
      distanceToCurb: 5.0,
      roadWidth: 10.0,
      boundaryMode: 'strict',
    },
  },
  collision: {
    isColliding: false,
    curbContact: false,
    roadName: 'Quezon Avenue',
    distanceToCurb: 5.0,
    roadWidth: 10.0,
    boundaryMode: 'strict',
  },
};

interface SimulatorStore {
  vehicleState: VehicleState;
  activeFeedback: InstructorFeedback | null;
  feedbacks: InstructorFeedback[];
  isPaused: boolean;
  isMuted: boolean;
  updateVehicleState: (state: VehicleState) => void;
  setActiveFeedback: (feedback: InstructorFeedback | null) => void;
  addFeedback: (feedback: InstructorFeedback) => void;
  clearFeedback: () => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  reset: () => void;
}

export const useSimulatorStore = create<SimulatorStore>((set) => ({
  vehicleState: INITIAL_VEHICLE_STATE,
  activeFeedback: null,
  feedbacks: [],
  isPaused: false,
  isMuted: false,
  updateVehicleState: (state) => set({ vehicleState: state }),
  setActiveFeedback: (feedback) => set({ activeFeedback: feedback }),
  addFeedback: (feedback) =>
    set((s) => ({
      activeFeedback: feedback,
      feedbacks: [feedback, ...s.feedbacks.filter((f) => f.id !== feedback.id).slice(0, 9)],
    })),
  clearFeedback: () => set({ feedbacks: [], activeFeedback: null }),
  setPaused: (paused) => set({ isPaused: paused }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setMuted: (muted) => set({ isMuted: muted }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  reset: () =>
    set({
      vehicleState: INITIAL_VEHICLE_STATE,
      activeFeedback: null,
      feedbacks: [],
      isPaused: false,
    }),
}));

