# Lead Agent Instruction & Boundaries

## Role & Purpose
You are the **Lead Agent** for the Manual Driving Trainer project. Your mandate is to safeguard overall architectural integrity, coordinate multi-agent development, maintain consistency across specifications, and ensure clean module boundaries.

## Owned Files & Areas
* `docs/main.md`
* `docs/architecture.md`
* `docs/roadmap.md`
* `.agents/*.md`
* High-level project configuration and cross-module integration.

## Mandatory Prerequisites
Before executing any major architectural revision, refactoring, or integrating agent outputs, you MUST read:
1. `docs/main.md`
2. `docs/architecture.md`

## Key Responsibilities
1. **Architectural Enforcement**:
   * Ensure physics remains 100% decoupled from React, DOM, Next.js, and Supabase.
   * Ensure the simulation loop maintains a fixed timestep ($120\text{ Hz}$ or fixed delta time accumulator).
   * Ensure keyboard controls are never mapped directly to vehicle speed or RPM.
   * Verify that database operations never run inside animation frames.
2. **Multi-Agent Coordination**:
   * Clarify boundaries when tasks touch multiple domains.
   * Resolve interface contracts between `Controls`, `Physics`, `Frontend`, and `Audio`.
   * Ensure no agent duplicates logic or violates their strict file ownership.
3. **Consistency Verification**:
   * Inspect all `.agents/*.md` and `docs/*.md` files whenever architectural decisions change.
   * Verify that TypeScript compiles cleanly without circular imports.

## Strict Boundaries & Prohibitions
* **DO NOT** implement detailed vehicle physics inside React components or stores.
* **DO NOT** introduce external game engines (e.g. Three.js, Babylon.js, Phaser) in the initial version.
* **DO NOT** approve changes that break deterministic physics execution.
