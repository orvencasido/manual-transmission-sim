'use client';

import React, { useMemo } from 'react';

interface SpeedometerGaugeProps {
  speedKmh: number;
  maxSpeed?: number;
  isRollingBackward?: boolean;
}

export function SpeedometerGauge({
  speedKmh,
  maxSpeed = 220,
  isRollingBackward = false,
}: SpeedometerGaugeProps) {
  const cx = 120;
  const cy = 120;
  const rGauge = 95;
  const startAngle = 135;
  const sweepAngle = 270;

  const absSpeed = Math.abs(speedKmh);
  const clampedSpeed = Math.min(Math.max(absSpeed, 0), maxSpeed);
  const needleAngle = startAngle + (clampedSpeed / maxSpeed) * sweepAngle;

  // Generate tick marks and numbers
  const ticks = useMemo(() => {
    const list: Array<{
      value: number;
      isMajor: boolean;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      labelX?: number;
      labelY?: number;
    }> = [];

    // Minor ticks every 10 km/h, Major ticks every 20 km/h
    for (let s = 0; s <= maxSpeed; s += 10) {
      const isMajor = s % 20 === 0;
      const angle = startAngle + (s / maxSpeed) * sweepAngle;
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const rOuter = rGauge;
      const rInner = isMajor ? rGauge - 13 : rGauge - 7;
      const rLabel = rGauge - 26;

      list.push({
        value: s,
        isMajor,
        x1: cx + rOuter * cos,
        y1: cy + rOuter * sin,
        x2: cx + rInner * cos,
        y2: cy + rInner * sin,
        labelX: isMajor ? cx + rLabel * cos : undefined,
        labelY: isMajor ? cy + rLabel * sin : undefined,
      });
    }
    return list;
  }, [maxSpeed, startAngle, sweepAngle, cx, cy, rGauge]);

  // Arc path generator
  const arcPath = useMemo(() => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;
    const x1 = cx + rGauge * Math.cos(startRad);
    const y1 = cy + rGauge * Math.sin(startRad);
    const x2 = cx + rGauge * Math.cos(endRad);
    const y2 = cy + rGauge * Math.sin(endRad);
    return `M ${x1} ${y1} A ${rGauge} ${rGauge} 0 1 1 ${x2} ${y2}`;
  }, [cx, cy, rGauge, startAngle, sweepAngle]);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative w-[210px] h-[210px] sm:w-[240px] sm:h-[240px]">
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full drop-shadow-lg"
          role="img"
          aria-label={`Speedometer: ${absSpeed.toFixed(0)} km/h`}
        >
          {/* Outer dial ring */}
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

          {/* Scale background track arc */}
          <path
            d={arcPath}
            fill="none"
            className="stroke-slate-700/50"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Dial Ticks and Labels */}
          {ticks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className={tick.isMajor ? 'stroke-slate-200' : 'stroke-slate-500'}
                strokeWidth={tick.isMajor ? 2 : 1}
                strokeLinecap="round"
              />
              {tick.isMajor && tick.labelX !== undefined && tick.labelY !== undefined && (
                <text
                  x={tick.labelX}
                  y={tick.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-slate-300 text-[10px] font-mono font-medium tracking-tighter"
                >
                  {tick.value}
                </text>
              )}
            </g>
          ))}

          {/* Gauge Center Badge / Label */}
          <text
            x={cx}
            y={cy - 38}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-400 text-[9px] font-semibold tracking-widest uppercase"
          >
            SPEED
          </text>
          <text
            x={cx}
            y={cy - 25}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-500 text-[8px] font-mono tracking-wider"
          >
            km/h
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
              className="fill-orange-500"
            />
            {/* Needle central bright line */}
            <line
              x1={cx - 16}
              y1={cy}
              x2={cx + 80}
              y2={cy}
              className="stroke-orange-300"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>

          {/* Center Hub & Pin */}
          <circle cx={cx} cy={cy} r="14" className="fill-slate-800 stroke-slate-700" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="8" className="fill-slate-900 stroke-slate-600" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="3" className="fill-orange-500" />

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
                isRollingBackward ? 'fill-amber-400' : 'fill-slate-100'
              }`}
            >
              {absSpeed.toFixed(0)}
            </text>
            <text
              x="40"
              y="25"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-slate-500 text-[7px] font-mono uppercase tracking-widest"
            >
              KM/H
            </text>
          </g>
        </svg>

        {/* Rolling Back Indicator Badge */}
        {isRollingBackward && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/70 text-amber-300 text-[10px] font-bold tracking-wide uppercase animate-pulse shadow-md shadow-amber-900/40">
            Rolling Back
          </div>
        )}
      </div>

      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
        Speedometer
      </span>
    </div>
  );
}
