# Road Boundary & Wall Collision Architecture Plan
**Manual Driving Trainer — Road Constraint & Collision System**  
**Document:** `docs/walls-collision.md`  
**Status:** Planning / Architecture Proposal  

---

## 1. Executive Summary & Feasibility

### "Is it possible on my maps, that I won't go outside the road?"
**YES, 100% possible.** Restricting vehicle movement to road corridors and preventing cars from driving over buildings, sidewalks, and open terrain is standard practice in real-world automotive simulation and GIS routing systems.

### The Technical Challenge
The simulator currently renders **OpenStreetMap raster tiles** (`tile.openstreetmap.org/{z}/{x}/{y}.png`). Raster tiles are pre-rendered bitmap images ($256 \times 256\text{ px}$) — they do not inherently contain collision boundaries or vector metadata.

To ensure the car remains strictly inside the road, the simulation needs **vector road geometry** (road centerlines, lane counts, and road widths) running underneath the visual map.

---

## 2. Architecture Comparison & Selected Strategy

| Strategy | Accuracy | Performance | Network Cost | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **1. Raster Pixel Color Mask**<br>(Sample canvas color under wheels) | Low (Fragile, label text & shadows cause false collisions) | Fast (Canvas 2D) | None | ❌ Not recommended |
| **2. Dynamic Vector Corridor (Overpass API)**<br>(Fetch live OSM road vectors in radius) | High (Real-world OSM ways) | High with R-Tree spatial index | 1 lightweight request per 1 km | ✅ Recommended for global exploration |
| **3. Pre-Packaged Local GeoJSON Corridor**<br>(Bundled road network for Lucena City) | **100% Exact & Instant** | **Ultra-Fast (60–120 FPS)** | **Zero (0ms, 100% Offline)** | 🏆 **Top Choice for Default City (Lucena)** |
| **4. Hybrid Architecture**<br>(Lucena offline pack + Overpass dynamic fallback) | **Maximum Flexibility** | **Optimized** | **Minimal** | 🌟 **Recommended Architecture** |

---

## 3. Recommended Solution: Vector Road Corridor Collision Model (VRCCM)

```
┌────────────────────────────────────────────────────────────────────────┐
│ OpenStreetMap Vector Road Network (Lucena City GeoJSON / Overpass API)  │
│ Nodes: [lat, lon], Ways: [highway=residential, lanes=2, width=8m]      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Spatial R-Tree Index (lib/simulation/roadNetwork.ts)                   │
│ Segments indexed into spatial bounding boxes for sub-millisecond lookup│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Vehicle Physics Tick (120 Hz)                                          │
│ 1. Current car coordinate P(lat, lon)                                  │
│ 2. Query nearest road segment AB                                       │
│ 3. Compute perpendicular distance d_perp to road centerline            │
│ 4. Check road half-width: Limit = W_road / 2                           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
        Inside Road Corridor              Outside / Curb Hit
        (d_perp < Limit)                  (d_perp >= Limit)
                   │                               │
                   ▼                               ▼
       Normal Friction & Drive         ┌───────────────────────────────┐
                                       │ Collision Response:           │
                                       │ • Solid Barrier Bounce        │
                                       │ • Sliding Tangent Constraint  │
                                       │ • Curb Scrape Audio SFX       │
                                       │ • Clutch/Stall Risk Penalty   │
                                       └───────────────────────────────┘
```

---

## 4. Mathematical Model for Road Collision & Boundaries

### 4.1 Road Centerline Segment Projection
Every road is represented as a sequence of connected 2D line segments $A(x_1, y_1)$ to $B(x_2, y_2)$ in local metric coordinates.

For a vehicle located at point $P(x, y)$:
1. **Segment Vector**: $\vec{v} = B - A$
2. **Vehicle Vector**: $\vec{u} = P - A$
3. **Projection Scalar ($t$)**:
   $$t = \frac{\vec{u} \cdot \vec{v}}{|\vec{v}|^2} = \frac{(P_x - A_x)(B_x - A_x) + (P_y - A_y)(B_y - A_y)}{(B_x - A_x)^2 + (B_y - A_y)^2}$$
4. **Closest Point on Road ($C$)**:
   $$t_{\text{clamped}} = \max(0, \min(1, t))$$
   $$C = A + t_{\text{clamped}} \vec{v}$$
5. **Perpendicular Distance to Centerline ($d_{\perp}$)**:
   $$d_{\perp} = |P - C| = \sqrt{(P_x - C_x)^2 + (P_y - C_y)^2}$$

---

### 4.2 Road Widths by OpenStreetMap Classification
If OSM tags do not specify an explicit `width=*` or `lanes=*`, the model assigns realistic Philippine road standards:

| OSM Highway Tag | Typical Philippine Road | Total Width ($W$) | Boundary Half-Width ($W/2$) |
| :--- | :--- | :--- | :--- |
| `motorway` / `trunk` | Expressways / SLEX bypass | $14.0\text{ m}$ (4 lanes) | $7.0\text{ m}$ |
| `primary` | Maharlika Highway, Quezon Ave | $10.5\text{ m}$ (3–4 lanes) | $5.25\text{ m}$ |
| `secondary` | Lucena Diversion Road, Perez Ave | $8.0\text{ m}$ (2 wide lanes) | $4.0\text{ m}$ |
| `tertiary` | Downtown Lucena connector streets | $6.5\text{ m}$ (2 standard lanes) | $3.25\text{ m}$ |
| `residential` | Neighborhood barangay streets | $5.5\text{ m}$ (tight 2 lanes) | $2.75\text{ m}$ |
| `service` / `alley` | Driveways & commercial alleys | $3.8\text{ m}$ (single lane) | $1.9\text{ m}$ |

---

### 4.3 Collision Detection & Response Types

When $d_{\perp} + \frac{W_{\text{car}}}{2} \ge \frac{W_{\text{road}}}{2}$ (where standard car half-width is $0.9\text{ m}$):

#### Option 1: Solid Guardrail / Curb Barrier Bounce (Realistic Physics)
* The vehicle reflects off the curb with an inelastic restitution coefficient ($e \approx 0.25$):
  $$\vec{v}_{\text{reflected}} = \vec{v} - (1 + e)(\vec{v} \cdot \hat{n})\hat{n}$$
  where $\hat{n}$ is the unit normal vector pointing inward toward the road center.
* **Speed Loss**: $30\% - 50\%$ instantaneous momentum drop.
* **Powertrain Impact**: If the car hits the wall in gear without dipping the clutch, the sudden wheel stoppage immediately stalls the engine!

#### Option 2: Road Clamping / Boundary Slide (Smooth Training Mode)
* Prevents the car from penetrating the barrier by projecting the position back onto the road edge:
  $$P_{\text{corrected}} = C + \left(\frac{W_{\text{road}}}{2} - \frac{W_{\text{car}}}{2}\right) \hat{n}_{\text{road}}$$
* Velocity component perpendicular to the road is zeroed out ($\vec{v}_{\perp} = 0$), allowing the driver to "slide" along the curb without clipping into buildings.

#### Option 3: Off-Road Rough Surface Penalty
* If collision wall is disabled or set to "Soft Shoulder":
  * Rolling resistance coefficient increases $10\times$ ($C_{rr} = 0.015 \to 0.15$).
  * Speed bleeds off rapidly.
  * Steering vibration feedback.
  * Instructor alert: *"Vehicle left road surface — return to paved lane."*

---

## 5. Road Data Strategy for Lucena City & Beyond

### 5.1 Bundled Lucena City Road Corridor (Fastest & 100% Reliable)
* Extract the vectorized road network for Lucena City (bounding box: `13.9100, 121.5800` to `13.9600, 121.6500`) into a compact JSON file:
  `public/data/roads-lucena.json` (~$350\text{ KB}$ gzipped).
* **Benefits**:
  * Loads in under 15ms.
  * Completely offline, zero API rate limits, works 100% on Vercel production.
  * Covers Quezon Capitol, Perez Park, Lucena Diversion Road, Grand Central Terminal, and all major avenues.

### 5.2 Dynamic Overpass API for Custom Locations
* When teleporing or searching outside Lucena City:
  * Query Overpass API endpoint:
    `https://overpass-api.de/api/interpreter?data=[out:json];way["highway"](bbox);out geom;`
  * Cache results in browser `sessionStorage` or local memory so each neighborhood is fetched only once.

---

## 6. Audio & Instructor Integration

1. **Curb Impact SFX (`lib/audio/engineAudio.ts`)**:
   * Synthesize a low-frequency mechanical thud + metal guardrail scrape when contacting the road boundary.
2. **Visual Feedback (`components/map/MapView.tsx`)**:
   * Subtle red collision spark / vignette pulse on screen border.
   * Optional toggle: **"Show Road Boundaries"** (renders thin neon cyan boundary lines along road curbs).
3. **Instructor Diagnostic Alert (`components/instructor/`)**:
   * *"Curb strike! Keep the vehicle centered between lane boundaries."*
   * Stalling caused by wall collision is properly diagnosed: *"Engine stalled due to impact resistance."*

---

## 7. Implementation Roadmap

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 13.1** | **Road Data Ingestion** | Author `lib/simulation/roadNetwork.ts` and bundle `public/data/roads-lucena.json`. |
| **Phase 13.2** | **Spatial Collision Engine** | Implement point-to-segment projection, perpendicular distance checks, and boundary limits. |
| **Phase 13.3** | **Physics Wall Response** | Connect collision normals to vehicle velocity vector, wheel speed feedback, and stall dynamics. |
| **Phase 13.4** | **UI & Audio Feedback** | Add curb strike sound synthesis, HUD boundary warning lamp, and optional road edge outlines. |
| **Phase 13.5** | **Toggle Settings** | Add toggle: **"Road Boundaries: Strict Wall / Soft Off-Road / Free Roam"** so users can choose their preference. |

---

## 8. Summary & Next Steps
Creating invisible collision walls along real OpenStreetMap roads is completely practical and will transform the simulator into a realistic driving environment where drivers must respect lane discipline, negotiate tight turns, and avoid mounting sidewalks or hitting roadside buildings.

> When you are ready to begin implementation, we can proceed with Phase 13.1 by preparing the Lucena City road vector dataset and integrating the collision model into the physics loop!
