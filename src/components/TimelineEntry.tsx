'use client';

import { useState } from 'react';
import type { ReadingGroup, BloodPressureData, HealthMetric } from '@/lib/types/metrics';
import { categoryConfig } from '@/lib/ui/category-config';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeOffset(firstTimestamp: string, currentTimestamp: string): string {
  const diffMs = new Date(currentTimestamp).getTime() - new Date(firstTimestamp).getTime();
  const diffSec = Math.round(diffMs / 1000);
  return `+${diffSec}s`;
}

function SubReading({ reading, firstTimestamp }: {
  reading: HealthMetric<BloodPressureData>;
  firstTimestamp: string;
}) {
  const { systolic, diastolic, pulse } = reading.data;
  return (
    <div className="flex items-center gap-3 py-1 pl-4 text-sm text-gray-500">
      <span className="w-12 text-xs text-gray-400 tabular-nums">
        {formatTimeOffset(firstTimestamp, reading.timestamp)}
      </span>
      <span className="tabular-nums">{systolic}/{diastolic}</span>
      <span className="text-xs text-gray-400">mmHg</span>
      <span className="text-xs text-gray-400 tabular-nums">{pulse} bpm</span>
    </div>
  );
}

interface TimelineEntryProps {
  reading: BloodPressureGroup;
}

export function TimelineEntry({ reading }: TimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const { systolic, diastolic, pulse, category } = reading.average;
  const config = categoryConfig[category];
  const readingCount = reading.readings.length;
  const sortedReadings = [...reading.readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const firstTimestamp = sortedReadings.length > 0 ? sortedReadings[0].timestamp : reading.timestamp;

  return (
    <div>
      <div
        className={`flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50/50 transition-colors ${
          reading.isGrouped ? 'cursor-pointer' : ''
        }`}
        onClick={reading.isGrouped ? () => setExpanded(!expanded) : undefined}
        role={reading.isGrouped ? 'button' : undefined}
        tabIndex={reading.isGrouped ? 0 : undefined}
        aria-expanded={reading.isGrouped ? expanded : undefined}
        aria-label={`${formatTime(reading.timestamp)}: ${systolic}/${diastolic} mmHg, ${config.label}`}
        onKeyDown={reading.isGrouped ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        } : undefined}
      >
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span className="text-xs text-gray-400 w-16 tabular-nums flex-shrink-0">
            {formatTime(reading.timestamp)}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {systolic}/{diastolic}
            </span>
            <span className="text-xs text-gray-400">mmHg</span>
            {reading.isGrouped && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                title={`Average of ${readingCount} readings — click to ${expanded ? 'collapse' : 'expand'}`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                ×{readingCount}
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500 tabular-nums">
            {pulse} bpm
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${config.classes}`}
        >
          {config.label}
        </span>
      </div>

      {reading.isGrouped && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="ml-2 border-l-2 border-gray-100 mb-2">
            {sortedReadings.map((r) => (
              <SubReading
                key={r.id}
                reading={r}
                firstTimestamp={firstTimestamp}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
