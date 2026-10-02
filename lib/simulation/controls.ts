/**
 * Controls System — Continuous Timed Input Ramping
 * Manual Driving Trainer
 */

import { InputState } from './types';
import { clamp } from './physics';

export interface ControlRatesConfig {
  throttlePressRate: number; // units/sec (e.g. 1.8 -> 0 to 1 in ~0.55s)
  throttleReleaseRate: number; // units/sec (e.g. 3.0 -> 1 to 0 in ~0.33s)
  brakePressRate: number; // units/sec (e.g. 2.5 -> 0 to 1 in ~0.40s)
  brakeReleaseRate: number; // units/sec (e.g. 4.0 -> 1 to 0 in ~0.25s)
  clutchPressRate: number; // units/sec (e.g. 3.5 -> 0 to 1 in ~0.28s)
  clutchReleaseRate: number; // units/sec (e.g. 1.2 -> 1 to 0 in ~0.83s)
  steeringPressRate: number; // units/sec (e.g. 2.2)
  steeringReturnRate: number; // units/sec (e.g. 3.0)
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

export type GearShiftCallback = (newGear: number) => void;
export type PauseCallback = () => void;

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

  private rates: ControlRatesConfig;
  private activeKeys = new Set<string>();
  private processedDiscreteKeys = new Set<string>();
  private isAttached = false;

  private onGearChange?: GearShiftCallback;
  private onPauseToggle?: PauseCallback;

  // Bound event listeners for clean teardown
  private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);

  constructor(
    rates: ControlRatesConfig = DEFAULT_CONTROL_RATES,
    callbacks?: {
      onGearChange?: GearShiftCallback;
      onPauseToggle?: PauseCallback;
    }
  ) {
    this.rates = { ...rates };
    this.onGearChange = callbacks?.onGearChange;
    this.onPauseToggle = callbacks?.onPauseToggle;
  }

  /**
   * Attach keyboard listeners to window or container
   */
  public attach(target?: Window | HTMLElement, options: AddEventListenerOptions = { passive: false }): void {
    if (this.isAttached) return;

    const eventTarget = target || (typeof window !== 'undefined' ? window : null);
    if (!eventTarget) return;

    eventTarget.addEventListener('keydown', this.boundKeyDown as EventListener, options);
    eventTarget.addEventListener('keyup', this.boundKeyUp as EventListener, options);
    this.isAttached = true;
  }

  /**
   * Detach keyboard listeners
   */
  public detach(target?: Window | HTMLElement): void {
    if (!this.isAttached) return;

    const eventTarget = target || (typeof window !== 'undefined' ? window : null);
    if (eventTarget) {
      eventTarget.removeEventListener('keydown', this.boundKeyDown as EventListener);
      eventTarget.removeEventListener('keyup', this.boundKeyUp as EventListener);
    }

    this.activeKeys.clear();
    this.processedDiscreteKeys.clear();
    this.isAttached = false;
  }

  /**
   * Normalized key helper
   */
  private normalizeKey(key: string, code?: string): string {
    const k = key.toLowerCase();
    if (k === ' ' || code === 'Space') return 'space';
    if (k === 'w' || code === 'KeyW') return 'w';
    if (k === 's' || code === 'KeyS') return 's';
    if (k === 'a' || code === 'KeyA') return 'a';
    if (k === 'd' || code === 'KeyD') return 'd';
    if (k === 'e' || code === 'KeyE') return 'e';
    if (k === 'q' || code === 'KeyQ') return 'q';
    if (k === 'n' || code === 'KeyN') return 'n';
    if (k === 'r' || code === 'KeyR') return 'r';
    if (k === 'p' || code === 'KeyP') return 'p';
    if (k === 'i' || code === 'KeyI') return 'i';
    if (k === 'escape' || code === 'Escape') return 'escape';
    return k;
  }

  /**
   * Handle keydown event
   */
  public handleKeyDown(e: KeyboardEvent | { key: string; code?: string; target?: unknown; preventDefault?: () => void }): void {
    // Ignore input if user is typing in a form field
    const target = (e as { target?: unknown }).target as HTMLElement | undefined;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    const key = this.normalizeKey(e.key, e.code);

    if (key === 'space') {
      if ('preventDefault' in e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    }

    this.activeKeys.add(key);

    // Discrete edge-triggered actions (fire once per press until released)
    if (!this.processedDiscreteKeys.has(key)) {
      this.processedDiscreteKeys.add(key);
      this.handleDiscreteKey(key);
    }
  }

  /**
   * Handle keyup event
   */
  public handleKeyUp(e: KeyboardEvent | { key: string; code?: string; target?: unknown; preventDefault?: () => void }): void {
    const target = (e as { target?: unknown }).target as HTMLElement | undefined;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    const key = this.normalizeKey(e.key, e.code);

    if (key === 'space') {
      if ('preventDefault' in e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    }

    this.activeKeys.delete(key);
    this.processedDiscreteKeys.delete(key);

    if (key === 'i') {
      this.state.isStarterEngaged = false;
    }
  }

  /**
   * Handle discrete one-shot key triggers
   */
  private handleDiscreteKey(key: string): void {
    switch (key) {
      case 'e':
        this.shiftUp();
        break;
      case 'q':
        this.shiftDown();
        break;
      case 'n':
        this.setGear(0);
        break;
      case 'r':
        this.setGear(-1);
        break;
      case 'p':
        this.state.parkingBrake = !this.state.parkingBrake;
        break;
      case 'i':
        this.state.isStarterEngaged = true;
        break;
      case 'escape':
        if (this.onPauseToggle) {
          this.onPauseToggle();
        }
        break;
    }
  }

  /**
   * Sequential upshift (R -> N -> 1 -> 2 -> 3 -> 4 -> 5)
   */
  public shiftUp(): void {
    let nextGear = this.state.gear;
    if (this.state.gear === -1) {
      nextGear = 0; // From Reverse to Neutral
    } else if (this.state.gear < 5) {
      nextGear = this.state.gear + 1;
    }
    this.setGear(nextGear);
  }

  /**
   * Sequential downshift (5 -> 4 -> 3 -> 2 -> 1 -> N)
   */
  public shiftDown(): void {
    let nextGear = this.state.gear;
    if (this.state.gear > 0) {
      nextGear = this.state.gear - 1;
    }
    this.setGear(nextGear);
  }

  /**
   * Direct gear set
   */
  public setGear(gear: number): void {
    if (gear >= -1 && gear <= 5) {
      this.state.gear = gear;
      if (this.onGearChange) {
        this.onGearChange(gear);
      }
    }
  }

  /**
   * Programmatic manual key control
   */
  public setVirtualKeyDown(key: string): void {
    this.handleKeyDown({ key });
  }

  public setVirtualKeyUp(key: string): void {
    this.handleKeyUp({ key });
  }

  /**
   * Update continuous pedal & steering values using elapsed delta time
   */
  public update(dt: number): void {
    if (dt <= 0) return;

    // 1. Throttle ramping (W key)
    const isThrottlePressed = this.activeKeys.has('w');
    if (isThrottlePressed) {
      this.state.throttle = clamp(
        this.state.throttle + this.rates.throttlePressRate * dt,
        0.0,
        1.0
      );
    } else {
      this.state.throttle = clamp(
        this.state.throttle - this.rates.throttleReleaseRate * dt,
        0.0,
        1.0
      );
    }

    // 2. Brake ramping (S key)
    const isBrakePressed = this.activeKeys.has('s');
    if (isBrakePressed) {
      this.state.brake = clamp(
        this.state.brake + this.rates.brakePressRate * dt,
        0.0,
        1.0
      );
    } else {
      this.state.brake = clamp(
        this.state.brake - this.rates.brakeReleaseRate * dt,
        0.0,
        1.0
      );
    }

    // 3. Clutch ramping (Space key)
    // Pressing Space pushes clutch pedal DOWN (disengaging clutch)
    // Releasing Space releases clutch pedal UP (engaging clutch through bite zone)
    const isClutchPressed = this.activeKeys.has('space');
    if (isClutchPressed) {
      this.state.clutch = clamp(
        this.state.clutch + this.rates.clutchPressRate * dt,
        0.0,
        1.0
      );
    } else {
      this.state.clutch = clamp(
        this.state.clutch - this.rates.clutchReleaseRate * dt,
        0.0,
        1.0
      );
    }

    // 4. Steering ramping (A and D keys)
    const isSteerLeft = this.activeKeys.has('a');
    const isSteerRight = this.activeKeys.has('d');

    if (isSteerLeft && !isSteerRight) {
      this.state.steering = clamp(
        this.state.steering - this.rates.steeringPressRate * dt,
        -1.0,
        1.0
      );
    } else if (isSteerRight && !isSteerLeft) {
      this.state.steering = clamp(
        this.state.steering + this.rates.steeringPressRate * dt,
        -1.0,
        1.0
      );
    } else {
      // Auto-return steering to center (0.0)
      if (this.state.steering > 0) {
        this.state.steering = Math.max(0.0, this.state.steering - this.rates.steeringReturnRate * dt);
      } else if (this.state.steering < 0) {
        this.state.steering = Math.min(0.0, this.state.steering + this.rates.steeringReturnRate * dt);
      }
    }
  }

  /**
   * Return immutable copy of current normalized InputState
   */
  public getState(): InputState {
    return { ...this.state };
  }

  /**
   * Set entire rates configuration
   */
  public setRates(rates: Partial<ControlRatesConfig>): void {
    this.rates = { ...this.rates, ...rates };
  }

  public getRates(): ControlRatesConfig {
    return { ...this.rates };
  }

  /**
   * Reset all controls to default stationary baseline
   */
  public reset(): void {
    this.activeKeys.clear();
    this.processedDiscreteKeys.clear();
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
