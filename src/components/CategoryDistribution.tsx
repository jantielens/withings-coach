'use client';

import type { BPCategory } from '@/lib/types/metrics';
import { categoryConfig } from '@/lib/ui/category-config';

interface CategoryDistributionProps {
  categories: BPCategory[];
}

/**
 * Stacked horizontal mini-bar showing what percentage of readings
 * fell into each ESC category, with tick marks between individual readings.
 */
export function CategoryDistribution({ categories }: CategoryDistributionProps) {
  if (categories.length === 0) return null;

  const total = categories.length;

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
          className={`${seg.config.barColor} transition-all duration-200 flex`}
          style={{ width: `${seg.pct}%` }}
          title={`${seg.config.label}: ${seg.count}`}
        >
          {/* Tick marks between individual readings within this segment */}
          {Array.from({ length: seg.count }).map((_, i) => (
            <div
              key={i}
              className={`flex-1${i < seg.count - 1 ? ' border-r border-white/50' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
