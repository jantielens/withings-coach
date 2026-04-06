'use client';

import { useState } from 'react';
import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import { categoryConfig, worstCategory } from '@/lib/ui/category-config';
import { CategoryDistribution } from './CategoryDistribution';
import { RangeBar } from './RangeBar';
import { TimelineEntry } from './TimelineEntry';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

function formatDayHeader(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface DaySummaryProps {
  dayReadings: BloodPressureGroup[];
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Tier 1 day summary dot with expandable tier 2 individual reading dots.
 * Shows: category distribution mini-bar, systolic/diastolic range, reading count, range bar.
 */
export function DaySummary({ dayReadings, isFirst, isLast }: DaySummaryProps) {
  const [expanded, setExpanded] = useState(false);

  // Compute day-level stats
  const allCategories = dayReadings.map((r) => r.average.category);
  const worst = worstCategory(allCategories);
  const config = categoryConfig[worst];

  const systolics = dayReadings.map((r) => r.average.systolic);
  const diastolics = dayReadings.map((r) => r.average.diastolic);
  const sysMin = Math.min(...systolics);
  const sysMax = Math.max(...systolics);
  const diaMin = Math.min(...diastolics);
  const diaMax = Math.max(...diastolics);

  const totalReadings = dayReadings.reduce((sum, g) => sum + g.readings.length, 0);
  const averagedCount = dayReadings.filter((g) => g.isGrouped).length;

  const countLabel =
    totalReadings === 1
      ? '1 reading'
      : averagedCount > 0
        ? `${totalReadings} readings (${averagedCount} averaged)`
        : `${totalReadings} readings`;

  const rangeLabel =
    sysMin === sysMax
      ? `${sysMin}/${diaMin} mmHg`
      : `${sysMin}–${sysMax} / ${diaMin}–${diaMax} mmHg`;

  return (
    <div className="relative">
      {/* Tier 1 dot on the main vertical line */}
      <div
        className="flex gap-3 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${formatDayHeader(dayReadings[0].timestamp)}: ${config.label}, ${countLabel}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        {/* Dot column with connecting line segments */}
        <div className="flex-shrink-0 w-6 self-stretch flex flex-col items-center">
          {isFirst ? (
            <div className="flex-1" />
          ) : (
            <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
          )}
          <div
            className={`flex-shrink-0 w-4 h-4 rounded-full ${config.dotColor} ring-2 ring-white shadow-sm z-10 transition-transform duration-200 group-hover:scale-110`}
            title={config.label}
          />
          {isLast && !expanded ? (
            <div className="flex-1" />
          ) : (
            <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
          )}
        </div>

        {/* Summary card */}
        <div className={`flex-1 rounded-xl p-3 ${config.zoneBg} border border-gray-100 transition-colors duration-200 group-hover:border-gray-200 min-w-0`}>
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-800">
                {formatDayHeader(dayReadings[0].timestamp)}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.classes}`}>
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-600">
            <span className="tabular-nums font-medium">{rangeLabel}</span>
            <span className="text-gray-400">·</span>
            <span>{countLabel}</span>
          </div>

          {/* Distribution bar + Range bar */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 min-w-0">
              <CategoryDistribution categories={allCategories} />
            </div>
            <div className="flex-1 min-w-0">
              <RangeBar sysMin={sysMin} sysMax={sysMax} diaMin={diaMin} diaMax={diaMax} />
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Individual readings (expandable) */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="relative mt-1 mb-2">
          {/* Vertical line through tier-2 area */}
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-300" aria-hidden="true" />

          {dayReadings.map((reading) => (
            <div key={reading.id} className="relative flex items-center gap-2 py-1 pl-10">
              {/* Horizontal stub from main timeline line to tier-2 dot */}
              <div className="absolute left-[11px] top-1/2 -translate-y-1/2 w-[29px] h-0.5 bg-gray-200" aria-hidden="true" />
              {/* Tier 2 dot */}
              <div className="flex-shrink-0 flex items-center justify-center w-5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${categoryConfig[reading.average.category].dotColor} z-10`}
                  title={categoryConfig[reading.average.category].label}
                />
              </div>
              {/* Reading entry */}
              <div className="flex-1 min-w-0">
                <TimelineEntry reading={reading} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
