# Controls System Specification — Manual Driving Trainer

This document specifies the keyboard controls, analog-like timed input ramping, normalization models, and configuration parameters for the **Manual Driving Trainer**.

---

## 1. Core Principle: Continuous Physical Controls

Standard keyboard keys provide only binary boolean states (`pressed` or `released`). Real driving pedals and steering wheels are continuous analog instruments. 

To simulate realistic pedal travel:
* An active key press **linearly or smoothly ramps up** the normalized control value at a specified press rate.
* Releasing the key **ramps down** the value back to its baseline at a release rate.
* The elapsed delta time ($\Delta t$) determines the exact increment per simulation tick.

Keyboard input **never** alters engine RPM or vehicle speed directly; it only modulates virtual pedal positions and steering angle.

---

## 2. Key Bindings

| Key | Control | Action | Range |
| :--- | :--- | :--- | :--- |
| **W** | Throttle Pedal | Ramps throttle toward 1.0 | $0.0 \rightarrow 1.0$ |
| **S** | Brake Pedal | Ramps service brake toward 1.0 | $0.0 \rightarrow 1.0$ |
| **Space** | Clutch Pedal | Ramps clutch pedal toward 1.0 (pressed) | $0.0 \rightarrow 1.0$ |
| **A** | Steering Left | Steers wheels to the left | $0.0 \rightarrow -1.0$ |
| **D** | Steering Right | Steers wheels to the right | $0.0 \rightarrow 1.0$ |
| **E** | Shift Up | Requests sequential upshift (N $\rightarrow$ 1 $\rightarrow$ 2 $\rightarrow$ 3 $\rightarrow$ 4 $\rightarrow$ 5) | Discrete |
| **Q** | Shift Down | Requests sequential downshift (5 $\rightarrow$ 4 $\rightarrow$ 3 $\rightarrow$ 2 $\rightarrow$ 1 $\rightarrow$ N) | Discrete |
| **N** | Direct Neutral | Shifts transmission directly into Neutral | Discrete |
| **R** | Reverse Gear | Shifts directly into Reverse (requires vehicle stopped or clutch in) | Discrete |
| **P** | Parking Brake | Toggles mechanical handbrake ON / OFF | Boolean |
| **I** | Starter / Ignition | Cranks / toggles engine starter | Boolean |
| **ESC** | Pause | Opens pause overlay and freezes simulation loop | State |

---

## 3. Normalized `InputState` Interface

```ts
export interface InputState {
  throttle: number;      // 0.0 (released) to 1.0 (fully floored)
  brake: number;         // 0.0 (released) to 1.0 (fully floored)
  clutch: number;        // 0.0 (fully released/engaged) to 1.0 (fully pressed/disengaged)
  steering: number;      // -1.0 (full left) to +1.0 (full right), 0.0 = centered
  gear: number;          // -1 = Reverse, 0 = Neutral, 1..5 = Forward gears
  parkingBrake: boolean; // true = engaged, false = released
  isStarterEngaged: boolean; // true when cranking starter motor
}
```

---

## 4. Ramping Mathematics & Tuning Parameters

Every continuous control is updated per simulation step $\Delta t$:

```ts
export interface ControlRatesConfig {
  throttlePressRate: number;    // Units/second (default: 1.8 -> 0 to 1 in ~0.55s)
  throttleReleaseRate: number;  // Units/second (default: 3.0 -> 1 to 0 in ~0.33s)

  brakePressRate: number;       // Units/second (default: 2.5 -> 0 to 1 in ~0.40s)
  brakeReleaseRate: number;     // Units/second (default: 4.0 -> 1 to 0 in ~0.25s)

  clutchPressRate: number;      // Units/second (default: 3.5 -> 0 to 1 in ~0.28s)
  clutchReleaseRate: number;    // Units/second (default: 1.2 -> 1 to 0 in ~0.83s)

  steeringPressRate: number;    // Units/second (default: 2.2)
  steeringReturnRate: number;   // Auto-center rate when A/D released (default: 3.0)
}
```

### Ramping Algorithm (Example for Clutch)

```ts
export function updateRampedValue(
  current: number,
  isPressed: boolean,
  pressRate: number,
  releaseRate: number,
  dt: number,
  min = 0,
  max = 1
): number {
  if (isPressed) {
    return Math.min(max, current + pressRate * dt);
  } else {
    return Math.max(min, current - releaseRate * dt);
  }
}
```

* **Clutch Release Rationale**: `clutchReleaseRate` is deliberately slower ($1.2/\text{s}$) than press rate ($3.5/\text{s}$). Releasing a clutch pedal requires fine muscular modulation through the friction zone; pressing is usually a quick push to the floor.

---

## 5. Input Provider Architecture (Future Gamepad / Wheel Support)

The `ControlsManager` abstracts hardware input:
* The primary provider listens to standard DOM keyboard `keydown`/`keyup` events.
* Because the simulation loop only receives the resulting `InputState`, an analog Gamepad/Wheel provider (using HTML5 Gamepad API) can easily feed raw analog pedal axes directly into `InputState` without altering any simulation or UI logic.
