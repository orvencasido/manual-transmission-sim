# DIY Physical Manual Transmission Controller: Build & Setup Guide
**Manual Driving Trainer — Hardware Architecture & Microcontroller Integration Specification**

---

## 1. Executive Summary & Feasibility

### Is this doable?
**Yes, 100% doable.** Modern web browsers (Chrome, Edge, Firefox, Brave) support low-latency hardware integration through two native browser APIs:

1. **HTML5 Gamepad API (`navigator.getGamepads()`)**:
   - Plug-and-play USB connection.
   - The browser detects your pedals, shifter, and steering wheel as a standard USB racing controller with zero driver installation.
   - 60Hz to 120Hz polling directly inside the browser's `requestAnimationFrame` loop.
2. **Web Serial API (`navigator.serial`)**:
   - Allows the browser to open a bidirectional 115,200 baud serial COM port directly to any standard Arduino (including Arduino Mega 2560, Uno, Nano, or ESP32) without flashing specialized HID firmware.

---

## 2. Microcontroller Selection: Arduino Mega vs Pro Micro / RP2040

| Metric | Arduino Mega 2560 | Arduino Pro Micro (ATmega32U4) | Raspberry Pi Pico (RP2040) |
| :--- | :--- | :--- | :--- |
| **Native USB HID** | ⚠️ Requires 16U2 DFU flash or Web Serial | ✅ **Native Plug & Play USB HID** | ✅ **Native USB HID + TinyUSB** |
| **Analog Inputs (Pedals)**| 16 channels (10-bit ADC, 0–1023) | 4–12 channels (10-bit ADC) | 3–4 channels (12-bit ADC, 0–4095) |
| **Digital Inputs (Shifter)**| 54 digital I/O pins | 18 digital I/O pins | 26 GPIO pins |
| **Estimated Cost (PH)** | ~₱450 – ₱750 ($8 – $13) | ~₱180 – ₱260 ($3 – $5) | ~₱220 – ₱350 ($4 – $6) |
| **Recommendation** | **Great if you already own one** (via Web Serial API) | **Best overall budget pick** for native USB Gamepad | **Best precision pick** (12-bit ADC resolution) |

> [!TIP]
> **If you already have an Arduino Mega 2560:** You can use it right away! The Web Serial API allows the Manual Driving Trainer web app to read pedal telemetry and gear switches directly from the Mega with zero hardware modifications.
>
> **If you are buying new parts:** An **Arduino Pro Micro (ATmega32U4)** or **Raspberry Pi Pico** is recommended because computers natively detect them as standard USB gamepads without any companion software.

---

## 3. Bill of Materials (BOM) & Estimated Costs

Prices reflect local availability in the Philippines (Shopee, Lazada, Makerlab Electronics) and international equivalents (AliExpress / Amazon):

| Item | Component | Quantity | Est. Cost (PHP) | Est. Cost (USD) | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Microcontroller** (Arduino Mega or Pro Micro) | 1 | ₱220 – ₱550 | $4 – $10 | Main controller logic & ADC read |
| **2** | **Pedal Sensors** (10kΩ Linear Potentiometers or SS49E Hall Effect Sensors + Neodymium magnets) | 3 | ₱90 – ₱180 | $1.50 – $3.50 | Measures pedal depth (Clutch, Brake, Gas) |
| **3** | **Pedal Springs / Door Hinge Mechanism** (Door hinges, compression springs) | 3 | ₱150 – ₱300 | $2.50 – $5.50 | Mechanical pedal return & resistance |
| **4** | **H-Shifter Microswitches** (KW12 / Omron style limit switches with lever) | 6 to 7 | ₱120 – ₱200 | $2 – $3.50 | Detects Gears 1, 2, 3, 4, 5, 6, Reverse |
| **5** | **Handbrake Switch or Potentiometer** | 1 | ₱40 – ₱120 | $0.80 – $2.00 | Handbrake engagement |
| **6** | **Ignition Key / Push Button Switch** | 1 | ₱35 – ₱80 | $0.60 – $1.50 | Starter motor cranking [I] |
| **7** | **Breadboard / Perfboard & Jumper Wires** | 1 kit | ₱100 – ₱180 | $1.80 – $3.20 | Wiring connections |
| **8** | **Wood / Acrylic / 3D-Printed Box** (MDF board or recycled wood) | 1 | ₱150 – ₱350 | $2.50 – $6.00 | Frame for pedals and shifter gate |
| **Total**| **Complete DIY 3-Pedal + H-Shifter Rig** | — | **₱905 – ₱1,960** | **$16 – $35** | Complete functional hardware |

---

## 4. Hardware Wiring & Pinout Architecture

```
                  +-----------------------------------+
                  |        ARDUINO MEGA / PRO MICRO   |
                  +-----------------------------------+
                  |                                   |
5V Bus -----------> VCC                               |
GND Bus ----------> GND                               |
                  |                                   |
Clutch Pot Out ---> A0 (Analog 0)                     |
Brake Pot Out ----> A1 (Analog 1)                     |
Throttle Pot Out -> A2 (Analog 2)                     |
Handbrake Pot ----> A3 (Analog 3)                     |
                  |                                   |
Gear 1 Switch ----> D2  (Digital Pin 2, INPUT_PULLUP) |
Gear 2 Switch ----> D3  (Digital Pin 3, INPUT_PULLUP) |
Gear 3 Switch ----> D4  (Digital Pin 4, INPUT_PULLUP) |
Gear 4 Switch ----> D5  (Digital Pin 5, INPUT_PULLUP) |
Gear 5 Switch ----> D6  (Digital Pin 6, INPUT_PULLUP) |
Reverse Switch ---> D7  (Digital Pin 7, INPUT_PULLUP) |
Starter Button ---> D8  (Digital Pin 8, INPUT_PULLUP) |
Handbrake Button -> D9  (Digital Pin 9, INPUT_PULLUP) |
                  |                                   |
                  +-----------------+-----------------+
                                    | USB Cable
                                    v
                           [ PC Browser / Web App ]
```

### 4.1 Sensor Setup Details
1. **Pedals (Clutch, Brake, Throttle)**:
   - **Pin 1 (Left Leg)**: Connect to `5V` (or `3.3V` on RP2040).
   - **Pin 2 (Wiper / Center Leg)**: Connect to Analog input (`A0` for Clutch, `A1` for Brake, `A2` for Throttle).
   - **Pin 3 (Right Leg)**: Connect to `GND`.
   - *Tip*: Adding a stiffer spring to the brake pedal and a progressive spring with a distinct mechanical "click" or cam profile to the clutch creates an authentic physical bite-point feel!
2. **H-Shifter Microswitches (Gears 1 to 5 + Reverse)**:
   - Connect one terminal of each microswitch to **GND**.
   - Connect the other terminal to the respective Arduino Digital Pin (`D2` to `D7`).
   - Use Arduino's internal `pinMode(pin, INPUT_PULLUP)`. When the shifter lever enters a gear gate, it closes the switch, pulling the pin to `LOW` (0V). When in neutral, no switch is clicked.

---

## 5. Microcontroller Firmware

### Option A: Web Serial Firmware (Compatible with Arduino Mega, Uno, Nano, ESP32)
*No special USB drivers required. Upload this standard sketch via Arduino IDE:*

```cpp
/**
 * Manual Driving Trainer — Web Serial Controller Firmware
 * Compatible with Arduino Mega 2560, Uno, Nano, and ESP32
 */

const int PIN_CLUTCH   = A0;
const int PIN_BRAKE    = A1;
const int PIN_THROTTLE = A2;
const int PIN_HANDBRAKE_ANALOG = A3;

const int PIN_GEAR_1   = 2;
const int PIN_GEAR_2   = 3;
const int PIN_GEAR_3   = 4;
const int PIN_GEAR_4   = 5;
const int PIN_GEAR_5   = 6;
const int PIN_GEAR_R   = 7;
const int PIN_STARTER  = 8;
const int PIN_HANDBRAKE_BTN = 9;

void setup() {
  Serial.begin(115200);

  pinMode(PIN_GEAR_1, INPUT_PULLUP);
  pinMode(PIN_GEAR_2, INPUT_PULLUP);
  pinMode(PIN_GEAR_3, INPUT_PULLUP);
  pinMode(PIN_GEAR_4, INPUT_PULLUP);
  pinMode(PIN_GEAR_5, INPUT_PULLUP);
  pinMode(PIN_GEAR_R, INPUT_PULLUP);
  pinMode(PIN_STARTER, INPUT_PULLUP);
  pinMode(PIN_HANDBRAKE_BTN, INPUT_PULLUP);
}

void loop() {
  // Read analog pedal inputs (10-bit: 0 to 1023)
  int rawClutch   = analogRead(PIN_CLUTCH);
  int rawBrake    = analogRead(PIN_BRAKE);
  int rawThrottle = analogRead(PIN_THROTTLE);

  // Normalize to 0.000 -> 1.000 float range
  float clutch   = constrain((float)rawClutch / 1023.0f, 0.0f, 1.0f);
  float brake    = constrain((float)rawBrake / 1023.0f, 0.0f, 1.0f);
  float throttle = constrain((float)rawThrottle / 1023.0f, 0.0f, 1.0f);

  // Determine active gear (-1: Reverse, 0: Neutral, 1..5: Forward Gears)
  int currentGear = 0;
  if (digitalRead(PIN_GEAR_1) == LOW) currentGear = 1;
  else if (digitalRead(PIN_GEAR_2) == LOW) currentGear = 2;
  else if (digitalRead(PIN_GEAR_3) == LOW) currentGear = 3;
  else if (digitalRead(PIN_GEAR_4) == LOW) currentGear = 4;
  else if (digitalRead(PIN_GEAR_5) == LOW) currentGear = 5;
  else if (digitalRead(PIN_GEAR_R) == LOW) currentGear = -1;

  bool starterEngaged = (digitalRead(PIN_STARTER) == LOW);
  bool handbrakeActive = (digitalRead(PIN_HANDBRAKE_BTN) == LOW);

  // Output 60Hz telemetry frame: C:clutch,B:brake,T:throttle,G:gear,S:starter,H:handbrake
  Serial.print("C:"); Serial.print(clutch, 3);
  Serial.print(",B:"); Serial.print(brake, 3);
  Serial.print(",T:"); Serial.print(throttle, 3);
  Serial.print(",G:"); Serial.print(currentGear);
  Serial.print(",S:"); Serial.print(starterEngaged ? 1 : 0);
  Serial.print(",H:"); Serial.println(handbrakeActive ? 1 : 0);

  delay(16); // ~60 updates per second
}
```

---

### Option B: Native USB HID Gamepad Firmware (For Arduino Pro Micro / Leonardo / RP2040)
*Emulates an official USB joystick. The browser recognizes it instantly as a game controller:*

```cpp
/**
 * Native USB HID Gamepad Controller
 * Requires Arduino Pro Micro / Leonardo (ATmega32U4) and the 'Joystick' library by MHeironimus
 */
#include <Joystick.h>

Joystick_ Joystick(
  JOYSTICK_DEFAULT_REPORT_ID, JOYSTICK_TYPE_GAMEPAD,
  8, 0,                   // 8 Buttons, 0 Hat Switches
  false, false, false,    // No X, Y, Z (flight axes)
  false, false, false,    // No Rx, Ry, Rz
  false,                  // No Rudder
  true,                   // Throttle (Accelerator)
  true,                   // Accelerator (Used as Clutch)
  true                    // Brake
);

void setup() {
  Joystick.begin();
  for (int pin = 2; pin <= 9; pin++) {
    pinMode(pin, INPUT_PULLUP);
  }
}

void loop() {
  // Read and set analog pedals
  Joystick.setThrottle(analogRead(A2));    // Throttle
  Joystick.setBrake(analogRead(A1));       // Brake
  Joystick.setAccelerator(analogRead(A0)); // Clutch

  // Set buttons (Gears 1..5, Reverse, Starter, Handbrake)
  for (int i = 0; i < 8; i++) {
    Joystick.setButton(i, digitalRead(i + 2) == LOW);
  }

  delay(10);
}
```

---

## 6. Web Application Integration in Next.js

### 6.1 HTML5 Gamepad API Support (For USB HID / Pro Micro)
The browser's Gamepad API requires zero configuration. We read axes and buttons inside the simulation loop:

```ts
// components/controls/usePhysicalGamepad.ts
export function pollGamepadState(): Partial<InputState> | null {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads[0];
  if (!gp) return null;

  // Typical Sim Wheel Pedal Mapping
  const clutch = (gp.axes[3] + 1) / 2;   // Axis mapped from -1..1 to 0..1
  const brake = (gp.axes[2] + 1) / 2;
  const throttle = (gp.axes[1] + 1) / 2;

  // H-Shifter Buttons
  let gear = 0;
  if (gp.buttons[0]?.pressed) gear = 1;
  else if (gp.buttons[1]?.pressed) gear = 2;
  else if (gp.buttons[2]?.pressed) gear = 3;
  else if (gp.buttons[3]?.pressed) gear = 4;
  else if (gp.buttons[4]?.pressed) gear = 5;
  else if (gp.buttons[5]?.pressed) gear = -1; // Reverse

  return {
    clutch,
    brake,
    throttle,
    gear,
    isStarterEngaged: Boolean(gp.buttons[6]?.pressed),
    parkingBrake: Boolean(gp.buttons[7]?.pressed),
  };
}
```

### 6.2 Web Serial API Support (For Arduino Mega 2560 via USB COM Port)
When using an Arduino Mega, the user clicks a **"🔌 Connect Hardware Rig"** button in the dashboard:

```ts
// components/controls/useWebSerialController.ts
export async function connectArduinoMega(onData: (state: InputState) => void) {
  if (!('serial' in navigator)) {
    alert('Web Serial API is supported in Chrome, Edge, and Opera.');
    return;
  }

  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 115200 });

  const textDecoder = new TextDecoderStream();
  port.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  let lineBuffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    lineBuffer += value;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() || '';

    for (const line of lines) {
      // Parse "C:0.450,B:0.000,T:0.120,G:1,S:0,H:0"
      parseControllerLine(line.trim(), onData);
    }
  }
}
```

---

## 7. Calibration & Physical Tuning Tips

1. **Deadzone Calibration**:
   - Potentiometers rarely reach absolute 0Ω or full scale due to physical travel limits.
   - The web app provides a calibration screen where you press each pedal to minimum and maximum to auto-scale the ADC values.
2. **Clutch Bite-Point Feel**:
   - In our simulation, the friction bite point occurs between **40% and 65%** travel.
   - You can place a mechanical door-stopper spring or rubber damper at the 50% travel mark of your clutch pedal so your foot physically feels the resistance wall where clutch friction engages!
3. **Brake Pedal Stiffness**:
   - A realistic brake pedal should have very little travel and high resistance. Adding a rubber bushing or skateboard truck bushing behind the brake pedal produces an authentic hydraulic brake pedal feel.

---

## 8. Summary & Next Steps

- **Feasibility**: High. Both the Arduino Mega 2560 (via Web Serial API) and Arduino Pro Micro (via native USB HID Gamepad API) work with zero extra software drivers on Linux, Windows, and Mac.
- **Estimated Budget**: ~**₱900 to ₱1,900 PHP** ($16 – $35 USD) for a complete 3-pedal and 6-speed H-shifter setup.
- **Ready for Implementation**: The code snippets above can be plugged directly into [`lib/simulation/controls.ts`](file:///home/orven/Documents/manual-transmission-sim/lib/simulation/controls.ts) and [`components/controls/useKeyboardControls.ts`](file:///home/orven/Documents/manual-transmission-sim/components/controls/useKeyboardControls.ts) to provide simultaneous physical hardware and keyboard driving.
