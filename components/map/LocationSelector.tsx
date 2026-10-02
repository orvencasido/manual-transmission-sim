'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface LocationPreset {
  id: string;
  name: string;
  location: string;
  description: string;
  lat: number;
  lon: number;
  heading: number;
  grade?: number; // incline in percent
  badge: string;
  icon: string;
}

export const PRESET_LOCATIONS: LocationPreset[] = [
  {
    id: 'lucena-city',
    name: 'Lucena City Center (Quezon Capitol)',
    location: 'Lucena City, Quezon (CALABARZON, Luzon)',
    description: 'Vibrant provincial capital with bustling intersections, commercial avenues, and real-world manual driving traffic.',
    lat: 13.9314,
    lon: 121.6172,
    heading: 0,
    badge: 'Home Base (Default)',
    icon: '🏛️',
  },
  {
    id: 'bgc-taguig',
    name: 'BGC High Street',
    location: 'Bonifacio Global City, Taguig',
    description: 'Modern urban grid with pedestrian crosswalks, roundabouts, and stop-and-go manual clutch traffic.',
    lat: 14.5503,
    lon: 121.0494,
    heading: 0,
    badge: 'Urban Grid',
    icon: '🏙️',
  },
  {
    id: 'ayala-makati',
    name: 'Ayala Avenue (Makati CBD)',
    location: 'Makati City, Metro Manila',
    description: 'Wide multi-lane commercial boulevard ideal for sequential upshifting and smooth lane transitions.',
    lat: 14.5547,
    lon: 121.0244,
    heading: 240,
    badge: 'Boulevard Cruise',
    icon: '🏢',
  },
  {
    id: 'baguio-kennon',
    name: 'Baguio City (Session & Kennon Rd)',
    location: 'Baguio, Benguet (Luzon Highlands)',
    description: 'Steep 14% mountain grades and tight winding switchbacks. The ultimate manual hill-start challenge.',
    lat: 16.412,
    lon: 120.596,
    heading: 330,
    grade: 14,
    badge: 'Steep Mountain Climb',
    icon: '🌲',
  },
  {
    id: 'tagaytay-ridge',
    name: 'Tagaytay Ridge (Aguinaldo Hwy)',
    location: 'Tagaytay, Cavite (Southern Luzon)',
    description: 'Scenic high-altitude ridge overlooking Taal Lake with rolling inclines and cool breeze cruising.',
    lat: 14.1153,
    lon: 120.9621,
    heading: 90,
    grade: 8,
    badge: 'Scenic Ridge Road',
    icon: '🌋',
  },
  {
    id: 'roxas-manila',
    name: 'Roxas Boulevard (Manila Bay)',
    location: 'Manila, Metro Manila',
    description: 'Historic scenic coastal highway along Manila Bay. Smooth 3rd and 4th gear cruising.',
    lat: 14.5764,
    lon: 120.979,
    heading: 160,
    badge: 'Coastal Highway',
    icon: '🌊',
  },
  {
    id: 'quezon-circle',
    name: 'Quezon Memorial Circle',
    location: 'Quezon City, Metro Manila',
    description: 'Massive multi-lane elliptical roundabout for mastering clutch feathering and steering modulation.',
    lat: 14.6516,
    lon: 121.0493,
    heading: 0,
    badge: 'Giant Roundabout',
    icon: '🔄',
  },
];

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

export interface LocationSelectorProps {
  currentLat: number;
  currentLon: number;
  onSelectLocation: (lat: number, lon: number, heading?: number, grade?: number) => void;
  isOpen: boolean;
  onClose: () => void;
  onMyLocationSuccess?: (lat: number, lon: number) => void;
  onMyLocationError?: (errMessage: string) => void;
}

export function LocationSelector({
  currentLat,
  currentLon,
  onSelectLocation,
  isOpen,
  onClose,
  onMyLocationSuccess,
  onMyLocationError,
}: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setGeoError(null);
      setIsLocating(false);
    }
  }, [isOpen]);

  const handleUseMyLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const err = 'HTML5 Geolocation is not supported by your browser.';
      setGeoError(err);
      onMyLocationError?.(err);
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        onSelectLocation(latitude, longitude, 0, 0);
        onMyLocationSuccess?.(latitude, longitude);
        onClose();
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to detect your location. Please check browser permissions.';
        if (error.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === 2) {
          msg = 'Location unavailable from device sensors.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        setGeoError(msg);
        onMyLocationError?.(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Free Global Search with Nominatim API (debounced)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          trimmed
        )}&countrycodes=ph&viewbox=119.2,19.0,124.8,12.2&format=json&limit=6&addressdetails=1`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Nominatim error: ${res.statusText}`);
        }

        const data: SearchResult[] = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          setSearchError('No matching places or streets found. Try a different city or landmark.');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setSearchError('Unable to reach OpenStreetMap search. Check your network connection.');
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Global Location Teleport
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an iconic training proving ground or search any real-world street on Earth.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 bg-slate-800/60 hover:bg-slate-800 transition"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick GPS Real Location Detector Banner */}
        <div className="px-6 pt-5 pb-2 bg-slate-950/40 border-b border-slate-800/60">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-800/50 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0">
                📍
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Drive at Your Real Location
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-700/60 font-semibold">
                    GPS
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Detect your browser coordinates and spawn your vehicle outside.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 disabled:opacity-50 shrink-0"
              title="Spawn vehicle at your real GPS coordinates"
            >
              {isLocating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>Use My Location</span>
                </>
              )}
            </button>
          </div>

          {geoError && (
            <div className="mt-2.5 p-2 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{geoError}</span>
            </div>
          )}
        </div>

        {/* Global Search Input */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-900/60">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any address, city, highway, or landmark worldwide..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Status & Results */}
          {searchQuery.trim().length >= 3 && (
            <div className="mt-3 space-y-1.5">
              {searchError && (
                <p className="text-xs text-amber-400/90 px-1">{searchError}</p>
              )}
              {searchResults.length > 0 && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                  {searchResults.map((item) => {
                    const latNum = parseFloat(item.lat);
                    const lonNum = parseFloat(item.lon);
                    return (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => {
                          onSelectLocation(latNum, lonNum, 0, 0);
                          onClose();
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-800/70 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-200 truncate">
                            {item.display_name.split(',')[0]}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.display_name}
                          </p>
                        </div>
                        <div className="font-mono text-[10px] text-cyan-400 shrink-0 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                          {latNum.toFixed(4)}, {lonNum.toFixed(4)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Curated Iconic Presets Section */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Curated Iconic Presets
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Current: {currentLat.toFixed(4)}°, {currentLon.toFixed(4)}°
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_LOCATIONS.map((preset) => {
              const isCurrent =
                Math.abs(currentLat - preset.lat) < 0.001 &&
                Math.abs(currentLon - preset.lon) < 0.001;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectLocation(preset.lat, preset.lon, preset.heading, preset.grade ?? 0);
                    onClose();
                  }}
                  className={`relative text-left p-4 rounded-2xl border transition flex flex-col justify-between group ${
                    isCurrent
                      ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/40'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{preset.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition">
                            {preset.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {preset.location}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {preset.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>
                      {preset.lat.toFixed(4)}°, {preset.lon.toFixed(4)}°
                    </span>
                    {preset.grade ? (
                      <span className="text-amber-400 font-semibold">
                        Grade: +{preset.grade}%
                      </span>
                    ) : (
                      <span className="text-cyan-400 font-medium group-hover:translate-x-0.5 transition inline-flex items-center gap-1">
                        Teleport →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
              Click Map
            </kbd>{' '}
            also teleports vehicle anywhere
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
