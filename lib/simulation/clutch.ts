/**
 * Clutch Simulation Model — Coulomb Friction & Smoothstep Coupling
 * Manual Driving Trainer
 */

import { ClutchConfig, ClutchState } from './types';
import { clamp, DEFAULT_VEHICLE_CONFIG } from './physics';

/**
 * Default angular velocity smoothing parameter (rad/s) for Coulomb friction tanh model.
 * ~2.0 rad/s (~19.1 RPM) eliminates sharp zero-crossing discontinuities and numerical chattering.
 */
export const DEFAULT_CLUTCH_SMOOTHING_RAD_PER_SEC = 2.0;

/**
 * Threshold of engagement factor above which clutch plates can lock into static friction.
 */
export const CLUTCH_LOCK_ENGAGEMENT_THRESHOLD = 0.95;

export class ClutchModel {
  private config: ClutchConfig;
  private state: ClutchState;
  private smoothingDeltaOmega: number;

  constructor(
    config: ClutchConfig = DEFAULT_VEHICLE_CONFIG.clutch,
    smoothingDeltaOmega = DEFAULT_CLUTCH_SMOOTHING_RAD_PER_SEC
  ) {
    this.config = { ...config };
    this.smoothingDeltaOmega = smoothingDeltaOmega;
    this.state = {
      pedalPosition: 0.0,
      engagement: 1.0,
      slipTorque: 0.0,
      isLocked: false,
      slipSpeed: 0.0,
    };
  }

  /**
   * Return a snapshot of the current clutch state
   */
  public getState(): ClutchState {
    return { ...this.state };
  }

  /**
   * Return a copy of the current clutch configuration
   */
  public getConfig(): ClutchConfig {
    return { ...this.config };
  }

  /**
   * Update configurable parameters (e.g. bite point calibration or wear simulation)
   */
  public setConfig(config: Partial<ClutchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate non-linear clutch engagement factor (c_eng in [0, 1]) from pedal position.
   *
   * Pedal position:
   *   0.0 = fully released (spring clamps pressure plate, 100% engagement)
   *   1.0 = fully depressed (diaphragm spring disengages friction plate, 0% engagement)
   *
   * Engagement curve:
   *   - pedal > bitePointEnd: c_eng = 0.0 (fully disengaged / open)
   *   - pedal < bitePointStart: c_eng = 1.0 (fully clamped)
   *   - bitePointStart <= pedal <= bitePointEnd:
   *       t = (bitePointEnd - pedal) / (bitePointEnd - bitePointStart)
   *       c_eng = 3t^2 - 2t^3 (smoothstep Hermite interpolation)
   */
  public calculateEngagement(pedalPosition: number): number {
    const clampedPedal = clamp(pedalPosition, 0, 1);
    const { bitePointStart, bitePointEnd } = this.config;

    if (clampedPedal >= bitePointEnd) {
      return 0.0;
    }
    if (clampedPedal <= bitePointStart) {
      return 1.0;
    }

    const range = Math.max(1e-5, bitePointEnd - bitePointStart);
    const t = clamp((bitePointEnd - clampedPedal) / range, 0, 1);
    return t * t * (3 - 2 * t);
  }

  /**
   * Update clutch state, slip velocity, locking condition, and friction torque transfer.
   *
   * @param pedalPosition Normalized clutch pedal position [0.0 = released, 1.0 = floored]
   * @param engineAngularSpeed Engine flywheel angular velocity [rad/s]
   * @param transInputSpeed Transmission input shaft angular velocity [rad/s]
   * @param dt Time delta [seconds]
   */
  public update(
    pedalPosition: number,
    engineAngularSpeed: number,
    transInputSpeed: number,
    dt: number
  ): void {
    if (dt < 0) return;

    const clampedPedal = clamp(pedalPosition, 0, 1);
    this.state.pedalPosition = clampedPedal;

    // 1. Calculate engagement factor via smoothstep bite point curve
    const engagement = this.calculateEngagement(clampedPedal);
    this.state.engagement = engagement;

    // 2. Relative angular velocity difference (slip speed)
    // Positive slipSpeed indicates engine spinning faster than transmission input shaft
    const slipSpeed = engineAngularSpeed - transInputSpeed;
    this.state.slipSpeed = slipSpeed;

    const relSpeed = Math.abs(slipSpeed);

    // 3. Mode transition: Slipping vs Locked Mode
    // Transition to locked mode occurs when engagement exceeds 0.95 and relative speed is below threshold
    if (this.state.isLocked) {
      // Disengage/unlock if pedal pressed past lock threshold or relative velocity diverges
      if (engagement <= CLUTCH_LOCK_ENGAGEMENT_THRESHOLD || relSpeed >= this.config.lockSpeedThreshold) {
        this.state.isLocked = false;
      }
    } else {
      // Lock into static coupling when clamping is near full and speeds are synchronized
      if (engagement > CLUTCH_LOCK_ENGAGEMENT_THRESHOLD && relSpeed < this.config.lockSpeedThreshold) {
        this.state.isLocked = true;
      }
    }

    // 4. Coulomb friction torque transfer with hyperbolic tangent smoothing
    // tau_slip = c_eng * maxClutchTorque * tanh((omega_engine - omega_trans_in) / delta_omega_smoothing)
    const slipTorque =
      engagement *
      this.config.maxClutchTorque *
      Math.tanh(slipSpeed / this.smoothingDeltaOmega);

    this.state.slipTorque = slipTorque;
  }

  /**
   * Reset clutch state to initial engaged resting condition
   */
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
