'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

export interface AuthProfilePillProps {
  className?: string;
  align?: 'left' | 'right';
}

export function AuthProfilePill({ className = '', align = 'right' }: AuthProfilePillProps) {
  const { user, profile, isAuthenticated, isLoading, signOut } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  if (isLoading) {
    return (
      <div className={`h-8 w-24 rounded-xl bg-slate-800/60 animate-pulse border border-slate-700/40 ${className}`} />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/auth/login"
        className={`px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-600/50 text-slate-300 hover:text-cyan-300 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm group ${className}`}
        title="Sign in to save stars and session stats to the cloud"
      >
        <span className="text-slate-400 group-hover:text-cyan-400 transition">👤</span>
        <span>Sign In</span>
      </Link>
    );
  }

  const displayName = profile?.username || user.email?.split('@')[0] || 'Driver';
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="px-2.5 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2 shadow-md"
        aria-expanded={dropdownOpen}
      >
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px]">
          {initialLetter}
        </div>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="max-w-[100px] sm:max-w-[120px] truncate">{displayName}</span>
        </span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            dropdownOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          className={`absolute top-full mt-2 w-56 rounded-2xl bg-slate-900/95 border border-slate-800/90 backdrop-blur-xl shadow-2xl p-2 z-[999] text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* User Info Header */}
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
            <div className="font-bold text-slate-100 truncate">{displayName}</div>
            {user.email && (
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {user.email}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Cloud Sync Active</span>
            </div>
          </div>

          {/* Navigation Links */}
          <Link
            href="/lessons"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition font-medium"
          >
            <span>🏆</span>
            <span>Driving Lessons</span>
          </Link>

          <Link
            href="/progress"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition font-medium"
          >
            <span>📊</span>
            <span>Progress & Telemetry</span>
          </Link>

          <Link
            href="/simulator"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition font-medium"
          >
            <span>🏎️</span>
            <span>Cockpit Simulator</span>
          </Link>

          <Link
            href="/map"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition font-medium"
          >
            <span>🗺️</span>
            <span>Street Map Driving</span>
          </Link>

          <Link
            href="/taxi"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 transition font-semibold"
          >
            <span>🚖</span>
            <span>Taxi Simulator</span>
          </Link>

          <div className="border-t border-slate-800/80 my-1" />

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={async () => {
              setDropdownOpen(false);
              await signOut();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition font-medium text-left"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
