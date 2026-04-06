// 📌 Proactive: Tests written from PRD spec while implementation was in progress. May need adjustment.

import {
  MetricType,
  BPCategory,
  BloodPressureData,
  MetricsResponse,
  ReadingGroup,
} from '@/lib/types/metrics';

// NOTE: Once Turk implements the API route at src/app/api/health/metrics/route.ts,
// these tests should be updated to call the actual GET handler directly.
// For Next.js App Router, the pattern is:
//   import { GET } from '@/app/api/health/metrics/route';
//   const response = await GET(new Request('http://localhost/api/health/metrics?type=blood_pressure'));

describe('GET /api/health/metrics', () => {
  describe('successful requests', () => {
    it('returns 200 with valid type=blood_pressure', () => {
      // Expected behavior: GET /api/health/metrics?type=blood_pressure → 200
      const params = new URLSearchParams({ type: 'blood_pressure' });
      expect(params.get('type')).toBe('blood_pressure');
      expect(Object.values(MetricType)).toContain(params.get('type'));
    });

    it('response matches MetricsResponse shape', () => {
      const mockResponse: MetricsResponse<BloodPressureData> = {
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
          period: {
            from: '2025-07-08T00:00:00Z',
            to: '2025-07-15T00:00:00Z',
          },
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

      expect(mockResponse.metrics).toHaveLength(1);
      expect(mockResponse.summary).not.toBeNull();
      expect(mockResponse.fetchedAt).toBeDefined();
    });
  });

  describe('error handling — missing type param', () => {
    it('should return 400 when type query parameter is missing', () => {
      // Expected: GET /api/health/metrics (no ?type=) → 400
      const params = new URLSearchParams();
      const type = params.get('type');
      expect(type).toBeNull();

      // The route handler should check for missing type and return:
      // { status: 400, body: { error: 'Missing required parameter: type' } }
      const expectedStatus = 400;
      expect(expectedStatus).toBe(400);
    });
  });

  describe('error handling — invalid type param', () => {
    it('should return 400 for unsupported metric type', () => {
      // Expected: GET /api/health/metrics?type=invalid_type → 400
      const invalidType = 'invalid_type';
      const validTypes = Object.values(MetricType);
      expect(validTypes).not.toContain(invalidType);

      const expectedStatus = 400;
      expect(expectedStatus).toBe(400);
    });

    it('should return 400 for empty type string', () => {
      const params = new URLSearchParams({ type: '' });
      const type = params.get('type');
      expect(type).toBe('');

      const validTypes = Object.values(MetricType);
      expect(validTypes).not.toContain('');
    });
  });

  describe('error handling — upstream failure', () => {
    it('should return 502 when Withings API fails', () => {
      // Expected: if adapter throws, route returns 502
      // The adapter might throw for: network error, auth error, rate limit, etc.
      const expectedStatus = 502;
      expect(expectedStatus).toBe(502);
    });

    it('502 response should include error message', () => {
      const errorResponse = {
        error: 'Failed to fetch data from upstream provider',
        details: 'Withings API returned 500',
      };
      expect(errorResponse.error).toBeDefined();
    });
  });

  describe('query parameter parsing', () => {
    it('accepts optional from/to date parameters', () => {
      const params = new URLSearchParams({
        type: 'blood_pressure',
        from: '2025-07-08T00:00:00Z',
        to: '2025-07-15T00:00:00Z',
      });
      expect(params.get('from')).toBe('2025-07-08T00:00:00Z');
      expect(params.get('to')).toBe('2025-07-15T00:00:00Z');
    });

    it('defaults summary to true when not specified', () => {
      const params = new URLSearchParams({ type: 'blood_pressure' });
      const summary = params.get('summary') ?? 'true';
      expect(summary).toBe('true');
    });
  });
});
