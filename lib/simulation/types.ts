/**
 * Simulation Data Types & Contracts
 * Manual Driving Trainer
 */

export interface InputState {
  throttle: number; // 0.0 (released) to 1.0 (fully floored)
  brake: number; // 0.0 (released) to 1.0 (fully floored)
  clutch: number; // 0.0 (released/engaged) to 1.0 (fully pressed/disengaged)
  steering: number; // -1.0 (full left) to +1.0 (full right), 0.0 = center
  gear: number; // -1 = Reverse, 0 = Neutral, 1..5 = Forward gears
  parkingBrake: boolean; // true = engaged, false = released
  isStarterEngaged: boolean; // true when cranking starter motor
}

export type EngineStatus = 'OFF' | 'STARTING' | 'RUNNING' | 'STALLED';

export interface EngineConfig {
  idleRpm: number;
  stallRpm: number;
  redlineRpm: number;
  maxTorque: number; // Nm
  flywheelInertia: number; // kg*m^2
  engineBrakingTorque: number; // Nm per 1000 RPM
}

export interface ClutchConfig {
  bitePointStart: number; // pedal pos (e.g. 0.40)
  bitePointEnd: number; // pedal pos (e.g. 0.65)
  maxClutchTorque: number; // Nm (e.g. 250)
  lockSpeedThreshold: number; // rad/s relative velocity threshold for locking
}

export interface TransmissionConfig {
  gears: number[]; // e.g. [3.54, 2.11, 1.37, 1.03, 0.82]
  reverseRatio: number; // e.g. 3.42
  finalDrive: number; // e.g. 3.94
  efficiency: number; // e.g. 0.92
}

export interface VehicleConfig {
  mass: number; // kg
  wheelRadius: number; // meters
  dragCoefficient: number; // Cd
  frontalArea: number; // m^2
  airDensity: number; // kg/m^3
  rollingResistanceCoeff: number; // Cr
  gravity: number; // m/s^2

  engine: EngineConfig;
  clutch: ClutchConfig;
  transmission: TransmissionConfig;

  brakes: {
    maxBrakeForce: number; // N
    parkingBrakeForce: number; // N
  };
}

export interface EngineState {
  rpm: number;
  angularVelocity: number; // rad/s
  netTorque: number; // Nm
  status: EngineStatus;
  isLugging: boolean;
}

export interface ClutchState {
  pedalPosition: number; // 0.0 (engaged) to 1.0 (disengaged)
  engagement: number; // 0.0 (slipping/open) to 1.0 (clamped)
  slipTorque: number; // Nm transferred through clutch
  isLocked: boolean; // true when flywheel & transmission input spin together
  slipSpeed: number; // rad/s difference
}

export interface TransmissionState {
  currentGear: number; // -1, 0, 1..5
  gearRatio: number;
  inputShaftRpm: number;
  inputShaftSpeed: number; // rad/s
  wheelTorque: number; // Nm at driven wheels
}

export interface VehicleDynamicsState {
  speed: number; // m/s (signed)
  speedKmh: number; // km/h
  acceleration: number; // m/s^2
  distanceTraveled: number; // meters
  steeringAngle: number; // -1.0 to +1.0
  grade: number; // radians slope (positive = uphill)
  isRollingBackward: boolean;
}

export type RoadBoundaryMode = 'strict' | 'soft' | 'off';

export interface RoadCollisionState {
  isColliding: boolean;
  curbContact: boolean;
  roadName: string;
  distanceToCurb: number;
  roadWidth: number;
  boundaryMode: RoadBoundaryMode;
}

export interface KinematicsState {
  latitude: number;
  longitude: number;
  headingDegrees: number; // 0 to 360 (0 = North, 90 = East, 180 = South, 270 = West)
  headingRadians: number;
  yawRate: number; // rad/s
  worldX: number; // cumulative meters East from spawn
  worldY: number; // cumulative meters North from spawn
  collision: RoadCollisionState;
}

export interface VehicleState {
  timestamp: number;
  engine: EngineState;
  clutch: ClutchState;
  transmission: TransmissionState;
  dynamics: VehicleDynamicsState;
  controls: InputState;
  kinematics: KinematicsState;
  collision?: RoadCollisionState;
}

export interface InstructorFeedback {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: number;
}
