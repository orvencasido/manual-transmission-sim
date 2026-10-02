/**
 * Vehicle Dynamics Simulation — Longitudinal Dynamics & Hill Physics
 * Manual Driving Trainer
 *
 * Implements vehicle longitudinal dynamics, tractive force delivery,
 * aerodynamic drag, rolling resistance, gravitational grade resistance,
 * service/parking braking, and static holding preventing zero-crossing jitter.
 */

import { VehicleConfig, VehicleDynamicsState } from './types';
import { clamp, DEFAULT_VEHICLE_CONFIG } from './physics';

/**
 * Velocity threshold below which the vehicle is considered effectively stationary.
 */
export const VEHICLE_STOP_SPEED_THRESHOLD = 0.05; // m/s (~0.18 km/h)

export class VehicleDynamicsModel {
  private config: VehicleConfig;
  private state: VehicleDynamicsState;

  constructor(config: VehicleConfig = DEFAULT_VEHICLE_CONFIG) {
    this.config = {
      ...config,
      brakes: { ...config.brakes },
    };
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

  /**
   * Return a snapshot of current vehicle dynamics state
   */
  public getState(): VehicleDynamicsState {
    return { ...this.state };
  }

  /**
   * Return a copy of the active vehicle configuration
   */
  public getConfig(): VehicleConfig {
    return {
      ...this.config,
      brakes: { ...this.config.brakes },
    };
  }

  /**
   * Update configurable vehicle parameters
   */
  public setConfig(config: Partial<VehicleConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      brakes: {
        ...this.config.brakes,
        ...(config.brakes || {}),
      },
    };
  }

  /**
   * Set road gradient in radians (positive = uphill, negative = downhill)
   */
  public setGrade(gradeInRadians: number): void {
    this.state.grade = gradeInRadians;
  }

  /**
   * Set normalized steering angle [-1.0 = full left, +1.0 = full right]
   */
  public setSteeringAngle(steering: number): void {
    this.state.steeringAngle = clamp(steering, -1.0, 1.0);
  }

  /**
   * Directly set vehicle longitudinal speed (m/s)
   */
  public setSpeed(speed: number): void {
    this.state.speed = speed;
    this.state.speedKmh = speed * 3.6;
    this.state.isRollingBackward = speed < -0.05;
  }

  /**
   * Apply instantaneous impact speed reduction multiplier (0.0 to 1.0)
   */
  public applyImpactSpeedReduction(retentionFactor: number): void {
    const factor = clamp(retentionFactor, 0.0, 1.0);
    this.state.speed *= factor;
    this.state.speedKmh = this.state.speed * 3.6;
    this.state.isRollingBackward = this.state.speed < -0.05;
  }

  /**
   * Update longitudinal vehicle dynamics over time step dt.
   *
   * @param driveTorque Wheel torque from driveline [Nm]
   * @param brakePedal Service brake pedal input [0.0 to 1.0]
   * @param parkingBrake Parking brake / handbrake state [true = engaged]
   * @param dt Elapsed delta time [seconds]
   * @param steeringAngle Optional normalized steering angle [-1.0 to +1.0]
   */
  public update(
    driveTorque: number,
    brakePedal: number,
    parkingBrake: boolean,
    dt: number,
    steeringAngle?: number
  ): void {
    if (steeringAngle !== undefined) {
      this.state.steeringAngle = clamp(steeringAngle, -1.0, 1.0);
    }

    if (dt <= 0) return;

    const {
      mass,
      wheelRadius,
      dragCoefficient,
      frontalArea,
      airDensity,
      rollingResistanceCoeff,
      gravity,
      brakes,
    } = this.config;

    const v = this.state.speed;
    const grade = this.state.grade;

    // 1. Tractive force at driven wheels: F_traction = driveTorque / wheelRadius
    const fTraction = driveTorque / wheelRadius;

    // 2. Grade resistance: F_grade = mass * gravity * sin(grade)
    // Positive grade represents uphill slope; creates backward force (-F_grade)
    const fGrade = mass * gravity * Math.sin(grade);

    // 3. Available braking force from service brake pedal and parking brake
    const clampedBrakePedal = clamp(brakePedal, 0, 1);
    const serviceBrakeForce = clampedBrakePedal * brakes.maxBrakeForce;
    const parkingBrakeForce = parkingBrake ? brakes.parkingBrakeForce : 0.0;
    const fBrakeAvailable = serviceBrakeForce + parkingBrakeForce;

    // Net external driving force along road incline
    const netExternalForce = fTraction - fGrade;

    // 4. Static holding logic:
    // When vehicle speed is near zero (|v| < 0.05 m/s) and brakes are applied,
    // if net external force |F_traction - F_grade| <= F_brake_available,
    // the vehicle remains stationary (v = 0, a = 0) preventing perpetual numerical jitter.
    const isNearZero = Math.abs(v) < VEHICLE_STOP_SPEED_THRESHOLD;
    if (isNearZero && fBrakeAvailable > 0 && Math.abs(netExternalForce) <= fBrakeAvailable) {
      this.state.speed = 0.0;
      this.state.speedKmh = 0.0;
      this.state.acceleration = 0.0;
      this.state.isRollingBackward = false;
      return;
    }

    // Static rest on level ground without external driving force or momentum
    if (isNearZero && Math.abs(netExternalForce) < 1e-4) {
      this.state.speed = 0.0;
      this.state.speedKmh = 0.0;
      this.state.acceleration = 0.0;
      this.state.isRollingBackward = false;
      return;
    }

    // 5. Dynamic resistive forces when in motion
    const sgnV = v > 0 ? 1 : (v < 0 ? -1 : 0);

    // Aerodynamic drag: F_drag = 0.5 * airDensity * dragCoefficient * frontalArea * v^2 * sgn(v)
    const fDrag = 0.5 * airDensity * dragCoefficient * frontalArea * v * Math.abs(v);

    // Rolling resistance: F_rolling = Cr * mass * gravity * cos(grade) * sgn(v)
    const fRolling = rollingResistanceCoeff * mass * gravity * Math.cos(grade) * sgnV;

    // Braking force: opposes velocity direction
    let fBrake = 0.0;
    if (v !== 0) {
      fBrake = fBrakeAvailable * sgnV;
    } else if (fBrakeAvailable > 0) {
      // Impending motion from standstill overcoming brake capacity
      fBrake = fBrakeAvailable * Math.sign(netExternalForce);
    }

    // 6. Net longitudinal force:
    // F_net = F_traction - F_grade - F_drag - F_rolling - F_brake
    const fNet = fTraction - fGrade - fDrag - fRolling - fBrake;

    // 7. Acceleration & integration
    const acceleration = fNet / mass;
    let newSpeed = v + acceleration * dt;

    // 8. Stopping & zero-crossing stabilization
    // If vehicle crossed zero speed this step:
    if (v > 0 && newSpeed < 0) {
      // Moving forward and decelerated across zero
      if (fBrakeAvailable > 0 && Math.abs(netExternalForce) <= fBrakeAvailable) {
        newSpeed = 0.0;
      } else if (netExternalForce >= 0) {
        // Pure resistive forces cannot cause backward acceleration
        newSpeed = 0.0;
      }
    } else if (v < 0 && newSpeed > 0) {
      // Moving backward and decelerated across zero
      if (fBrakeAvailable > 0 && Math.abs(netExternalForce) <= fBrakeAvailable) {
        newSpeed = 0.0;
      } else if (netExternalForce <= 0) {
        // Pure resistive forces cannot cause forward acceleration
        newSpeed = 0.0;
      }
    }

    // Lock to standstill if stopped within near-zero threshold and holding with brakes
    if (Math.abs(newSpeed) < VEHICLE_STOP_SPEED_THRESHOLD && fBrakeAvailable > 0 && Math.abs(netExternalForce) <= fBrakeAvailable) {
      newSpeed = 0.0;
    }

    const finalAcceleration = (newSpeed === 0.0 && v === 0.0) ? 0.0 : acceleration;

    // 9. Update state
    this.state.speed = newSpeed;
    this.state.speedKmh = newSpeed * 3.6;
    this.state.acceleration = finalAcceleration;
    this.state.distanceTraveled += newSpeed * dt;
    this.state.isRollingBackward = newSpeed < -0.05;
  }

  /**
   * Reset vehicle dynamics to stationary state
   */
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
