/**
 * Deterministic Rule-Based Instructor Evaluator
 * Manual Driving Trainer — Phase 8
 *
 * Strictly deterministic rule-based evaluation of simulation VehicleState.
 * Evaluates powertrain, clutch friction, driveline, and vehicle dynamics
 * in real-time to provide contextual, actionable driving instruction.
 *
 * NO LLM or AI in vehicle feedback loop.
 */

import { VehicleState, InstructorFeedback, EngineStatus } from '@/lib/simulation/types';

const SEVERITY_WEIGHT: Record<InstructorFeedback['type'], number> = {
  error: 4,
  warning: 3,
  success: 2,
  info: 1,
};

export interface StartAttemptState {
  tracking: boolean;
  startTime: number;
  initialSpeedKmh: number;
  excessiveSlip: boolean;
  maxSlipDuration: number;
  currentSlipDuration: number;
}

export class InstructorEvaluator {
  private lastEngineStatus: EngineStatus = 'OFF';
  private lastTimestamp: number = 0;
  private clutchRidingDuration: number = 0;
  private shiftUpDuration: number = 0;
  private luggingDuration: number = 0;
  private rollbackDuration: number = 0;

  // Timed event feedbacks (e.g., stall explanations, smooth start praise)
  private eventFeedbacks: Map<string, { feedback: InstructorFeedback; expiresAt: number }> = new Map();

  // Track start from standstill for smooth start praise
  private startAttempt: StartAttemptState = {
    tracking: false,
    startTime: 0,
    initialSpeedKmh: 0,
    excessiveSlip: false,
    maxSlipDuration: 0,
    currentSlipDuration: 0,
  };

  // Cooldown tracking for emitting persistent log events to the history store
  private lastEmittedTimes: Map<string, number> = new Map();

  private onFeedbackCallback?: (feedback: InstructorFeedback) => void;

  constructor(onFeedback?: (feedback: InstructorFeedback) => void) {
    this.onFeedbackCallback = onFeedback;
  }

  /**
   * Register or replace the event feedback callback
   */
  public setOnFeedback(callback?: (feedback: InstructorFeedback) => void): void {
    this.onFeedbackCallback = callback;
  }

  /**
   * Reset all evaluator memory (called when simulation resets)
   */
  public reset(): void {
    this.lastEngineStatus = 'OFF';
    this.lastTimestamp = 0;
    this.clutchRidingDuration = 0;
    this.shiftUpDuration = 0;
    this.luggingDuration = 0;
    this.rollbackDuration = 0;
    this.eventFeedbacks.clear();
    this.lastEmittedTimes.clear();
    this.startAttempt = {
      tracking: false,
      startTime: 0,
      initialSpeedKmh: 0,
      excessiveSlip: false,
      maxSlipDuration: 0,
      currentSlipDuration: 0,
    };
  }

  /**
   * Pure evaluation function that examines VehicleState and returns
   * all currently active InstructorFeedback items, sorted by priority.
   *
   * @param state Real-time vehicle simulation snapshot
   * @param dt Optional frame delta time in seconds
   */
  public evaluate(state: VehicleState, dt?: number): InstructorFeedback[] {
    const now = state.timestamp || Date.now();
    const effectiveDt =
      typeof dt === 'number' && dt > 0
        ? dt
        : this.lastTimestamp > 0
        ? Math.max(0.001, Math.min(0.1, (now - this.lastTimestamp) / 1000))
        : 0.016;

    this.lastTimestamp = now;

    // Clean up expired event feedbacks
    for (const [key, item] of this.eventFeedbacks.entries()) {
      if (now >= item.expiresAt) {
        this.eventFeedbacks.delete(key);
      }
    }

    const activeList: InstructorFeedback[] = [];

    // ------------------------------------------------------------------------
    // Rule 1: Stalling Diagnostic
    // "If engine transitions to STALLED while in gear, explain WHY"
    // ------------------------------------------------------------------------
    const justStalled =
      this.lastEngineStatus !== 'STALLED' &&
      state.engine.status === 'STALLED';

    if (justStalled) {
      const gear = state.transmission.currentGear;
      let stallReason = 'You stalled the engine.';

      if (state.collision?.curbContact) {
        stallReason = `You stalled from curb impact on ${state.collision.roadName || 'road barrier'}: dip the clutch [Space] during sudden stops.`;
      } else if (state.controls.parkingBrake) {
        stallReason = 'You stalled: parking brake was still engaged while releasing the clutch.';
      } else if (gear > 1) {
        stallReason = `You stalled: attempted to start in gear ${gear} instead of 1st gear. Shift to 1st gear.`;
      } else if (gear === 1 || gear === -1) {
        if (state.controls.throttle < 0.12 && state.controls.clutch < 0.35) {
          stallReason = 'You stalled: released the clutch without enough throttle. Apply gentle gas at the bite point.';
        } else if (state.controls.clutch < 0.45) {
          stallReason = 'You stalled: released the clutch too quickly through the bite point. Ease it out smoothly.';
        } else {
          stallReason = 'You stalled: clutch load exceeded engine torque. Give slightly more throttle and pause at bite point.';
        }
      }

      const stallFeedback: InstructorFeedback = {
        id: `stall-${now}`,
        type: 'error',
        message: stallReason,
        timestamp: now,
      };

      this.triggerEventFeedback('stall', stallFeedback, 6000, now);
      // Cancel any ongoing start attempt
      this.startAttempt.tracking = false;
    }

    // ------------------------------------------------------------------------
    // Rule 2: Bite Point Guidance
    // "When clutch is in friction zone (40% - 65%) and speed is near 0,
    //  notify: 'Bite point reached — apply gentle throttle and hold clutch steady'."
    // ------------------------------------------------------------------------
    const isStationaryOrCreeping = Math.abs(state.dynamics.speedKmh) < 3.0;
    const isClutchInBiteZone =
      state.controls.clutch >= 0.40 && state.controls.clutch <= 0.65;
    const isEngineRunning = state.engine.status === 'RUNNING';
    const isInGear = state.transmission.currentGear !== 0;

    if (isEngineRunning && isInGear && isStationaryOrCreeping && isClutchInBiteZone) {
      const biteFeedback: InstructorFeedback = {
        id: 'bite-point-guidance',
        type: 'info',
        message: 'Bite point reached — apply gentle throttle and hold clutch steady.',
        timestamp: now,
      };
      activeList.push(biteFeedback);
      this.maybeEmitPersistent('bite-point', biteFeedback, 4000, now);
    }

    // ------------------------------------------------------------------------
    // Rule 3: Riding the Clutch Warning
    // "If clutch is slipping (engagement between 10% and 90%) while RPM > 2500
    //  for more than 2 seconds, issue warning:
    //  'Warning: Riding the clutch causes premature clutch wear'."
    // ------------------------------------------------------------------------
    const isSlippingClutch =
      state.clutch.engagement >= 0.10 &&
      state.clutch.engagement <= 0.90 &&
      !state.clutch.isLocked;
    const isHighRpm = state.engine.rpm > 2500;

    if (isEngineRunning && isSlippingClutch && isHighRpm) {
      this.clutchRidingDuration += effectiveDt;
      if (this.clutchRidingDuration >= 2.0) {
        const ridingFeedback: InstructorFeedback = {
          id: 'riding-clutch',
          type: 'warning',
          message: 'Warning: Riding the clutch causes premature clutch wear. Fully release or depress the clutch pedal.',
          timestamp: now,
        };
        activeList.push(ridingFeedback);
        this.maybeEmitPersistent('riding-clutch', ridingFeedback, 4000, now);
      }
    } else {
      this.clutchRidingDuration = Math.max(0, this.clutchRidingDuration - effectiveDt * 2);
    }

    // ------------------------------------------------------------------------
    // Rule 4: Smooth Start Praise
    // "When moving smoothly from 0 to > 10 km/h in 1st gear without stalling
    //  or excessive slip, trigger praise: 'Smooth start executed perfectly!'."
    // ------------------------------------------------------------------------
    const currentSpeedKmh = state.dynamics.speedKmh;
    const isFirstGear = state.transmission.currentGear === 1;

    if (isEngineRunning && isFirstGear) {
      // 1. Initiate start tracking when car is stationary and clutch begins release
      if (!this.startAttempt.tracking) {
        if (Math.abs(currentSpeedKmh) < 1.0 && state.controls.clutch > 0.40) {
          this.startAttempt = {
            tracking: true,
            startTime: now,
            initialSpeedKmh: currentSpeedKmh,
            excessiveSlip: false,
            maxSlipDuration: 0,
            currentSlipDuration: 0,
          };
        }
      } else {
        // 2. We are currently tracking a start from 0 -> 10 km/h
        if (isSlippingClutch) {
          this.startAttempt.currentSlipDuration += effectiveDt;
          if (this.startAttempt.currentSlipDuration > this.startAttempt.maxSlipDuration) {
            this.startAttempt.maxSlipDuration = this.startAttempt.currentSlipDuration;
          }

          // Excessive slip checks: RPM revving beyond 3200 while slipping, or slipping > 3.0s once moving
          if (state.engine.rpm > 3200 || (this.startAttempt.currentSlipDuration > 3.0 && currentSpeedKmh > 2.0)) {
            this.startAttempt.excessiveSlip = true;
          }
        } else {
          this.startAttempt.currentSlipDuration = 0;
        }

        // 3. Goal reached: Speed exceeds 10 km/h and clutch is engaged
        if (currentSpeedKmh >= 10.0) {
          const isClutchEngaged = state.controls.clutch < 0.20 || state.clutch.isLocked;
          if (isClutchEngaged) {
            if (!this.startAttempt.excessiveSlip) {
              const praiseFeedback: InstructorFeedback = {
                id: `smooth-start-${now}`,
                type: 'success',
                message: 'Smooth start executed perfectly!',
                timestamp: now,
              };
              this.triggerEventFeedback('smooth-start', praiseFeedback, 5000, now);
            }
            this.startAttempt.tracking = false;
          }
        }

        // Abort tracking if driver stops, shifts gear, or reverses
        if (currentSpeedKmh < -0.5 || state.transmission.currentGear !== 1) {
          this.startAttempt.tracking = false;
        }
      }
    } else {
      this.startAttempt.tracking = false;
    }

    // ------------------------------------------------------------------------
    // Rule 5: Gear Shift Recommendation
    // - "If RPM > 3500 and speed is steady, suggest: 'Consider shifting to a higher gear'."
    // - "If engine is lugging (< 1100 RPM under load in high gear), suggest: 'Downshift to a lower gear'."
    // ------------------------------------------------------------------------
    if (isEngineRunning && !justStalled) {
      const gear = state.transmission.currentGear;
      const isClutchEngaged = state.controls.clutch < 0.25;

      // Upshift check: RPM > 3500, forward gears 1..4, clutch engaged, speed relatively steady
      const isSteadySpeed = Math.abs(state.dynamics.acceleration) < 1.0;
      if (gear >= 1 && gear < 5 && isClutchEngaged && state.engine.rpm > 3500 && isSteadySpeed) {
        this.shiftUpDuration += effectiveDt;
        if (this.shiftUpDuration >= 0.75) {
          const shiftUpFeedback: InstructorFeedback = {
            id: 'shift-up-recommendation',
            type: 'info',
            message: `Consider shifting to a higher gear (Gear ${gear + 1}).`,
            timestamp: now,
          };
          activeList.push(shiftUpFeedback);
          this.maybeEmitPersistent('shift-up', shiftUpFeedback, 5000, now);
        }
      } else {
        this.shiftUpDuration = 0;
      }

      // Downshift / Lugging check: gear >= 2, RPM < 1100 under load or isLugging
      const isUnderLoad = state.controls.throttle > 0.15;
      const isLugging =
        gear >= 2 &&
        isClutchEngaged &&
        (state.engine.isLugging || (state.engine.rpm < 1100 && isUnderLoad));

      if (isLugging) {
        this.luggingDuration += effectiveDt;
        if (this.luggingDuration >= 0.4) {
          const downshiftFeedback: InstructorFeedback = {
            id: 'downshift-recommendation',
            type: 'warning',
            message: `Engine lugging at low RPM — downshift to a lower gear (Gear ${gear - 1}).`,
            timestamp: now,
          };
          activeList.push(downshiftFeedback);
          this.maybeEmitPersistent('downshift', downshiftFeedback, 4000, now);
        }
      } else {
        this.luggingDuration = 0;
      }
    }

    // ------------------------------------------------------------------------
    // Rule 6: Hill Start Alert
    // "If rolling backward on a hill, advise: 'Vehicle rolling backward — use handbrake or find bite point faster'."
    // ------------------------------------------------------------------------
    const isTryingToGoForward = state.transmission.currentGear >= 1;
    const isRollingBackward =
      state.dynamics.isRollingBackward ||
      (state.dynamics.grade > 0.015 && state.dynamics.speed < -0.10);

    if (isTryingToGoForward && isRollingBackward) {
      this.rollbackDuration += effectiveDt;
      if (this.rollbackDuration >= 0.25) {
        const hillFeedback: InstructorFeedback = {
          id: 'hill-start-rollback',
          type: 'warning',
          message: 'Vehicle rolling backward — use handbrake or find bite point faster.',
          timestamp: now,
        };
        activeList.push(hillFeedback);
        this.maybeEmitPersistent('hill-rollback', hillFeedback, 3000, now);
      }
    } else {
      this.rollbackDuration = 0;
    }

    // ------------------------------------------------------------------------
    // Additional Ergonomic Feedback: Handbrake drag warning
    // ------------------------------------------------------------------------
    if (state.controls.parkingBrake && Math.abs(state.dynamics.speedKmh) > 5.0) {
      const handbrakeFeedback: InstructorFeedback = {
        id: 'handbrake-drag',
        type: 'warning',
        message: 'Parking brake is engaged while vehicle is moving — press [P] to release.',
        timestamp: now,
      };
      activeList.push(handbrakeFeedback);
    }

    // ------------------------------------------------------------------------
    // Rule 7: Road Boundary & Curb Strike Alert
    // ------------------------------------------------------------------------
    const collision = state.collision || state.kinematics?.collision;
    if (collision?.curbContact && collision.boundaryMode !== 'off') {
      const isStrict = collision.boundaryMode === 'strict';
      const curbFeedback: InstructorFeedback = {
        id: 'curb-strike-alert',
        type: isStrict ? 'error' : 'warning',
        message: isStrict
          ? `Curb strike on ${collision.roadName || 'road'}! Keep vehicle centered between road boundaries.`
          : `Vehicle veered off-road onto shoulder (${collision.roadName || 'road'}). Steer back to paved lane.`,
        timestamp: now,
      };
      activeList.push(curbFeedback);
      this.maybeEmitPersistent('curb-strike', curbFeedback, 2500, now);
    }

    // Include unexpired event feedbacks
    for (const item of this.eventFeedbacks.values()) {
      activeList.push(item.feedback);
    }

    // Update state tracking for next evaluation tick
    this.lastEngineStatus = state.engine.status;

    // Sort active feedbacks by severity priority: error > warning > success > info
    activeList.sort((a, b) => {
      const weightDiff = SEVERITY_WEIGHT[b.type] - SEVERITY_WEIGHT[a.type];
      if (weightDiff !== 0) return weightDiff;
      return b.timestamp - a.timestamp;
    });

    return activeList;
  }

  /**
   * Helper to trigger a temporary event feedback (e.g. stall explanation or praise)
   */
  private triggerEventFeedback(
    key: string,
    feedback: InstructorFeedback,
    durationMs: number,
    now: number
  ): void {
    this.eventFeedbacks.set(key, {
      feedback,
      expiresAt: now + durationMs,
    });

    if (this.onFeedbackCallback) {
      this.onFeedbackCallback(feedback);
    }
  }

  /**
   * Helper to emit state-based guidance to the permanent log with cooldown debouncing
   */
  private maybeEmitPersistent(
    key: string,
    feedback: InstructorFeedback,
    cooldownMs: number,
    now: number
  ): void {
    const lastTime = this.lastEmittedTimes.get(key) || 0;
    if (now - lastTime >= cooldownMs) {
      this.lastEmittedTimes.set(key, now);
      if (this.onFeedbackCallback) {
        this.onFeedbackCallback(feedback);
      }
    }
  }
}
