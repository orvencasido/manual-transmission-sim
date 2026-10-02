# Vehicle Scale Calibration & Road Collision Tuning Plan
**Document:** `docs/vehicle-scale-collision.md`  
**Status:** Approved for Implementation  
**Affected Subsystems:** `components/map/MapView.tsx` (`frontend_agent`), `lib/simulation/roadNetwork.ts` (`physics_agent`), `lib/simulation/kinematics.ts` (`physics_agent`)

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 The Visual Oversizing Issue
- In `components/map/MapView.tsx` (lines 175–255), the vehicle top-view marker is defined with:
  - Container: `48px × 48px`, `iconAnchor: [24, 24]`
  - Car body width: `19px`, length: `35px`
  - Total sprite footprint: `26px × 42px` (including tires, mirrors, headlight cones)
- **Scale Mismatch on OpenStreetMap:**
  - At zoom level 18 at Lucena City / Tayabas coordinates ($\approx 13.9^\circ \text{N}$), ground resolution is:
    $$S = \frac{156543.03 \times \cos(13.9^\circ)}{2^{18}} \approx 0.579 \text{ m/pixel}$$
  - A $48\text{px}$ sprite visually represents a vehicle **$27.8\text{ meters}$ long** and **$15.0\text{ meters}$ wide**!
  - Real-world Philippine 2-lane roads (e.g. Merchan St, Lucena Diversion, Tayabas Heritage Corridor) are typically $6.0\text{m} - 9.0\text{m}$ wide (only $10 - 16\text{ pixels}$ across at zoom 18).
  - Consequently, the car marker appears **2× wider than the entire two-lane asphalt roadway**, swallowing sidewalks, curbs, and both oncoming and forward lanes.

### 1.2 The Collision Sensitivity Issue
- In `lib/simulation/roadNetwork.ts` & `lib/simulation/kinematics.ts`:
  - `CAR_HALF_WIDTH_METERS = 0.9` (1.8m width)
  - `SHOULDER_BUFFER_METERS = 1.5`
  - In narrow downtown street segments ($5.5\text{m} - 6.5\text{m}$ width), `halfWidth = 2.75\text{m}`.
  - The maximum allowable centerline deviation before collision is:
    $$\text{maxCenterlineDist} = 2.75\text{m} + 1.5\text{m} - 0.9\text{m} = 3.35\text{m}$$
  - Because the visual car marker is gigantic, the player navigates by steering away from visually overlapping curbs. This inadvertently pushes the vehicle centerline off-course, instantly exceeding $\text{maxCenterlineDist}$ and triggering hard curb collision clamping.
  - Furthermore, segmented vector road polylines at curved corners have localized chord-depth offsets, causing premature collision triggers when cornering.

---

## 2. Technical Objectives & Calibration Target

1. **Realistic Visual Vehicle Proportion (`frontend_agent`)**:
   - Rescale top-down vehicle SVG marker from $48\text{px} \times 48\text{px}$ down to **$26\text{px} \times 26\text{px}$** (with `iconAnchor: [13, 13]`).
   - The car body will have a streamlined width of $\approx 10\text{px} - 11\text{px}$ and length of $\approx 19\text{px} - 20\text{px}$.
   - At zoom 18 ($0.58\text{m/px}$), this represents $\approx 5.8\text{m} \times 11.5\text{m}$ bounding box—perfectly fitting inside a single traffic lane with clear lane margin on both sides while preserving high-DPI crisp visibility of headlights, tires, and roofline.
   - Dynamic zoom-responsive scaling: at zoom 16–17 ($22\text{px}$), zoom 18 ($26\text{px}$), zoom 19 ($32\text{px}$).

2. **Physical Corridor & Collision Hitbox Calibration (`physics_agent`)**:
   - Calibrate `CAR_HALF_WIDTH_METERS` from $0.9\text{m}$ to **$0.75\text{m}$** (standard subcompact sedan clearance).
   - Increase `SHOULDER_BUFFER_METERS` from $1.5\text{m}$ to **$2.5\text{m}$** to accommodate realistic road shoulders, curbside parking bays, and OSM centerline polyline approximations.
   - Update default road widths in `DEFAULT_ROAD_WIDTHS`:
     - `primary`: $14.0\text{m} \rightarrow 16.0\text{m}$
     - `secondary`: $10.0\text{m} \rightarrow 12.0\text{m}$
     - `tertiary`: $7.5\text{m} \rightarrow 9.0\text{m}$
     - `residential`: $6.0\text{m} \rightarrow 7.5\text{m}$
     - `unclassified`: $5.5\text{m} \rightarrow 7.0\text{m}$
   - Soften glancing boundary response in `lib/simulation/kinematics.ts`:
     - Allow glancing contact with road edges without abrupt speed kills.
     - Smooth deflecting tangent slide when steering along the curb.

---

## 3. Subagent Delegation Plan

### Subagent 1: `physics_agent`
- **Assigned Files**:
  - `lib/simulation/roadNetwork.ts`
  - `lib/simulation/kinematics.ts`
- **Tasks**:
  1. Update `CAR_HALF_WIDTH_METERS = 0.75` and `SHOULDER_BUFFER_METERS = 2.5`.
  2. Increase default highway widths in `DEFAULT_ROAD_WIDTHS` to give realistic drivable corridors on Lucena and Tayabas roads.
  3. Ensure point-to-segment projection and curb contact thresholds allow smooth turning around corners without false positives.
  4. Ensure `npx tsc --noEmit` compiles with 0 errors.

### Subagent 2: `frontend_agent`
- **Assigned Files**:
  - `components/map/MapView.tsx`
- **Tasks**:
  1. Redesign `carIcon` SVG marker with a proportional $26\text{px} \times 26\text{px}$ bounding box and `iconAnchor: [13, 13]`.
  2. Maintain rotation pivot centered at `13px 13px`.
  3. Scale car body shell, windshields, headlights, side mirrors, and tires cleanly in SVG coordinates.
  4. Scale down drop shadow and glow filters so they do not spill outside the road lane.
  5. Verify that in both Heading-Up mode and North-Up mode, the vehicle marker rotates smoothly and points accurately.
  6. Ensure `npx tsc --noEmit` and Next.js build compile cleanly.

---

## 4. Verification Criteria
- [ ] Vehicle fits cleanly inside a single travel lane on Lucena and Tayabas streets.
- [ ] Normal driving along downtown streets (e.g. Quezon Ave, Merchan St, Perez Park loop) does not trigger collision alarms unless actively running off the road into buildings.
- [ ] Visual car size matches intuitive scale relative to road widths, intersections, and roundabouts.
- [ ] `npx tsc --noEmit` passes with 0 errors.
