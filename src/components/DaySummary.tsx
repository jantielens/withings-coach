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
 * Condensed: ● Mon, Apr 6  [█|█|█░|░]  Normal  ⚠  ▼
 * Tick marks in the bar indicate individual readings. Warning icon on the right for high-risk days.
 * Expanded: Range bar + individual tier-2 readings (no duplicate summary).
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
    <div>
      {/* Tier-1 row: day dot on main timeline + summary card */}
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

        {/* Content area: condensed header + range bar (no card frame — parent timeline card wraps everything) */}
        <div className={`flex-1 min-w-0 py-0.5 ${lowConfidence ? 'opacity-70' : ''}`}>
          {/* Condensed row header */}
          <div
            className="flex items-center gap-3 py-2 px-3 cursor-pointer group flex-wrap"
            onClick={handleToggle}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-label={`${dayLabel}: ${dominantConfig.label}, ${groupCount} readings${isHighRisk ? ', high risk' : ''}${expanded ? ', expanded' : ''}`}
            onKeyDown={handleKeyDown}
          >
            {/* Day label */}
            <span className="text-sm font-semibold text-gray-800 flex-shrink-0 w-[100px]">
              {dayLabel}
            </span>

            {/* Category distribution bar (tick marks show individual readings) */}
            <div className="flex-1 min-w-[60px] max-w-[140px]">
              <CategoryDistribution categories={allCategories} readings={dayReadings} />
            </div>

            {/* Dominant category text */}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${dominantConfig.classes}`}>
              {dominantConfig.label}
            </span>

            {/* Warning icon for high-risk days — far right */}
            {isHighRisk && (
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold"
                title={`Contains ${worstConfig.label} readings — review recommended`}
                aria-label="High risk day"
              >
                !
              </span>
            )}

            {/* Expand/collapse chevron */}
            <span className="text-gray-400 text-sm flex-shrink-0 ml-auto" aria-hidden="true">
              {expanded ? '▲' : '▼'}
            </span>
          </div>

          {/* Range bar (inside card, shown when expanded) */}
          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-3 pb-3">
              <RangeBar sysMin={sysMin} sysMax={sysMax} diaMin={diaMin} diaMax={diaMax} />
            </div>
          </div>
        </div>
      </div>

      {/* Tier-2: Individual readings on the SAME main timeline (outside the card) */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          expanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {dayReadings.map((reading, i) => {
          const isLastTier2 = isLast && i === dayReadings.length - 1;
          const readingConfig = categoryConfig[reading.average.category];
          return (
            <div key={reading.id} className="flex items-center">
              {/* Dot column — same w-6 as tier-1, keeps dots on the SAME vertical line */}
              <div className="flex-shrink-0 w-6 self-stretch flex flex-col items-center">
                <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
                <div
                  className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${readingConfig.dotColor} z-10`}
                  title={readingConfig.label}
                />
                {isLastTier2 ? (
                  <div className="flex-1" />
                ) : (
                  <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
                )}
              </div>
              {/* Horizontal stub connecting main line to content */}
              <div className="flex-shrink-0 w-3 h-0.5 bg-gray-300 self-center" aria-hidden="true" />
              {/* Reading content */}
              <div className="flex-1 min-w-0">
                <TimelineEntry reading={reading} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
