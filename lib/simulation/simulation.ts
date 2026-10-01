/**
 * Simulation Orchestrator — Placeholder & Initial Contracts
 * Manual Driving Trainer
 */

import { VehicleConfig, VehicleState, InputState } from './types';
import { DEFAULT_VEHICLE_CONFIG } from './physics';
import { EngineModel } from './engine';
import { ClutchModel } from './clutch';
import { TransmissionModel } from './transmission';
import { VehicleDynamicsModel } from './vehicle';

export class Simulation {
  private config: VehicleConfig;
  private engine: EngineModel;
  private clutch: ClutchModel;
  private transmission: TransmissionModel;
  private vehicle: VehicleDynamicsModel;

  constructor(config: VehicleConfig = DEFAULT_VEHICLE_CONFIG) {
    this.config = config;
    this.engine = new EngineModel(config.engine);
    this.clutch = new ClutchModel(config.clutch);
    this.transmission = new TransmissionModel(config.transmission);
    this.vehicle = new VehicleDynamicsModel(config);
  }

  public tick(input: InputState, dt: number): void {
    this.transmission.setGear(input.gear);
    this.clutch.update(input.clutch, this.engine.getState().angularVelocity, 0, dt);
    this.engine.update(input.throttle, this.clutch.getState().slipTorque, dt);
    this.transmission.update(this.clutch.getState().slipTorque, 0);
    this.vehicle.update(this.transmission.getState().wheelTorque, input.brake, input.parkingBrake, dt);
  }

  public getState(controls?: InputState): VehicleState {
    const defaultControls: InputState = {
      throttle: 0.0,
      brake: 0.0,
      clutch: 0.0,
      steering: 0.0,
      gear: 0,
      parkingBrake: true,
      isStarterEngaged: false,
    };

    return {
      timestamp: Date.now(),
      engine: this.engine.getState(),
      clutch: this.clutch.getState(),
      transmission: this.transmission.getState(),
      dynamics: this.vehicle.getState(),
      controls: controls || defaultControls,
    };
  }

  public reset(): void {
    this.engine.reset();
    this.clutch.reset();
    this.transmission.reset();
    this.vehicle.reset();
  }
}
