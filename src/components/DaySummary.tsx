'use client';

import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import { categoryConfig, worstCategory, dominantCategory, hasHighRiskCategory } from '@/lib/ui/category-config';
import { CategoryDistribution } from './CategoryDistribution';
import { RangeBar } from './RangeBar';
import { TimelineEntry } from './TimelineEntry';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

function formatDayShort(isoTimestamp: string): string {
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
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Tier 1 day row — condensed single-line (default) or expanded full card.
 *
 * Condensed: ● Mon, Apr 6  [████░░░░]  Normal (n=10) ▼
 * Expanded: Same card grows to include detail below the condensed header.
 */
export function DaySummary({ dayReadings, isFirst, isLast, expanded, onToggle }: DaySummaryProps) {
  const allCategories = dayReadings.map((r) => r.average.category);
  const worst = worstCategory(allCategories);
  const dominant = dominantCategory(allCategories);
  const worstConfig = categoryConfig[worst];
  const dominantConfig = categoryConfig[dominant];
  const isHighRisk = hasHighRiskCategory(allCategories);

  const systolics = dayReadings.map((r) => r.average.systolic);
  const diastolics = dayReadings.map((r) => r.average.diastolic);
  const sysMin = Math.min(...systolics);
  const sysMax = Math.max(...systolics);
  const diaMin = Math.min(...diastolics);
  const diaMax = Math.max(...diastolics);

  const groupCount = dayReadings.length;
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

  const lowConfidence = groupCount < 3;
  const dayLabel = formatDayShort(dayReadings[0].timestamp);

  const handleToggle = () => onToggle();
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="relative flex gap-3">
      {/* Dot column with connecting line segments */}
      <div className="flex-shrink-0 w-6 self-stretch flex flex-col items-center">
        {isFirst ? (
          <div className="flex-1" />
        ) : (
          <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
        )}
        <div
          className={`flex-shrink-0 w-4 h-4 rounded-full ${worstConfig.dotColor} ring-2 ring-white shadow-sm z-10 transition-transform duration-200 group-hover:scale-110`}
          title={worstConfig.label}
        />
        {isLast && !expanded ? (
          <div className="flex-1" />
        ) : (
          <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
        )}
      </div>

      {/* Single card: condensed header + expandable detail */}
      <div className={`flex-1 min-w-0 rounded-lg border border-gray-100 transition-colors duration-200 hover:border-gray-200 ${lowConfidence ? 'opacity-70' : ''}`}>
        {/* Condensed row header */}
        <div
          className="flex items-center gap-3 py-2 px-3 cursor-pointer group flex-wrap"
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${dayLabel}: ${dominantConfig.label}, n=${groupCount}${isHighRisk ? ', high risk' : ''}${expanded ? ', expanded' : ''}`}
          onKeyDown={handleKeyDown}
        >
          {/* Day label */}
          <span className="text-sm font-semibold text-gray-800 flex-shrink-0 w-[100px]">
            {dayLabel}
          </span>

          {/* Warning icon for high-risk days */}
          {isHighRisk && (
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold"
              title={`Contains ${worstConfig.label} readings — review recommended`}
              aria-label="High risk day"
            >
              !
            </span>
          )}

          {/* Category distribution bar */}
          <div className="flex-1 min-w-[60px] max-w-[140px]">
            <CategoryDistribution categories={allCategories} />
          </div>

          {/* Dominant category text */}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${dominantConfig.classes}`}>
            {dominantConfig.label}
          </span>

          {/* Reading count */}
          <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">
            (n={groupCount})
          </span>

          {/* Expand/collapse chevron */}
          <span className="text-gray-400 text-sm flex-shrink-0 ml-auto" aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>
        </div>

        {/* Expanded detail — same card, no gap */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            expanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-3 pt-0 pb-3">
            {/* Full summary card */}
            <div className={`rounded-lg p-3 ${worstConfig.zoneBg}`}>
              {/* Stats row */}
              <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
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

              {/* Individual readings */}
              <div className="mt-3 space-y-1 border-t border-gray-200/50 pt-2">
                {dayReadings.map((reading) => (
                  <div key={reading.id} className="relative flex items-center gap-2 py-1">
                    {/* Horizontal stub from left edge to dot */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-gray-300" aria-hidden="true" />
                    {/* Tier 2 dot */}
                    <div className="flex-shrink-0 flex items-center justify-center w-5 pl-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${categoryConfig[reading.average.category].dotColor} relative z-10`}
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
        </div>
      </div>
    </div>
  );
}
