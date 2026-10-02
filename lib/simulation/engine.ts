/**
 * Engine Simulation Model
 * Manual Driving Trainer
 */

import { EngineConfig, EngineState, EngineStatus } from './types';
import { clamp, radPerSecToRpm, rpmToRadPerSec } from './physics';

export class EngineModel {
  private config: EngineConfig;
  private state: EngineState;

  // Starter cranking tracking
  private starterCrankTime = 0;

  // Rev limiter hysteresis
  private isRevLimiterActive = false;

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

  /**
   * Return a snapshot of current engine state
   */
  public getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Approximate internal combustion torque curve (Nm) based on RPM
   * Characteristic: ~65% torque at idle, peak torque at ~3800 RPM, tapers off near redline
   */
  public getAvailableTorque(rpm: number): number {
    if (this.state.status !== 'RUNNING') return 0;

    const r = clamp(rpm, 0, this.config.redlineRpm * 1.1);

    // Normalized curve parameterized with peak at ~3800 RPM
    // f(r) in [0.65, 1.0]
    const peakRpm = 3800;
    const norm = (r - peakRpm) / 3800;
    const curveFactor = Math.max(0.4, 1.0 - 0.45 * norm * norm);

    return this.config.maxTorque * curveFactor;
  }

  /**
   * Calculate internal engine friction & vacuum pumping resistance (engine braking)
   */
  public getEngineBrakingTorque(rpm: number): number {
    if (rpm <= 0) return 0;
    // Friction increases with RPM: base friction + viscous mechanical drag
    const baseFriction = 12; // Nm minimum mechanical resistance
    const dynamicFriction = (rpm / 1000) * this.config.engineBrakingTorque;
    return baseFriction + dynamicFriction;
  }

  /**
   * Update engine dynamics for time step dt
   * @param throttle Normalized throttle pedal [0.0, 1.0]
   * @param clutchLoadTorque Reaction torque from clutch friction disk [Nm]
   * @param isStarterEngaged Whether starter key/switch is currently cranking
   * @param dt Fixed delta time [seconds]
   */
  public update(
    throttle: number,
    clutchLoadTorque: number,
    dt: number,
    isStarterEngaged = false
  ): void {
    if (dt <= 0) return;

    // 1. Handle Engine Starter & Cranking
    if (this.state.status === 'OFF' || this.state.status === 'STALLED') {
      if (isStarterEngaged) {
        this.state.status = 'STARTING';
        this.starterCrankTime += dt;

        // Starter motor spins flywheel up to ~280-320 RPM
        const crankRpm = Math.min(300, this.starterCrankTime * 600);
        this.state.rpm = crankRpm;
        this.state.angularVelocity = rpmToRadPerSec(crankRpm);

        // After cranking past firing threshold (~0.25s), engine catches and idles
        if (this.starterCrankTime >= 0.25) {
          this.state.status = 'RUNNING';
          this.state.rpm = this.config.idleRpm;
          this.state.angularVelocity = rpmToRadPerSec(this.config.idleRpm);
          this.starterCrankTime = 0;
        }
        return;
      } else {
        this.starterCrankTime = 0;
        // Flywheel winds down to 0 if starter is released
        if (this.state.rpm > 0) {
          const spinDownRate = 800; // RPM/sec
          this.state.rpm = Math.max(0, this.state.rpm - spinDownRate * dt);
          this.state.angularVelocity = rpmToRadPerSec(this.state.rpm);
        }
        return;
      }
    }

    // 2. Rev Limiter Cutoff logic
    if (this.state.rpm >= this.config.redlineRpm) {
      this.isRevLimiterActive = true;
    } else if (this.state.rpm < this.config.redlineRpm - 150) {
      this.isRevLimiterActive = false;
    }

    const effectiveThrottle = this.isRevLimiterActive ? 0 : clamp(throttle, 0, 1);

    // 3. Gross Combustion Torque
    const availableTorque = this.getAvailableTorque(this.state.rpm);
    const combustionTorque = effectiveThrottle * availableTorque;

    // 4. Idle Governor (IACV / ECU closed-loop controller)
    // When throttle is near 0 and RPM is falling near or below idle, apply stabilizing torque
    let idleGovernorTorque = 0;
    if (effectiveThrottle < 0.1 && this.state.rpm < this.config.idleRpm * 1.15) {
      const rpmDeficit = this.config.idleRpm - this.state.rpm;
      if (rpmDeficit > 0) {
        // Proportional idle governor up to 60 Nm
        idleGovernorTorque = Math.min(65, rpmDeficit * 0.18);
      }
    }

    // 5. Engine Braking & Friction Drag
    const engineBraking = this.getEngineBrakingTorque(this.state.rpm);

    // 6. Net Flywheel Torque
    // Net = Combustion + Idle - Internal Friction - External Clutch Load
    const netTorque = combustionTorque + idleGovernorTorque - engineBraking - clutchLoadTorque;
    this.state.netTorque = netTorque;

    // 7. Angular Acceleration & Integration (when flywheel is free/slipping)
    const angularAcceleration = netTorque / this.config.flywheelInertia;
    const newAngularVelocity = Math.max(0, this.state.angularVelocity + angularAcceleration * dt);
    const newRpm = radPerSecToRpm(newAngularVelocity);

    this.state.angularVelocity = newAngularVelocity;
    this.state.rpm = newRpm;

    // 8. Stall Detection
    // If RPM drops below stall threshold under load, combustion ceases and engine stalls
    if (this.state.rpm < this.config.stallRpm) {
      this.state.status = 'STALLED';
      this.state.rpm = 0;
      this.state.angularVelocity = 0;
      this.state.netTorque = 0;
      this.state.isLugging = false;
      return;
    }

    // 9. Engine Lugging Detection
    // Occurs when engine is forced to operate below comfortable RPM under heavy load
    this.state.isLugging = this.state.rpm < 1100 && (effectiveThrottle > 0.5 || clutchLoadTorque > 40);
  }

  /**
   * Set engine rotational speed directly (used when clutch is locked 1:1 with transmission)
   */
  public setLockedRpm(rpm: number): void {
    if (this.state.status !== 'RUNNING') return;

    if (rpm < this.config.stallRpm) {
      this.state.status = 'STALLED';
      this.state.rpm = 0;
      this.state.angularVelocity = 0;
      this.state.netTorque = 0;
      this.state.isLugging = false;
    } else {
      this.state.rpm = Math.min(rpm, this.config.redlineRpm + 300);
      this.state.angularVelocity = rpmToRadPerSec(this.state.rpm);
      this.state.isLugging = this.state.rpm < 1100;
    }
  }

  /**
   * Immediately stall engine due to driveline shock or impact resistance
   */
  public stall(): void {
    this.state.status = 'STALLED';
    this.state.rpm = 0;
    this.state.angularVelocity = 0;
    this.state.netTorque = 0;
    this.state.isLugging = false;
  }

  /**
   * Force start engine (used for resets or session starts)
   */
  public forceStart(): void {
    this.state = {
      rpm: this.config.idleRpm,
      angularVelocity: rpmToRadPerSec(this.config.idleRpm),
      netTorque: 0,
      status: 'RUNNING',
      isLugging: false,
    };
    this.starterCrankTime = 0;
    this.isRevLimiterActive = false;
  }

  /**
   * Reset engine to standard idle state
   */
  public reset(): void {
    this.forceStart();
  }
}
