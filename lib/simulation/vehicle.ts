/**
 * Vehicle Dynamics Simulation — Placeholder & Initial Contracts
 * Manual Driving Trainer
 */

import { VehicleConfig, VehicleDynamicsState } from './types';

export class VehicleDynamicsModel {
  private state: VehicleDynamicsState;
  private config: VehicleConfig;

  constructor(config: VehicleConfig) {
    this.config = config;
    this.state = {
      speed: 0.0,
      speedKmh: 0.0,
      acceleration: 0.0,
      distanceTraveled: 0.0,
      steeringAngle: 0.0,
      grade: 0.0,
      isRollingBackward: false,
    };
  }

  public getState(): VehicleDynamicsState {
    return { ...this.state };
  }

  public setGrade(grade: number): void {
    this.state.grade = grade;
  }

  public update(driveTorque: number, brakePedal: number, parkingBrake: boolean, dt: number): void {
    // Placeholder: longitudinal drag, rolling resistance, grade forces implemented in Phase 6
    void driveTorque;
    void brakePedal;
    void parkingBrake;
    void dt;
  }

  public reset(): void {
    this.state = {
      speed: 0.0,
      speedKmh: 0.0,
      acceleration: 0.0,
      distanceTraveled: 0.0,
      steeringAngle: 0.0,
      grade: 0.0,
      isRollingBackward: false,
    };
  }
}
