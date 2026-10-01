/**
 * Core Physics Utilities & Vehicle Configuration
 * Manual Driving Trainer
 */

import { VehicleConfig } from './types';

export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  mass: 1200, // kg
  wheelRadius: 0.30, // meters (~15-16 inch wheel with tire)
  dragCoefficient: 0.32, // Cd
  frontalArea: 2.1, // m^2
  airDensity: 1.225, // kg/m^3 (sea level, 15°C)
  rollingResistanceCoeff: 0.015, // Cr for standard asphalt
  gravity: 9.81, // m/s^2

  engine: {
    idleRpm: 800,
    stallRpm: 450,
    redlineRpm: 6500,
    maxTorque: 175, // Nm at peak (~3800 RPM)
    flywheelInertia: 0.18, // kg*m^2
    engineBrakingTorque: 25, // Nm per 1000 RPM when throttle is 0
  },

  clutch: {
    bitePointStart: 0.40, // pedal position where friction plate starts touching
    bitePointEnd: 0.65, // pedal position where friction plate is fully separated
    maxClutchTorque: 260, // Nm maximum friction capacity
    lockSpeedThreshold: 4.0, // rad/s relative velocity threshold to lock without slip
  },

  transmission: {
    gears: [
      3.54, // 1st gear
      2.11, // 2nd gear
      1.37, // 3rd gear
      1.03, // 4th gear
      0.82, // 5th gear (overdrive)
    ],
    reverseRatio: 3.42,
    finalDrive: 3.94,
    efficiency: 0.92,
  },

  brakes: {
    maxBrakeForce: 8500, // N maximum service braking force
    parkingBrakeForce: 3800, // N handbrake holding force
  },
};

/**
 * Utility: Clamp number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Utility: Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Utility: Smooth step interpolation (Hermite)
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Convert RPM to radians per second
 */
export function rpmToRadPerSec(rpm: number): number {
  return (rpm * 2 * Math.PI) / 60;
}

/**
 * Convert radians per second to RPM
 */
export function radPerSecToRpm(radPerSec: number): number {
  return (radPerSec * 60) / (2 * Math.PI);
}
