/**
 * Engine Simulation — Placeholder & Initial Contracts
 * Manual Driving Trainer
 */

import { EngineConfig, EngineState } from './types';
import { rpmToRadPerSec } from './physics';

export class EngineModel {
  private state: EngineState;
  private config: EngineConfig;

  constructor(config: EngineConfig) {
    this.config = config;
    this.state = {
      rpm: config.idleRpm,
      angularVelocity: rpmToRadPerSec(config.idleRpm),
      netTorque: 0,
      status: 'RUNNING',
      isLugging: false,
    };
  }

  public getState(): EngineState {
    return { ...this.state };
  }

  public update(throttle: number, clutchLoadTorque: number, dt: number): void {
    // Placeholder: detailed torque curve and stall dynamics implemented in Phase 3
    void throttle;
    void clutchLoadTorque;
    void dt;
  }

  public reset(): void {
    this.state = {
      rpm: this.config.idleRpm,
      angularVelocity: rpmToRadPerSec(this.config.idleRpm),
      netTorque: 0,
      status: 'RUNNING',
      isLugging: false,
    };
  }
}
