# Street Map Driving: Hover, Orientation Stability & Accurate Teleport Fix
**Document:** `docs/map-pointer-teleport-fix.md`  
**Status:** Approved for Implementation  
**Affected Subsystem:** `components/map/MapView.tsx` (`frontend_agent`)

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 The Orientation Flipping / Shifting Bug ("hover, then orientation shift up down")
- **Cause**: In `components/map/MapView.tsx`, the rotator transform was conditionally toggled based on `isFollowing`:
  ```ts
  transform: `translate3d(-50%, -50%, 0) rotate(${
    orientationMode === 'heading-up' && isFollowing ? -headingDegrees : 0
  }deg)`
  ```
  Whenever the user dragged, hovered, or panned the map, Leaflet fired `dragstart`, setting `isFollowing = false`.
- This caused the entire map container to violently snap from `-headingDegrees` to `0deg` (flipping the screen upside-down or sideways).
- Then, as soon as the vehicle moved or recentered, `isFollowing` became `true`, snapping the map violently back to `-headingDegrees`.
- In addition, the JSX inline style was using `-headingDegrees` (wrapped 0-360) while `useEffect` was using `-unwrappedHeading`, causing style fighting on every render.

### 1.2 The Teleport Inaccuracy Bug ("when i pinpoint or teleport, it is not going down to the exact location")
- **Cause 1: Drag-to-Teleport False Triggers**:
  - The outer viewport caught `onClick` events. When a user dragged to pan the map and released the mouse, the browser generated a `click` event on mouseup, inadvertently triggering `handleViewportClick` and teleporting the vehicle to wherever the drag ended!
- **Cause 2: Rotational Condition Mismatch in Click Math**:
  - In `handleViewportClick`, `isRotated` was defined as `orientationMode === 'heading-up' && isFollowing`.
  - Because panning set `isFollowing = false`, `isRotated` evaluated to `false`. The unrotated screen offset was added directly to `centerPixel`, causing teleportation to an entirely incorrect geographic location (e.g. clicking ahead in East heading teleported North).
- **Cause 3: Disconnected Centers**:
  - `centerLatLng` was fetched from `map.getCenter()`, but during continuous rotation and pan offsets, the pivot center was not synced with the actual rotator origin.

---

## 2. Technical Solution & Mathematical Formulation

### 2.1 Orientation Stability
1. **Decouple Orientation from Camera Follow**:
   - `orientationMode === 'heading-up'` must keep the map rotated by `-headingDegrees` consistently, regardless of whether `isFollowing` is true or false.
   - Panning in Heading-Up mode moves the map center smoothly along the driver's perspective without spinning the world.
   - In North-Up mode, the map is permanently held at `0deg` (fixed North).
   - This eliminates all orientation flips, violent spinning, and visual chaos when hovering or panning.

### 2.2 Drag vs. Click Disambiguation
1. **Pointer Down / Up Movement Tracking**:
   - Track pointer start position `(startX, startY)` on `pointerdown`.
   - On `pointerup`, compute distance moved:
     $$\text{dist} = \sqrt{(e.clientX - \text{startX})^2 + (e.clientY - \text{startY})^2}$$
   - If $\text{dist} > 6\text{px}$, it is classified as a pan/drag. Teleportation is completely ignored.
   - Only a stationary click ($\text{dist} \le 6\text{px}$) triggers pinpoint teleportation.

### 2.3 Exact Inverse Rotation Coordinate Transformation
1. **Transformation Formula**:
   - Let viewport center be $(C_x, C_y) = (\text{rect.left} + \text{width}/2, \text{rect.top} + \text{height}/2)$.
   - Mouse offset: $\Delta X = e.clientX - C_x, \quad \Delta Y = e.clientY - C_y$.
   - Rotator angle in radians:
     $$\phi = \begin{cases} (-\text{currentHeadingDegrees} \times \pi / 180) & \text{if } \text{orientationMode} = \text{'heading-up'} \\ 0 & \text{if } \text{orientationMode} = \text{'north-up'} \end{cases}$$
   - Inverse rotation to local Web Mercator pixel delta $(u, v)$:
     $$\begin{aligned}
     u &= \Delta X \cos\phi + \Delta Y \sin\phi \\
     v &= -\Delta X \sin\phi + \Delta Y \cos\phi
     \end{aligned}$$
   - Project map center to pixel point: $\mathbf{P}_{\text{center}} = \text{map.project}(\text{map.getCenter()}, \text{zoom})$.
   - Target pixel: $\mathbf{P}_{\text{target}} = \mathbf{P}_{\text{center}} + (u, v)$.
   - Target coordinate: $\text{targetLatLng} = \text{map.unproject}(\mathbf{P}_{\text{target}}, \text{zoom})$.
2. **Visual Teleport Feedback**:
   - Render a temporary pinpoint pulse ring at the clicked destination coordinates, confirming exact landing accuracy.

---

## 3. Subagent Delegation Plan
- **Assigned Agent**: `frontend_agent`
- **Assigned File**: `components/map/MapView.tsx`
- **Tasks**:
  1. Decouple map rotation from `isFollowing`.
  2. Implement pointer distance check to prevent drag-release teleportation.
  3. Implement exact inverse rotation math for pinpoint click-to-teleport.
  4. Ensure smooth, jitter-free hover cursor behavior.
  5. Verify `npx tsc --noEmit` and Next.js build.
