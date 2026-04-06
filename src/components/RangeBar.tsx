'use client';

interface RangeBarProps {
  sysMin: number;
  sysMax: number;
  diaMin: number;
  diaMax: number;
  /** Fixed scale minimum (default 80) */
  scaleMin?: number;
  /** Fixed scale maximum (default 200) */
  scaleMax?: number;
}

const TICK_VALUES = [80, 120, 140, 160, 200];

function barPosition(min: number, max: number, scaleMin: number, scaleRange: number) {
  const leftPct = Math.max(0, ((min - scaleMin) / scaleRange) * 100);
  const widthPct = Math.max(1, ((max - min) / scaleRange) * 100);
  return { leftPct, widthPct };
}

/**
 * Combined horizontal bar showing systolic (rose) and diastolic (sky) ranges
 * on a shared 80–200 mmHg scale with tick marks at ESC zone boundaries.
 */
export function RangeBar({
  sysMin, sysMax, diaMin, diaMax,
  scaleMin = 80, scaleMax = 200,
}: RangeBarProps) {
  const scaleRange = scaleMax - scaleMin;
  const sys = barPosition(sysMin, sysMax, scaleMin, scaleRange);
  const dia = barPosition(diaMin, diaMax, scaleMin, scaleRange);

  return (
    <div
      className="flex-1 min-w-[60px]"
      aria-label={`Systolic ${sysMin}–${sysMax}, Diastolic ${diaMin}–${diaMax} mmHg`}
      role="img"
    >
      {/* Combined range bar — diastolic (sky) + systolic (rose) on same track */}
      <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute top-0 h-full bg-sky-400 rounded-full"
          style={{ left: `${dia.leftPct}%`, width: `${dia.widthPct}%` }}
        />
        <div
          className="absolute top-0 h-full bg-rose-400 rounded-full"
          style={{ left: `${sys.leftPct}%`, width: `${sys.widthPct}%` }}
        />
      </div>

      {/* Tick marks */}
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
    </div>
  );
}
