/**
 * Clutch Simulation — Placeholder & Initial Contracts
 * Manual Driving Trainer
 */

import { ClutchConfig, ClutchState } from './types';

export class ClutchModel {
  private state: ClutchState;
  private config: ClutchConfig;

  constructor(config: ClutchConfig) {
    this.config = config;
    this.state = {
      pedalPosition: 0.0,
      engagement: 1.0,
      slipTorque: 0.0,
      isLocked: false,
      slipSpeed: 0.0,
    };
  }

  public getState(): ClutchState {
    return { ...this.state };
  }

  public update(pedalPosition: number, engineAngularSpeed: number, transInputSpeed: number, dt: number): void {
    // Placeholder: bite point curve & Coulomb friction torque implemented in Phase 4
    void pedalPosition;
    void engineAngularSpeed;
    void transInputSpeed;
    void dt;
  }

  public reset(): void {
    this.state = {
      pedalPosition: 0.0,
      engagement: 1.0,
      slipTorque: 0.0,
      isLocked: false,
      slipSpeed: 0.0,
    };
  }
}
