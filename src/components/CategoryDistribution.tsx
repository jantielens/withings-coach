'use client';

import type { BPCategory } from '@/lib/types/metrics';
import { categoryConfig } from '@/lib/ui/category-config';

interface CategoryDistributionProps {
  categories: BPCategory[];
}

/**
 * Stacked horizontal mini-bar showing what percentage of readings
 * fell into each ESC category.
 */
export function CategoryDistribution({ categories }: CategoryDistributionProps) {
  if (categories.length === 0) return null;

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
      pct: (count / categories.length) * 100,
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
          className={`${seg.config.barColor} transition-all duration-200`}
          style={{ width: `${seg.pct}%` }}
          title={`${seg.config.label}: ${Math.round(seg.pct)}%`}
        />
      ))}
    </div>
  );
}
