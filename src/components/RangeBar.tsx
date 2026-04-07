'use client';

import { useState } from 'react';

interface RangeBarProps {
  sysMin: number;
  sysMax: number;
  diaMin: number;
  diaMax: number;
  /** Compact mode: h-2 bar, no tick labels (for collapsed day row) */
  compact?: boolean;
  /** Fixed scale minimum (default 60) */
  scaleMin?: number;
  /** Fixed scale maximum (default 200) */
  scaleMax?: number;
}

const TICK_VALUES = [60, 120, 140, 160, 200];

/** Ideal BP per ESC/ESH guidelines (Kelso clinical guidance) */
const IDEAL_SYSTOLIC = 120;
const IDEAL_DIASTOLIC = 80;

function barPosition(min: number, max: number, scaleMin: number, scaleRange: number) {
  const leftPct = Math.max(0, ((min - scaleMin) / scaleRange) * 100);
  const widthPct = Math.max(1, ((max - min) / scaleRange) * 100);
  return { leftPct, widthPct };
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMin < bMax && bMin < aMax;
}

/**
 * Combined horizontal bar showing systolic (rose) and diastolic (sky) ranges
 * on a shared 60–200 mmHg scale with tick marks at ESC zone boundaries.
 * Includes subtle ideal BP reference lines at 120/80 mmHg.
 */
export function RangeBar({
  sysMin, sysMax, diaMin, diaMax,
  compact = false,
  scaleMin = 60, scaleMax = 200,
}: RangeBarProps) {
  const [hovered, setHovered] = useState<'sys' | 'dia' | null>(null);
  const scaleRange = scaleMax - scaleMin;
  const sys = barPosition(sysMin, sysMax, scaleMin, scaleRange);
  const dia = barPosition(diaMin, diaMax, scaleMin, scaleRange);
  const overlap = rangesOverlap(sysMin, sysMax, diaMin, diaMax);

  const idealSysPct = ((IDEAL_SYSTOLIC - scaleMin) / scaleRange) * 100;
  const idealDiaPct = ((IDEAL_DIASTOLIC - scaleMin) / scaleRange) * 100;

  return (
    <div
      className="flex-1 min-w-[60px]"
      aria-label={`Systolic ${sysMin}–${sysMax}, Diastolic ${diaMin}–${diaMax} mmHg`}
      role="img"
    >
      {/* Combined range bar — diastolic (sky) + systolic (rose) on same track */}
      <div className={`relative ${compact ? 'h-2' : 'h-1.5'} bg-gray-100 rounded-full overflow-visible`}>
        {/* Diastolic segment */}
        <div
          className="absolute top-0 h-full bg-sky-400 rounded-full cursor-pointer z-[1] min-w-[8px]"
          style={{ left: `${dia.leftPct}%`, width: `${dia.widthPct}%` }}
          onMouseEnter={() => setHovered('dia')}
          onMouseLeave={() => setHovered(null)}
        >
          {hovered === 'dia' && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
              <div className="bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                <div className="tabular-nums">Diastolic: {diaMin}–{diaMax} mmHg</div>
              </div>
            </div>
          )}
        </div>

        {/* Systolic segment (rendered on top) */}
        <div
          className="absolute top-0 h-full bg-rose-400 rounded-full cursor-pointer z-[2] min-w-[8px]"
          style={{ left: `${sys.leftPct}%`, width: `${sys.widthPct}%` }}
          onMouseEnter={() => setHovered('sys')}
          onMouseLeave={() => setHovered(null)}
        >
          {hovered === 'sys' && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
              <div className="bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                <div className="tabular-nums">Systolic: {sysMin}–{sysMax} mmHg</div>
                {overlap && (
                  <div className="tabular-nums">Diastolic: {diaMin}–{diaMax} mmHg</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ideal BP reference lines — on top of colored segments */}
        <div
          className="absolute top-0 h-full w-px bg-gray-400/40 z-[3]"
          style={{ left: `${idealSysPct}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute top-0 h-full w-px bg-gray-400/40 z-[3]"
          style={{ left: `${idealDiaPct}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Tick labels — hidden in compact mode */}
      {!compact && (
        <div className="relative flex-1 h-3 mt-px">
          {TICK_VALUES.map((v) => {
            const pct = ((v - scaleMin) / scaleRange) * 100;
            return (
              <span
                key={v}
                className="absolute text-[9px] text-gray-400 -translate-x-1/2 leading-none"
                style={{ left: `${pct}%` }}
              >
                {v}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
