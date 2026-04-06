'use client';

import { useHealthData } from '@/hooks/useHealthData';
import { LatestReading } from '@/components/LatestReading';
import { SummaryCard } from '@/components/SummaryCard';
import { Timeline } from '@/components/Timeline';
import type { BloodPressureData } from '@/lib/types/metrics';

export default function Home() {
  const { data, summary, isLoading, error, refresh } = useHealthData<BloodPressureData>({
    metricType: 'blood_pressure',
    dateRange: { days: 30 },
  });

  const latestReading = data.length > 0
    ? [...data].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
    : null;

  const averagedGroupCount = data.filter((g) => g.isGrouped).length;

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Withings Coach</h1>
            <p className="text-sm text-gray-500">Last 30 days</p>
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Latest Reading */}
        {isLoading ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
            <div className="h-12 w-48 bg-gray-200 rounded mb-3" />
            <div className="h-5 w-20 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        ) : error ? null : (
          <LatestReading reading={latestReading} />
        )}

        {/* Summary */}
        {!isLoading && !error && (
          <SummaryCard summary={summary} averagedGroupCount={averagedGroupCount} />
        )}

        {/* Timeline */}
        <Timeline
          readings={data}
          isLoading={isLoading}
          error={error}
          onRetry={refresh}
        />

        {/* Disclaimer footer */}
        {!isLoading && data.length > 0 && (
          <footer className="text-center pb-8">
            <p className="text-xs text-gray-400 leading-relaxed max-w-lg mx-auto">
              ⚠️ Blood pressure readings are for informational purposes only. Blood
              pressure varies throughout the day and is influenced by stress, activity,
              and posture. Always consult your physician for medical advice.
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}
