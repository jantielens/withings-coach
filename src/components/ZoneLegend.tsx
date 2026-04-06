'use client';

import { categoryConfig, zoneLegendCategories } from '@/lib/ui/category-config';

/**
 * Compact legend showing ESC zone names with their colors.
 * Placed at the top of the timeline.
 */
export function ZoneLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500" role="list" aria-label="ESC blood pressure zones">
      <span className="font-medium text-gray-600 mr-1">Zones:</span>
      {zoneLegendCategories.map((cat) => {
        const config = categoryConfig[cat];
        return (
          <div key={cat} className="flex items-center gap-1" role="listitem">
            <span className={`inline-block w-2 h-2 rounded-full ${config.dotColor}`} />
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
