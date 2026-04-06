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
 * Dual horizontal bars showing systolic and diastolic ranges on a shared
 * 80–200 mmHg scale with tick marks at ESC zone boundaries.
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
      {/* Systolic bar */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-gray-500 w-6 flex-shrink-0 text-right">SYS</span>
        <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden flex-1">
          <div
            className="absolute top-0 h-full bg-rose-400 rounded-full"
            style={{ left: `${sys.leftPct}%`, width: `${sys.widthPct}%` }}
          />
        </div>
      </div>

      {/* Diastolic bar */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[9px] text-gray-500 w-6 flex-shrink-0 text-right">DIA</span>
        <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden flex-1">
          <div
            className="absolute top-0 h-full bg-sky-400 rounded-full"
            style={{ left: `${dia.leftPct}%`, width: `${dia.widthPct}%` }}
          />
        </div>
      </div>

      {/* Tick marks */}
      <div className="flex items-center gap-1 mt-px">
        <span className="w-6 flex-shrink-0" />
        <div className="relative flex-1 h-3">
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
    </div>
  );
}
