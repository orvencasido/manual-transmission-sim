# Manual Driving Trainer

A browser-based manual car driving training simulator built with **Next.js**, **React**, **TypeScript**, **Tailwind CSS**, **Zustand**, and **Supabase**.

## Overview
The goal is to teach users how to operate a manual transmission vehicle through realistic interaction between the clutch, throttle, brake, steering, gears, RPM, and vehicle movement.

## Key Principles
* **Decoupled Physics**: Longitudinal vehicle dynamics run independently in pure TypeScript at a fixed 120Hz timestep.
* **Continuous Input**: Digital keyboard keys (W/S/Space/A/D) are converted into continuous analog pedal travel using delta-time based ramp rates.
* **Realistic Clutch Friction**: Simulates clutch slip, non-linear bite point zone ($0.40 \rightarrow 0.65$), stalling below idle threshold, and smooth starting.
* **Web Audio Synthesis**: Procedural engine sound responds dynamically to RPM, throttle, and engine load.
* **Supabase Persistence**: Session summaries, stall counts, and lesson progress saved asynchronously outside the real-time physics loop.

## Project Structure
```text
manual-driving-trainer/
├── .agents/          # Multi-agent role instructions and strict ownership boundaries
├── docs/             # Technical specifications, architecture, physics, and roadmap
├── app/              # Next.js App Router (Homepage, Simulator, Lessons, Progress)
├── components/       # 2D Dashboard instruments, pedals, controls, instructor UI
├── lib/
│   ├── simulation/   # Pure TypeScript powertrain & vehicle simulation
│   ├── audio/        # Web Audio API engine sound synthesis
│   └── supabase/     # Supabase client and database types
└── stores/           # Zustand store for simulator UI subscriptions
```

## Getting Started
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

## Documentation
* [Main Specification](docs/main.md)
* [Technical Architecture](docs/architecture.md)
* [Vehicle Physics](docs/physics.md)
* [Controls System](docs/controls.md)
* [Roadmap](docs/roadmap.md)
