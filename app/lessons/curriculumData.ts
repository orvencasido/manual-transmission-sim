import { VehicleState } from '@/lib/simulation/types';

export interface LessonStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  telemetryHint: string;
  /**
   * Minimum duration in seconds the condition must be continuously held to pass.
   * Defaults to 0 (immediate).
   */
  holdDurationSeconds?: number;
  /**
   * Pure evaluation function reading snapshot state and step hold timer.
   * Returns true if step requirement is met.
   */
  isCompleted: (state: VehicleState, holdTimeSeconds: number) => boolean;
  /**
   * Returns a real-time status string for the step telemetry HUD badge
   */
  getTelemetryStatus: (state: VehicleState) => {
    label: string;
    value: string;
    isTargetMet: boolean;
  };
}

export interface LessonFailure {
  isTriggered: (
    state: VehicleState,
    stepIndex: number,
    stats: { stalls: number; maxRollbackMeters: number; attemptDuration: number }
  ) => { failed: boolean; reason?: string };
}

export interface LessonDefinition {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  objective: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedDuration: string;
  initialGradePct: number;
  steps: LessonStep[];
  failureRules: LessonFailure[];
}

export const LESSONS: LessonDefinition[] = [
  // --------------------------------------------------------------------------
  // LESSON 1: Finding the Bite Point
  // --------------------------------------------------------------------------
  {
    id: 1,
    slug: 'bite-point',
    title: 'Finding the Bite Point',
    subtitle: 'Clutch Friction Zone & Idle Creep',
    objective:
      'Learn clutch modulation and locate the friction zone without touching the gas pedal. Bring the car to a forward creep above 1.0 km/h without stalling.',
    difficulty: 'Beginner',
    estimatedDuration: '2 mins',
    initialGradePct: 0,
    steps: [
      {
        id: 'step-prep',
        title: 'Clutch In & 1st Gear',
        description: 'Depress the clutch pedal all the way down and select 1st gear.',
        instruction: 'Press and hold Space to push the clutch in, then press E to engage 1st gear.',
        telemetryHint: 'Clutch: 100% | Gear: 1',
        isCompleted: (state) =>
          state.transmission.currentGear === 1 && state.clutch.pedalPosition > 0.85,
        getTelemetryStatus: (state) => ({
          label: 'Clutch & Gear',
          value:
            state.transmission.currentGear === 1
              ? `Gear 1 (${Math.round(state.clutch.pedalPosition * 100)}% clutch)`
              : state.clutch.pedalPosition > 0.85
              ? 'Clutch in, press E for 1st'
              : 'Hold Space for clutch',
          isTargetMet:
            state.transmission.currentGear === 1 && state.clutch.pedalPosition > 0.85,
        }),
      },
      {
        id: 'step-handbrake',
        title: 'Release Handbrake',
        description: 'Disengage the parking brake so the car is free to move forward.',
        instruction: 'Keep the clutch depressed and press P to disengage the handbrake.',
        telemetryHint: 'Parking Brake: OFF',
        isCompleted: (state) =>
          state.transmission.currentGear === 1 &&
          state.clutch.pedalPosition > 0.85 &&
          !state.controls.parkingBrake,
        getTelemetryStatus: (state) => ({
          label: 'Parking Brake',
          value: state.controls.parkingBrake ? 'Engaged (Press P)' : 'Released ✔',
          isTargetMet: !state.controls.parkingBrake,
        }),
      },
      {
        id: 'step-bite-point',
        title: 'Find the Friction Zone',
        description:
          'Slowly ease off the clutch pedal (Space) without touching the throttle (W). Watch for RPM to dip slightly as friction begins.',
        instruction:
          'Release Space slowly until clutch pedal is around 40-60%. Notice the engine sound deepen and RPM dip to ~700-750 RPM.',
        telemetryHint: 'Clutch: 40-70% | RPM dip ~700 RPM | No Throttle',
        isCompleted: (state) =>
          state.clutch.pedalPosition < 0.75 &&
          state.clutch.slipTorque > 15 &&
          state.engine.status === 'RUNNING',
        getTelemetryStatus: (state) => ({
          label: 'Clutch Slip Torque',
          value: `${Math.round(state.clutch.slipTorque)} Nm (Pedal ${Math.round(
            state.clutch.pedalPosition * 100
          )}%)`,
          isTargetMet: state.clutch.slipTorque > 15,
        }),
      },
      {
        id: 'step-creep',
        title: 'Maintain Idle Creep (> 1 km/h)',
        description:
          'Hold the clutch steady right at the bite point. Let the idle governor propel the car forward above 1.0 km/h for 1.5 seconds without stalling.',
        instruction:
          'Keep your foot steady on the clutch! DO NOT touch throttle (W). Let the car roll forward smoothly.',
        telemetryHint: 'Speed: > 1.0 km/h | Hold for 1.5s',
        holdDurationSeconds: 1.5,
        isCompleted: (state, holdTime) =>
          state.dynamics.speedKmh >= 1.0 &&
          state.controls.throttle < 0.05 &&
          state.engine.status === 'RUNNING' &&
          holdTime >= 1.5,
        getTelemetryStatus: (state) => ({
          label: 'Creep Speed',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h (Target: ≥ 1.0 km/h)`,
          isTargetMet: state.dynamics.speedKmh >= 1.0,
        }),
      },
    ],
    failureRules: [
      {
        isTriggered: (state) => {
          if (state.engine.status === 'STALLED') {
            return {
              failed: true,
              reason:
                'Engine stalled! The clutch was released too quickly through the bite point without giving the engine idle governor time to transfer torque.',
            };
          }
          if (state.controls.throttle > 0.06) {
            return {
              failed: true,
              reason:
                'Throttle detected! Lesson 1 strictly forbids using the gas pedal. Rely solely on clutch modulation and idle torque.',
            };
          }
          return { failed: false };
        },
      },
    ],
  },

  // --------------------------------------------------------------------------
  // LESSON 2: Smooth Flat Starts
  // --------------------------------------------------------------------------
  {
    id: 2,
    slug: 'smooth-starts',
    title: 'Smooth Flat Starts',
    subtitle: 'Throttle & Clutch Coordination',
    objective:
      'Coordinate 1,500–2,000 RPM gentle throttle with progressive clutch release to accelerate smoothly past 15 km/h from a standstill.',
    difficulty: 'Beginner',
    estimatedDuration: '3 mins',
    initialGradePct: 0,
    steps: [
      {
        id: 'step-prep-start',
        title: 'Clutch In, 1st Gear & Handbrake Off',
        description: 'Depress clutch (Space), shift to 1st gear (E), and release handbrake (P).',
        instruction: 'Hold Space, press E to shift into 1st, and press P if handbrake is on.',
        telemetryHint: 'Clutch: 100% | Gear: 1 | Handbrake: OFF',
        isCompleted: (state) =>
          state.transmission.currentGear === 1 &&
          state.clutch.pedalPosition > 0.85 &&
          !state.controls.parkingBrake,
        getTelemetryStatus: (state) => ({
          label: 'Preparation',
          value:
            state.transmission.currentGear !== 1
              ? 'Select 1st Gear'
              : state.controls.parkingBrake
              ? 'Release Handbrake (P)'
              : 'Ready ✔',
          isTargetMet:
            state.transmission.currentGear === 1 &&
            state.clutch.pedalPosition > 0.85 &&
            !state.controls.parkingBrake,
        }),
      },
      {
        id: 'step-hold-throttle',
        title: 'Set Launch RPM (1,500–2,200 RPM)',
        description:
          'With clutch kept down, apply a light, steady touch on the gas pedal (W) to hold engine speed between 1,500 and 2,200 RPM.',
        instruction:
          'Gently tap or feather W. Hold RPM between 1,500 and 2,200 for 0.8 seconds before releasing clutch.',
        telemetryHint: 'Target RPM: 1,500 – 2,200 RPM',
        holdDurationSeconds: 0.8,
        isCompleted: (state, holdTime) =>
          state.engine.rpm >= 1450 &&
          state.engine.rpm <= 2350 &&
          state.clutch.pedalPosition > 0.85 &&
          holdTime >= 0.8,
        getTelemetryStatus: (state) => ({
          label: 'Target RPM',
          value: `${Math.round(state.engine.rpm)} RPM (Target: 1500–2200)`,
          isTargetMet: state.engine.rpm >= 1450 && state.engine.rpm <= 2350,
        }),
      },
      {
        id: 'step-ease-clutch',
        title: 'Ease Clutch into Bite Point',
        description:
          'While maintaining your gentle throttle, progressively release the clutch pedal through the friction zone.',
        instruction:
          'Release Space smoothly to about 40–50% pedal travel while keeping throttle applied. The vehicle will accelerate smoothly.',
        telemetryHint: 'Speed: > 3.0 km/h | Clutch: ~40-60%',
        isCompleted: (state) =>
          state.dynamics.speedKmh > 3.0 &&
          state.clutch.pedalPosition < 0.7 &&
          state.engine.status === 'RUNNING',
        getTelemetryStatus: (state) => ({
          label: 'Speed & Bite',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h | Clutch ${Math.round(
            state.clutch.pedalPosition * 100
          )}%`,
          isTargetMet: state.dynamics.speedKmh > 3.0,
        }),
      },
      {
        id: 'step-reach-15',
        title: 'Smooth Acceleration Past 15 km/h',
        description:
          'Release the clutch pedal completely (0%) and accelerate smoothly past 15 km/h.',
        instruction:
          'Lift off Space entirely and feed in throttle until your speedometer passes 15 km/h.',
        telemetryHint: 'Speed: ≥ 15 km/h | Clutch: 0%',
        isCompleted: (state) =>
          state.dynamics.speedKmh >= 15.0 &&
          state.clutch.pedalPosition < 0.15 &&
          state.engine.status === 'RUNNING',
        getTelemetryStatus: (state) => ({
          label: 'Vehicle Speed',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h (Target: ≥ 15.0 km/h)`,
          isTargetMet: state.dynamics.speedKmh >= 15.0,
        }),
      },
    ],
    failureRules: [
      {
        isTriggered: (state) => {
          if (state.engine.status === 'STALLED') {
            return {
              failed: true,
              reason:
                'Engine stalled! The clutch was released too quickly for the amount of throttle applied.',
            };
          }
          if (state.engine.rpm > 4500) {
            return {
              failed: true,
              reason:
                'Excessive engine revving (> 4,500 RPM)! High revs during clutch release glaze the friction disc.',
            };
          }
          return { failed: false };
        },
      },
    ],
  },

  // --------------------------------------------------------------------------
  // LESSON 3: Sequential Upshifting
  // --------------------------------------------------------------------------
  {
    id: 3,
    slug: 'sequential-upshifting',
    title: 'Sequential Upshifting',
    subtitle: 'Coordinating 1st → 2nd → 3rd Gear',
    objective:
      'Accelerate in 1st gear, shift smoothly into 2nd gear, match revs on re-engagement, and upshift into 3rd gear cruising above 35 km/h.',
    difficulty: 'Intermediate',
    estimatedDuration: '3-4 mins',
    initialGradePct: 0,
    steps: [
      {
        id: 'step-accel-1st',
        title: 'Accelerate in 1st Gear (> 16 km/h)',
        description: 'Engage 1st gear, release handbrake, and accelerate past 16 km/h.',
        instruction:
          'Start from a stop in 1st gear and apply throttle until vehicle speed exceeds 16 km/h (RPM ~ 2,500).',
        telemetryHint: 'Gear: 1 | Speed: ≥ 16 km/h',
        isCompleted: (state) =>
          state.transmission.currentGear === 1 &&
          state.dynamics.speedKmh >= 16.0 &&
          state.clutch.pedalPosition < 0.2,
        getTelemetryStatus: (state) => ({
          label: '1st Gear Speed',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h (Target: ≥ 16 km/h)`,
          isTargetMet:
            state.transmission.currentGear === 1 && state.dynamics.speedKmh >= 16.0,
        }),
      },
      {
        id: 'step-shift-2nd',
        title: 'Clutch In & Upshift to 2nd Gear',
        description:
          'Depress clutch (Space), lift off gas (W), press E to engage 2nd gear, and smoothly release clutch.',
        instruction:
          'Press Space, press E to select 2nd, and let the clutch back up smoothly.',
        telemetryHint: 'Gear: 2 | Clutch: Released',
        isCompleted: (state) =>
          state.transmission.currentGear === 2 &&
          state.clutch.pedalPosition < 0.2 &&
          state.engine.status === 'RUNNING',
        getTelemetryStatus: (state) => ({
          label: 'Gear 2 Status',
          value:
            state.transmission.currentGear === 2
              ? `In 2nd Gear (Clutch ${Math.round(state.clutch.pedalPosition * 100)}%)`
              : 'Press Space + E for 2nd',
          isTargetMet:
            state.transmission.currentGear === 2 && state.clutch.pedalPosition < 0.2,
        }),
      },
      {
        id: 'step-accel-2nd',
        title: 'Accelerate in 2nd Gear (> 30 km/h)',
        description: 'Apply throttle in 2nd gear to accelerate forward past 30 km/h.',
        instruction: 'Feed in throttle (W) until vehicle speed exceeds 30 km/h.',
        telemetryHint: 'Gear: 2 | Speed: ≥ 30 km/h',
        isCompleted: (state) =>
          state.transmission.currentGear === 2 &&
          state.dynamics.speedKmh >= 30.0 &&
          state.clutch.pedalPosition < 0.2,
        getTelemetryStatus: (state) => ({
          label: '2nd Gear Speed',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h (Target: ≥ 30 km/h)`,
          isTargetMet:
            state.transmission.currentGear === 2 && state.dynamics.speedKmh >= 30.0,
        }),
      },
      {
        id: 'step-shift-3rd',
        title: 'Upshift to 3rd Gear & Cruise (> 35 km/h)',
        description:
          'Depress clutch (Space), press E to engage 3rd gear, release clutch smoothly, and cruise above 35 km/h.',
        instruction:
          'Press Space, press E to shift into 3rd gear, release Space, and hold speed above 35 km/h for 1.2s.',
        telemetryHint: 'Gear: 3 | Speed: ≥ 35 km/h | Hold 1.2s',
        holdDurationSeconds: 1.2,
        isCompleted: (state, holdTime) =>
          state.transmission.currentGear === 3 &&
          state.clutch.pedalPosition < 0.2 &&
          state.dynamics.speedKmh >= 35.0 &&
          state.engine.status === 'RUNNING' &&
          holdTime >= 1.2,
        getTelemetryStatus: (state) => ({
          label: '3rd Gear Cruise',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h in Gear ${
            state.transmission.currentGear
          }`,
          isTargetMet:
            state.transmission.currentGear === 3 && state.dynamics.speedKmh >= 35.0,
        }),
      },
    ],
    failureRules: [
      {
        isTriggered: (state) => {
          if (state.engine.status === 'STALLED') {
            return {
              failed: true,
              reason: 'Engine stalled! Release the clutch with proper rev matching.',
            };
          }
          if (state.transmission.currentGear === -1) {
            return {
              failed: true,
              reason: 'Reverse gear selected while traveling forward!',
            };
          }
          return { failed: false };
        },
      },
    ],
  },

  // --------------------------------------------------------------------------
  // LESSON 4: Hill Starts & Handbrake Transition
  // --------------------------------------------------------------------------
  {
    id: 4,
    slug: 'hill-start',
    title: 'Hill Starts & Handbrake Transition',
    subtitle: '10% Incline Rollback Prevention',
    objective:
      'Master the handbrake-to-clutch transition on a 10% uphill gradient. Pre-load clutch torque to hold the grade, release the handbrake with rollback < 0.1m, and climb past 10 km/h.',
    difficulty: 'Advanced',
    estimatedDuration: '3-4 mins',
    initialGradePct: 10,
    steps: [
      {
        id: 'step-hill-hold',
        title: 'Set Handbrake & 1st Gear',
        description:
          'On this 10% uphill slope, hold the vehicle with the handbrake (P), push the clutch in (Space), and select 1st gear (E).',
        instruction: 'Ensure P is engaged (Handbrake ON), hold Space, and select 1st gear (E).',
        telemetryHint: 'Grade: 10% | Handbrake: ON | Gear: 1',
        isCompleted: (state) =>
          state.transmission.currentGear === 1 &&
          state.clutch.pedalPosition > 0.85 &&
          state.controls.parkingBrake,
        getTelemetryStatus: (state) => ({
          label: 'Hill Hold Status',
          value: !state.controls.parkingBrake
            ? 'Engage Handbrake (P)'
            : state.transmission.currentGear !== 1
            ? 'Select 1st Gear'
            : 'Holding on Incline ✔',
          isTargetMet:
            state.transmission.currentGear === 1 &&
            state.clutch.pedalPosition > 0.85 &&
            state.controls.parkingBrake,
        }),
      },
      {
        id: 'step-hill-preload',
        title: 'Pre-load Clutch Bite Torque',
        description:
          'Add light throttle (1,600–2,200 RPM) and ease clutch up until torque builds against the handbrake (~35 Nm slip torque).',
        instruction:
          'Feather W and slowly release Space to ~50% until slip torque rises above 35 Nm. Hold steady for 0.6s.',
        telemetryHint: 'RPM: 1600–2200 | Torque: > 35 Nm | Handbrake: ON',
        holdDurationSeconds: 0.6,
        isCompleted: (state, holdTime) =>
          state.controls.parkingBrake &&
          state.clutch.slipTorque > 35 &&
          state.engine.rpm >= 1350 &&
          state.engine.status === 'RUNNING' &&
          holdTime >= 0.6,
        getTelemetryStatus: (state) => ({
          label: 'Pre-load Torque',
          value: `${Math.round(state.clutch.slipTorque)} Nm / 35 Nm (${Math.round(
            state.engine.rpm
          )} RPM)`,
          isTargetMet: state.clutch.slipTorque > 35 && state.engine.rpm >= 1350,
        }),
      },
      {
        id: 'step-hill-release',
        title: 'Release Handbrake (Zero Rollback)',
        description:
          'Release handbrake (P). The pre-loaded clutch torque will hold the car against gravity without rolling back.',
        instruction:
          'Press P to drop the handbrake while maintaining your clutch and throttle position.',
        telemetryHint: 'Handbrake: OFF | Rollback: < 0.1m',
        isCompleted: (state) =>
          !state.controls.parkingBrake &&
          state.transmission.currentGear === 1 &&
          state.engine.status === 'RUNNING' &&
          state.clutch.slipTorque > 30,
        getTelemetryStatus: (state) => ({
          label: 'Handbrake Release',
          value: state.controls.parkingBrake
            ? 'Press P to Release'
            : 'Handbrake Released ✔',
          isTargetMet: !state.controls.parkingBrake,
        }),
      },
      {
        id: 'step-hill-climb',
        title: 'Climb Incline Past 10 km/h',
        description:
          'Complete clutch release smoothly while feeding throttle to climb up the 10% slope past 10 km/h.',
        instruction: 'Feed in throttle (W) and lift off clutch entirely to ascend above 10 km/h.',
        telemetryHint: 'Speed: ≥ 10.0 km/h | Incline: 10%',
        isCompleted: (state) =>
          state.dynamics.speedKmh >= 10.0 &&
          state.clutch.pedalPosition < 0.2 &&
          state.engine.status === 'RUNNING',
        getTelemetryStatus: (state) => ({
          label: 'Hill Climb Speed',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h (Target: ≥ 10.0 km/h)`,
          isTargetMet: state.dynamics.speedKmh >= 10.0,
        }),
      },
    ],
    failureRules: [
      {
        isTriggered: (state, _step, stats) => {
          if (state.engine.status === 'STALLED') {
            return {
              failed: true,
              reason:
                'Engine stalled! Climbing a 10% grade requires maintaining sufficient engine revs (~1,800–2,200 RPM) while overcoming gravitational resistance.',
            };
          }
          if (stats.maxRollbackMeters > 0.1) {
            return {
              failed: true,
              reason: `Vehicle rolled back ${stats.maxRollbackMeters.toFixed(
                2
              )}m (maximum allowed: 0.10m)! Ensure you have built sufficient bite torque before releasing the handbrake.`,
            };
          }
          return { failed: false };
        },
      },
    ],
  },

  // --------------------------------------------------------------------------
  // LESSON 5: Downshifting & Rev Matching
  // --------------------------------------------------------------------------
  {
    id: 5,
    slug: 'rev-matching',
    title: 'Downshifting & Rev Matching',
    subtitle: 'Smooth Downshift Deceleration (3rd → 2nd)',
    objective:
      'From 3rd gear cruising at 40 km/h, brake down to 25 km/h, depress clutch, blip throttle to match revs, select 2nd gear, and release clutch smoothly without driveline jolt.',
    difficulty: 'Advanced',
    estimatedDuration: '3-4 mins',
    initialGradePct: 0,
    steps: [
      {
        id: 'step-reach-cruise',
        title: 'Accelerate to ~40 km/h in 3rd Gear',
        description:
          'Drive up through the gears (1st → 2nd → 3rd) and reach cruising speed above 38 km/h in 3rd gear.',
        instruction:
          'Accelerate in 1st, shift to 2nd, then shift to 3rd gear (E) and cruise above 38 km/h.',
        telemetryHint: 'Gear: 3 | Speed: ≥ 38 km/h',
        isCompleted: (state) =>
          state.transmission.currentGear === 3 &&
          state.dynamics.speedKmh >= 38.0 &&
          state.clutch.pedalPosition < 0.2,
        getTelemetryStatus: (state) => ({
          label: 'Cruising in 3rd',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h in Gear ${
            state.transmission.currentGear
          } (Target: ≥ 38 km/h in 3rd)`,
          isTargetMet:
            state.transmission.currentGear === 3 && state.dynamics.speedKmh >= 38.0,
        }),
      },
      {
        id: 'step-brake-decel',
        title: 'Brake Down to 22–26 km/h',
        description:
          'Apply the foot brake (S) while remaining in 3rd gear to decelerate into the 22–26 km/h window.',
        instruction: 'Gently apply S to slow down between 22 and 26 km/h.',
        telemetryHint: 'Target Speed: 22–26 km/h in 3rd',
        holdDurationSeconds: 0.5,
        isCompleted: (state, holdTime) =>
          state.transmission.currentGear === 3 &&
          state.dynamics.speedKmh <= 26.5 &&
          state.dynamics.speedKmh >= 20.0 &&
          holdTime >= 0.5,
        getTelemetryStatus: (state) => ({
          label: 'Deceleration',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h (Target: 22–26 km/h)`,
          isTargetMet:
            state.dynamics.speedKmh <= 26.5 && state.dynamics.speedKmh >= 20.0,
        }),
      },
      {
        id: 'step-clutch-select2',
        title: 'Clutch In & Downshift to 2nd Gear',
        description: 'Push clutch fully in (Space) and shift down to 2nd gear (Q).',
        instruction: 'Depress Space completely and press Q to shift from 3rd to 2nd gear.',
        telemetryHint: 'Gear: 2 | Clutch: 100%',
        isCompleted: (state) =>
          state.transmission.currentGear === 2 && state.clutch.pedalPosition > 0.8,
        getTelemetryStatus: (state) => ({
          label: '2nd Gear Selection',
          value:
            state.transmission.currentGear === 2
              ? 'In 2nd Gear ✔'
              : 'Press Q for 2nd gear',
          isTargetMet:
            state.transmission.currentGear === 2 && state.clutch.pedalPosition > 0.8,
        }),
      },
      {
        id: 'step-rev-blip',
        title: 'Blip Throttle (Rev Match to ~2,400+ RPM)',
        description:
          'While clutch is still pressed, give a quick tap/blip on the gas (W) to raise engine RPM to match transmission input speed.',
        instruction:
          'Tap W firmly while holding Space to flare revs above 2,200 RPM before letting the clutch out.',
        telemetryHint: 'Clutch: IN | Throttle blip: RPM ≥ 2,200',
        isCompleted: (state) =>
          state.transmission.currentGear === 2 &&
          state.clutch.pedalPosition > 0.65 &&
          state.engine.rpm >= 2200,
        getTelemetryStatus: (state) => ({
          label: 'Rev Match Blip',
          value: `${Math.round(state.engine.rpm)} RPM (Target: ≥ 2,200 RPM blip)`,
          isTargetMet: state.engine.rpm >= 2200,
        }),
      },
      {
        id: 'step-smooth-reengage',
        title: 'Smooth Clutch Re-engagement',
        description:
          'Release the clutch pedal smoothly as revs align to complete the downshift seamlessly.',
        instruction:
          'Release Space smoothly and maintain forward drive in 2nd gear without stalling or stopping.',
        telemetryHint: 'Gear: 2 | Clutch: 0% | Speed: ≥ 16 km/h',
        isCompleted: (state) =>
          state.transmission.currentGear === 2 &&
          state.clutch.pedalPosition < 0.15 &&
          state.engine.status === 'RUNNING' &&
          state.dynamics.speedKmh >= 16.0,
        getTelemetryStatus: (state) => ({
          label: 'Downshift Complete',
          value: `${state.dynamics.speedKmh.toFixed(1)} km/h in 2nd Gear`,
          isTargetMet:
            state.transmission.currentGear === 2 &&
            state.clutch.pedalPosition < 0.15 &&
            state.dynamics.speedKmh >= 16.0,
        }),
      },
    ],
    failureRules: [
      {
        isTriggered: (state, stepIndex) => {
          if (state.engine.status === 'STALLED') {
            return {
              failed: true,
              reason: 'Engine stalled during downshift! Match revs before releasing clutch.',
            };
          }
          if (stepIndex >= 2 && state.dynamics.speedKmh < 4.0) {
            return {
              failed: true,
              reason:
                'Vehicle stopped! Downshifting and rev matching are meant for active cornering or slowing down in motion.',
            };
          }
          return { failed: false };
        },
      },
    ],
  },
];

export function getLessonById(id: number): LessonDefinition | undefined {
  return LESSONS.find((l) => l.id === id);
}
