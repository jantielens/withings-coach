'use client';

import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';

interface SparklineProps {
  readings: ReadingGroup<BloodPressureData>[];
}

/**
 * Tiny inline SVG sparkline showing intra-day BP trend.
 * Only meaningful with 3+ readings.
 */
export function Sparkline({ readings }: SparklineProps) {
  if (readings.length < 3) return null;

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const systolics = sorted.map((r) => r.average.systolic);
  const diastolics = sorted.map((r) => r.average.diastolic);

  const allValues = [...systolics, ...diastolics];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const toPoints = (values: number[]): string => {
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 92 + 4;
        const y = 36 - ((v - min) / range) * 32;
        return `${x},${y}`;
      })
      .join(' ');
  };

  return (
    <svg
      className="w-20 h-8 flex-shrink-0"
      viewBox="0 0 100 40"
      fill="none"
      aria-label={`Sparkline: systolic ${systolics[0]}–${systolics[systolics.length - 1]}`}
      role="img"
    >
      {/* Diastolic line (lighter) */}
      <polyline
        points={toPoints(diastolics)}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-300"
        fill="none"
      />
      {/* Systolic line (primary) */}
      <polyline
        points={toPoints(systolics)}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-600"
        fill="none"
      />
    </svg>
  );
}
