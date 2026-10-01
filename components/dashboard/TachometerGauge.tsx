'use client';

import React, { useMemo } from 'react';

interface TachometerGaugeProps {
  rpm: number;
  redlineRpm?: number;
  maxRpm?: number;
  isLugging?: boolean;
}

export function TachometerGauge({
  rpm,
  redlineRpm = 6500,
  maxRpm = 8000,
  isLugging = false,
}: TachometerGaugeProps) {
  const cx = 120;
  const cy = 120;
  const rGauge = 95;
  const startAngle = 135;
  const sweepAngle = 270;

  const clampedRpm = Math.min(Math.max(rpm, 0), maxRpm);
  const needleAngle = startAngle + (clampedRpm / maxRpm) * sweepAngle;
  const isRedline = rpm >= redlineRpm;

  // Arc path generator
  const getArc = (fromVal: number, toVal: number, radius: number) => {
    const a1 = startAngle + (fromVal / maxRpm) * sweepAngle;
    const a2 = startAngle + (toVal / maxRpm) * sweepAngle;
    const rad1 = (a1 * Math.PI) / 180;
    const rad2 = (a2 * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(rad1);
    const y1 = cy + radius * Math.sin(rad1);
    const x2 = cx + radius * Math.cos(rad2);
    const y2 = cy + radius * Math.sin(rad2);
    const largeArc = a2 - a1 > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Redline arc (6500 to 8000)
  const redlineArcPath = useMemo(
    () => getArc(redlineRpm, maxRpm, rGauge - 1),
    [redlineRpm, maxRpm, rGauge]
  );

  // Background arc (0 to 6500)
  const baseArcPath = useMemo(
    () => getArc(0, redlineRpm, rGauge - 1),
    [redlineRpm, maxRpm, rGauge]
  );

  // Generate tick marks: every 200 RPM, with major ticks every 1000 RPM (0 to 8)
  const ticks = useMemo(() => {
    const list: Array<{
      value: number;
      isMajor: boolean;
      isRed: boolean;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      labelX?: number;
      labelY?: number;
      majorLabel?: number;
    }> = [];

    for (let r = 0; r <= maxRpm; r += 200) {
      const isMajor = r % 1000 === 0;
      const isMid = r % 500 === 0 && !isMajor;
      const isRed = r >= redlineRpm;
      const angle = startAngle + (r / maxRpm) * sweepAngle;
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const rOuter = rGauge;
      const rInner = isMajor ? rGauge - 14 : isMid ? rGauge - 9 : rGauge - 5;
      const rLabel = rGauge - 26;

      list.push({
        value: r,
        isMajor,
        isRed,
        x1: cx + rOuter * cos,
        y1: cy + rOuter * sin,
        x2: cx + rInner * cos,
        y2: cy + rInner * sin,
        labelX: isMajor ? cx + rLabel * cos : undefined,
        labelY: isMajor ? cy + rLabel * sin : undefined,
        majorLabel: isMajor ? r / 1000 : undefined,
      });
    }
    return list;
  }, [maxRpm, redlineRpm, startAngle, sweepAngle, cx, cy, rGauge]);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative w-[210px] h-[210px] sm:w-[240px] sm:h-[240px]">
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full drop-shadow-lg"
          role="img"
          aria-label={`Tachometer: ${rpm.toFixed(0)} RPM`}
        >
          {/* Dial casing */}
          <circle
            cx={cx}
            cy={cy}
            r="115"
            className="fill-slate-950 stroke-slate-800"
            strokeWidth="3"
          />
          <circle
            cx={cx}
            cy={cy}
            r="110"
            className="fill-slate-900/90 stroke-slate-800/60"
            strokeWidth="1.5"
          />
          <circle
            cx={cx}
            cy={cy}
            r="102"
            className="fill-none stroke-slate-700/30"
            strokeWidth="1"
          />

          {/* Normal RPM scale arc */}
          <path
            d={baseArcPath}
            fill="none"
            className="stroke-slate-700/50"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Highlighted Redline sector arc (6500 - 8000 RPM) */}
          <path
            d={redlineArcPath}
            fill="none"
            className="stroke-red-500/80"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Ticks and Markings */}
          {ticks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className={
                  tick.isRed
                    ? 'stroke-red-500'
                    : tick.isMajor
                    ? 'stroke-slate-200'
                    : 'stroke-slate-500'
                }
                strokeWidth={tick.isMajor ? 2 : 1}
                strokeLinecap="round"
              />
              {tick.isMajor && tick.labelX !== undefined && tick.labelY !== undefined && (
                <text
                  x={tick.labelX}
                  y={tick.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`font-mono text-[11px] font-bold ${
                    tick.isRed ? 'fill-red-400' : 'fill-slate-300'
                  }`}
                >
                  {tick.majorLabel}
                </text>
              )}
            </g>
          ))}

          {/* Center Labels */}
          <text
            x={cx}
            y={cy - 38}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-400 text-[9px] font-semibold tracking-widest uppercase"
          >
            TACHOMETER
          </text>
          <text
            x={cx}
            y={cy - 25}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-500 text-[8px] font-mono tracking-wider"
          >
            x1000 r/min
          </text>

          {/* Dynamic Needle */}
          <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
            {/* Needle shadow */}
            <line
              x1={cx - 16}
              y1={cy}
              x2={cx + 80}
              y2={cy}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="4"
              strokeLinecap="round"
              transform="translate(1, 2)"
            />
            {/* Needle body */}
            <polygon
              points={`${cx - 18},${cy - 2} ${cx + 78},${cy - 0.75} ${cx + 82},${cy} ${cx + 78},${cy + 0.75} ${cx - 18},${cy + 2}`}
              className={isRedline ? 'fill-red-500' : 'fill-orange-500'}
            />
            {/* Needle center line */}
            <line
              x1={cx - 16}
              y1={cy}
              x2={cx + 80}
              y2={cy}
              className={isRedline ? 'stroke-red-200' : 'stroke-orange-300'}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>

          {/* Center Hub & Pin */}
          <circle cx={cx} cy={cy} r="14" className="fill-slate-800 stroke-slate-700" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="8" className="fill-slate-900 stroke-slate-600" strokeWidth="1" />
          <circle
            cx={cx}
            cy={cy}
            r="3"
            className={isRedline ? 'fill-red-500' : 'fill-orange-500'}
          />

          {/* Digital Readout Display Box */}
          <g transform={`translate(${cx - 40}, ${cy + 36})`}>
            <rect
              width="80"
              height="30"
              rx="5"
              className="fill-slate-950/90 stroke-slate-800/80"
              strokeWidth="1.5"
            />
            <text
              x="40"
              y="16"
              textAnchor="middle"
              dominantBaseline="central"
              className={`font-mono text-base font-bold tracking-tight ${
                isRedline
                  ? 'fill-red-400'
                  : isLugging
                  ? 'fill-amber-400'
                  : 'fill-emerald-400'
              }`}
            >
              {rpm.toFixed(0)}
            </text>
            <text
              x="40"
              y="25"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-slate-500 text-[7px] font-mono uppercase tracking-widest"
            >
              RPM
            </text>
          </g>
        </svg>

        {/* Lugging / Redline warning flags */}
        {isLugging && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/70 text-amber-300 text-[10px] font-bold tracking-wide uppercase animate-pulse shadow-md shadow-amber-900/40">
            Lugging
          </div>
        )}
        {isRedline && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-red-950/90 border border-red-500/80 text-red-300 text-[10px] font-bold tracking-wide uppercase animate-pulse shadow-md shadow-red-900/40">
            Redline!
          </div>
        )}
      </div>

      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
        Tachometer
      </span>
    </div>
  );
}
