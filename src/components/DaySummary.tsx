'use client';

import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import type { DiaryEntry } from '@/lib/types/diary';
import { categoryConfig, worstCategory, hasHighRiskCategory } from '@/lib/ui/category-config';
import { TimelineBar } from './TimelineBar';
import { RangeBar } from './RangeBar';
import { TimelineEntry } from './TimelineEntry';
import { DiaryNote } from './DiaryNote';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

function formatDayShort(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDayLong(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface DaySummaryProps {
  dayReadings: BloodPressureGroup[];
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  diaryEntry?: DiaryEntry;
  onSaveDiary?: (date: string, text: string) => void;
  onDeleteDiary?: (date: string) => void;
}

/**
 * Tier 1 day row — condensed single-line (default) or expanded full card.
 *
 * Condensed: ● Mon, Apr 6  [█|█|█░|░]  Normal  ⚠  ▼
 * Tick marks in the bar indicate individual readings. Warning icon on the right for high-risk days.
 * Expanded: Range bar + individual tier-2 readings (no duplicate summary).
 */
export function DaySummary({ dayReadings, isFirst, isLast, expanded, onToggle, diaryEntry, onSaveDiary, onDeleteDiary }: DaySummaryProps) {
  const allCategories = dayReadings.map((r) => r.average.category);
  const worst = worstCategory(allCategories);
  const worstConfig = categoryConfig[worst];
  const isHighRisk = hasHighRiskCategory(allCategories);

  const systolics = dayReadings.map((r) => r.average.systolic);
  const diastolics = dayReadings.map((r) => r.average.diastolic);
  const sysMin = Math.min(...systolics);
  const sysMax = Math.max(...systolics);
  const diaMin = Math.min(...diastolics);
  const diaMax = Math.max(...diastolics);

  const groupCount = dayReadings.length;
  const dayLabel = formatDayShort(dayReadings[0].timestamp);
  const dayLabelLong = formatDayLong(dayReadings[0].timestamp);
  const dateKey = dayReadings[0].timestamp.slice(0, 10); // YYYY-MM-DD for diary lookup

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
        {/* Warning / note icon column — reserves space so dots stay aligned */}
        <div className="flex-shrink-0 w-7 self-stretch flex items-center justify-center gap-px">
          {isHighRisk && (
            <span title="High risk" className="text-sm leading-none">⚠️</span>
          )}
          {diaryEntry && (
            <span title="Diary note" className="text-xs leading-none text-gray-400">📝</span>
          )}
        </div>

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
            aria-label={`${dayLabelLong}: ${worstConfig.label}, ${groupCount} reading${groupCount !== 1 ? 's' : ''}`}
          />
          {isLast && !expanded ? (
            <div className="flex-1" />
          ) : (
            <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
          )}
        </div>

        {/* Content area: condensed header + range bar (no card frame — parent timeline card wraps everything) */}
        <div className="flex-1 min-w-0 py-0.5">
          {/* Condensed row header — CSS Grid for aligned dual-bar layout */}
          <div
            className="grid items-center gap-x-10 py-2 px-3 cursor-pointer group grid-cols-[100px_minmax(60px,1fr)_auto] md:grid-cols-[100px_minmax(60px,1fr)_minmax(60px,1fr)_auto]"
            onClick={handleToggle}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-label={`${dayLabel}: ${worstConfig.label}, ${groupCount} reading${groupCount !== 1 ? 's' : ''}${isHighRisk ? ', high risk' : ''}${expanded ? ', expanded' : ''}`}
            onKeyDown={handleKeyDown}
          >
            {/* Day label with optional warning icon */}
            <span className="text-sm font-semibold text-gray-800 truncate">
              {dayLabel}
            </span>

            {/* 24h timeline bar (tick marks show individual readings) */}
            <div className="min-w-0">
              <TimelineBar readings={dayReadings} />
            </div>

            {/* RangeBar (SYS/DIA spread) — hidden on mobile, visible md+ */}
            <div className="hidden md:block min-w-0">
              <RangeBar compact sysMin={sysMin} sysMax={sysMax} diaMin={diaMin} diaMax={diaMax} />
            </div>

            {/* Expand/collapse chevron */}
            <span className="text-gray-400 text-sm" aria-hidden="true">
              {expanded ? '▲' : '▼'}
            </span>
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
          const isLastTier2 = isLast && i === dayReadings.length - 1 && !onSaveDiary;
          const readingConfig = categoryConfig[reading.average.category];
          return (
            <div key={reading.id} className="flex items-center">
              {/* Spacer matching warning column + gap from tier-1 (w-7 + gap-3 = 40px) */}
              <div className="flex-shrink-0 w-10" aria-hidden="true" />
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

        {/* Diary note — at the bottom of expanded section */}
        {onSaveDiary && onDeleteDiary && (
          <div className="flex items-start">
            {/* Spacer matching warning column + gap */}
            <div className="flex-shrink-0 w-10" aria-hidden="true" />
            {/* Dot column — continue/end the timeline line */}
            <div className="flex-shrink-0 w-6 self-stretch flex flex-col items-center">
              {isLast ? (
                <div className="flex-1" />
              ) : (
                <div className="flex-1 w-0.5 bg-gray-300" aria-hidden="true" />
              )}
            </div>
            {/* Spacer matching horizontal stub */}
            <div className="flex-shrink-0 w-3" aria-hidden="true" />
            {/* Diary content */}
            <div className="flex-1 min-w-0 border-t border-gray-100 pt-2 pb-3 px-1">
              <DiaryNote
                date={dateKey}
                entry={diaryEntry}
                onSave={onSaveDiary}
                onDelete={onDeleteDiary}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
