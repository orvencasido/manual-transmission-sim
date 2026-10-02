/**
 * Manual Driving Technique & Passenger Comfort Evaluator
 * Manual Driving Trainer — Taxi Mode
 *
 * Evaluates real-time manual powertrain technique:
 * - Engine stalls, clutch dumping, clutch riding, rollback
 * - Smooth bite launches, rev-matched downshifts, and proper stops
 */

import { VehicleState } from '@/lib/simulation/types';
import { ComfortEvent, ComfortEventType } from './types';

export interface EvaluatorSnapshot {
  comfort: number; // 0 to 100
  patienceRemainingSeconds: number;
  events: ComfortEvent[];
}

export class ComfortEvaluator {
  private lastEngineStatus: string = 'OFF';
  private lastGear: number = 0;
  private lastSpeed: number = 0;
  private lastClutchPedal: number = 0;
  private downshiftDetectedTime: number = 0;
  private downshiftTargetRpm: number = 0;

  // Timers and accumulators
  private ridingClutchTimer: number = 0;
  private launchCandidateActive: boolean = false;
  private launchStartRpm: number = 0;
  private rollbackOriginDistance: number | null = null;
  private maxRollbackObserved: number = 0;

  // Cooldown timers to prevent event spam
  private cooldowns: Record<string, number> = {};

  /**
   * Reset evaluator state for a new mission or shift.
   */
  public reset(): void {
    this.lastEngineStatus = 'OFF';
    this.lastGear = 0;
    this.lastSpeed = 0;
    this.lastClutchPedal = 0;
    this.downshiftDetectedTime = 0;
    this.downshiftTargetRpm = 0;
    this.ridingClutchTimer = 0;
    this.launchCandidateActive = false;
    this.launchStartRpm = 0;
    this.rollbackOriginDistance = null;
    this.maxRollbackObserved = 0;
    this.cooldowns = {};
  }

  /**
   * Check if a cooldown is expired, and reset it if active.
   */
  private checkAndSetCooldown(key: string, cooldownDurationSec: number): boolean {
    const now = Date.now();
    const last = this.cooldowns[key] || 0;
    if (now - last < cooldownDurationSec * 1000) {
      return false; // Still on cooldown
    }
    this.cooldowns[key] = now;
    return true;
  }

  /**
   * Create a ComfortEvent helper.
   */
  private createEvent(
    type: ComfortEventType,
    comfortDelta: number,
    message: string,
    patienceDelta?: number
  ): ComfortEvent {
    return {
      id: `comfort_event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      comfortDelta,
      patienceDelta,
      message,
      timestamp: Date.now(),
    };
  }

  /**
   * Evaluate manual driving technique for one frame/step.
   *
   * @param state Current VehicleState from the simulation loop
   * @param dt Elapsed time in seconds
   * @param curbContactReported Optional boolean indicating wall/curb collision
   * @returns Array of ComfortEvents triggered this frame
   */
  public evaluate(
    state: VehicleState,
    dt: number,
    curbContactReported?: boolean
  ): ComfortEvent[] {
    const events: ComfortEvent[] = [];
    const { engine, clutch, transmission, dynamics, controls } = state;

    // 1. ENGINE STALL EVALUATION
    if (engine.status === 'STALLED' && this.lastEngineStatus !== 'STALLED') {
      if (this.checkAndSetCooldown('stall', 3.0)) {
        events.push(
          this.createEvent(
            'stall',
            -20,
            'Namatayan ng makina! Engine stalled.',
            -15
          )
        );
      }
      this.launchCandidateActive = false;
    }

    // 2. CURB STRIKE / COLLISION
    if (curbContactReported && this.checkAndSetCooldown('curb_strike', 2.0)) {
      events.push(
        this.createEvent(
          'curb_strike',
          -15,
          'Sumampa sa bangketa! Struck road boundary curb.',
          -10
        )
      );
    }

    // 3. SMOOTH BITE-POINT LAUNCH EVALUATION
    // When starting from standstill in 1st gear or Reverse
    const isStationary = this.lastSpeed < 1.0;
    const isMovingForward = dynamics.speedKmh > 5.0;
    const inLaunchGear = transmission.currentGear === 1 || transmission.currentGear === -1;

    if (isStationary && inLaunchGear && clutch.pedalPosition > 0.4) {
      this.launchCandidateActive = true;
      this.launchStartRpm = engine.rpm;
    }

    if (this.launchCandidateActive) {
      // If clutch becomes locked without stalling and car accelerated smoothly
      if (clutch.isLocked && isMovingForward) {
        if (
          this.launchStartRpm >= 1100 &&
          this.launchStartRpm <= 1900 &&
          engine.status === 'RUNNING'
        ) {
          if (this.checkAndSetCooldown('smooth_bite', 5.0)) {
            events.push(
              this.createEvent(
                'smooth_bite',
                +5,
                'Suwabeng arangkada! Clean bite-point engagement.'
              )
            );
          }
        }
        this.launchCandidateActive = false;
      } else if (clutch.pedalPosition > 0.95 || transmission.currentGear === 0) {
        this.launchCandidateActive = false;
      }
    }

    // 4. REV-MATCHED DOWNSHIFT EVALUATION
    // Detect gear shift transition from higher to lower gear
    if (
      this.lastGear > 1 &&
      transmission.currentGear === this.lastGear - 1 &&
      clutch.pedalPosition > 0.5
    ) {
      this.downshiftDetectedTime = Date.now();
      this.downshiftTargetRpm = transmission.inputShaftRpm;
    }

    // When clutch is re-engaged shortly after downshifting
    if (
      this.downshiftDetectedTime > 0 &&
      Date.now() - this.downshiftDetectedTime < 1800
    ) {
      if (clutch.engagement > 0.8 && clutch.pedalPosition < 0.2) {
        const rpmDelta = Math.abs(engine.rpm - transmission.inputShaftRpm);
        if (rpmDelta < 180 && this.checkAndSetCooldown('rev_match', 4.0)) {
          events.push(
            this.createEvent(
              'rev_match',
              +8,
              'Swabeng downshift! Perfect rev-matched shift.'
            )
          );
        }
        this.downshiftDetectedTime = 0;
      }
    } else if (Date.now() - this.downshiftDetectedTime >= 1800) {
      this.downshiftDetectedTime = 0;
    }

    // 5. RIDING THE CLUTCH / FRICTION ABUSE EVALUATION
    // Cruising speed > 12 km/h while clutch is continuously slipping
    const isCruising = dynamics.speedKmh > 12;
    const isClutchRiding =
      clutch.pedalPosition > 0.25 &&
      clutch.pedalPosition < 0.75 &&
      !clutch.isLocked &&
      transmission.currentGear !== 0;

    if (isCruising && isClutchRiding) {
      this.ridingClutchTimer += dt;
      if (
        this.ridingClutchTimer > 2.5 &&
        this.checkAndSetCooldown('riding_clutch', 6.0)
      ) {
        events.push(
          this.createEvent(
            'riding_clutch',
            -5,
            'Nakapasan sa clutch! Riding the clutch while moving.'
          )
        );
        this.ridingClutchTimer = 0;
      }
    } else {
      this.ridingClutchTimer = Math.max(0, this.ridingClutchTimer - dt * 2);
    }

    // 6. INCLINE HILL ROLLBACK EVALUATION
    if (dynamics.grade > 0.03 && transmission.currentGear > 0) {
      if (dynamics.isRollingBackward) {
        if (this.rollbackOriginDistance === null) {
          this.rollbackOriginDistance = dynamics.distanceTraveled;
          this.maxRollbackObserved = 0;
        } else {
          const rollback = Math.max(
            0,
            this.rollbackOriginDistance - dynamics.distanceTraveled
          );
          if (rollback > this.maxRollbackObserved) {
            this.maxRollbackObserved = rollback;
          }
        }
      } else {
        if (
          this.maxRollbackObserved > 0.4 &&
          this.checkAndSetCooldown('severe_rollback', 5.0)
        ) {
          events.push(
            this.createEvent(
              'severe_rollback',
              -12,
              `Umatras sa ahon (${this.maxRollbackObserved.toFixed(1)}m)! Hill rollback warning.`
            )
          );
        }
        this.rollbackOriginDistance = null;
        this.maxRollbackObserved = 0;
      }
    } else {
      this.rollbackOriginDistance = null;
      this.maxRollbackObserved = 0;
    }

    // Update history references
    this.lastEngineStatus = engine.status;
    this.lastGear = transmission.currentGear;
    this.lastSpeed = dynamics.speedKmh;
    this.lastClutchPedal = clutch.pedalPosition;

    return events;
  }
}

/**
 * Validates whether the vehicle is properly brought to a halt for passenger boarding/deboarding:
 * 1. Vehicle is fully stopped (|speed| < 0.4 km/h)
 * 2. In Neutral (gear 0) OR clutch pedal fully depressed (> 0.85)
 * 3. Handbrake engaged OR firmly pressing foot brake (> 0.5)
 */
export function isStopAcceptableForPassenger(state: VehicleState): boolean {
  const isStopped = Math.abs(state.dynamics.speedKmh) < 0.4;
  const isDrivelineDecoupled =
    state.transmission.currentGear === 0 || state.clutch.pedalPosition > 0.85;
  const isSecured = state.controls.parkingBrake || state.controls.brake > 0.5;

  return isStopped && isDrivelineDecoupled && isSecured;
}

/**
 * Checks if the vehicle position is within arrival tolerance of a target GPS coordinate.
 * Default radius is 18 meters for generous urban curbside stopping.
 */
export function isAtTargetZone(
  carLat: number,
  carLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters = 18
): boolean {
  const METERS_PER_DEGREE_LAT = 111139;
  const METERS_PER_DEGREE_LON =
    111139 * Math.cos(((carLat + targetLat) / 2) * (Math.PI / 180));

  const dy = (targetLat - carLat) * METERS_PER_DEGREE_LAT;
  const dx = (targetLon - carLon) * METERS_PER_DEGREE_LON;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= radiusMeters;
}
