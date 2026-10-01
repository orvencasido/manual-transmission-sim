/**
 * Transmission & Driveline Simulation Model
 * Manual Driving Trainer
 *
 * Implements gearbox ratios, final drive reduction, driveline mechanical efficiency,
 * and bidirectional torque / speed coupling between the clutch and driven wheels.
 */

import { TransmissionConfig, TransmissionState } from './types';
import { DEFAULT_VEHICLE_CONFIG, radPerSecToRpm } from './physics';

export class TransmissionModel {
  private config: TransmissionConfig;
  private state: TransmissionState;
  private lastWheelAngularSpeed = 0.0;

  constructor(config: TransmissionConfig = DEFAULT_VEHICLE_CONFIG.transmission) {
    this.config = {
      ...config,
      gears: [...config.gears],
    };
    this.state = {
      currentGear: 0, // Neutral
      gearRatio: 0.0,
      inputShaftRpm: 0.0,
      inputShaftSpeed: 0.0,
      wheelTorque: 0.0,
    };
  }

  /**
   * Return a snapshot of the current transmission state
   */
  public getState(): TransmissionState {
    return { ...this.state };
  }

  /**
   * Return a copy of the active transmission configuration
   */
  public getConfig(): TransmissionConfig {
    return {
      ...this.config,
      gears: [...this.config.gears],
    };
  }

  /**
   * Update configurable transmission parameters
   */
  public setConfig(config: Partial<TransmissionConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      gears: config.gears ? [...config.gears] : this.config.gears,
    };
    this.state.gearRatio = this.getOverallRatio(this.state.currentGear);
  }

  /**
   * Returns the individual gearbox transmission ratio for a given gear.
   * - Neutral (0): 0.0
   * - Reverse (-1): -reverseRatio (negative indicates reverse drive)
   * - Forward gears (1..N): gears[gear - 1]
   * - Invalid gear: 0.0
   */
  public getGearRatio(gear: number): number {
    if (!Number.isInteger(gear)) return 0.0;
    if (gear === 0) return 0.0;
    if (gear === -1) return -this.config.reverseRatio;
    if (gear >= 1 && gear <= this.config.gears.length) {
      return this.config.gears[gear - 1];
    }
    return 0.0;
  }

  /**
   * Returns the overall driveline ratio (gearbox ratio * final drive multiplier).
   * - Neutral (0): 0.0
   * - Reverse (-1): -reverseRatio * finalDrive
   * - Forward gears (1..N): gears[gear - 1] * finalDrive
   * - Invalid gear: 0.0
   */
  public getOverallRatio(gear: number): number {
    if (gear === 0) return 0.0;
    return this.getGearRatio(gear) * this.config.finalDrive;
  }

  /**
   * Validates and selects a gear (-1 for Reverse, 0 for Neutral, 1..N for Forward gears).
   * Updates current gear and current overall gear ratio.
   */
  public setGear(gear: number): void {
    if (!Number.isInteger(gear)) return;
    if (gear < -1 || gear > this.config.gears.length) {
      return;
    }

    this.state.currentGear = gear;
    const overallRatio = this.getOverallRatio(gear);
    this.state.gearRatio = overallRatio;

    if (gear === 0) {
      this.state.inputShaftSpeed = 0.0;
      this.state.inputShaftRpm = 0.0;
    } else {
      this.state.inputShaftSpeed = this.lastWheelAngularSpeed * overallRatio;
      this.state.inputShaftRpm = radPerSecToRpm(this.state.inputShaftSpeed);
    }
  }

  /**
   * Updates transmission driveline state based on input torque and wheel rotational speed.
   *
   * Computations:
   * - Wheel torque: tau_wheel = transInputTorque * overallRatio * efficiency (when in gear; 0 in neutral).
   * - Input shaft rotational velocity from wheel speed: omega_input = wheelAngularSpeed * overallRatio (when in gear).
   * - Input shaft RPM: radPerSecToRpm(omega_input).
   *
   * @param transInputTorque Torque delivered into transmission input shaft by clutch (Nm)
   * @param wheelAngularSpeed Angular rotational speed of driven wheels (rad/s)
   */
  public update(transInputTorque: number, wheelAngularSpeed: number): void {
    this.lastWheelAngularSpeed = wheelAngularSpeed;
    const overallRatio = this.getOverallRatio(this.state.currentGear);
    this.state.gearRatio = overallRatio;

    if (this.state.currentGear === 0) {
      this.state.wheelTorque = 0.0;
      this.state.inputShaftSpeed = 0.0;
      this.state.inputShaftRpm = 0.0;
    } else {
      this.state.wheelTorque = transInputTorque * overallRatio * this.config.efficiency;
      this.state.inputShaftSpeed = wheelAngularSpeed * overallRatio;
      this.state.inputShaftRpm = radPerSecToRpm(this.state.inputShaftSpeed);
    }
  }

  /**
   * Resets transmission state to Neutral with zero velocities and torques
   */
  public reset(): void {
    this.lastWheelAngularSpeed = 0.0;
    this.state = {
      currentGear: 0,
      gearRatio: 0.0,
      inputShaftRpm: 0.0,
      inputShaftSpeed: 0.0,
      wheelTorque: 0.0,
    };
  }
}
