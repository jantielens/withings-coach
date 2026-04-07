'use client';

import { useState, useMemo } from 'react';
import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import { categoryConfig } from '@/lib/ui/category-config';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

const MINUTES_IN_DAY = 24 * 60;
const MIN_WIDTH_PCT = 3; // Minimum segment width (~43 min visual)

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

interface TimelineSegment {
  group: BloodPressureGroup;
  leftPct: number;
  widthPct: number;
}

function buildSegments(readings: BloodPressureGroup[]): TimelineSegment[] {
  if (readings.length === 0) return [];

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const segments: TimelineSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const group = sorted[i];
    const startMinutes = minutesOfDay(group.timestamp);
    const leftPct = (startMinutes / MINUTES_IN_DAY) * 100;

    // Width: span of readings within a group, or minimum for single readings
    let widthPct = MIN_WIDTH_PCT;
    if (group.isGrouped && group.readings.length > 1) {
      const times = group.readings.map((r) => minutesOfDay(r.timestamp));
      const spanPct = ((Math.max(...times) - Math.min(...times)) / MINUTES_IN_DAY) * 100;
      widthPct = Math.max(MIN_WIDTH_PCT, spanPct);
    }

    // Don't overlap the next segment — leave a 0.3% gap for the tick mark
    if (i < sorted.length - 1) {
      const nextLeft = (minutesOfDay(sorted[i + 1].timestamp) / MINUTES_IN_DAY) * 100;
      const maxAllowed = nextLeft - leftPct - 0.3;
      if (maxAllowed > 0 && widthPct > maxAllowed) {
        widthPct = Math.max(maxAllowed, 1);
      }
    }

    // Don't exceed day bounds
    widthPct = Math.min(widthPct, 100 - leftPct);

    segments.push({ group, leftPct, widthPct });
  }

  return segments;
}

interface TimelineBarProps {
  readings: BloodPressureGroup[];
}

/**
 * 24-hour timeline bar — each reading group is positioned by its
 * timestamp. Gray background = no data, colored segments = readings.
 * Hover a segment to see BP values, time, and category.
 */
export function TimelineBar({ readings }: TimelineBarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const segments = useMemo(() => buildSegments(readings), [readings]);

  if (readings.length === 0) return null;

  return (
    <div
      className="relative h-2 rounded-full bg-gray-200 overflow-visible"
      role="img"
      aria-label={`24-hour timeline: ${segments.length} reading${segments.length !== 1 ? ' groups' : ''}`}
    >
      {segments.map((seg) => {
        const config = categoryConfig[seg.group.average.category];
        const isHovered = hoveredId === seg.group.id;
        const readingCount = seg.group.readings.length;

        return (
          <div
            key={seg.group.id}
            className={`absolute top-0 h-full rounded-sm cursor-pointer ${config.barColor}`}
            style={{
              left: `${seg.leftPct}%`,
              width: `${seg.widthPct}%`,
            }}
            onMouseEnter={() => setHoveredId(seg.group.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Tick marks between individual readings within a grouped segment */}
            {readingCount > 1 && (
              <div className="absolute inset-0 flex">
                {Array.from({ length: readingCount }).map((_, i) => (
                  <div key={i} className="flex-1">
                    {i < readingCount - 1 && (
                      <div className="absolute h-full w-[2px] bg-white" style={{ left: `${((i + 1) / readingCount) * 100}%` }} aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tooltip — rendered conditionally via React state for reliability */}
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
    </div>
  );
}
