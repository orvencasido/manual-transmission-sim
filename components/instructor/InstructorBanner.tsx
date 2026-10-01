'use client';

import React, { useState } from 'react';
import { InstructorFeedback } from '@/lib/simulation/types';
import { useSimulatorStore } from '@/stores/simulatorStore';

interface InstructorBannerProps {
  feedback?: InstructorFeedback | null;
  className?: string;
}

export function InstructorBanner({ feedback: propFeedback, className = '' }: InstructorBannerProps) {
  const storeActiveFeedback = useSimulatorStore((s) => s.activeFeedback);
  const storeFeedbacks = useSimulatorStore((s) => s.feedbacks);
  const clearFeedback = useSimulatorStore((s) => s.clearFeedback);
  const [showHistory, setShowHistory] = useState(false);

  // If prop provided, prioritize it, otherwise use store's active feedback or top item
  const currentFeedback =
    propFeedback !== undefined
      ? propFeedback
      : storeActiveFeedback || (storeFeedbacks.length > 0 ? storeFeedbacks[0] : null);

  // Theme configuration based on severity
  const getSeverityStyle = (type: InstructorFeedback['type']) => {
    switch (type) {
      case 'error':
        return {
          wrapper: 'bg-rose-950/40 border-rose-700/60 shadow-rose-950/30 text-rose-100',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          indicator: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
          label: 'DIAGNOSTIC',
          icon: (
            <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ),
        };
      case 'warning':
        return {
          wrapper: 'bg-amber-950/40 border-amber-600/50 shadow-amber-950/30 text-amber-100',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          indicator: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
          label: 'CAUTION',
          icon: (
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case 'success':
        return {
          wrapper: 'bg-emerald-950/40 border-emerald-600/50 shadow-emerald-950/30 text-emerald-100',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          indicator: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
          label: 'EXCELLENT',
          icon: (
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case 'info':
      default:
        return {
          wrapper: 'bg-cyan-950/40 border-cyan-600/50 shadow-cyan-950/30 text-cyan-100',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          indicator: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
          label: 'COACH',
          icon: (
            <svg className="w-5 h-5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
    }
  };

  const style = currentFeedback
    ? getSeverityStyle(currentFeedback.type)
    : {
        wrapper: 'bg-slate-900/60 border-slate-800 text-slate-300 shadow-slate-950/30',
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        indicator: 'bg-slate-500',
        label: 'INSTRUCTOR',
        icon: (
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        ),
      };

  return (
    <div className={`w-full transition-all duration-300 ease-in-out ${className}`}>
      {/* Primary Banner Surface */}
      <div
        className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border backdrop-blur-md shadow-lg ${style.wrapper}`}
      >
        {/* Left Side: Indicator Badge & Content */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 mt-0.5 sm:mt-0">
            <span className={`w-2 h-2 rounded-full ${style.indicator}`} />
            {style.icon}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span
              className={`text-[10px] font-bold font-mono tracking-widest px-2 py-0.5 rounded border uppercase shrink-0 ${style.badge}`}
            >
              {style.label}
            </span>

            <p className="text-xs sm:text-sm font-medium tracking-tight">
              {currentFeedback
                ? currentFeedback.message
                : 'Instructor active — monitoring throttle balance, clutch friction & gear selection.'}
            </p>
          </div>
        </div>

        {/* Right Side: Log History Toggle & Clear Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {storeFeedbacks.length > 0 && (
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              aria-label="Toggle instructor history log"
              className="text-[11px] px-2.5 py-1 rounded-lg font-mono bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition flex items-center gap-1.5"
            >
              <span>History</span>
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px]">
                {storeFeedbacks.length}
              </span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {currentFeedback && (
            <button
              onClick={clearFeedback}
              title="Clear feedback message"
              aria-label="Dismiss feedback"
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/60 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible History Drawer */}
      {showHistory && storeFeedbacks.length > 0 && (
        <div className="mt-2 p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl backdrop-blur-md text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Recent Instructor Feedback Log</span>
            <button
              onClick={clearFeedback}
              className="text-[10px] text-rose-400 hover:text-rose-300 underline lowercase"
            >
              clear log
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
            {storeFeedbacks.map((item, index) => {
              const itemStyle = getSeverityStyle(item.type);
              const formattedTime = new Date(item.timestamp).toLocaleTimeString([], {
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div key={item.id || index} className="pt-1.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border ${itemStyle.badge}`}
                    >
                      {item.type.toUpperCase()}
                    </span>
                    <span className="text-slate-200 text-xs">{item.message}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{formattedTime}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorBanner;
