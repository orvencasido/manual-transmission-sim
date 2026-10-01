# Technical Architecture Specification — Manual Driving Trainer

This document defines the technical architecture, component boundaries, simulation loop mechanics, and data contracts for the **Manual Driving Trainer**.

---

## 1. Architectural Philosophy & Principles

1. **Strict Decoupling of Simulation & UI**:
   The physics and simulation engine must be written in pure TypeScript with **zero dependencies** on React, Next.js, Zustand, Supabase, or DOM APIs.
2. **Fixed Timestep Simulation Loop**:
   The physics engine operates using an accumulator with a fixed delta time ($\Delta t = 1/120\text{ s}$ or $8.33\text{ ms}$). This ensures identical behavior across all display refresh rates (60 Hz, 120 Hz, 144 Hz, 240 Hz).
3. **Unidirectional Data Flow**:
   Inputs flow from hardware (keyboard) $\rightarrow$ Input State Ramping $\rightarrow$ Vehicle Physics $\rightarrow$ State Snapshot $\rightarrow$ Zustand Store $\rightarrow$ React UI & Web Audio.
4. **Offline-Resilient Persistence**:
   Supabase is purely a persistence layer. Database operations never execute inside the simulation loop. If network requests fail or lag, simulation remains unaffected.
5. **Renderer Independence**:
   The vehicle state emitted by the physics engine is pure data. The UI currently uses 2D SVG/Canvas and Tailwind, but the architecture can support a 3D renderer (e.g. Three.js) without altering the powertrain or vehicle physics.

---

## 2. High-Level Data Flow

```text
[ Physical Keyboard Events (keydown / keyup) ]
                     │
                     ▼
[ Controls System (lib/simulation/controls.ts) ]
  • Continuous timed ramping (0.0 to 1.0)
  • Normalized InputState: { throttle, brake, clutch, steering, gearShift }
                     │
                     ▼
[ Simulation Loop (lib/simulation/simulation.ts) ]
  • requestAnimationFrame + fixed delta time accumulator (dt = 1/120s)
  • Clamped max frame time (0.1s) to prevent spiral of death on tab unfocus
                     │
  ┌──────────────────┴──────────────────┐
  ▼                                     ▼
[ Engine (engine.ts) ]         [ Transmission (transmission.ts) ]
  • Torque curve calculation     • Gear selection & ratios
  • Flywheel RPM & inertia       • Wheel torque calculation
  • Idle controller & stall      • Reverse gear handling
  └──────────────────┬──────────────────┘
                     │
                     ▼
       [ Clutch Coupling (clutch.ts) ]
         • Bite point non-linear curve
         • Slip friction torque
         • Locked-state speed coupling
                     │
                     ▼
       [ Vehicle Dynamics (vehicle.ts) ]
         • Longitudinal tractive force
         • Aerodynamic drag & rolling resistance
         • Gravitational grade/slope force
         • Integration of velocity & distance
                     │
                     ▼
       [ VehicleState Snapshot Output ]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
[ React Zustand Store ]     [ Web Audio API ]
  • Speedometer / Tacho       • Procedural engine synth
  • Pedal & bite point bars   • RPM pitch & load filter
  • Rule-Based Instructor     • Stall & shift SFX
         │
         ▼ (Asynchronous on session end / milestones)
[ Supabase Persistence (lib/supabase/) ]
  • Querying & migrations via `npx supabase`
```

---

## 3. Module Boundaries & Ownership

### `lib/simulation/` (Pure TypeScript Core)
Contains all mathematical and physical calculations:
* `controls.ts`: Converts digital keyboard triggers into continuous physical pedal positions using delta-time based ramp rates.
* `engine.ts`: Models flywheel inertia, torque production, idle governor, and stall conditions.
* `clutch.ts`: Models normal force, friction plate engagement, bite point threshold, and torque transfer.
* `transmission.ts`: Models gear ratios, final drive, neutral, reverse, and rotational speed conversion.
* `vehicle.ts`: Models mass, aerodynamic drag, rolling resistance, braking force, and road grade.
* `physics.ts`: Core numerical utilities, clamping, and Euler integration routines.
* `simulation.ts`: Orchestrates powertrain subsystems, advances simulation ticks, and exposes state snapshots.

### `stores/` & `components/` (Frontend Presentation)
* `stores/simulatorStore.ts`: Zustand store holding current visual state snapshots. Updated by the simulation runner at display refresh rates.
* `components/dashboard/`: Speedometer, tachometer, gear display, and pedal indicators.
* `components/instructor/`: Rule-based evaluation engine analyzing `VehicleState` to provide real-time driving advice.

### `lib/audio/` (Audio Synthesis)
* `engineAudio.ts`: Web Audio API graph. Subscribes to RPM, throttle, and engine load to modulate oscillator frequencies and gain nodes. Never feeds data back into physics.

### `lib/supabase/` (Backend & Persistence)
* Supabase client and schema types. Managed and queried directly via `npx supabase`.
* Saves session statistics (stalls, smooth starts, duration) asynchronously.

---

## 4. Simulation Loop & Delta Time Details

### Fixed Timestep Accumulator Pattern
```ts
const FIXED_DT = 1 / 120; // 120 Hz physics rate
const MAX_FRAME_TIME = 0.1; // Maximum 100ms accumulation to prevent freeze spikes

let accumulator = 0;
let lastTime = performance.now();

function step(currentTime: number) {
  let frameTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  if (frameTime > MAX_FRAME_TIME) {
    frameTime = MAX_FRAME_TIME; // Clamp
  }

  accumulator += frameTime;

  while (accumulator >= FIXED_DT) {
    simulation.tick(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  // Publish snapshot to UI / Audio
  publishState(simulation.getState());

  requestAnimationFrame(step);
}
```

---

## 5. Supabase Integration Rules

* Supabase is the backend for persistence.
* Database operations are initiated via asynchronous action handlers (e.g. `saveSessionSummary()`, `updateLessonProgress()`).
* Database queries, migrations, and schema inspections are managed in the development environment using `npx supabase`.
* The client uses environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) with Row Level Security (RLS) enabled on all tables.
* If Supabase is unreachable or offline, the local driving simulator functions with full capability; records are held locally or discarded without throwing fatal errors.

---

## 6. Future 3D / Game Engine Path

Because `VehicleState` contains normalized physical properties (`speed`, `engineRpm`, `steeringAngle`, `distanceTraveled`, `grade`), a 3D canvas (Three.js/WebGL) can simply read these coordinates to position a 3D vehicle model and rotate wheel meshes without altering a single line of powertrain code.
