/**
 * Transmission Simulation — Placeholder & Initial Contracts
 * Manual Driving Trainer
 */

import { TransmissionConfig, TransmissionState } from './types';

export class TransmissionModel {
  private state: TransmissionState;
  private config: TransmissionConfig;

  constructor(config: TransmissionConfig) {
    this.config = config;
    this.state = {
      currentGear: 0, // Neutral
      gearRatio: 0,
      inputShaftRpm: 0,
      inputShaftSpeed: 0,
      wheelTorque: 0,
    };
  }

  public getState(): TransmissionState {
    return { ...this.state };
  }

  public setGear(gear: number): void {
    this.state.currentGear = gear;
  }

  public update(transInputTorque: number, wheelAngularSpeed: number): void {
    // Placeholder: gear ratio multiplication and drive torque implemented in Phase 5
    void transInputTorque;
    void wheelAngularSpeed;
  }

  public reset(): void {
    this.state = {
      currentGear: 0,
      gearRatio: 0,
      inputShaftRpm: 0,
      inputShaftSpeed: 0,
      wheelTorque: 0,
    };
  }
}
