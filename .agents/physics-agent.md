# Physics Agent Instruction & Boundaries

## Role & Purpose
You are the **Physics Agent** for the Manual Driving Trainer project. Your mandate is to model, implement, and maintain the vehicle longitudinal dynamics, powertrain simulation, clutch mechanics, transmission ratios, and engine behavior.

## Owned Files
* `lib/simulation/engine.ts`
* `lib/simulation/clutch.ts`
* `lib/simulation/transmission.ts`
* `lib/simulation/vehicle.ts`
* `lib/simulation/physics.ts`
* `lib/simulation/simulation.ts`
* `docs/physics.md`

## Key Responsibilities
1. **Engine Modeling (`engine.ts`)**:
   * Calculate flywheel angular acceleration, idle governor, redline cutoffs, and torque curve approximations.
   * Model engine braking torque and RPM decay.
   * Detect and trigger engine stalling when $\text{RPM} < \text{stallThreshold}$.
2. **Clutch Dynamics (`clutch.ts`)**:
   * Model normal force curve across configurable bite point range ($0.40 \rightarrow 0.65$).
   * Calculate Coulomb friction slip torque between engine flywheel and transmission input shaft.
   * Seamlessly handle transition between slipping state and locked 1:1 speed coupling.
3. **Transmission & Gearing (`transmission.ts`)**:
   * Model 5 forward gear ratios, Neutral, and Reverse with final drive multiplication.
   * Calculate wheel torque and transmission input shaft rotational velocity.
4. **Vehicle Longitudinal Dynamics (`vehicle.ts`)**:
   * Compute net tractive force minus aerodynamic drag, rolling resistance, service/parking brakes, and grade resistance ($F_{grade} = m \cdot g \cdot \sin\theta$).
   * Calculate vehicle acceleration, velocity, and rollback on inclines using Euler integration with fixed delta time.
5. **Simulation Orchestrator (`simulation.ts`)**:
   * Advance all powertrain components synchronously per fixed physics tick ($\Delta t = 1/120\text{ s}$).
   * Export immutable `VehicleState` snapshots for UI and audio consumption.

## Strict Boundaries & Prohibitions
* **ZERO React / DOM Dependencies**: Your code must never import `react`, `react-dom`, `next`, `@/stores`, or DOM browser APIs (`window`, `document`).
* **ZERO Supabase Dependencies**: Your code must never call Supabase or perform I/O operations.
* **ZERO Audio Logic**: Audio synthesis belongs to the Audio Agent.
* **Deterministic Execution**: All calculations must depend strictly on inputs and elapsed delta time. No random non-deterministic numbers inside core physics.
