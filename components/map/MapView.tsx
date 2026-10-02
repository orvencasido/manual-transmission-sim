'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type * as LeafletTypes from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { RoadBoundaryMode, RoadCollisionState } from '@/lib/simulation/types';

export type MapOrientationMode = 'heading-up' | 'north-up';

export interface MapViewProps {
  latitude: number;
  longitude: number;
  headingDegrees: number;
  speedKmh: number;
  onTeleport?: (lat: number, lon: number, heading?: number) => void;
  className?: string;
  initialOrientation?: MapOrientationMode;
  boundaryMode?: RoadBoundaryMode;
  onBoundaryModeChange?: (mode: RoadBoundaryMode) => void;
  collision?: RoadCollisionState;
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

function MapViewComponent({
  latitude,
  longitude,
  headingDegrees,
  speedKmh,
  onTeleport,
  className = '',
  initialOrientation = 'heading-up',
  boundaryMode = 'strict',
  onBoundaryModeChange,
  collision,
}: MapViewProps) {
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const mapRotatorRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletTypes.Map | null>(null);
  const leafletModuleRef = useRef<typeof LeafletTypes | null>(null);
  const markerRef = useRef<LeafletTypes.Marker | null>(null);
  const polylineRef = useRef<LeafletTypes.Polyline | null>(null);
  const tileLayerRef = useRef<LeafletTypes.TileLayer | null>(null);
  const carPointerRotatorRef = useRef<HTMLElement | null>(null);

  const lastRecordedPosRef = useRef<{ lat: number; lon: number }>({ lat: latitude, lon: longitude });
  const lastViewPosRef = useRef<{ lat: number; lon: number }>({ lat: latitude, lon: longitude });
  const breadcrumbCountRef = useRef<number>(0);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Unwrapped heading tracker to prevent 360° <-> 0° visual spin glitches
  const continuousHeadingRef = useRef<number>(headingDegrees);

  const [orientationMode, setOrientationMode] = useState<MapOrientationMode>(initialOrientation);
  const [showTrail, setShowTrail] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(18);
  const [tileTheme, setTileTheme] = useState<TileTheme>('dark');
  const [isMapReady, setIsMapReady] = useState(false);
  const [teleportPulse, setTeleportPulse] = useState<{ x: number; y: number } | null>(null);

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

      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 18,
        minZoom: 4,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
      });

      // Dragging always enabled for natural pan exploration
      map.dragging.enable();

      // Add Tile Layer with crisp scaling up to zoom 19
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

      // Create Custom SVG Vehicle Marker Icon (Scaled to 26px x 26px)
      const carIcon = L.divIcon({
        className: 'vehicle-marker-wrapper',
        html: `
          <div id="car-pointer-root" style="width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div id="car-pointer-rotator" style="width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transform-origin: 13px 13px; transform: rotate(${headingDegrees}deg); will-change: transform;">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.75)) drop-shadow(0 0 4px rgba(6,182,212,0.5));">
                <defs>
                  <linearGradient id="carBodyGrad" x1="7.8" y1="4" x2="18.2" y2="22.5" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="35%" stop-color="#06b6d4"/>
                    <stop offset="75%" stop-color="#0284c7"/>
                    <stop offset="100%" stop-color="#0369a1"/>
                  </linearGradient>
                  <linearGradient id="glassGrad" x1="13" y1="8" x2="13" y2="20" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#0b1120"/>
                    <stop offset="100%" stop-color="#1e293b"/>
                  </linearGradient>
                  <linearGradient id="beamGrad" x1="13" y1="5" x2="13" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="rgba(254,240,138,0.5)"/>
                    <stop offset="100%" stop-color="rgba(254,240,138,0)"/>
                  </linearGradient>
                </defs>

                <!-- Headlight Beams -->
                <polygon points="9.5,4.5 5,0 11.5,0 10.2,4.5" fill="url(#beamGrad)"/>
                <polygon points="16.5,4.5 14.5,0 21,0 15.8,4.5" fill="url(#beamGrad)"/>

                <!-- Locator Halo -->
                <circle cx="13" cy="13" r="12" fill="rgba(6,182,212,0.06)" stroke="#06b6d4" stroke-width="0.75" stroke-dasharray="2 2"/>

                <!-- Tires -->
                <rect x="6.5" y="5.5" width="2.0" height="4.2" rx="0.8" fill="#090d16" stroke="#475569" stroke-width="0.5"/>
                <rect x="17.5" y="5.5" width="2.0" height="4.2" rx="0.8" fill="#090d16" stroke="#475569" stroke-width="0.5"/>
                <rect x="6.5" y="16.0" width="2.0" height="4.2" rx="0.8" fill="#090d16" stroke="#475569" stroke-width="0.5"/>
                <rect x="17.5" y="16.0" width="2.0" height="4.2" rx="0.8" fill="#090d16" stroke="#475569" stroke-width="0.5"/>

                <!-- Mirrors -->
                <path d="M 8,9 L 6,9.5 L 6.2,10.8 L 8,10.2 Z" fill="#0284c7" stroke="#ffffff" stroke-width="0.3"/>
                <path d="M 18,9 L 20,9.5 L 19.8,10.8 L 18,10.2 Z" fill="#0284c7" stroke="#ffffff" stroke-width="0.3"/>

                <!-- Body Shell -->
                <path d="M 10,4 C 11.2,3.4 14.8,3.4 16,4 C 17.5,4.8 18.2,6.5 18.2,9 L 18.2,18 C 18.2,20.5 17.5,22.2 16,22.5 C 14.8,22.8 11.2,22.8 10,22.5 C 8.5,22.2 7.8,20.5 7.8,18 L 7.8,9 C 7.8,6.5 8.5,4.8 10,4 Z"
                  fill="url(#carBodyGrad)" stroke="#ffffff" stroke-width="0.75" stroke-linejoin="round"/>

                <!-- Hood Creases & Nose Pointer -->
                <path d="M 11,5 L 11.5,8 M 15,5 L 14.5,8" stroke="rgba(255,255,255,0.45)" stroke-width="0.5" stroke-linecap="round"/>
                <path d="M 13,2 L 14.2,3.8 L 11.8,3.8 Z" fill="#38bdf8" stroke="#ffffff" stroke-width="0.4"/>

                <!-- Front Windshield -->
                <path d="M 9.5,8.8 C 11,8.3 15,8.3 16.5,8.8 L 16,12.2 C 14.5,11.8 11.5,11.8 10,12.2 Z"
                  fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="0.5"/>

                <!-- Roof & Sunroof -->
                <rect x="9.8" y="12" width="6.4" height="5.5" rx="1.2" fill="#0284c7" stroke="rgba(255,255,255,0.3)" stroke-width="0.4"/>
                <rect x="10.8" y="12.8" width="4.4" height="3.8" rx="0.8" fill="#082f49" stroke="#38bdf8" stroke-width="0.3"/>

                <!-- Rear Windshield -->
                <path d="M 10,17.5 C 11.5,17.8 14.5,17.8 16,17.5 L 15.6,19.8 C 14.5,20.1 11.5,20.1 10.4,19.8 Z"
                  fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="0.5"/>

                <!-- Headlights -->
                <ellipse cx="9.8" cy="4.8" rx="1.1" ry="0.7" fill="#fef08a" stroke="#ffffff" stroke-width="0.3"/>
                <ellipse cx="16.2" cy="4.8" rx="1.1" ry="0.7" fill="#fef08a" stroke="#ffffff" stroke-width="0.3"/>

                <!-- Taillights -->
                <rect x="8.5" y="22.0" width="2" height="0.9" rx="0.3" fill="#f43f5e" stroke="#fda4af" stroke-width="0.2"/>
                <rect x="15.5" y="22.0" width="2" height="0.9" rx="0.3" fill="#f43f5e" stroke="#fda4af" stroke-width="0.2"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([latitude, longitude], {
        icon: carIcon,
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
      markerRef.current = marker;

      // Cache direct reference to car rotator element
      carPointerRotatorRef.current = mapContainerRef.current.querySelector('#car-pointer-rotator') as HTMLElement | null;

      // Real-time Cyan GPS Breadcrumb Trail Polyline
      const polyline = L.polyline([[latitude, longitude]], {
        color: '#06b6d4',
        weight: 3.5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      polylineRef.current = polyline;

      // Drag listener: disable camera centering so user can pan freely
      map.on('dragstart', () => {
        setIsFollowing(false);
      });

      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      mapRef.current = map;
      setIsMapReady(true);

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

    // 3. Fast direct rotator update without DOM querying
    let rotator = carPointerRotatorRef.current;
    if (!rotator) {
      rotator = mapContainerRef.current.querySelector('#car-pointer-rotator') as HTMLElement | null;
      carPointerRotatorRef.current = rotator;
    }

    // Stable Orientation: rotation MUST depend strictly on orientationMode, NEVER on isFollowing!
    if (mapRotatorRef.current) {
      if (orientationMode === 'heading-up') {
        mapRotatorRef.current.style.transform = `translate3d(-50%, -50%, 0) rotate(${-unwrappedHeading}deg)`;
        if (rotator) {
          rotator.style.transform = `rotate(${unwrappedHeading}deg)`;
        }
      } else {
        mapRotatorRef.current.style.transform = 'translate3d(-50%, -50%, 0) rotate(0deg)';
        if (rotator) {
          rotator.style.transform = `rotate(${headingDegrees}deg)`;
        }
      }
    }

    // 4. Camera Follow with displacement throttling (prevents micro-stutter when idling/stopped)
    const isDriving = Math.abs(speedKmh) > 0.4;
    if (isDriving && !isFollowing) {
      setIsFollowing(true);
    }

    if (isFollowing && mapRef.current) {
      const dViewLat = latitude - lastViewPosRef.current.lat;
      const dViewLon = longitude - lastViewPosRef.current.lon;
      const distViewSq = dViewLat * dViewLat + dViewLon * dViewLon;

      // Only invoke setView when vehicle has moved > ~0.08m or when actively driving
      if (distViewSq > 0.0000000001 || isDriving) {
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), { animate: false });
        lastViewPosRef.current = { lat: latitude, lon: longitude };
      }
    }

    // 5. Breadcrumb Trail Handling without state setter thrashing!
    const dLat = latitude - lastRecordedPosRef.current.lat;
    const dLon = longitude - lastRecordedPosRef.current.lon;
    const distSq = dLat * dLat + dLon * dLon;

    // Detect teleport jump (> ~150m or coordinate relocation)
    if (distSq > 0.00002) {
      setIsFollowing(true);
      if (mapRef.current) {
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), { animate: false });
        lastViewPosRef.current = { lat: latitude, lon: longitude };
      }
      if (polylineRef.current) {
        polylineRef.current.setLatLngs([]);
        breadcrumbCountRef.current = 0;
      }
      lastRecordedPosRef.current = { lat: latitude, lon: longitude };
    } else if (distSq > 0.0000000004 && showTrail) {
      if (polylineRef.current) {
        polylineRef.current.addLatLng([latitude, longitude]);
        breadcrumbCountRef.current++;
      }
      lastRecordedPosRef.current = { lat: latitude, lon: longitude };
    }
  }, [latitude, longitude, headingDegrees, speedKmh, orientationMode, isFollowing, showTrail]);

  // Synchronize polyline trail visibility
  useEffect(() => {
    if (!showTrail && polylineRef.current) {
      polylineRef.current.setLatLngs([]);
      breadcrumbCountRef.current = 0;
    }
  }, [showTrail]);

  // Toggle Orientation Mode smoothly between Heading-Up (Driver POV) and North-Up (Fixed Map)
  const toggleOrientationMode = useCallback(() => {
    setIsTransitioning(true);

    const rotator = carPointerRotatorRef.current;
    if (rotator) {
      rotator.style.transition = 'transform 0.3s ease-out';
    }

    setOrientationMode((prev) => {
      const nextMode = prev === 'heading-up' ? 'north-up' : 'heading-up';

      if (mapRef.current && nextMode === 'heading-up') {
        mapRef.current.setView([latitude, longitude], mapRef.current.getZoom(), { animate: false });
        lastViewPosRef.current = { lat: latitude, lon: longitude };
        setIsFollowing(true);
      }

      return nextMode;
    });

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
      lastViewPosRef.current = { lat: latitude, lon: longitude };
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
      polylineRef.current.setLatLngs([]);
      breadcrumbCountRef.current = 0;
      lastRecordedPosRef.current = { lat: latitude, lon: longitude };
    }
  };

  // Pointer down to record drag start position for drag vs click disambiguation
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Accurate Click-to-Teleport with exact inverse rotation matrix & drag filtering
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks originating from interactive UI buttons, inputs, links
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }

    // Filter out pan/drag gestures: only accept intentional stationary clicks
    if (pointerDownPosRef.current) {
      const dragDist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      if (dragDist > 6) {
        return;
      }
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

    // The rotator is rotated by phi = -heading in Heading-Up mode, 0 in North-Up mode
    const isHeadingUp = orientationMode === 'heading-up';
    const currentHeading = isHeadingUp ? continuousHeadingRef.current : 0;
    const phi = isHeadingUp ? (-currentHeading * Math.PI) / 180 : 0;

    // Exact inverse rotation:
    const u = deltaX * Math.cos(phi) + deltaY * Math.sin(phi);
    const v = -deltaX * Math.sin(phi) + deltaY * Math.cos(phi);

    const centerLatLng = mapRef.current.getCenter();
    const currentZoom = mapRef.current.getZoom();
    const centerPixel = mapRef.current.project(centerLatLng, currentZoom);
    const targetPixel = L.point(centerPixel.x + u, centerPixel.y + v);
    const targetLatLng = mapRef.current.unproject(targetPixel, currentZoom);

    const targetHeading = Math.round(
      calculateBearing(latitude, longitude, targetLatLng.lat, targetLatLng.lng, headingDegrees)
    );

    // Visual pinpoint indicator
    setTeleportPulse({ x: e.clientX, y: e.clientY });
    setTimeout(() => setTeleportPulse(null), 600);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs([]);
      breadcrumbCountRef.current = 0;
    }
    lastRecordedPosRef.current = { lat: targetLatLng.lat, lon: targetLatLng.lng };
    lastViewPosRef.current = { lat: targetLatLng.lat, lon: targetLatLng.lng };

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
      onPointerDown={handlePointerDown}
      onClick={handleViewportClick}
      className={`relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .leaflet-container {
              background-color: #020617 !important;
              background: #020617 !important;
              cursor: grab !important;
            }
            .leaflet-container:active {
              cursor: grabbing !important;
            }
            .osm-dark-theme .leaflet-tile-pane {
              filter: invert(100%) hue-rotate(180deg) brightness(86%) contrast(92%);
            }
          `,
        }}
      />

      {/* Rotating Map Viewport Wrapper: 142vmax screen diagonal with hardware acceleration */}
      <div
        ref={mapRotatorRef}
        id="map-rotator"
        className={`absolute top-1/2 left-1/2 pointer-events-auto origin-center ${
          isTransitioning ? 'transition-transform duration-300 ease-out' : 'transition-none'
        }`}
        style={{
          width: '142vmax',
          height: '142vmax',
          transform: `translate3d(-50%, -50%, 0) rotate(${
            orientationMode === 'heading-up' ? -headingDegrees : 0
          }deg)`,
          willChange: 'transform',
          contain: 'layout paint',
        }}
      >
        <div
          ref={mapContainerRef}
          className={`w-full h-full bg-slate-950 ${tileTheme === 'dark' ? 'osm-dark-theme' : ''}`}
        />
      </div>

      {/* Pinpoint Teleport Pulse Effect */}
      {teleportPulse && (
        <div
          className="pointer-events-none fixed z-[2000] -translate-x-1/2 -translate-y-1/2"
          style={{ left: teleportPulse.x, top: teleportPulse.y }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 bg-cyan-400/20 animate-ping" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-cyan-400" />
        </div>
      )}

      {/* Curb Strike Red Flash Vignette */}
      {collision?.curbContact && boundaryMode !== 'off' && (
        <div className="absolute inset-0 pointer-events-none z-[1200] border-4 sm:border-8 border-rose-500/80 bg-rose-500/10 animate-pulse transition-opacity duration-75" />
      )}

      {/* ================= FIXED SCREEN-SPACE MAP OVERLAYS ================= */}

      {/* Sleek Consolidated Top-Right Map Controls Stack */}
      <div className="absolute top-16 right-4 sm:right-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {/* Zoom In/Out Cluster */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md p-1 flex flex-col gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 19}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition font-bold text-lg"
            title="Zoom In"
          >
            +
          </button>
          <div className="h-px bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 8}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition font-bold text-lg"
            title="Zoom Out"
          >
            −
          </button>
        </div>

        {/* Camera Tracking Toggle / Re-center Target Button */}
        <button
          type="button"
          onClick={() => {
            if (isFollowing) {
              setIsFollowing(false);
            } else {
              handleRecenter();
            }
          }}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xl backdrop-blur-md transition flex items-center justify-center ${
            !isFollowing
              ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 ring-2 ring-cyan-400/40 animate-pulse'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title={isFollowing ? 'Camera locked on vehicle' : 'Camera panned — Click to re-center on car'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Quick Orientation Toggle Button in Stack */}
        <button
          type="button"
          onClick={toggleOrientationMode}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xl backdrop-blur-md transition flex items-center justify-center ${
            orientationMode === 'heading-up'
              ? 'bg-cyan-950/85 text-cyan-300 border-cyan-500/60 hover:bg-cyan-900/90'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-100 hover:bg-slate-800'
          }`}
          title={orientationMode === 'heading-up' ? 'Driver POV (Heading-Up)' : 'Fixed Map (North-Up)'}
        >
          <span className="text-base sm:text-lg">🧭</span>
        </button>

        {/* Road Boundary Walls Mode Toggle Button */}
        <button
          type="button"
          onClick={() => {
            const nextMode: RoadBoundaryMode =
              boundaryMode === 'strict' ? 'soft' : boundaryMode === 'soft' ? 'off' : 'strict';
            onBoundaryModeChange?.(nextMode);
          }}
          className={`p-2.5 sm:p-3 rounded-2xl border shadow-xl backdrop-blur-md transition flex items-center justify-center ${
            boundaryMode === 'strict'
              ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/60'
              : boundaryMode === 'soft'
              ? 'bg-amber-950/85 text-amber-300 border-amber-500/60'
              : 'bg-slate-900/90 text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={`Road Boundaries: ${boundaryMode.toUpperCase()} (Click to cycle)`}
        >
          <span className="text-base sm:text-lg">🚧</span>
        </button>

        {/* Map Tile Layer Theme Switcher */}
        <div className="relative group">
          <button
            type="button"
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md transition"
            title="Switch Map Tile Theme"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>

          <div className="absolute right-0 top-12 hidden group-hover:flex flex-col bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-1.5 w-44 backdrop-blur-md divide-y divide-slate-800/60 z-50">
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

        {/* Trail Toggle & Clear */}
        <div className="flex flex-col gap-1 items-center">
          <button
            type="button"
            onClick={() => setShowTrail((prev) => !prev)}
            className={`p-2 rounded-xl text-xs font-mono border backdrop-blur-md transition ${
              showTrail
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60'
                : 'bg-slate-900/80 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle GPS Breadcrumb Trail"
          >
            〰️
          </button>
          {showTrail && (
            <button
              type="button"
              onClick={handleClearTrail}
              className="text-[10px] text-slate-500 hover:text-rose-400 font-mono transition"
              title="Clear Trail Points"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Sleek Minimalist Top-Left Compass & Heading Cluster */}
      <div className="absolute top-[120px] left-4 sm:left-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md p-2.5 sm:p-3 flex items-center gap-3">
          {/* Compass Dial */}
          <div
            onClick={toggleOrientationMode}
            className="relative w-9 h-9 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center cursor-pointer hover:border-cyan-500/60 transition group shrink-0"
            title="Click to toggle Driver POV / North-Up"
          >
            <span className="text-rose-500 font-mono text-[8px] font-black absolute top-0.5 pointer-events-none">
              N
            </span>
            <div
              className="w-1 h-5 bg-gradient-to-b from-rose-500 via-slate-300 to-cyan-400 rounded-full transition-transform duration-75 shadow-sm"
              style={{
                transform: `rotate(${orientationMode === 'heading-up' ? -headingDegrees : 0}deg)`,
              }}
            />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-950 border border-slate-400 absolute" />
          </div>

          {/* Heading Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100 font-mono tracking-wider">
                {Math.round(headingDegrees).toString().padStart(3, '0')}°
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 uppercase font-mono">
                {getCardinalDirection(headingDegrees)}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleOrientationMode}
              className="mt-0.5 text-[10px] font-medium text-slate-400 hover:text-cyan-300 text-left transition flex items-center gap-1"
            >
              <span>{orientationMode === 'heading-up' ? '🧭 Driver POV' : '🧭 North-Up'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MapViewComponent);
