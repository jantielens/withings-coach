'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReadingGroup, MetricSummary, MetricsResponse } from '@/lib/types/metrics';

interface UseHealthDataOptions {
  metricType: string;
  dateRange: { days: number };
}

interface UseHealthDataResult<T> {
  data: ReadingGroup<T>[];
  summary: MetricSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useHealthData<T>({
  metricType,
  dateRange,
}: UseHealthDataOptions): UseHealthDataResult<T> {
  const [data, setData] = useState<ReadingGroup<T>[]>([]);
  const [summary, setSummary] = useState<MetricSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - dateRange.days);

      const params = new URLSearchParams({
        type: metricType,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      const response = await fetch(`/api/health/metrics?${params}`);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          response.status === 401
            ? 'Authentication failed. Check your access token.'
            : response.status === 502
              ? 'Could not reach Withings API. Try again later.'
              : `Failed to fetch health data (${response.status}): ${errorBody}`
        );
      }

      const result: MetricsResponse<T> = await response.json();
      setData(result.metrics);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setData([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [metricType, dateRange.days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, summary, isLoading, error, refresh: fetchData };
}
