# OpenStreetMap Driving Simulator Feature Specification
**Manual Driving Trainer — Phase 12**
**Document Version:** 1.0.0  
**Target:** Free, Open-Source 2D Top-Down Real-World Driving Simulator via OpenStreetMap (OSM)

---

## 1. Executive Summary & Feasibility

### Is this doable?
**YES, 100% doable.** This is an established, high-performance architecture for browser-based vehicle and flight simulators. 

Using **OpenStreetMap (OSM)**, the entire mapping stack is:
- **100% Free and Open-Source**: No credit cards, no billing, no usage quotas, and no Google Maps API keys required.
- **Global Coverage**: Real-world roads, intersections, highways, and mountain passes across every country and city in the world.
- **Lightweight**: Utilizing standard tile servers (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) and Leaflet.js (~42 KB gzip), loading instantaneously inside Next.js.
- **Seamless Telemetry Sync**: The map vehicle pointer is driven directly by the existing physics engine (`dynamics.speedKmh`, `controls.steering`, transmission gears), maintaining complete mechanical realism.

---

## 2. Core Technical Architecture

The map simulator links the vehicle powertrain physics with geographical coordinates using a **2D Kinematic Bicycle Model** and **WGS-84 Geodetic Projection**.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Powertrain Physics Loop (120 Hz)                                       │
│ Inputs: Throttle (W), Brake (S), Clutch (Space), Steering (A/D), Gear  │
│ Outputs: Linear Speed v (m/s), Steering Angle δ (rad)                  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2D Kinematic Bicycle Model (lib/simulation/kinematics.ts)              │
│ Heading Rate: dψ/dt = (v / Wheelbase) * tan(δ)                         │
│ World Displacement: dx = v * cos(ψ) * dt, dy = v * sin(ψ) * dt         │
│ Geodetic Conversion: dLat = dy / 111139, dLon = dx / (111139 * cosLat) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ OpenStreetMap Leaflet View (components/map/MapView.tsx)                │
│ • Real-time Rotated Vehicle Pointer (heading ψ)                        │
│ • Smooth Camera Tracking (Follow Car vs North-Up)                      │
│ • GPS Breadcrumb Trail / Odometry Path                                 │
│ • Location Preset Selector & Nominatim Free Search Bar                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical & Kinematic Model

### 3.1 Kinematic Bicycle Steering Model
To realistically translate steering pedal inputs into curved trajectory motion on real-world roads:

* **Wheelbase ($L$)**: $2.60\text{ meters}$ (standard compact manual car).
* **Maximum Wheel Angle ($\delta_{\max}$)**: $\pm 35^\circ$ ($\pm 0.6108\text{ rad}$).
* **Current Steering Angle ($\delta$)**:
  $$\delta = \text{controls.steering} \times \delta_{\max}$$
* **Yaw Heading Angular Velocity ($\dot{\psi}$)**:
  $$\dot{\psi} = \frac{v}{L} \cdot \tan(\delta)$$
* **Heading Integration ($\psi$)**:
  $$\psi_{t} = \psi_{t - dt} + \dot{\psi} \cdot dt \pmod{2\pi}$$

### 3.2 Cartesian Displacement (Local Metric Grid)
Given longitudinal forward velocity $v$ ($m/s$) and heading angle $\psi$ (where $0\text{ rad} = \text{East}$, $\frac{\pi}{2} = \text{North}$):
$$\Delta x = v \cdot \cos(\psi) \cdot dt \quad (\text{Meters East/West})$$
$$\Delta y = v \cdot \sin(\psi) \cdot dt \quad (\text{Meters North/South})$$

*When in Reverse gear ($v < 0$), the vehicle reverses naturally backwards while maintaining accurate Ackerman steering curvature.*

### 3.3 Geodetic Projection (WGS-84 to Latitude & Longitude)
Converting metric displacement into geographic coordinates:
$$\Delta \text{Latitude} = \frac{\Delta y}{111\,139\text{ m/degree}}$$
$$\Delta \text{Longitude} = \frac{\Delta x}{111\,139\text{ m/degree} \times \cos(\text{Latitude}_{\text{radians}})}$$
$$\text{Lat}_{new} = \text{Lat}_{old} + \Delta \text{Latitude}$$
$$\text{Lon}_{new} = \text{Lon}_{old} + \Delta \text{Longitude}$$

---

## 4. Feature Specifications

### 4.1 Pure 2D Top-Down Aerial Map Display (`components/map/MapView.tsx`)
1. **Strictly 2D Top-Down Orthogonal Perspective**:
   - Pure 90° top-down bird's-eye view, identical to standard navigation map apps (Google Maps / Apple Maps / Waze in top-down 2D mode).
   - Zero 3D tilt, zero pitch angles, zero isometric distortion, and no distracting 3D building extrusions.
   - Clean, flat OpenStreetMap road geometry clearly showing lane layouts, cross streets, roundabouts, and turns.
   - High-contrast road styling (e.g. OpenStreetMap CartoDB Dark Matter / Alidade Smooth Dark tiles for clean contrast with HUD gauges).
   - Smooth zoom controls ($Z = 15$ to $19$, optimized for street-level cornering and highway cruising).
2. **2D Vehicle Pointer & Marker**:
   - Clean 2D top-down directional pointer icon (sharp navigation arrow or flat stylized top-down car silhouette).
   - Rotates strictly in the 2D plane to indicate heading angle $\psi$ ($0^\circ\text{--}360^\circ$).
   - Placed directly at the vehicle's real-world GPS coordinates (`latitude`, `longitude`).
3. **Smooth 2D Camera Follow**:
   - Camera auto-centers smoothly on the 2D pointer as you drive along roads.
   - Optional toggle:
     * **North-Up**: Map stays fixed with North at the top; pointer rotates as you turn corners (standard map mode).
     * **Heading-Up (Heads-Up)**: Map smoothly rotates so the road ahead is always oriented upward, matching your driving direction.
4. **GPS Breadcrumb Trail**:
   - Crisp 2D illuminated polyline tracing the exact route driven across streets during the session.

### 4.2 Global Location Selector & Search
1. **Curated Iconic Driving Presets**:
   - **San Francisco, CA (Lombard & California St)**: Steep hill start playground ($10\%\text{--}18\%$ natural incline).
   - **Tokyo, Japan (Shibuya Crossing & Shinjuku)**: Dense urban intersections and manual stop-and-go practice.
   - **Nürburgring Nordschleife, Germany**: High-speed upshifting, downshifting, and rev-matching circuit.
   - **Paris, France (Arc de Triomphe)**: High-intensity roundabout clutch modulation.
   - **Amalfi Coast, Italy**: Scenic coastal road with tight switchbacks.
2. **Free Global Search (OpenStreetMap Nominatim Geocoder)**:
   - Free search bar powered by `https://nominatim.openstreetmap.org/search?q={query}&format=json`.
   - Type any neighborhood, street name, town, or landmark in the world and drop the vehicle there with 1 click.
3. **Click-to-Spawn**:
   - Option to click anywhere on the map to teleport the vehicle to that exact coordinate.

### 4.3 Cockpit UI Integration
- Seamless integration with the newly revamped **3-Column Widescreen Cockpit**:
  - **Embedded Mode**: Displayed in the center or right column, synchronized with dials and pedals.
  - **Theater / Expanded Map Mode**: Dedicated route `/map` or 1-click toggle expanding the map while keeping a compact transparent HUD binnacle (Speedometer, Tachometer, Gear, Pedals) overlaid at the bottom.

---

## 5. Agent Ownership & Work Breakdown

To maintain modularity and strict boundary enforcement across our multi-agent architecture:

### 1. `physics_agent` (Powertrain & Kinematics Specialist)
- **Files Owned**: `lib/simulation/kinematics.ts`, `lib/simulation/types.ts`
- **Tasks**:
  - Implement 2D bicycle kinematic model (`KinematicsModel`).
  - Calculate yaw heading $\psi$, turning rate, Cartesian displacement, and WGS-84 Lat/Lon integration.
  - Expose `GeoPositionState` (`latitude`, `longitude`, `headingDegrees`, `headingRadians`, `pathHistory`).
  - Connect kinematics update into the fixed 120Hz simulation loop in `lib/simulation/simulation.ts`.

### 2. `frontend_agent` (UI & Map Presentation Specialist)
- **Files Owned**: `components/map/`, `app/map/page.tsx`, `components/dashboard/`
- **Tasks**:
  - Install and configure `leaflet` and `@types/leaflet` (or lightweight canvas tile engine).
  - Build `components/map/MapView.tsx` (OSM tile layer, dynamic rotated car SVG marker, follow camera, breadcrumb path).
  - Build `components/map/LocationSelector.tsx` (iconic presets + Nominatim free global search bar).
  - Build dedicated `/map` page route and embed toggle in `/simulator`.
  - Maintain strict separation: React UI purely consumes `GeoPositionState` from Zustand.

---

## 6. Implementation Roadmap (Phase 12)

| Step | Milestone | Description | Agent |
| :--- | :--- | :--- | :--- |
| **12.1** | **Kinematic Bicycle Model** | Create `lib/simulation/kinematics.ts` for 2D heading, Ackerman turning radius, and Lat/Lon integration. | `physics_agent` |
| **12.2** | **OpenStreetMap Rendering** | Build `components/map/MapView.tsx` with OpenStreetMap raster tiles, custom car pointer, and smooth tracking. | `frontend_agent` |
| **12.3** | **Location Presets & Search** | Build `components/map/LocationSelector.tsx` with curated city presets and free Nominatim search bar. | `frontend_agent` |
| **12.4** | **Cockpit Integration** | Wire map view into `/simulator` and create dedicated `/map` route with transparent HUD instrumentation overlay. | `frontend_agent` |
| **12.5** | **Testing & Verification** | Verify 0 errors with `npx tsc --noEmit` and production build with `npm run build`. | Lead / All |

---

## 7. Operational & Licensing Compliance
- **Attribution**: Display standard OpenStreetMap attribution (`© OpenStreetMap contributors`) in the map footer per OSM Tile Usage Policy.
- **Tile Server Limits**: Standard OSM tile servers allow reasonable interactive web application usage. Leaflet caches tiles automatically in browser memory to minimize requests.
- **Offline Fallback**: If offline or internet is disconnected, the vehicle continues moving on a schematic coordinate grid without interrupting the driver.
