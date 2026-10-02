# Vehicle Physics Specification — Manual Driving Trainer

This document defines the mathematical equations, powertrain model, and configurable physical parameters for the longitudinal vehicle simulation.

---

## 1. Physical Units & Coordinate System

* **Mass**: Kilograms ($kg$)
* **Distance**: Meters ($m$)
* **Velocity**: Meters per second ($m/s$) [Converted to $km/h$ for dashboard display]
* **Rotational Speed**: Radians per second ($rad/s$) and Revolutions per minute ($RPM$)
* **Torque**: Newton-meters ($Nm$)
* **Force**: Newtons ($N$)
* **Time**: Seconds ($s$)

---

## 2. Configurable Vehicle Parameters

All tunable parameters are centralized in `DEFAULT_VEHICLE_CONFIG`:

```ts
export interface VehicleConfig {
  mass: number;               // kg (e.g. 1200)
  wheelRadius: number;        // meters (e.g. 0.30)
  dragCoefficient: number;    // Cd (e.g. 0.32)
  frontalArea: number;        // m^2 (e.g. 2.1)
  airDensity: number;         // kg/m^3 (e.g. 1.225)
  rollingResistanceCoeff: number; // Cr (e.g. 0.015)
  gravity: number;            // m/s^2 (e.g. 9.81)

  engine: {
    idleRpm: number;          // e.g. 800
    stallRpm: number;         // e.g. 450
    redlineRpm: number;       // e.g. 6500
    maxTorque: number;        // Nm (e.g. 175)
    flywheelInertia: number;  // kg*m^2 (e.g. 0.18)
    engineBrakingTorque: number; // Nm per 1000 RPM (e.g. 25)
  };

  clutch: {
    bitePointStart: number;   // pedal pos (e.g. 0.40)
    bitePointEnd: number;     // pedal pos (e.g. 0.65)
    maxClutchTorque: number;  // Nm (e.g. 250)
    lockSpeedThreshold: number; // rad/s difference for lock (e.g. 5.0)
  };

  transmission: {
    gears: number[];          // [1st: 3.54, 2nd: 2.11, 3rd: 1.37, 4th: 1.03, 5th: 0.82]
    reverseRatio: number;     // e.g. 3.42
    finalDrive: number;       // e.g. 3.94
    efficiency: number;       // e.g. 0.92
  };

  brakes: {
    maxBrakeForce: number;    // N (e.g. 8000)
    parkingBrakeForce: number;// N (e.g. 3500)
  };
}
```

---

## 3. Subsystem Mathematical Models

### 3.1. Engine Model

The engine produces torque as a function of throttle position ($T_{pedal} \in [0, 1]$) and current angular velocity $\omega_e = \text{RPM} \cdot \frac{2\pi}{60}$:

$$\tau_{gross} = T_{pedal} \cdot \tau_{curve}(\text{RPM}) + \tau_{idle\_governor}(\text{RPM})$$

* **Idle Governor**: Proportional controller maintaining idle when throttle is zero and $\text{RPM} < \text{idleRpm}$.
* **Engine Braking**: When throttle is zero:
  $$\tau_{braking} = -k_{eb} \cdot \frac{\text{RPM}}{1000}$$
* **Net Engine Torque**:
  $$\tau_{net} = \tau_{gross} - \tau_{braking} - \tau_{clutch\_load}$$
* **Free Flywheel Angular Acceleration**:
  $$\frac{d\omega_e}{dt} = \frac{\tau_{net}}{I_{flywheel}}$$
* **Stalling**:
  If engine is running and $\text{RPM} < \text{stallRpm}$, the engine status switches to `STALLED`. Torque production drops to zero and RPM decays to 0.

---

### 3.2. Clutch Model

The clutch pedal position ranges from $0.0$ (fully released/engaged) to $1.0$ (fully pressed/disengaged).

* **Clutch Engagement Factor ($c_{eng} \in [0, 1]$)**:
  * When pedal position $> \text{bitePointEnd}$: $c_{eng} = 0.0$ (Fully disengaged)
  * When pedal position $< \text{bitePointStart}$: $c_{eng} = 1.0$ (Fully clamped)
  * Between bite points: non-linear smooth step:
    $$t = \frac{\text{bitePointEnd} - \text{pedal}}{\text{bitePointEnd} - \text{bitePointStart}}, \quad c_{eng} = 3t^2 - 2t^3$$
* **Friction Torque Transfer**:
  $$\tau_{clutch\_slip} = c_{eng} \cdot \tau_{max\_clutch} \cdot \tanh\left(\frac{\omega_e - \omega_{trans\_input}}{\Delta\omega_{smoothing}}\right)$$
* **Coupling**:
  * $\tau_{clutch\_slip}$ acts as a load against the engine: $\tau_{clutch\_load} = \tau_{clutch\_slip}$.
  * Equal and opposite torque drives the transmission input shaft.
* **Locked Mode**:
  When $c_{eng} \approx 1.0$ and $|\omega_e - \omega_{trans\_input}| < \text{threshold}$, the clutch locks without slip, and engine RPM matches wheel speed directly via gear ratios.

---

### 3.3. Transmission & Driveline

* **Overall Gear Ratio ($G_{ratio}$)**:
  * Neutral: $0.0$
  * Reverse: $-\text{reverseRatio} \cdot \text{finalDrive}$
  * Gear $k$ ($1 \le k \le 5$): $\text{gears}[k-1] \cdot \text{finalDrive}$
* **Drive Torque at Wheels**:
  $$\tau_{wheel} = \tau_{trans\_input} \cdot G_{ratio} \cdot \eta_{efficiency}$$
* **Transmission Input Speed from Wheel Speed**:
  $$\omega_{trans\_input} = \frac{v_{vehicle}}{r_{wheel}} \cdot G_{ratio}$$

---

### 3.4. Vehicle Longitudinal Dynamics

Total tractive/resistive force applied to vehicle mass:

$$F_{net} = F_{traction} - F_{brake} - F_{drag} - F_{rolling} - F_{grade}$$

* **Traction Force**:
  $$F_{traction} = \frac{\tau_{wheel}}{r_{wheel}}$$
* **Aerodynamic Drag**:
  $$F_{drag} = \frac{1}{2} \cdot \rho_{air} \cdot C_d \cdot A_{front} \cdot v_{vehicle}^2 \cdot \text{sgn}(v_{vehicle})$$
* **Rolling Resistance**:
  $$F_{rolling} = C_r \cdot m \cdot g \cdot \cos(\theta) \cdot \text{sgn}(v_{vehicle})$$
* **Grade / Slope Resistance**:
  $$F_{grade} = m \cdot g \cdot \sin(\theta)$$
  *(Positive $\theta$ represents uphill resistance; causes backward rollback if clutch is released without enough drive torque).*
* **Braking Force**:
  $$F_{brake} = (\text{brakePedal} \cdot F_{max\_brake} + \text{parkingBrake} \cdot F_{pb}) \cdot \text{sgn}(v_{vehicle})$$

---

### 3.5. State Integration (Euler Step)

For fixed time step $\Delta t$:

$$a = \frac{F_{net}}{m}$$
$$v_{new} = v_{current} + a \cdot \Delta t$$
$$x_{new} = x_{current} + v_{new} \cdot \Delta t$$

Static friction thresholds prevent perpetual microscopic jitter when the vehicle is stationary.

---

### 3.6. Road Vector Corridor & Spatial Projection

The road network is represented as sequences of 2D line segments $A(x_1, y_1)$ to $B(x_2, y_2)$ in local metric coordinates converted from WGS-84 coordinates:

$$dx = (\text{lon} - \text{lon}_A) \cdot 111139 \cdot \cos(\text{lat}_{rad})$$
$$dy = (\text{lat} - \text{lat}_A) \cdot 111139$$

For vehicle location $P(x, y)$ relative to segment vector $\vec{v} = B - A$ and vehicle offset $\vec{u} = P - A$:
* **Projection Scalar**:
  $$t = \frac{\vec{u} \cdot \vec{v}}{|\vec{v}|^2}, \quad t_{\text{clamped}} = \max(0, \min(1, t))$$
* **Closest Centerline Point**: $C = A + t_{\text{clamped}} \vec{v}$
* **Perpendicular Distance**: $d_{\perp} = |P - C|$
* **Usable Corridor Limit**:
  $$R_{\text{max}} = \frac{W_{\text{road}}}{2} - \frac{W_{\text{car}}}{2} \quad (W_{\text{car}} = 1.8\text{ m})$$

---

### 3.7. Collision Enforcement & Powertrain Stall Dynamics

* **Boundary Modes**:
  * `'strict'`: If $d_{\perp} \ge R_{\text{max}}$, the vehicle is clamped back to $R_{\text{max}}$ along the inward unit normal $\hat{n} = \frac{C - P}{|C - P|}$.
  * `'soft'`: Penetration beyond curb is allowed but collision contact is flagged.
  * `'off'`: Free roaming without road boundaries.
* **Curb Impact Momentum Loss**:
  When curb contact occurs in `'strict'` mode at speed ($|v| > 0.5\text{ m/s}$), instantaneous vehicle velocity drops by 50%.
* **Collision Stall Risk**:
  If the vehicle strikes a curb at speed in gear with the clutch engaged ($c_{\text{eng}} > 0.25$), the sudden driveline stoppage drags the engine RPM below $\text{stallRpm}$, triggering an immediate mechanical stall.

