# Project Development Roadmap — Manual Driving Trainer

This roadmap outlines the phased development sequence for the **Manual Driving Trainer**. Work progresses incrementally so that underlying powertrain subsystems are completed and verified before UI and auxiliary features depend on them.

---

## Phase Overview

```text
Phase 1: Foundation & Setup
   │
   ▼
Phase 2: Controls & Timed Ramping
   │
   ▼
Phase 3: Engine Dynamics
   │
   ▼
Phase 4: Clutch Friction & Coupling
   │
   ▼
Phase 5: Transmission & Gearing
   │
   ▼
Phase 6: Vehicle Longitudinal Dynamics
   │
   ▼
Phase 7: Dashboard Presentation
   │
   ▼
Phase 8: Rule-Based Instructor
   │
   ▼
Phase 9: Web Audio Procedural Synthesis
   │
   ▼
Phase 10: Supabase Persistence
   │
   ▼
Phase 11: Driving Lessons & Curriculum
```

---

## Detailed Phases

### Phase 1: Foundation & Setup (Current Phase)
* Initialize Next.js, TypeScript, Tailwind CSS, and Zustand.
* Establish root folder structure: `app/`, `lib/`, `components/`, `stores/`, `docs/`, `.agents/`.
* Author source-of-truth documentation (`main.md`, `architecture.md`, `physics.md`, `controls.md`, `roadmap.md`).
* Author agent role definitions in `.agents/*.md`.
* Define TypeScript data contracts in `lib/simulation/types.ts`.
* Verify build and TypeScript compilation pass cleanly.

### Phase 2: Controls & Timed Input Ramping
* Build `lib/simulation/controls.ts`.
* Implement keyboard event listeners tracking active key states.
* Implement delta-time continuous ramping for throttle, brake, clutch, and steering.
* Implement gear shifting keys (Q, E, N, R) and parking brake toggle (P).
* Output normalized `InputState` clamped within $[0.0, 1.0]$.

### Phase 3: Engine Simulation
* Build `lib/simulation/engine.ts`.
* Model idle RPM governor, maximum redline RPM cutoff, and torque curve approximations.
* Implement throttle response and engine braking.
* Implement stall logic (transitions to stalled state when RPM drops below stall threshold).

### Phase 4: Clutch Friction & Coupling
* Build `lib/simulation/clutch.ts`.
* Implement configurable bite point zone ($0.40 \rightarrow 0.65$).
* Implement smooth non-linear normal force curve through friction zone.
* Calculate slip torque transfer based on relative angular speed difference ($\omega_e - \omega_{trans\_in}$).
* Handle seamless transition between slipping friction and locked direct-drive states.

### Phase 5: Transmission & Gearing
* Build `lib/simulation/transmission.ts`.
* Implement 5 forward gears, Neutral, and Reverse ratios with final drive multiplier.
* Calculate wheel torque multiplication and transmission input shaft angular speed.

### Phase 6: Vehicle Dynamics
* Build `lib/simulation/vehicle.ts`.
* Implement vehicle mass inertia, aerodynamic drag, rolling resistance, and service/parking braking.
* Model road slope/incline forces ($F_{grade} = m \cdot g \cdot \sin\theta$) causing vehicle rollback on hills.
* Complete `lib/simulation/simulation.ts` uniting engine, clutch, transmission, and vehicle physics in a fixed 120 Hz loop.

### Phase 7: Dashboard Presentation
* Build 2D SVG/Canvas and Tailwind dashboard instruments.
* Speedometer gauge (km/h) and Tachometer gauge with redline marker.
* Vertical pedal position bars (Throttle, Brake, Clutch) with marked Clutch Bite Zone.
* Gear indicator, parking brake lamp, and engine status indicators.
* Unidirectional connection from simulation runner to Zustand store.

### Phase 8: Rule-Based Instructor
* Build `components/instructor/` evaluation engine.
* Real-time contextual diagnostic messages:
  * "Stalled: Released clutch too fast without sufficient throttle."
  * "Bite point reached — hold clutch steady and apply gentle throttle."
  * "Warning: Riding the clutch with high RPM."
  * "Engine lugging — downshift to a lower gear."
  * "Smooth start executed perfectly!"

### Phase 9: Web Audio Procedural Synthesis
* Build `lib/audio/engineAudio.ts` using native Web Audio API.
* Modulate oscillator fundamental frequencies and harmonic overtones based on engine RPM.
* Adjust biquad filters and wave-shaping distortion based on throttle load.
* Synthesize starter motor cranking, stall click, and gear engagement clicks.

### Phase 10: Supabase Persistence (Completed)
* [x] Configure Supabase client in `lib/supabase/client.ts`.
* [x] Apply database migrations via `npx supabase` (`profiles`, `driving_sessions`, `lesson_progress` with RLS).
* [x] Synchronized schema types in `lib/supabase/types.ts`.
* [x] Robust, fail-safe query helpers in `lib/supabase/queries.ts`.
* [x] Asynchronously save session metrics when the driver resets or ends a drive session.
* [x] Dual-write and background sync for lesson curriculum progress.
* [x] Driver Statistics & Progress telemetry dashboard in `app/progress/page.tsx`.

### Phase 11: Driving Lessons & Curriculum
* Create guided lesson modules in `app/lessons/`:
  1. *Finding the Bite Point* (no throttle, slow clutch release until forward creep).
  2. *Smooth Flat Starts* (balancing throttle and clutch simultaneously).
  3. *Sequential Upshifting* (1st $\rightarrow$ 2nd $\rightarrow$ 3rd with rev drop).
  4. *Hill Starts & Handbrake Transition* (preventing backward rollback on incline).
  5. *Downshifting & Rev Matching*.
