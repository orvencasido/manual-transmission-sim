'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface SearchLocationResult {
  placeId: number;
  lat: number;
  lon: number;
  title: string;
  subtitle: string;
  icon: string;
  type?: string;
}

interface RawNominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
}

export interface MapSearchBarProps {
  onSelectLocation: (lat: number, lon: number, displayName: string) => void;
  className?: string;
}

function getPlaceIcon(item: RawNominatimItem): string {
  const cls = (item.class || '').toLowerCase();
  const typ = (item.type || '').toLowerCase();

  if (cls === 'highway' || typ === 'road' || typ === 'residential' || typ === 'motorway') {
    return '🛣️';
  }
  if (cls === 'place' || typ === 'city' || typ === 'town' || typ === 'administrative') {
    return '🏙️';
  }
  if (cls === 'building' || cls === 'shop' || cls === 'office') {
    return '🏢';
  }
  if (cls === 'tourism' || cls === 'historic' || typ === 'monument' || typ === 'attraction') {
    return '🏛️';
  }
  if (cls === 'leisure' || cls === 'natural' || typ === 'park' || typ === 'forest') {
    return '🌲';
  }
  if (cls === 'aeroway') {
    return '✈️';
  }
  if (typ === 'village' || typ === 'hamlet') {
    return '🏡';
  }
  return '📍';
}

function formatPlace(item: RawNominatimItem): SearchLocationResult {
  const parts = item.display_name.split(',').map((p) => p.trim());
  const title = parts[0] || 'Unknown Location';
  const subtitle = parts.slice(1, 4).join(', ') || parts.slice(1).join(', ');

  return {
    placeId: item.place_id,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    title,
    subtitle: subtitle || 'OpenStreetMap location',
    icon: getPlaceIcon(item),
    type: item.type,
  };
}

export function MapSearchBar({ onSelectLocation, className = '' }: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchLocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search via OpenStreetMap Nominatim API (350-450ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          trimmed
        )}&countrycodes=ph&viewbox=119.2,19.0,124.8,12.2&format=json&limit=6&addressdetails=1`;

        const res = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Nominatim request failed: ${res.statusText}`);
        }

        const data: RawNominatimItem[] = await res.json();
        const formatted = data.map(formatPlace);
        setResults(formatted);
        setHighlightedIndex(-1);
        setIsOpen(true);

        if (formatted.length === 0) {
          setErrorMessage('No matching locations found in the Philippines');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setErrorMessage('Search temporarily unavailable. Check network.');
      } finally {
        setIsLoading(false);
      }
    }, 380);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = useCallback(
    (item: SearchLocationResult) => {
      onSelectLocation(item.lat, item.lon, `${item.title}${item.subtitle ? ` (${item.subtitle})` : ''}`);
      setQuery(item.title);
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onSelectLocation]
  );

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setErrorMessage(null);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Keyboard navigation & isolated input controls to prevent vehicle triggers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent event from bubbling to window keyboard controls (Space, W, S, A, D, etc.)
    e.stopPropagation();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && results.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
      if (results.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        const targetIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
        const selected = results[targetIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none pointer-events-auto transition-all ${className}`}
    >
      {/* Floating Pill Search Input */}
      <div className="relative flex items-center bg-slate-900/90 hover:bg-slate-900 focus-within:bg-slate-900 backdrop-blur-xl border border-slate-700/80 focus-within:border-cyan-500/80 rounded-2xl shadow-2xl transition duration-150 group">
        <div className="pl-3.5 pr-1 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0 || errorMessage) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder="🔍 Search street, city, or place in Luzon, Philippines..."
          className="w-full bg-transparent py-2.5 pl-2 pr-9 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
          autoComplete="off"
          spellCheck="false"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && (results.length > 0 || errorMessage) && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-[1200] max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-800/80">
          {errorMessage && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-amber-300/90 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {results.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={item.placeId}
                type="button"
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3.5 py-2.5 transition flex items-center justify-between gap-3 text-xs ${
                  isHighlighted
                    ? 'bg-cyan-950/60 text-cyan-200 border-l-2 border-cyan-400 pl-3'
                    : 'hover:bg-slate-800/70 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-base shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-100 truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 font-mono text-[10px] text-cyan-400 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span>{item.lat.toFixed(3)}°,</span>
                  <span>{item.lon.toFixed(3)}°</span>
                </div>
              </button>
            );
          })}

          {results.length > 0 && (
            <div className="px-3.5 py-1.5 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">↵</kbd>
                <span>Select & Drive</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
