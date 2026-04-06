'use client';

import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import { ZoneLegend } from './ZoneLegend';
import { DaySummary } from './DaySummary';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

function getDayKey(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupByDay(groups: BloodPressureGroup[]): Map<string, BloodPressureGroup[]> {
  const dayGroups = new Map<string, BloodPressureGroup[]>();
  for (const group of groups) {
    const key = getDayKey(group.timestamp);
    const dayGroup = dayGroups.get(key) ?? [];
    dayGroup.push(group);
    dayGroups.set(key, dayGroup);
  }
  return dayGroups;
}

interface TimelineProps {
  readings: BloodPressureGroup[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function SkeletonDot() {
  return (
    <div className="flex items-start gap-3 animate-pulse">
      <div className="flex-shrink-0 w-6 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-gray-200" />
      </div>
      <div className="flex-1 rounded-xl bg-gray-50 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-14 bg-gray-200 rounded-full" />
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full" />
        <div className="h-3 w-32 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function Timeline({ readings, isLoading, error, onRetry }: TimelineProps) {
  if (error) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-red-100 text-center">
        <p className="text-red-600 font-medium mb-2">Something went wrong</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="relative ml-3">
          <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-gray-100" />
          <div className="space-y-4 relative">
            <SkeletonDot />
            <SkeletonDot />
            <SkeletonDot />
          </div>
        </div>
      </div>
    );
  }

  if (readings.length === 0) {
    return null;
  }

  // Sort newest first
  const sorted = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const grouped = groupByDay(sorted);
  const dayEntries = Array.from(grouped.entries());

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Timeline
        </p>
        <ZoneLegend />
      </div>

      {/* Connected dot timeline */}
      <div className="relative ml-3">
        {/* Vertical connecting line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-300" aria-hidden="true" />

        <div className="space-y-4 relative">
          {dayEntries.map(([dayKey, dayReadings], idx) => (
            <DaySummary
              key={dayKey}
              dayReadings={dayReadings}
              isLast={idx === dayEntries.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
