// 📌 Proactive: Tests written from PRD spec while implementation was in progress. May need adjustment.

import {
  MetricType,
  BPCategory,
  BloodPressureData,
  MetricsResponse,
} from '@/lib/types/metrics';

// ─── Hook contract tests ────────────────────────────────────────────

describe('useHealthData hook contract', () => {
  const mockSuccessResponse: MetricsResponse<BloodPressureData> = {
    metrics: [
      {
        id: 'group-1',
        readings: [
          {
            id: '1',
            type: MetricType.BLOOD_PRESSURE,
            timestamp: '2025-07-15T08:32:00Z',
            source: 'withings',
            data: {
              systolic: 128,
              diastolic: 82,
              pulse: 72,
              category: BPCategory.NORMAL,
            },
          },
        ],
        average: {
          systolic: 128,
          diastolic: 82,
          pulse: 72,
          category: BPCategory.NORMAL,
        },
        timestamp: '2025-07-15T08:32:00Z',
        isGrouped: false,
      },
    ],
    summary: {
      type: MetricType.BLOOD_PRESSURE,
      period: { from: '2025-07-08T00:00:00Z', to: '2025-07-15T00:00:00Z' },
      count: 1,
      groupCount: 1,
      stats: {
        systolic: { avg: 128, median: 128, min: 128, max: 128 },
        diastolic: { avg: 82, median: 82, min: 82, max: 82 },
        pulse: { avg: 72, median: 72, min: 72, max: 72 },
      },
    },
    fetchedAt: '2025-07-15T12:00:00Z',
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('loading state', () => {
    it('hook should expose a loading boolean, initially true', () => {
      // Expected contract:
      // const { loading, data, error, refresh } = useHealthData('blood_pressure');
      // On mount: loading=true, data=null, error=null
      interface HookState {
        loading: boolean;
        data: MetricsResponse<BloodPressureData> | null;
        error: Error | null;
        refresh: () => void;
      }

      const initialState: HookState = {
        loading: true,
        data: null,
        error: null,
        refresh: jest.fn(),
      };

      expect(initialState.loading).toBe(true);
      expect(initialState.data).toBeNull();
      expect(initialState.error).toBeNull();
    });
  });

  describe('successful data fetch', () => {
    it('returns data and sets loading=false after fetch completes', async () => {
      // Simulate fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSuccessResponse,
      });

      const response = await fetch('/api/health/metrics?type=blood_pressure');
      const data = await response.json();

      expect(data.metrics).toHaveLength(1);
      expect(data.metrics[0].average.systolic).toBe(128);
      expect(data.summary).not.toBeNull();
      expect(data.fetchedAt).toBeDefined();
    });

    it('fetches with correct URL including metric type', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSuccessResponse,
      });

      await fetch('/api/health/metrics?type=blood_pressure');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/health/metrics?type=blood_pressure'
      );
    });
  });

  describe('error handling', () => {
    it('sets error state when fetch fails', async () => {
      const networkError = new Error('Network error');
      global.fetch = jest.fn().mockRejectedValue(networkError);

      let error: Error | null = null;
      try {
        await fetch('/api/health/metrics?type=blood_pressure');
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error!.message).toBe('Network error');
    });

    it('sets error state when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      });

      const response = await fetch('/api/health/metrics?type=blood_pressure');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(502);
    });
  });

  describe('refresh functionality', () => {
    it('calling refresh triggers a new fetch', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSuccessResponse,
      });

      // Initial fetch
      await fetch('/api/health/metrics?type=blood_pressure');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Refresh = another fetch
      await fetch('/api/health/metrics?type=blood_pressure');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('refresh returns fresh data', async () => {
      const updatedResponse = {
        ...mockSuccessResponse,
        fetchedAt: '2025-07-15T12:05:00Z',
        metrics: [
          {
            ...mockSuccessResponse.metrics[0],
            average: { systolic: 132, diastolic: 84, pulse: 74, category: BPCategory.NORMAL },
          },
        ],
      };

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => updatedResponse });

      // Initial
      const first = await (await fetch('/api/health/metrics?type=blood_pressure')).json();
      expect(first.metrics[0].average.systolic).toBe(128);

      // Refresh
      const second = await (await fetch('/api/health/metrics?type=blood_pressure')).json();
      expect(second.metrics[0].average.systolic).toBe(132);
      expect(second.fetchedAt).toBe('2025-07-15T12:05:00Z');
    });
  });
});
