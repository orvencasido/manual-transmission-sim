'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type * as LeafletTypes from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapOrientationMode = 'heading-up' | 'north-up';
export type MapInteractionMode = 'hover' | 'select';

export interface MapViewProps {
  latitude: number;
  longitude: number;
  headingDegrees: number;
  speedKmh: number;
  onTeleport?: (lat: number, lon: number, heading?: number) => void;
  className?: string;
  initialOrientation?: MapOrientationMode;
}

export type TileTheme = 'dark' | 'standard' | 'hot';

const TILE_LAYERS: Record<TileTheme, { url: string; attribution: string; name: string; isDark?: boolean }> = {
  dark: {
    name: 'Cockpit Dark (OSM)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    isDark: true,
  },
  standard: {
    name: 'Daylight (OpenStreetMap)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    isDark: false,
  },
  hot: {
    name: 'Humanitarian (HOT OSM)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    isDark: false,
  },
};

/**
 * Calculate forward compass azimuth (bearing 0-360°) from coordinate A to coordinate B
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fallbackHeading: number = 0
): number {
  const dLat = Math.abs(lat2 - lat1);
  const dLon = Math.abs(lon2 - lon1);
  if (dLat < 0.000005 && dLon < 0.000005) {
    return fallbackHeading;
  }

  const dLonRad = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLonRad) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLonRad);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export default function MapView({
  latitude,
  longitude,
  headingDegrees,
  speedKmh,
  onTeleport,
  className = '',
  initialOrientation = 'heading-up',
}: MapViewProps) {
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const mapRotatorRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletTypes.Map | null>(null);
  const leafletModuleRef = useRef<typeof LeafletTypes | null>(null);
  const markerRef = useRef<LeafletTypes.Marker | null>(null);
  const polylineRef = useRef<LeafletTypes.Polyline | null>(null);
  const tileLayerRef = useRef<LeafletTypes.TileLayer | null>(null);
  const lastRecordedPosRef = useRef<{ lat: number; lon: number }>({ lat: latitude, lon: longitude });

  // Unwrapped heading tracker to prevent 360° <-> 0° visual spin glitches
  const continuousHeadingRef = useRef<number>(headingDegrees);

  const [orientationMode, setOrientationMode] = useState<MapOrientationMode>(initialOrientation);
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('hover');
  const [showTrail, setShowTrail] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(18);
  const [tileTheme, setTileTheme] = useState<TileTheme>('dark');
  const [breadcrumbCount, setBreadcrumbCount] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);

  // Keep latest onTeleport in ref
  const onTeleportRef = useRef(onTeleport);
  onTeleportRef.current = onTeleport;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isCancelled = false;

    async function initMap() {
      const L = await import('leaflet');
      if (isCancelled || !mapContainerRef.current) return;
      leafletModuleRef.current = L;

      // Clean existing instance if any
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Initialize map instance without rigid bounding box so worldwide teleporting works seamlessly
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 18,
        minZoom: 4,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
      });

      // Enable dragging when in hover mode
      if (interactionMode === 'hover') {
        map.dragging.enable();
      } else {
        map.dragging.disable();
      }

      // Add Tile Layer with crisp scaling up to zoom 19 (OSM native limit is 18-19)
      const themeConfig = TILE_LAYERS[tileTheme];
      const tileLayer = L.tileLayer(themeConfig.url, {
        attribution: themeConfig.attribution,
        maxNativeZoom: 18,
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Add Custom Attribution
      L.control
        .attribution({
          position: 'bottomright',
          prefix: false,
        })
        .addTo(map);

      // Create Custom SVG Vehicle Marker Icon
      // In Heading-Up mode: wrapper is rotated by -heading, so marker rotated by +heading points straight UP (0° on screen)
      // In North-Up mode: wrapper is at 0°, so marker rotated by +heading points in heading direction
      const carIcon = L.divIcon({
        className: 'vehicle-marker-wrapper',
        html: `
          <div id="car-pointer-root" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div id="car-pointer-rotator" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transform-origin: 24px 24px; transform: rotate(${headingDegrees}deg); will-change: transform;">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 8px rgba(6,182,212,0.85));">
                <!-- Outer Pulse Halo -->
                <circle cx="24" cy="24" r="21" fill="rgba(6,182,212,0.16)" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="3 3"/>
                <!-- Direction Pointer Arrow (pointing strictly North/Up at 0 deg) -->
                <path d="M24 5L37 38L24 30L11 38L24 5Z" fill="#06b6d4" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round"/>
                <!-- Center Cockpit Core -->
                <circle cx="24" cy="24" r="3.5" fill="#ffffff" stroke="#0891b2" stroke-width="1.5"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker([latitude, longitude], {
        icon: carIcon,
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
      markerRef.current = marker;

      // Real-time Cyan GPS Breadcrumb Trail Polyline
      const polyline = L.polyline([[latitude, longitude]], {
        color: '#06b6d4',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      polylineRef.current = polyline;

      // Drag listener for North-Up free pan
      map.on('dragstart', () => {
        setIsFollowing(false);
      });

      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      mapRef.current = map;
      setIsMapReady(true);

      // Crucial: invalidateSize after mount so tiles load fully across the generous 160vmax rotator canvas
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.setView([latitude, longitude], 18, { animate: false });
        }
      }, 100);
    }

    initMap();

    const handleWindowResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleWindowResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Switch Tile Layer when tileTheme changes
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;
      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }
      const themeConfig = TILE_LAYERS[tileTheme];
      const newLayer = L.tileLayer(themeConfig.url, {
        attribution: themeConfig.attribution,
        maxNativeZoom: 18,
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(mapRef.current);
      tileLayerRef.current = newLayer;
    });
  }, [tileTheme, isMapReady]);

  // Dynamically synchronize map dragging capability with active interaction mode
  useEffect(() => {
    if (!mapRef.current) return;
    if (interactionMode === 'hover') {
      mapRef.current.dragging.enable();
    } else {
      mapRef.current.dragging.disable();
    }
  }, [interactionMode]);

  // Update Vehicle Marker Position & Heading Angle Smoothly at 60 FPS
  useEffect(() => {
    if (!markerRef.current || !mapContainerRef.current) return;

    // 1. Update marker geo coordinate
    markerRef.current.setLatLng([latitude, longitude]);

    // 2. Continuous heading unwrap to prevent 360° <-> 0° flip spin glitches
    const prevContinuous = continuousHeadingRef.current;
    const diff = headingDegrees - (prevContinuous % 360);
    const normalizedDiff = ((diff + 540) % 360) - 180;
    const unwrappedHeading = prevContinuous + normalizedDiff;
    continuousHeadingRef.current = unwrappedHeading;

    // 3. Update rotation of map rotator and car pointer
    const rotator = mapContainerRef.current.querySelector('#car-pointer-rotator') as HTMLElement | null;

    if (mapRotatorRef.current) {
      if (orientationMode === 'heading-up' && isFollowing) {
        // Rotate world by -headingDegrees so road ahead aligns straight UP on screen
        mapRotatorRef.current.style.transform = `translate(-50%, -50%) rotate(${-unwrappedHeading}deg)`;
        if (rotator) {
          // Inside the -heading container, rotating marker by +heading keeps it pointing strictly 0° UP relative to screen
          rotator.style.transform = `rotate(${unwrappedHeading}deg)`;
        }
      } else {
        // North-Up: map stays fixed at 0° (and when freely hovering/panning so dragging is 100% natural)
        mapRotatorRef.current.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        if (rotator) {
          rotator.style.transform = `rotate(${headingDegrees}deg)`;
        }
      }
    }

    // 4. Camera Follow & Free Hover/Pan logic:
    // If the vehicle starts driving, automatically re-lock camera onto the car
    const isDriving = Math.abs(speedKmh) > 0.4;
    if (isDriving && !isFollowing) {
      setIsFollowing(true);
    }

    // Camera only auto-centers when isFollowing is active.
    // When the user drags/pans the map in Hover mode, isFollowing is false,
    // so the camera stays wherever the user hovered/panned to explore!
    if (isFollowing && mapRef.current) {
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), { animate: false });
    }

    // 5. Breadcrumb Trail Handling (only if showTrail is enabled by user)
    const dLat = latitude - lastRecordedPosRef.current.lat;
    const dLon = longitude - lastRecordedPosRef.current.lon;
    const distSq = dLat * dLat + dLon * dLon;

    // Detect teleport jump (> ~150m or coordinate relocation)
    if (distSq > 0.00002) {
      setIsFollowing(true);
      if (mapRef.current) {
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), { animate: false });
      }
      if (polylineRef.current) {
        polylineRef.current.setLatLngs([]);
        setBreadcrumbCount(0);
      }
      lastRecordedPosRef.current = { lat: latitude, lon: longitude };
    } else if (distSq > 0.0000000004 && showTrail) {
      // Normal driving movement (~2m) with trail enabled
      if (polylineRef.current) {
        polylineRef.current.addLatLng([latitude, longitude]);
        setBreadcrumbCount((prev) => prev + 1);
      }
      lastRecordedPosRef.current = { lat: latitude, lon: longitude };
    }
  }, [latitude, longitude, headingDegrees, speedKmh, orientationMode, isFollowing, showTrail]);

  // Synchronize polyline trail visibility
  useEffect(() => {
    if (!showTrail && polylineRef.current) {
      polylineRef.current.setLatLngs([]);
      setBreadcrumbCount(0);
    }
  }, [showTrail]);

  // Toggle Orientation Mode smoothly between Heading-Up (Driver POV) and North-Up (Fixed Map)
  const toggleOrientationMode = useCallback(() => {
    setIsTransitioning(true);

    const rotator = mapContainerRef.current?.querySelector('#car-pointer-rotator') as HTMLElement | null;
    if (rotator) {
      rotator.style.transition = 'transform 0.3s ease-out';
    }

    setOrientationMode((prev) => {
      const nextMode = prev === 'heading-up' ? 'north-up' : 'heading-up';

      if (mapRef.current && nextMode === 'heading-up') {
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), { animate: false });
        setIsFollowing(true);
      }

      return nextMode;
    });

    // Revert to 0ms transition for instantaneous 60 FPS driving response after mode switch
    setTimeout(() => {
      setIsTransitioning(false);
      if (rotator) {
        rotator.style.transition = 'none';
      }
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 350);
  }, [latitude, longitude]);

  // Recenter Camera handler
  const handleRecenter = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), { animate: true });
      setIsFollowing(true);
    }
  }, [latitude, longitude]);

  // Zoom controls
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleClearTrail = () => {
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([[latitude, longitude]]);
      setBreadcrumbCount(0);
      lastRecordedPosRef.current = { lat: latitude, lon: longitude };
    }
  };

  // Click-to-teleport on map with inverse 2D rotation matrix and heading azimuth calculation
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Only process destination selection when explicitly in 'select' mode
    if (interactionMode !== 'select') {
      return;
    }

    // Ignore clicks originating from interactive UI buttons, inputs, links
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }
    if (!mapRef.current || !onTeleportRef.current || !leafletModuleRef.current) return;

    const L = leafletModuleRef.current;
    const viewport = mapViewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const screenCenterX = rect.left + rect.width / 2;
    const screenCenterY = rect.top + rect.height / 2;

    const deltaX = e.clientX - screenCenterX;
    const deltaY = e.clientY - screenCenterY;

    // Check if the map rotator is currently rotated on screen.
    // The rotator is ONLY rotated when in Heading-Up mode AND following the car!
    // When the map was panned in Hover mode or in North-Up mode, rotation is 0deg.
    const isRotated = orientationMode === 'heading-up' && isFollowing;
    let unrotX = deltaX;
    let unrotY = deltaY;

    if (isRotated) {
      const headingRad = (continuousHeadingRef.current * Math.PI) / 180;
      unrotX = deltaX * Math.cos(headingRad) - deltaY * Math.sin(headingRad);
      unrotY = deltaX * Math.sin(headingRad) + deltaY * Math.cos(headingRad);
    }

    // Convert pixel offset from screen center to exact geographic coordinates using Web Mercator projection
    const centerLatLng = mapRef.current.getCenter();
    const currentZoom = mapRef.current.getZoom();
    const centerPixel = mapRef.current.project(centerLatLng, currentZoom);
    const targetPixel = L.point(centerPixel.x + unrotX, centerPixel.y + unrotY);
    const targetLatLng = mapRef.current.unproject(targetPixel, currentZoom);

    // Calculate heading pointing towards the clicked destination
    const targetHeading = Math.round(
      calculateBearing(latitude, longitude, targetLatLng.lat, targetLatLng.lng, headingDegrees)
    );

    // Strictly clear any breadcrumbs so NO line is drawn when selecting destinations
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([]);
      setBreadcrumbCount(0);
    }
    lastRecordedPosRef.current = { lat: targetLatLng.lat, lon: targetLatLng.lng };

    // Re-lock camera follow onto the newly selected place
    setIsFollowing(true);
    mapRef.current.setView([targetLatLng.lat, targetLatLng.lng], mapRef.current.getZoom(), { animate: true });

    onTeleportRef.current(targetLatLng.lat, targetLatLng.lng, targetHeading);
  };

  // Cardinal direction from heading
  const getCardinalDirection = (deg: number): string => {
    const normalized = ((deg % 360) + 360) % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(normalized / 45) % 8;
    return directions[index];
  };

  return (
    <div
      ref={mapViewportRef}
      onClick={handleViewportClick}
      className={`relative w-full h-full overflow-hidden select-none ${
        interactionMode === 'select' ? 'select-mode-active' : 'hover-mode-active'
      } ${className}`}
    >
      {/* Dark mode CSS filter, dark container background fallback, and dynamic cursor mode styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .leaflet-container {
              background-color: #020617 !important;
              background: #020617 !important;
            }
            .hover-mode-active,
            .hover-mode-active .leaflet-container,
            .hover-mode-active .leaflet-grab,
            .hover-mode-active .leaflet-pane {
              cursor: grab !important;
            }
            .hover-mode-active:active,
            .hover-mode-active .leaflet-container:active,
            .hover-mode-active .leaflet-grabbing,
            .hover-mode-active .leaflet-pane:active {
              cursor: grabbing !important;
            }
            .select-mode-active,
            .select-mode-active .leaflet-container,
            .select-mode-active .leaflet-pane {
              cursor: crosshair !important;
            }
            .osm-dark-theme .leaflet-tile-pane {
              filter: invert(100%) hue-rotate(180deg) brightness(86%) contrast(92%);
            }
          `,
        }}
      />

      {/* Rotating Map Viewport Wrapper (sized generously at 160vmax so rotation reveals zero blank corners) */}
      <div
        ref={mapRotatorRef}
        id="map-rotator"
        className={`absolute top-1/2 left-1/2 pointer-events-auto origin-center ${
          isTransitioning ? 'transition-transform duration-300 ease-out' : 'transition-none'
        }`}
        style={{
          width: '160vmax',
          height: '160vmax',
          transform: `translate(-50%, -50%) rotate(${
            orientationMode === 'heading-up' ? -headingDegrees : 0
          }deg)`,
          willChange: 'transform',
        }}
      >
        <div
          ref={mapContainerRef}
          className={`w-full h-full bg-slate-950 ${tileTheme === 'dark' ? 'osm-dark-theme' : ''}`}
        />
      </div>

      {/* ================= FIXED SCREEN-SPACE MAP OVERLAYS ================= */}

      {/* Top-Right Floating Map Controls Stack */}
      <div className="absolute top-16 right-4 sm:right-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {/* Zoom In/Out Cluster */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md p-1 flex flex-col gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 19}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition font-bold text-lg"
            title="Zoom In (Max 19)"
          >
            +
          </button>
          <div className="h-px bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 8}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition font-bold text-lg"
            title="Zoom Out (Min 8)"
          >
            −
          </button>
        </div>

        {/* Quick Interaction Mode Toggle in Toolbar */}
        <button
          type="button"
          onClick={() => setInteractionMode((prev) => (prev === 'hover' ? 'select' : 'hover'))}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-2xl backdrop-blur-md transition flex items-center justify-center ${
            interactionMode === 'select'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold ring-2 ring-cyan-400/40 shadow-cyan-500/20'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title={
            interactionMode === 'select'
              ? 'Mode: Select Place (Active) — Click to switch to Hover / Pan Mode'
              : 'Mode: Hover / Pan (Active) — Click to switch to Select Place Mode'
          }
        >
          <span className="text-base sm:text-lg">{interactionMode === 'select' ? '🎯' : '✋'}</span>
        </button>

        {/* Quick Orientation Toggle Button in Stack */}
        <button
          type="button"
          onClick={toggleOrientationMode}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-2xl backdrop-blur-md transition flex items-center justify-center ${
            orientationMode === 'heading-up'
              ? 'bg-cyan-950/85 text-cyan-300 border-cyan-500/60 hover:bg-cyan-900/90 ring-1 ring-cyan-500/30'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title={
            orientationMode === 'heading-up'
              ? 'Mode: Heading-Up (Driver POV) — Click to switch to North-Up'
              : 'Mode: North-Up (Fixed Map) — Click to switch to Driver POV'
          }
        >
          <span className="text-base sm:text-lg">🧭</span>
        </button>

        {/* Camera Tracking Toggle / Re-center */}
        <button
          type="button"
          onClick={() => {
            if (orientationMode === 'heading-up') {
              handleRecenter();
            } else if (isFollowing) {
              setIsFollowing(false);
            } else {
              handleRecenter();
            }
          }}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-2xl backdrop-blur-md transition flex items-center justify-center ${
            isFollowing
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/80'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title={
            isFollowing
              ? 'Camera auto-centered on car. Click to unlock pan'
              : 'Pan unlocked. Click to re-center on car'
          }
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Map Tile Layer Theme Switcher */}
        <div className="relative group">
          <button
            type="button"
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 shadow-2xl backdrop-blur-md transition"
            title="Switch Map Tile Theme"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>

          {/* Theme Dropdown Menu */}
          <div className="absolute right-0 top-12 hidden group-hover:flex flex-col bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-1.5 w-48 backdrop-blur-md divide-y divide-slate-800/60 z-50">
            {(Object.keys(TILE_LAYERS) as TileTheme[]).map((themeKey) => (
              <button
                key={themeKey}
                type="button"
                onClick={() => setTileTheme(themeKey)}
                className={`w-full text-left px-3 py-2 text-xs rounded-xl font-medium transition ${
                  tileTheme === themeKey
                    ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {TILE_LAYERS[themeKey].name}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Breadcrumbs */}
        {breadcrumbCount > 10 && (
          <button
            type="button"
            onClick={handleClearTrail}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-800/50 shadow-xl backdrop-blur-md transition text-[11px] font-mono"
            title="Clear Route Breadcrumbs"
          >
            Clear Trail
          </button>
        )}
      </div>

      {/* Top-Left Compass & Orientation Mode Cluster (positioned below floating search bar) */}
      <div className="absolute top-[120px] left-4 sm:left-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md p-3 sm:p-3.5 flex items-center gap-3.5 max-w-xs">
          {/* Compass Dial with Real North Needle Pointer */}
          <div
            onClick={toggleOrientationMode}
            className="relative w-11 h-11 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center cursor-pointer hover:border-cyan-500/60 transition group shrink-0"
            title={
              orientationMode === 'heading-up'
                ? 'North needle indicates real North. Click to toggle North-Up'
                : 'Compass indicator. Click to toggle Driver POV'
            }
          >
            <span className="text-rose-500 font-mono text-[9px] font-black absolute top-0.5 pointer-events-none">
              N
            </span>
            <div
              className="w-1.5 h-6 bg-gradient-to-b from-rose-500 via-slate-300 to-cyan-400 rounded-full transition-transform duration-75 shadow-sm"
              style={{
                transform: `rotate(${orientationMode === 'heading-up' ? -headingDegrees : 0}deg)`,
              }}
            />
            <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-400 absolute" />
          </div>

          {/* Heading Info & Mode Toggle Button */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100 font-mono tracking-wider">
                {Math.round(headingDegrees).toString().padStart(3, '0')}°
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 uppercase tracking-wider font-mono">
                {getCardinalDirection(headingDegrees)}
              </span>
            </div>

            {/* Mode Switcher Button */}
            <button
              type="button"
              onClick={toggleOrientationMode}
              className={`mt-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 border shadow-sm ${
                orientationMode === 'heading-up'
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 hover:bg-cyan-900/90 ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
              title="Click to toggle between Heading-Up (Driver POV) and North-Up (Fixed Map)"
            >
              <span>🧭</span>
              <span className="truncate">
                {orientationMode === 'heading-up'
                  ? 'Heading-Up (Driver POV)'
                  : 'North-Up (Fixed Map)'}
              </span>
            </button>
          </div>
        </div>

        {/* Camera Free-Pan Alert Banner (shows whenever map is panned away from vehicle) */}
        {!isFollowing && (
          <button
            type="button"
            onClick={handleRecenter}
            className="bg-cyan-950/95 border border-cyan-500/80 text-cyan-200 rounded-2xl px-3.5 py-2 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 hover:bg-cyan-900 transition animate-pulse"
            title="Map is panned away. Click to snap camera back to vehicle"
          >
            <span>📍 Map Panned — Click to Recenter on Car</span>
          </button>
        )}
      </div>

      {/* Top-Center Interactive Mode Switcher: Toggle between Hover/Pan Map and Select Place */}
      <div className="absolute top-28 sm:top-16 left-1/2 -translate-x-1/2 z-[1050] pointer-events-auto flex flex-col items-center gap-1.5">
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-1 shadow-2xl backdrop-blur-md flex items-center gap-1">
          <button
            type="button"
            onClick={() => setInteractionMode('hover')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              interactionMode === 'hover'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
            title="Hover / Pan Map: Browse the map freely with normal cursor and without teleporting"
          >
            <span>✋</span>
            <span>Hover / Pan Map</span>
          </button>
          <button
            type="button"
            onClick={() => setInteractionMode('select')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              interactionMode === 'select'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
            title="Select Place: One click anywhere to place vehicle and point towards destination"
          >
            <span>🎯</span>
            <span>Select Place</span>
          </button>
        </div>

        {/* Dynamic Context Hint */}
        {interactionMode === 'select' && (
          <div className="bg-cyan-950/90 border border-cyan-500/60 rounded-full px-3 py-1 text-[11px] text-cyan-200 font-medium backdrop-blur-md shadow-lg animate-in fade-in flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Click any road to teleport and point car towards it (no line)</span>
          </div>
        )}
      </div>
    </div>
  );
}
