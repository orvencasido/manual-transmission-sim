# UI Cleanup & High-Performance Optimization Plan
**Document:** `docs/ui-performance-optimization.md`  
**Status:** Approved for Implementation  
**Affected Subsystems:**  
- `components/map/MapView.tsx` (`frontend_agent`)
- `components/map/MapHUD.tsx` (`frontend_agent`)
- `app/map/page.tsx` (`frontend_agent`)
- `components/dashboard/CockpitHeader.tsx` (`frontend_agent`)
- `components/controls/useKeyboardControls.ts` (`physics_agent`)
- `lib/simulation/simulation.ts` (`physics_agent`)

---

## 1. Problem Analysis & Root Cause Identification

### 1.1 Map View Sluggishness & Stutter Causes
1. **Double-Render Cascade on Every Frame**:
   - In `components/map/MapView.tsx`, while driving, `distSq > 0.0000000004 && showTrail` continuously calls `setBreadcrumbCount((prev) => prev + 1)`.
   - Because `setBreadcrumbCount` is a React state setter, it triggers an immediate re-render of the entire 926-line `MapView` component 60 times per second, on top of the parent page's re-renders!
2. **Excessive Rotator Size & DOM Repaint Burden**:
   - The map container rotator is sized at `160vmax × 160vmax` ($\approx 3100\text{px} \times 3100\text{px}$ on standard 1080p, and $> 4000\text{px}$ on 1440p).
   - Rotating this massive DOM subtree on every frame forces the browser compositor to repaint dozens of off-screen Leaflet image tiles.
   - Reducing to $\approx 142\text{vmax}$ (the geometric screen diagonal $\sqrt{100^2 + 100^2}$) and applying GPU acceleration (`transform: translate3d(-50%, -50%, 0) rotate(...)`, `contain: layout paint`) drastically reduces GPU memory bandwidth.
3. **DOM Query Overhead in Frame Loop**:
   - `mapContainerRef.current.querySelector('#car-pointer-rotator')` is executed repeatedly on every frame. A direct React ref (`rotatorRef`) eliminates DOM queries completely.
4. **Unmemoized Callbacks & Prop Churn**:
   - `MapView` was receiving inline functions like `onTeleport={(lat, lon, heading) => setGeoPosition(lat, lon, heading)}`, preventing memoization. Wrapping `MapView` in `React.memo` and passing stable handlers prevents unnecessary re-rendering.

### 1.2 Noisy Texts & UI Clutter
1. **Redundant Controls in Map View**:
   - Mode toggles ("Hover / Pan Map" vs "Select Place") were displayed in two different places, accompanied by large pulsing banners ("Click any road to teleport and point car towards it").
   - Orientation toggles appeared in three different locations (compass, toolbar, etc.).
   - The floating road corridor badge ("Quezon Avenue | W: 10m | Curb: 5.0m | strict") overlapped with the compass and search bar while repeating information already visible in the bottom HUD.
   - A pulsing "Map Panned — Click to Recenter on Car" banner blocked screen visibility.
2. **Text Noise in Gauges & HUDs**:
   - Redundant sub-labels like `(0 to 180 km/h)`, `/ 7000`, `0`, `160`, and duplicate unit abbreviations cluttered the instruments.
   - Verbose tooltips and labels distracted from clean automotive instrumentation.

---

## 2. Optimization Specifications

### 2.1 Map View Performance Refactor (`frontend_agent`)
- **Direct Ref Access**:
  - Replace `querySelector('#car-pointer-rotator')` with a direct ref `rotatorRef.current`.
- **Remove State Updates in Motion Loop**:
  - Eliminate `setBreadcrumbCount` state setter from the per-tick driving loop. Use a ref `breadcrumbCountRef.current++` for tracking polyline points.
- **Hardware-Accelerated Rotator**:
  - Size rotator precisely at `142vmax` with `contain: layout paint; will-change: transform; transform: translate3d(-50%, -50%, 0) rotate(...)`.
- **Smooth Throttled Camera Centering**:
  - Only invoke `map.setView` when vehicle movement exceeds $0.1\text{m}$ or on orientation mode switches, eliminating sub-pixel micro-jitter and unnecessary tile recalculations.
- **Memoization**:
  - Wrap `MapView` in `React.memo` with a custom comparison or stable props.

### 2.2 UI Streamlining & Text De-Noising (`frontend_agent`)
- **Clean Map Screen**:
  - Remove the floating top-center mode switcher and pulsing hint banners.
  - Consolidate map controls into a sleek, unified, semi-transparent top-right tool stack (Zoom In, Zoom Out, Layer Theme, Compass/POV toggle, Recenter).
  - Replace the large pulsing "Map Panned" banner with an elegant, non-intrusive re-center target button that lights up when panning away.
  - Remove the duplicate top-left road corridor overlay (retaining clean telemetry in the bottom HUD).
- **Streamlined MapHUD**:
  - Remove noisy sub-labels (`/ 7000`, `0`, `160`, `(0 to 180 km/h)`).
  - Keep high-contrast numbers, clean bar meters, and crisp status badges.
- **De-noised Cockpit Header**:
  - Remove verbose secondary subtitles; keep clean title, session stopwatch, audio toggle, and pause/reset controls.

### 2.3 Powertrain & Telemetry Efficiency (`physics_agent`)
- **Audit `useKeyboardControls.ts`**:
  - Ensure state snapshot emission in the 120Hz/60Hz loop avoids redundant object allocations.
  - Ensure stable function references (`useCallback`) for all exposed handlers.
  - Keep telemetry calculation pure and fast.

---

## 3. Verification Criteria
- [ ] Map View runs smoothly at a consistent 60 FPS without frame drops, micro-stutters, or sluggishness during driving and steering.
- [ ] All noisy, redundant banners and duplicate buttons removed from `/map` and `/simulator`.
- [ ] Map pan, zoom, click-to-teleport, and Heading-Up / North-Up toggle work cleanly.
- [ ] `npx tsc --noEmit` and `npm run build` pass with 0 errors.
