/**
 * Simulation Orchestrator — Powertrain & Vehicle Dynamics Coordination
 * Manual Driving Trainer
 */

import { VehicleConfig, VehicleState, InputState, RoadBoundaryMode } from './types';
import { clamp, DEFAULT_VEHICLE_CONFIG } from './physics';
import { EngineModel } from './engine';
import { ClutchModel } from './clutch';
import { TransmissionModel } from './transmission';
import { VehicleDynamicsModel } from './vehicle';
import { KinematicsModel } from './kinematics';
import { RoadNetwork } from './roadNetwork';

export class Simulation {
  private config: VehicleConfig;
  private engine: EngineModel;
  private clutch: ClutchModel;
  private transmission: TransmissionModel;
  private vehicle: VehicleDynamicsModel;
  private kinematics: KinematicsModel;
  private initialBoundaryMode: RoadBoundaryMode;
  private lastInput: InputState = {
    throttle: 0.0,
    brake: 0.0,
    clutch: 0.0,
    steering: 0.0,
    gear: 0,
    parkingBrake: true,
    isStarterEngaged: false,
  };

  constructor(
    config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
    boundaryMode: RoadBoundaryMode = 'off'
  ) {
    this.config = config;
    this.initialBoundaryMode = boundaryMode;
    this.engine = new EngineModel(config.engine);
    this.clutch = new ClutchModel(config.clutch);
    this.transmission = new TransmissionModel(config.transmission);
    this.vehicle = new VehicleDynamicsModel(config);
    this.kinematics = new KinematicsModel({ boundaryMode });
  }

  /**
   * Execute one simulation time step dt
   *
   * @param input Current controls / pedal state
   * @param dt Elapsed delta time in seconds
   */
  public tick(input: InputState, dt: number): void {
    this.lastInput = { ...input };

    // 1. Synchronize transmission gear selection and current wheel rotational speed
    const currentWheelSpeed = this.vehicle.getState().speed / this.config.wheelRadius;
    this.transmission.setGear(input.gear);
    this.transmission.update(this.clutch.getState().slipTorque, currentWheelSpeed);

    const transState = this.transmission.getState();
    const engineState = this.engine.getState();
    const isNeutral = input.gear === 0;

    // 2. Determine transmission input shaft rotational speed (rad/s)
    // In neutral (gear 0), the input shaft is disconnected from the driven wheels.
    // When the clutch is engaged in neutral, the input shaft spins freely with the engine flywheel.
    // When in gear, the input shaft is coupled to the driven wheels through the gear ratio.
    const transInputSpeed = isNeutral
      ? (input.clutch < this.config.clutch.bitePointEnd ? engineState.angularVelocity : transState.inputShaftSpeed)
      : transState.inputShaftSpeed;

    // 3. Update clutch engagement, slip speed, locked state, and Coulomb friction torque
    this.clutch.update(input.clutch, engineState.angularVelocity, transInputSpeed, dt);
    const clutchState = this.clutch.getState();

    // 4. Update engine dynamics and determine torque transmitted into gearbox
    let transInputTorque = clutchState.slipTorque;

    if (clutchState.isLocked && !isNeutral) {
      // When locked in gear, the clutch acts as a solid mechanical coupling.
      // Driveline torque is produced directly by engine combustion & idle governor minus internal engine friction.
      const availableTorque = this.engine.getAvailableTorque(engineState.rpm);
      const effectiveThrottle = clamp(input.throttle, 0, 1);
      const combustionTorque = effectiveThrottle * availableTorque;

      let idleGovernorTorque = 0.0;
      if (effectiveThrottle < 0.1 && engineState.rpm < this.config.engine.idleRpm * 1.15) {
        const rpmDeficit = this.config.engine.idleRpm - engineState.rpm;
        if (rpmDeficit > 0) {
          idleGovernorTorque = Math.min(65, rpmDeficit * 0.18);
        }
      }

      const engineBraking = this.engine.getEngineBrakingTorque(engineState.rpm);
      transInputTorque = combustionTorque + idleGovernorTorque - engineBraking;

      // In locked mode, synchronize engine RPM with transmission input shaft RPM directly
      this.engine.setLockedRpm(transState.inputShaftRpm);
    } else {
      // Slipping or neutral mode: clutch load torque acts on free flywheel
      this.engine.update(input.throttle, clutchState.slipTorque, dt, input.isStarterEngaged);
    }

    // 5. Update transmission driveline torque transfer with wheel angular speed
    this.transmission.update(transInputTorque, currentWheelSpeed);

    // 6. Update vehicle longitudinal dynamics with drive torque, brakes, and steering
    this.vehicle.update(
      this.transmission.getState().wheelTorque,
      input.brake,
      input.parkingBrake,
      dt,
      input.steering
    );

    // 7. Pass updated wheel speed back to transmission to ensure closed-loop driveline mechanics
    const updatedWheelSpeed = this.vehicle.getState().speed / this.config.wheelRadius;
    this.transmission.update(transInputTorque, updatedWheelSpeed);

    // If clutch is locked, keep engine RPM synchronized with the updated driveline speed
    if (clutchState.isLocked && !isNeutral) {
      this.engine.setLockedRpm(this.transmission.getState().inputShaftRpm);
    }

    // 8. Update 2D kinematic bicycle model and geodetic positioning
    this.kinematics.update(this.vehicle.getState().speed, input.steering, dt);

    // 9. Road boundary collision enforcement & continuous curb friction
    // Completely short-circuit when boundaryMode is 'off' (0 overhead in trainer and lesson modes)
    if (this.kinematics.getBoundaryMode() === 'strict') {
      const collision = this.kinematics.getCollisionState();

      if (collision.curbContact) {
      const currentSpeed = this.vehicle.getState().speed;
      const speedAbs = Math.abs(currentSpeed);

      if (speedAbs > 0.05) {
        // Continuous physical sliding friction deceleration along curb (slows down gradually over seconds)
        const frictionMultiplier = Math.max(0.85, 1.0 - 1.2 * dt);
        this.vehicle.applyImpactSpeedReduction(frictionMultiplier);

        // Re-synchronize wheel speed and transmission driveline following curb sliding friction
        const postImpactWheelSpeed = this.vehicle.getState().speed / this.config.wheelRadius;
        this.transmission.update(transInputTorque, postImpactWheelSpeed);

        // Natural manual car stall physics:
        // Only stall if vehicle speed drops to near standstill (< 0.25 m/s) while in gear
        // with clutch engaged (pedalPosition < bitePointStart, e.g. < 0.40)
        const isClutchEngaged = clutchState.pedalPosition < this.config.clutch.bitePointStart;

        if (!isNeutral && isClutchEngaged) {
          const postRpm = this.transmission.getState().inputShaftRpm;
          if (speedAbs < 0.25 || postRpm < this.config.engine.stallRpm) {
            this.engine.stall();
          } else {
            this.engine.setLockedRpm(postRpm);
          }
        }
      }
    }
  }
}

  /**
   * Set road gradient in radians (positive = uphill, negative = downhill)
   */
  public setGrade(grade: number): void {
    this.vehicle.setGrade(grade);
  }

  /**
   * Set vehicle geodetic coordinates and optional heading angle
   */
  public setGeoPosition(lat: number, lon: number, headingDegrees?: number): void {
    this.kinematics.setPosition(lat, lon, headingDegrees);
  }

  /**
   * Set road collision enforcement mode:
   * - 'strict': Clamp vehicle inside corridor and prevent mounting curbs / sidewalks
   * - 'soft': Allow leaving corridor but report collisions
   * - 'off': Completely unrestricted free roaming
   */
  public setBoundaryMode(mode: RoadBoundaryMode): void {
    this.kinematics.setBoundaryMode(mode);
  }

  public getBoundaryMode(): RoadBoundaryMode {
    return this.kinematics.getBoundaryMode();
  }

  public getRoadNetwork(): RoadNetwork {
    return this.kinematics.getRoadNetwork();
  }

  /**
   * Return a snapshot of the full vehicle simulation state
   */
  public getState(controls?: InputState): VehicleState {
    const kinematicsState = this.kinematics.getState();
    return {
      timestamp: Date.now(),
      engine: this.engine.getState(),
      clutch: this.clutch.getState(),
      transmission: this.transmission.getState(),
      dynamics: this.vehicle.getState(),
      controls: controls || { ...this.lastInput },
      kinematics: kinematicsState,
      collision: kinematicsState.collision,
    };
  }

  public getEngine(): EngineModel {
    return this.engine;
  }

  public getClutch(): ClutchModel {
    return this.clutch;
  }

  public getTransmission(): TransmissionModel {
    return this.transmission;
  }

  public getVehicle(): VehicleDynamicsModel {
    return this.vehicle;
  }

  public getKinematics(): KinematicsModel {
    return this.kinematics;
  }

  public getConfig(): VehicleConfig {
    return this.config;
  }

  public reset(): void {
    this.engine.reset();
    this.clutch.reset();
    this.transmission.reset();
    this.vehicle.reset();
    this.kinematics.reset();
    this.kinematics.setBoundaryMode(this.initialBoundaryMode);
  }
}
