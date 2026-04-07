'use client';

import type { MetricSummary } from '@/lib/types/metrics';

interface SummaryCardProps {
  summary: MetricSummary | null;
  averagedGroupCount?: number;
  dayCount: number;
}

export function SummaryCard({ summary, averagedGroupCount = 0, dayCount }: SummaryCardProps) {
  if (!summary || summary.count === 0) {
    return null;
  }

  const systolic = summary.stats['systolic'];
  const diastolic = summary.stats['diastolic'];

  if (!systolic || !diastolic) {
    return null;
  }

  const groupCount = summary.groupCount ?? summary.count;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
        {dayCount}-Day Summary
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Average */}
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Average
          </p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {Math.round(systolic.avg)}/{Math.round(diastolic.avg)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Median {Math.round(systolic.median)}/{Math.round(diastolic.median)}
          </p>
        </div>

        {/* Range */}
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Range
          </p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {systolic.min}–{systolic.max}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            / {diastolic.min}–{diastolic.max} mmHg
          </p>
        </div>

        {/* Count */}
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Readings
          </p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {groupCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {averagedGroupCount > 0
              ? `${averagedGroupCount} averaged · over ${dayCount} days`
              : `over ${dayCount} days`}
          </p>
        </div>
      </div>
    </div>
  );
}
