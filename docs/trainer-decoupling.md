# Manual Driving Trainer Decoupling & Free Roam Plan
**Document:** `docs/trainer-decoupling.md`  
**Status:** Approved for Implementation  
**Affected Subsystems:**  
- `lib/simulation/simulation.ts` (`physics_agent`)
- `components/controls/useKeyboardControls.ts` (`physics_agent`)
- `app/simulator/page.tsx` (`frontend_agent`)
- `app/map/page.tsx` (`frontend_agent`)
- `app/lessons/[id]/page.tsx` (`frontend_agent`)

---

## 1. Problem Statement & Root Cause

### 1.1 The Issue
- When practicing in the **Manual Driving Trainer** (`/simulator`), driving forward or steering causes the vehicle to unexpectedly slow down, fight invisible friction, or stall the engine.
- This happens because the underlying `Simulation` engine was defaulting to `boundaryMode: 'strict'` (Lucena City road network). Even though `/simulator` renders no map tiles, the vehicle was still navigating Lucena coordinates and colliding with invisible curbs/walls after traveling only a few meters.
- In addition, `/simulator` featured a prominent banner: **"Pure 2D Top-Down OpenStreetMap Driving Mode / Launch Street Map Driving"**, which made the trainer appear directly coupled with or subservient to the map mode rather than functioning as an independent cockpit focused purely on teaching manual car control.

### 1.2 User Expectation
1. **Unrestricted Free Roam in Trainer**:
   - The `/simulator` page must have zero invisible map walls, zero curb collision penalties, and zero road corridor constraints (`boundaryMode: 'off'`).
   - The user should be able to accelerate indefinitely in 1st through 5th gear, test rev matching, practice clutch bite point modulation, and steer freely without map interference.
2. **Clean separation of concerns**:
   - `/simulator` is dedicated to learning **how to control** the manual car (pedals, gauges, clutch slip waveform, powertrain torque flow).
   - The promotional map banner should be removed from `/simulator` so the cockpit is distraction-free. (Navigation to the map remains accessible via the top navigation bar).
   - `/map` remains the dedicated venue for OpenStreetMap city navigation with road boundaries (`boundaryMode: 'strict'`).

---

## 2. Technical Architecture & Agent Delegation

### Subagent 1: `physics_agent`
1. **`lib/simulation/simulation.ts`**:
   - Update `Simulation` constructor:
     ```ts
     constructor(
       config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
       boundaryMode: RoadBoundaryMode = 'off'
     )
     ```
   - Default the initial boundary mode of the simulation engine to `'off'`.
   - Pass `boundaryMode` to `new KinematicsModel({ boundaryMode })`.
   - In `reset()`: restore `this.kinematics.setBoundaryMode(this.initialBoundaryMode)`.

2. **`components/controls/useKeyboardControls.ts`**:
   - Accept configuration options:
     ```ts
     export interface KeyboardControlsOptions {
       defaultBoundaryMode?: RoadBoundaryMode;
     }
     export function useKeyboardControls(options?: KeyboardControlsOptions)
     ```
   - Default `options?.defaultBoundaryMode ?? 'off'`.
   - Pass `defaultBoundaryMode` when instantiating `new Simulation(DEFAULT_VEHICLE_CONFIG, defaultBoundaryMode)`.
   - Ensure `resetSimulation()` properly re-applies `defaultBoundaryMode`.

### Subagent 2: `frontend_agent`
1. **`app/simulator/page.tsx`**:
   - Remove the intrusive "Pure 2D Top-Down OpenStreetMap Driving Mode / Launch Street Map Driving" banner block.
   - Use `useKeyboardControls({ defaultBoundaryMode: 'off' })`.
   - Keep `/simulator` focused on the 3-column cockpit instrument cluster.
2. **`app/map/page.tsx`**:
   - Pass `useKeyboardControls({ defaultBoundaryMode: 'strict' })` so street map driving retains road boundaries and curb collisions.
3. **`app/lessons/[id]/page.tsx`**:
   - Pass `useKeyboardControls({ defaultBoundaryMode: 'off' })` so guided lessons operate in an unconstrained training environment.

---

## 3. Verification Criteria
- [ ] In `/simulator`, vehicle can drive continuously in any gear and direction without hitting any invisible boundaries or experiencing curb sliding friction.
- [ ] No map-launch banner dominates `/simulator`.
- [ ] In `/map`, street boundaries and curb collisions remain active as intended.
- [ ] `npx tsc --noEmit` and `npm run build` compile cleanly with 0 errors.
