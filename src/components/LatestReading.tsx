'use client';

import { useState } from 'react';
import type { ReadingGroup, BloodPressureData, HealthMetric } from '@/lib/types/metrics';
import { categoryConfig } from '@/lib/ui/category-config';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const measurementDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (measurementDay.getTime() === today.getTime()) {
    return `Today at ${timeStr}`;
  }
  if (measurementDay.getTime() === yesterday.getTime()) {
    return `Yesterday at ${timeStr}`;
  }
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr} at ${timeStr}`;
}

function formatTimeOffset(firstTimestamp: string, currentTimestamp: string): string {
  const diffMs = new Date(currentTimestamp).getTime() - new Date(firstTimestamp).getTime();
  const diffSec = Math.round(diffMs / 1000);
  return `+${diffSec}s`;
}

function IndividualReading({ reading, firstTimestamp }: {
  reading: HealthMetric<BloodPressureData>;
  firstTimestamp: string;
}) {
  const { systolic, diastolic, pulse } = reading.data;
  const offset = formatTimeOffset(firstTimestamp, reading.timestamp);

  return (
    <div className="flex items-center gap-3 py-1.5 text-sm text-gray-600">
      <span className="w-12 text-xs text-gray-400 tabular-nums">{offset}</span>
      <span className="font-medium tabular-nums">{systolic}/{diastolic}</span>
      <span className="text-xs text-gray-400">mmHg</span>
      <span className="text-xs text-gray-500 tabular-nums">{pulse} bpm</span>
    </div>
  );
}

interface LatestReadingProps {
  reading: BloodPressureGroup | null;
  dayCount: number;
}

export function LatestReading({ reading, dayCount }: LatestReadingProps) {
  const [expanded, setExpanded] = useState(false);

  if (!reading) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
        <div className="text-gray-400 text-lg">
          No readings in the last {dayCount} days
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Take a measurement with your Withings device.
        </p>
      </div>
    );
  }

  const { systolic, diastolic, pulse, category } = reading.average;
  const config = categoryConfig[category];
  const readingCount = reading.readings.length;
  const sortedReadings = [...reading.readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const firstTimestamp = sortedReadings.length > 0 ? sortedReadings[0].timestamp : reading.timestamp;

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Latest Reading
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-gray-900 tabular-nums">
              {systolic}
            </span>
            <span className="text-3xl font-light text-gray-400">/</span>
            <span className="text-5xl font-bold text-gray-900 tabular-nums">
              {diastolic}
            </span>
            <span className="text-lg text-gray-400 ml-1">mmHg</span>
          </div>
          <p className="text-xl text-gray-500 mt-2 tabular-nums">
            {pulse} <span className="text-base">bpm</span>
          </p>
          {reading.isGrouped && (
            <p className="text-sm text-gray-400 mt-1">
              Average of {readingCount} readings
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${config.classes}`}
        >
          {config.label}
        </span>
      </div>
      <p suppressHydrationWarning className="text-sm text-gray-400 mt-4">
        {formatTimestamp(reading.timestamp)}
      </p>

      {reading.isGrouped && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center gap-1"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? 'Hide' : 'Show'} individual readings
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pl-2 border-l-2 border-gray-100 space-y-0.5">
              {sortedReadings.map((r) => (
                <IndividualReading
                  key={r.id}
                  reading={r}
                  firstTimestamp={firstTimestamp}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
