'use client';

import { Fragment } from 'react';
import type { BPCategory, ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import { categoryConfig } from '@/lib/ui/category-config';

type BloodPressureGroup = ReadingGroup<BloodPressureData>;

interface CategoryDistributionProps {
  categories: BPCategory[];
  readings?: BloodPressureGroup[];
}

/**
 * Stacked horizontal mini-bar showing what percentage of readings
 * fell into each ESC category, with tick marks between individual readings.
 * When `readings` is provided, segments show hover tooltips with BP values.
 */
export function CategoryDistribution({ categories, readings }: CategoryDistributionProps) {
  if (categories.length === 0) return null;

  const total = categories.length;

  // Group readings by category for tooltip data
  const readingsByCategory = new Map<BPCategory, BloodPressureGroup[]>();
  if (readings) {
    for (const r of readings) {
      const cat = r.average.category;
      const list = readingsByCategory.get(cat) ?? [];
      list.push(r);
      readingsByCategory.set(cat, list);
    }
  }

  // Count occurrences of each category
  const counts = new Map<BPCategory, number>();
  for (const cat of categories) {
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  // Build segments ordered by severity
  const segments = Array.from(counts.entries())
    .sort((a, b) => categoryConfig[a[0]].severity - categoryConfig[b[0]].severity)
    .map(([cat, count]) => ({
      category: cat,
      count,
      pct: (count / total) * 100,
      config: categoryConfig[cat],
      readings: readingsByCategory.get(cat) ?? [],
    }));

  return (
    <div
      className="flex h-2 rounded-full overflow-hidden"
      aria-label={`Category distribution: ${segments.map((s) => `${s.config.label} ${Math.round(s.pct)}%`).join(', ')}`}
      role="img"
    >
      {segments.map((seg) => (
        <div
          key={seg.category}
          className={`${seg.config.barColor} transition-all duration-200 flex relative group/seg`}
          style={{ width: `${seg.pct}%` }}
        >
          {/* Tick marks between individual readings within this segment */}
          {Array.from({ length: seg.count }).map((_, i) => (
            <Fragment key={i}>
              <div className="flex-1" />
              {i < seg.count - 1 && (
                <div className="w-[2px] bg-white flex-shrink-0" aria-hidden="true" />
              )}
            </Fragment>
          ))}

          {/* Hover tooltip */}
          {seg.readings.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 pointer-events-none opacity-0 group-hover/seg:opacity-100 transition-opacity duration-150 z-50">
              <div className="bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                <div className="font-semibold">{seg.config.label}</div>
                <div className="text-gray-300">{seg.readings.length} reading{seg.readings.length !== 1 ? 's' : ''}</div>
                {seg.readings.map((g) => (
                  <div key={g.id} className="tabular-nums">
                    {g.isGrouped
                      ? `Avg: ${g.average.systolic}/${g.average.diastolic} (×${g.readings.length})`
                      : `${g.average.systolic}/${g.average.diastolic}`
                    }
                  </div>
                ))}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
