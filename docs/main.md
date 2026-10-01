# Manual Driving Trainer — Project Initialization

I want you to initialize a new web application called **Manual Driving Trainer**.

This is a browser-based manual car driving training simulator. It is NOT primarily a racing game. The goal is to teach users how to operate a manual transmission vehicle through realistic interaction between the clutch, throttle, brake, steering, gears, RPM, and vehicle movement.

I will be developing this project using **Antigravity with multiple AI agents**, so the project must be structured for clear agent ownership and maintainability.

Do NOT immediately build the entire application. First establish the architecture, documentation, folders, agent instructions, and development foundation.

---

# 1. Technology Stack

Use:

* Next.js
* React
* TypeScript
* Tailwind CSS
* Zustand
* Supabase
* PostgreSQL
* Web Audio API
* Vercel deployment

Do NOT use a game engine for the initial version.

The first version must be a 2D browser simulator.

The architecture must remain flexible enough that a 3D renderer or game engine could potentially be added later without rewriting the physics engine.

---

# 2. Core Concept

The simulator should simulate a manual transmission vehicle.

The primary training concepts are:

* Clutch control
* Throttle control
* Brake control
* Steering
* Gear selection
* Engine RPM
* Engine torque
* Clutch engagement
* Clutch slip
* Bite point
* Stalling
* Engine lugging
* Smooth starts
* Gear shifting
* Downshifting
* Rev matching
* Hill starts
* Rolling backward
* Braking
* Reverse

The simulator should prioritize realistic training behavior rather than arcade-style gameplay.

---

# 3. Most Important Control Requirement

Keyboard controls must behave like **continuous physical controls**, not simple ON/OFF buttons.

For example:

W = throttle.

When W is held:

0%
→ 10%
→ 20%
→ 30%
→ ...
→ 100%

When W is released:

100%
→ 90%
→ 80%
→ ...
→ 0%

The same concept applies to:

* Brake
* Clutch
* Steering

The simulator must use elapsed time / delta time so that how long the user holds a key affects the virtual pedal position.

Do NOT simply implement:

```ts
if (wPressed) throttle = 1
else throttle = 0
```

Instead, maintain a continuously changing value between 0 and 1.

Use configurable ramp rates.

For example:

```ts
throttlePressRate
throttleReleaseRate

brakePressRate
brakeReleaseRate

clutchPressRate
clutchReleaseRate

steeringRate
```

These values should be configurable and tunable.

---

# 4. Keyboard Controls

Initial controls:

W = throttle

S = brake

Space = clutch

A = steer left

D = steer right

E = shift up

Q = shift down

N = neutral

R = reverse

P = parking brake

ESC = pause

The controls system should generate normalized input values.

Example:

```ts
interface InputState {
  throttle: number
  brake: number
  clutch: number
  steering: number
}
```

Values should generally range from:

0.0 → 1.0

Steering may range from:

-1.0 → 1.0

Keyboard input must NOT directly modify engine RPM or vehicle speed.

---

# 5. Clutch Simulation

The clutch is one of the most important systems.

Model clutch pedal position from:

0.0 = fully released

1.0 = fully pressed

The clutch should have a configurable bite point.

Example:

```text
0% ─────── 40% ─────── 60% ─────── 100%
          bite point
```

The exact values must be configurable.

The simulator should be able to reproduce:

### Smooth start

Clutch pressed
→ 1st gear
→ moderate throttle
→ slowly release clutch
→ reach bite point
→ vehicle begins moving
→ continue releasing clutch
→ clutch fully engaged

### Stall

Clutch pressed
→ 1st gear
→ little/no throttle
→ release clutch too quickly
→ engine RPM drops
→ engine stalls

### Riding clutch

Partial clutch engagement
+
high RPM
+
continued driving

should generate an appropriate instructor warning.

---

# 6. Engine Simulation

Create a simplified but believable engine model.

It should support:

* Idle RPM
* Maximum RPM
* Throttle response
* Torque
* Engine braking
* RPM increase
* RPM decrease
* Stall
* Lugging
* Engine load

The goal is not to create a professional automotive engineering simulator.

The goal is to create believable behavior that teaches the correct manual-driving concepts.

---

# 7. Transmission

Initial gearbox:

```text
Reverse
Neutral
1
2
3
4
5
```

Use configurable gear ratios.

Example configuration:

```ts
interface TransmissionConfig {
  gears: number[]
  reverseRatio: number
  finalDrive: number
}
```

The transmission should affect:

* Engine RPM
* Wheel RPM
* Wheel torque
* Acceleration
* Engine braking
* Speed

Gear ratios must NOT be hard-coded throughout the application.

---

# 8. Vehicle Physics

Create a configurable vehicle model.

At minimum model:

* Vehicle mass
* Engine torque
* Gear ratio
* Final drive
* Wheel torque
* Wheel radius
* Acceleration
* Braking
* Rolling resistance
* Aerodynamic drag
* Vehicle speed
* Slope / hill
* Engine load

Use delta time.

The simulation must behave consistently regardless of frame rate.

Use:

```ts
requestAnimationFrame()
```

and calculate:

```ts
dt = currentTime - previousTime
```

Clamp unusually large delta values to prevent physics instability after tab switching.

---

# 9. Simulation Architecture

The architecture should follow:

```text
Keyboard Input
      ↓
Control State
      ↓
Simulation
      ↓
Engine
      ↓
Clutch
      ↓
Transmission
      ↓
Vehicle Physics
      ↓
Vehicle State
      ↓
Dashboard UI
```

Keep the simulation independent from React.

The physics system must NOT depend on:

* React
* Next.js
* Zustand
* Supabase
* DOM APIs

React should display the simulation state.

---

# 10. Real-Time Simulation

The simulation must run locally in the browser.

It should be capable of running indefinitely.

Create a **Free Drive** mode.

The user should be able to:

* Start driving
* Stop
* Shift gears
* Stall
* Restart
* Practice clutch control
* Practice hill starts
* Drive indefinitely
* Reset the vehicle

There should be no artificial race or finish condition.

The session ends when the user chooses to stop/reset or exits.

---

# 11. Dashboard

Create a training-oriented 2D dashboard.

Display:

* Speedometer
* Tachometer
* Current gear
* Throttle position
* Brake position
* Clutch position
* Steering position
* Engine status
* Parking brake
* Instructor feedback

The UI should look like a **driving training instrument**, not an arcade racing HUD.

Prioritize clarity and usability.

---

# 12. Instructor System

Create a rule-based instructor system.

It should analyze the simulation state and provide contextual feedback.

Examples:

```text
"Release the clutch more slowly."

"Engine RPM is too low."

"You stalled the engine."

"Too much throttle."

"You're riding the clutch."

"Consider shifting to a higher gear."

"Consider shifting to a lower gear."

"Good clutch control."

"Smooth start."
```

Feedback must be based on actual simulation state.

Do not randomly generate feedback.

Do NOT use an AI/LLM for basic vehicle feedback.

AI coaching can be considered as a future feature.

---

# 13. Audio

Use the Web Audio API.

Engine audio should respond to:

* RPM
* Throttle
* Engine load

The sound should change continuously rather than simply switching between unrelated sound clips.

Audio is secondary to physics.

The simulator must still work if audio is disabled.

---

# 14. Supabase

Use Supabase for persistence only.

The backend is Supabase, and you can query and manage Supabase directly in this environment using the `npx supabase` command. The project reference is already set up and configured on this laptop (e.g. for generating TypeScript types via `npx supabase gen types typescript`, running migrations, or executing queries).

Potential data:

* User profile
* Driving sessions
* Lesson progress
* Statistics
* Number of stalls
* Successful starts
* Gear shifts
* Training progress
* User settings

IMPORTANT:

Supabase must NOT be inside the real-time physics loop.

Do NOT write to the database every animation frame.

The simulation must continue working if the network is temporarily unavailable.

Save session summaries after meaningful events or when the session ends.

Never expose Supabase service-role keys in the browser.

Use Row Level Security where appropriate.

---

# 15. Folder Structure

Create this structure:

```text
manual-driving-trainer/

├── .agents/
│   ├── lead-agent.md
│   ├── physics-agent.md
│   ├── frontend-agent.md
│   ├── controls-agent.md
│   ├── audio-agent.md
│   └── backend-agent.md
│
├── docs/
│   ├── main.md
│   ├── architecture.md
│   ├── physics.md
│   ├── controls.md
│   └── roadmap.md
│
├── app/
│   ├── simulator/
│   │   └── page.tsx
│   ├── lessons/
│   │   └── page.tsx
│   ├── progress/
│   │   └── page.tsx
│   └── page.tsx
│
├── components/
│   ├── dashboard/
│   ├── controls/
│   └── instructor/
│
├── lib/
│   ├── simulation/
│   │   ├── engine.ts
│   │   ├── clutch.ts
│   │   ├── transmission.ts
│   │   ├── vehicle.ts
│   │   ├── physics.ts
│   │   ├── controls.ts
│   │   └── simulation.ts
│   │
│   ├── audio/
│   │   └── engineAudio.ts
│   │
│   └── supabase/
│       ├── client.ts
│       └── types.ts
│
├── stores/
│   └── simulatorStore.ts
│
├── public/
│   └── audio/
│
├── package.json
├── tsconfig.json
└── README.md
```

Create empty placeholder files where implementation has not started yet.

Do not fill every file with unnecessary placeholder code.

---

# 16. Agent Responsibilities

Create these agent instruction files under `.agents/`.

## Lead Agent

Responsible for:

* Overall architecture
* Project coordination
* Integration
* Reviewing other agents' changes
* Maintaining project consistency

The Lead Agent must read:

```text
docs/main.md
docs/architecture.md
```

before major changes.

---

## Physics Agent

Own:

```text
lib/simulation/engine.ts
lib/simulation/clutch.ts
lib/simulation/transmission.ts
lib/simulation/vehicle.ts
lib/simulation/physics.ts
lib/simulation/simulation.ts
```

Responsible for:

* Engine
* Torque
* RPM
* Clutch
* Bite point
* Clutch slip
* Transmission
* Gear ratios
* Wheel torque
* Acceleration
* Braking
* Resistance
* Hills
* Stalling
* Lugging

Physics must remain independent from React.

---

## Frontend Agent

Own:

```text
app/
components/
stores/
```

Responsible for:

* Dashboard
* UI
* Simulator screen
* Speedometer
* Tachometer
* Gear indicator
* Pedal indicators
* Steering indicator
* Instructor UI
* Lesson UI
* Progress UI

The Frontend Agent must NOT implement physics inside React components.

---

## Controls Agent

Own:

```text
lib/simulation/controls.ts
components/controls/
```

Responsible for:

* Keyboard input
* Timed input ramping
* Throttle
* Brake
* Clutch
* Steering
* Gear keys

The Controls Agent generates normalized input.

It must NOT directly control engine RPM or vehicle speed.

---

## Audio Agent

Own:

```text
lib/audio/
public/audio/
```

Responsible for:

* Engine sound
* RPM-based pitch
* Throttle response
* Engine load
* Stall sound
* Gear shift sound

Audio consumes simulation state and must never modify physics.

---

## Backend Agent

Own:

```text
lib/supabase/
```

Supabase is the backend for this application. The Backend Agent should query and manage the database directly by using `npx supabase` (e.g. executing queries, inspecting schema, running migrations, and generating types). The project reference is already set up and linked on this laptop.

Responsible for:

* Supabase database queries and management via `npx supabase`
* Authentication
* User profiles
* Session persistence
* Progress
* Statistics
* Settings
* Schema migrations and type generation (`npx supabase gen types typescript`)

Supabase must never be required for the real-time simulator.

---

# 17. Documentation

Create `docs/main.md` containing the complete product specification.

Create `docs/architecture.md` containing:

* System architecture
* Module responsibilities
* State separation
* Simulation loop
* Delta time
* Zustand usage
* Supabase separation
* Future 3D compatibility

Create `docs/physics.md` containing configurable vehicle parameters.

Create `docs/controls.md` containing keyboard behavior and input ramping.

Create `docs/roadmap.md` containing development phases.

---

# 18. Vehicle Configuration

Create a central configurable vehicle configuration.

Example starting configuration:

```ts
const DEFAULT_VEHICLE = {
  mass: 1200,

  wheelRadius: 0.30,

  engine: {
    idleRpm: 800,
    redlineRpm: 6500
  },

  transmission: {
    gears: [
      3.5,
      2.1,
      1.4,
      1.0,
      0.8
    ],

    reverseRatio: 3.2,

    finalDrive: 3.9
  }
}
```

These are starting values only.

Do not claim that they represent a specific real-world vehicle.

Keep all tunable parameters centralized.

---

# 19. Development Order

Do not build everything at once.

Follow this order:

### Phase 1

Project setup:

* Next.js
* TypeScript
* Tailwind
* Zustand
* Folder structure
* Documentation
* Agent instructions

### Phase 2

Controls:

* Keyboard input
* Timed ramping
* Throttle
* Brake
* Clutch
* Steering

### Phase 3

Engine:

* RPM
* Torque
* Idle
* Throttle
* Engine braking
* Stall

### Phase 4

Clutch:

* Pedal position
* Bite point
* Engagement
* Slip
* Torque transfer

### Phase 5

Transmission:

* Neutral
* 1st–5th
* Reverse
* Gear ratios
* RPM relationship

### Phase 6

Vehicle:

* Wheel torque
* Acceleration
* Braking
* Drag
* Rolling resistance
* Hills
* Rolling backward

### Phase 7

Dashboard:

* RPM
* Speed
* Gear
* Pedals
* Steering
* Engine status

### Phase 8

Instructor:

* Stall feedback
* Clutch feedback
* RPM feedback
* Gear feedback
* Driving feedback

### Phase 9

Audio

### Phase 10

Supabase persistence

### Phase 11

Lessons and progress

---

# 20. Critical Architectural Rules

These rules must be respected throughout the project.

1. Physics must be independent from React.

2. Physics must be independent from Supabase.

3. Supabase must never run inside the animation/physics loop.

4. UI components must not contain vehicle physics calculations.

5. Keyboard input must be converted into continuous normalized input.

6. Use delta time for all time-dependent simulation behavior.

7. Vehicle parameters must be configurable.

8. Physics should be deterministic.

9. Avoid unnecessary dependencies.

10. Do not introduce a game engine in the initial version.

11. Keep the simulation renderer-independent.

12. Build and verify the physics before building advanced UI.

13. Do not over-engineer the first version.

14. Do not implement AI where deterministic logic is sufficient.

15. Do not rewrite working systems without a clear reason.

---

# 21. First Task

For this first task, DO NOT build the complete simulator.

Instead:

1. Initialize the Next.js project.
2. Install the required dependencies.
3. Create the folder structure.
4. Create the documentation files.
5. Create all `.agents/*.md` files.
6. Create the initial TypeScript interfaces/types.
7. Create placeholder simulation modules.
8. Create a minimal homepage.
9. Create a minimal `/simulator` route.
10. Make sure the project runs successfully.
11. Make sure TypeScript passes.
12. Provide a concise summary of what was created.

Do NOT implement the complete physics engine yet.

After the foundation is complete, we will implement the simulator incrementally, starting with the Controls System and then the Engine/Clutch/Transmission physics.

