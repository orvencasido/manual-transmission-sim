/**
 * Controls System — Placeholder & Initial Contracts
 * Manual Driving Trainer
 */

import { InputState } from './types';

export interface ControlRatesConfig {
  throttlePressRate: number;
  throttleReleaseRate: number;
  brakePressRate: number;
  brakeReleaseRate: number;
  clutchPressRate: number;
  clutchReleaseRate: number;
  steeringPressRate: number;
  steeringReturnRate: number;
}

export const DEFAULT_CONTROL_RATES: ControlRatesConfig = {
  throttlePressRate: 1.8,
  throttleReleaseRate: 3.0,
  brakePressRate: 2.5,
  brakeReleaseRate: 4.0,
  clutchPressRate: 3.5,
  clutchReleaseRate: 1.2,
  steeringPressRate: 2.2,
  steeringReturnRate: 3.0,
};

export class ControlsManager {
  private state: InputState = {
    throttle: 0.0,
    brake: 0.0,
    clutch: 0.0,
    steering: 0.0,
    gear: 0,
    parkingBrake: true,
    isStarterEngaged: false,
  };

  public getState(): InputState {
    return { ...this.state };
  }

  public update(dt: number): void {
    // Placeholder for Phase 2 timed ramping implementation
    // Unused dt preserved for interface compatibility
    void dt;
  }

  public reset(): void {
    this.state = {
      throttle: 0.0,
      brake: 0.0,
      clutch: 0.0,
      steering: 0.0,
      gear: 0,
      parkingBrake: true,
      isStarterEngaged: false,
    };
  }
}
