'use client';

import { Fragment, useState, useMemo } from 'react';
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
    <div className="flex items-center gap-3 animate-pulse">
      <div className="flex-shrink-0 w-6 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-gray-200" />
      </div>
      <div className="flex-1 flex items-center gap-3 py-2 px-3">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-2 w-24 bg-gray-100 rounded-full" />
        <div className="h-4 w-14 bg-gray-200 rounded-full" />
        <div className="h-3 w-10 bg-gray-100 rounded" />
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
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-100" />
          <div className="space-y-2 relative">
            <SkeletonDot />
            <SkeletonDot />
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

  return <TimelineContent readings={readings} />;
}

/** Inner component so hooks are only called when we have data */
function TimelineContent({ readings }: { readings: BloodPressureGroup[] }) {
  // Sort newest first
  const sorted = useMemo(
    () =>
      [...readings].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [readings]
  );
  const grouped = useMemo(() => groupByDay(sorted), [sorted]);
  const dayEntries = useMemo(() => Array.from(grouped.entries()), [grouped]);

  // All days start collapsed — warning icons on high-risk days provide safety signal
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set());

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-end mb-4 flex-wrap gap-2">
        <ZoneLegend />
      </div>

      {/* Sticky scale header — aligns with day row grid columns */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 -mx-6 px-6 py-1">
        <div className="relative ml-3">
          <div className="relative flex gap-3">
            {/* Spacer matching warning icon column */}
            <div className="flex-shrink-0 w-5" aria-hidden="true" />
            {/* Spacer matching dot column width */}
            <div className="flex-shrink-0 w-6" aria-hidden="true" />
            {/* Grid matching day row columns */}
            <div className="flex-1 min-w-0">
              <div className="grid items-center gap-x-10 px-3 grid-cols-[100px_minmax(60px,1fr)_auto] md:grid-cols-[100px_minmax(60px,1fr)_minmax(60px,1fr)_auto]">
                {/* Date column spacer */}
                <div />
                {/* Timeline bar scale: 0h — 12h — 24h */}
                <div className="relative h-3 min-w-0">
                  <span className="absolute left-0 text-[10px] text-gray-400 leading-none">0h</span>
                  <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-400 leading-none">12h</span>
                  <span className="absolute right-0 text-[10px] text-gray-400 leading-none text-right">24h</span>
                </div>
                {/* Range bar scale: 60 — 120 — 140 — 200 (hidden on mobile) */}
                <div className="hidden md:block relative h-3 min-w-0">
                  {/* Ideal BP reference lines — aligned with RangeBar markers */}
                  <div className="absolute top-0 h-full w-px bg-gray-400/40" style={{ left: '42.86%' }} aria-hidden="true" />
                  <div className="absolute top-0 h-full w-px bg-gray-400/40" style={{ left: '14.29%' }} aria-hidden="true" />
                  <span className="absolute text-[10px] text-gray-400 leading-none whitespace-nowrap" style={{ left: '14.29%', transform: 'translateX(-50%)' }}>80 mmHg</span>
                  <span className="absolute text-[10px] text-gray-400 leading-none" style={{ left: '42.86%', transform: 'translateX(-50%)' }}>120</span>
                  <span className="absolute text-[10px] text-gray-400 leading-none" style={{ left: '57.14%', transform: 'translateX(-50%)' }}>140</span>
                  <span className="absolute right-0 text-[10px] text-gray-400 leading-none text-right">200</span>
                </div>
                {/* Chevron column spacer — invisible char so auto column matches day rows */}
                <span className="text-gray-400 text-sm invisible" aria-hidden="true">▼</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected dot timeline */}
      <div className="relative ml-3">
        <div className="relative">
          {dayEntries.map(([dayKey, dayReadings], idx) => (
            <Fragment key={dayKey}>
              <DaySummary
                dayReadings={dayReadings}
                isFirst={idx === 0}
                isLast={idx === dayEntries.length - 1}
                expanded={expandedDays.has(dayKey)}
                onToggle={() => toggleDay(dayKey)}
              />
              {idx < dayEntries.length - 1 && (
                <div className="ml-[43px] w-0.5 h-4 bg-gray-300" aria-hidden="true" />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
