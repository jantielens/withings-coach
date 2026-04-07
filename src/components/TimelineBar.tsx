'use client';

import { useState, useMemo } from 'react';
import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import { categoryConfig } from '@/lib/ui/category-config';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

const MINUTES_IN_DAY = 24 * 60;

function minutesOfDay(isoTimestamp: string): number {
  const d = new Date(isoTimestamp);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface MidpointSegment {
  group: BloodPressureGroup;
  leftPct: number;
  widthPct: number;
}

interface TickMark {
  group: BloodPressureGroup;
  positionPct: number;
}

/**
 * Midpoint-split (Voronoi) algorithm: each reading owns the time from
 * the midpoint with its previous neighbor to the midpoint with its next
 * neighbor. First reading extends back to midnight, last extends to end
 * of day. The entire bar is fully colored — no gray gaps.
 */
function buildMidpointSegments(
  readings: BloodPressureGroup[]
): { segments: MidpointSegment[]; ticks: TickMark[] } {
  if (readings.length === 0) return { segments: [], ticks: [] };

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const minutePositions = sorted.map((g) => minutesOfDay(g.timestamp));

  // Calculate midpoints between consecutive readings
  const midpoints: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    midpoints.push((minutePositions[i] + minutePositions[i + 1]) / 2);
  }

  const segments: MidpointSegment[] = [];
  const ticks: TickMark[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const startMin = i === 0 ? 0 : midpoints[i - 1];
    const endMin = i === sorted.length - 1 ? MINUTES_IN_DAY : midpoints[i];
    const leftPct = (startMin / MINUTES_IN_DAY) * 100;
    const widthPct = ((endMin - startMin) / MINUTES_IN_DAY) * 100;

    segments.push({ group: sorted[i], leftPct, widthPct });
    ticks.push({
      group: sorted[i],
      positionPct: (minutePositions[i] / MINUTES_IN_DAY) * 100,
    });
  }

  return { segments, ticks };
}

interface TimelineBarProps {
  readings: BloodPressureGroup[];
}

/**
 * 24-hour timeline bar using midpoint-split coloring. The entire bar is
 * filled — each reading owns the region from its previous midpoint to
 * its next midpoint. Thin white tick marks show exact measurement times.
 */
export function TimelineBar({ readings }: TimelineBarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { segments, ticks } = useMemo(
    () => buildMidpointSegments(readings),
    [readings]
  );

  if (readings.length === 0) return null;

  return (
    <div
      className="relative h-2 rounded-full overflow-visible"
      role="img"
      aria-label={`24-hour timeline: ${segments.length} reading${segments.length !== 1 ? ' groups' : ''}`}
    >
      {/* Colored segments — fully cover the bar */}
      {segments.map((seg, i) => {
        const config = categoryConfig[seg.group.average.category];
        const isHovered = hoveredId === seg.group.id;
        const readingCount = seg.group.readings.length;

        // Round corners only on first/last segment ends
        const isFirst = i === 0;
        const isLast = i === segments.length - 1;
        const roundedClass = isFirst && isLast
          ? 'rounded-full'
          : isFirst
            ? 'rounded-l-full'
            : isLast
              ? 'rounded-r-full'
              : '';

        return (
          <div
            key={seg.group.id}
            className={`absolute top-0 h-full cursor-pointer ${config.barColor} ${roundedClass}`}
            style={{
              left: `${seg.leftPct}%`,
              width: `${seg.widthPct}%`,
            }}
            onMouseEnter={() => setHoveredId(seg.group.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Tooltip */}
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  <div className="font-semibold">{formatTime(seg.group.timestamp)}</div>
                  {seg.group.isGrouped ? (
                    <div className="tabular-nums">
                      Avg of {readingCount}: {seg.group.average.systolic}/{seg.group.average.diastolic} mmHg
                    </div>
                  ) : (
                    <div className="tabular-nums">
                      {seg.group.average.systolic}/{seg.group.average.diastolic} mmHg
                    </div>
                  )}
                  <div className="tabular-nums text-gray-300">
                    {seg.group.average.pulse} bpm
                  </div>
                  <div className="mt-0.5">{config.label}</div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        );
      })}

      {/* Tick marks at exact reading positions */}
      {ticks.map((tick) => (
        <div
          key={`tick-${tick.group.id}`}
          className="absolute top-0 h-full w-[2px] bg-white pointer-events-none"
          style={{ left: `${tick.positionPct}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
