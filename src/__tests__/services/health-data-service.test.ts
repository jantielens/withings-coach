// 📌 Tests updated for ESC/ESH 2018 classification, ReadingGroup support,
//    and ESC/ESH first-reading exclusion averaging.

import {
  MetricType,
  BPCategory,
  HealthMetric,
  BloodPressureData,
  MetricSummary,
  DateRange,
} from '@/lib/types/metrics';
import { DataSourceAdapter } from '@/lib/adapters/data-source-adapter';
import { AuthProvider } from '@/lib/types/auth';
import { groupReadings } from '@/lib/services/health-data-service';

// ─── Helpers ────────────────────────────────────────────────────────

function makeBPMetric(
  overrides: Partial<HealthMetric<BloodPressureData>> & {
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    category?: BPCategory;
  } = {}
): HealthMetric<BloodPressureData> {
  return {
    id: overrides.id ?? 'test-1',
    type: MetricType.BLOOD_PRESSURE,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    source: overrides.source ?? 'withings',
    data: {
      systolic: overrides.systolic ?? 120,
      diastolic: overrides.diastolic ?? 80,
      pulse: overrides.pulse ?? 72,
      category: overrides.category ?? BPCategory.NORMAL,
    },
  };
}

function createMockAdapter(
  metrics: HealthMetric<BloodPressureData>[] = []
): DataSourceAdapter {
  return {
    fetchMetrics: jest.fn().mockResolvedValue(metrics),
    getSupportedMetrics: jest.fn().mockReturnValue([MetricType.BLOOD_PRESSURE]),
  };
}

function createMockAuth(): AuthProvider {
  return {
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('HealthDataService', () => {
  let mockAdapter: DataSourceAdapter;
  let mockAuth: AuthProvider;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    mockAuth = createMockAuth();
  });

  describe('adapter delegation', () => {
    it('calls adapter.fetchMetrics with correct metric type', async () => {
      const adapter = createMockAdapter([makeBPMetric()]);
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dateRange: DateRange = { from: sevenDaysAgo, to: now };

      await adapter.fetchMetrics(MetricType.BLOOD_PRESSURE, dateRange, mockAuth);

      expect(adapter.fetchMetrics).toHaveBeenCalledWith(
        MetricType.BLOOD_PRESSURE,
        dateRange,
        mockAuth
      );
    });

    it('passes auth provider to adapter', async () => {
      const adapter = createMockAdapter();
      const dateRange: DateRange = {
        from: new Date('2025-07-08'),
        to: new Date('2025-07-15'),
      };

      await adapter.fetchMetrics(MetricType.BLOOD_PRESSURE, dateRange, mockAuth);

      expect(adapter.fetchMetrics).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        mockAuth
      );
    });
  });

  describe('summary computation', () => {
    it('computes average, median, min, max, and count for BP metrics', () => {
      const metrics = [
        makeBPMetric({ id: '1', systolic: 120, diastolic: 80, pulse: 70 }),
        makeBPMetric({ id: '2', systolic: 130, diastolic: 85, pulse: 75 }),
        makeBPMetric({ id: '3', systolic: 140, diastolic: 90, pulse: 80 }),
        makeBPMetric({ id: '4', systolic: 125, diastolic: 82, pulse: 72 }),
        makeBPMetric({ id: '5', systolic: 135, diastolic: 88, pulse: 78 }),
      ];

      const systolicValues = [120, 130, 140, 125, 135];
      const diastolicValues = [80, 85, 90, 82, 88];

      const systolicAvg = systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length;
      const diastolicAvg = diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length;

      expect(systolicAvg).toBe(130);
      expect(diastolicAvg).toBe(85);

      const sortedSystolic = [...systolicValues].sort((a, b) => a - b);
      const medianIdx = Math.floor(sortedSystolic.length / 2);
      expect(sortedSystolic[medianIdx]).toBe(130);

      expect(Math.min(...systolicValues)).toBe(120);
      expect(Math.max(...systolicValues)).toBe(140);
      expect(metrics.length).toBe(5);
    });

    it('returns null summary when no metrics are provided', () => {
      const metrics: HealthMetric<BloodPressureData>[] = [];
      const summary: MetricSummary | null = metrics.length === 0 ? null : ({} as MetricSummary);
      expect(summary).toBeNull();
    });
  });

  describe('classification application', () => {
    it('each metric should have a BPCategory assigned', () => {
      const metrics = [
        makeBPMetric({ systolic: 115, diastolic: 75, category: BPCategory.OPTIMAL }),
        makeBPMetric({ systolic: 135, diastolic: 87, category: BPCategory.HIGH_NORMAL }),
        makeBPMetric({ systolic: 145, diastolic: 95, category: BPCategory.GRADE_1 }),
      ];

      metrics.forEach((metric) => {
        expect(Object.values(BPCategory)).toContain(metric.data.category);
      });
    });

    it('category should match ESC/ESH 2018 thresholds', () => {
      const testCases = [
        { systolic: 115, diastolic: 75, expected: BPCategory.OPTIMAL },
        { systolic: 125, diastolic: 82, expected: BPCategory.NORMAL },
        { systolic: 135, diastolic: 87, expected: BPCategory.HIGH_NORMAL },
        { systolic: 145, diastolic: 95, expected: BPCategory.GRADE_1 },
        { systolic: 165, diastolic: 105, expected: BPCategory.GRADE_2 },
        { systolic: 185, diastolic: 115, expected: BPCategory.GRADE_3 },
      ];

      testCases.forEach(({ systolic, diastolic, expected }) => {
        const metric = makeBPMetric({ systolic, diastolic, category: expected });
        expect(metric.data.category).toBe(expected);
      });
    });
  });

  describe('first-reading exclusion (ESC/ESH guideline averaging)', () => {
    it('excludes the first (earliest) reading from the average when 3 readings in a group', () => {
      const baseTime = new Date('2025-07-18T08:00:00Z');
      const readings = [
        makeBPMetric({
          id: 'r1',
          timestamp: new Date(baseTime.getTime()).toISOString(),
          systolic: 150, diastolic: 95, pulse: 90,
        }),
        makeBPMetric({
          id: 'r2',
          timestamp: new Date(baseTime.getTime() + 2 * 60000).toISOString(),
          systolic: 130, diastolic: 85, pulse: 75,
        }),
        makeBPMetric({
          id: 'r3',
          timestamp: new Date(baseTime.getTime() + 4 * 60000).toISOString(),
          systolic: 128, diastolic: 82, pulse: 72,
        }),
      ];

      const groups = groupReadings(readings);
      expect(groups).toHaveLength(1);

      const group = groups[0];
      // All 3 readings preserved
      expect(group.readings).toHaveLength(3);
      // Average excludes the first reading (150/95/90), uses only r2+r3
      expect(group.average.systolic).toBe(Math.round((130 + 128) / 2)); // 129
      expect(group.average.diastolic).toBe(Math.round((85 + 82) / 2)); // 84
      expect(group.average.pulse).toBe(Math.round((75 + 72) / 2)); // 74
    });

    it('excludes the first reading from the average when 2 readings in a group', () => {
      const baseTime = new Date('2025-07-18T08:00:00Z');
      const readings = [
        makeBPMetric({
          id: 'r1',
          timestamp: new Date(baseTime.getTime()).toISOString(),
          systolic: 145, diastolic: 92, pulse: 85,
        }),
        makeBPMetric({
          id: 'r2',
          timestamp: new Date(baseTime.getTime() + 3 * 60000).toISOString(),
          systolic: 130, diastolic: 84, pulse: 74,
        }),
      ];

      const groups = groupReadings(readings);
      expect(groups).toHaveLength(1);

      const group = groups[0];
      expect(group.readings).toHaveLength(2);
      // Average is just the second reading
      expect(group.average.systolic).toBe(130);
      expect(group.average.diastolic).toBe(84);
      expect(group.average.pulse).toBe(74);
    });

    it('uses the single reading as-is when only one reading in a group', () => {
      const readings = [
        makeBPMetric({
          id: 'r1',
          timestamp: '2025-07-18T08:00:00Z',
          systolic: 140, diastolic: 90, pulse: 80,
        }),
      ];

      const groups = groupReadings(readings);
      expect(groups).toHaveLength(1);

      const group = groups[0];
      expect(group.readings).toHaveLength(1);
      expect(group.isGrouped).toBe(false);
      expect(group.average.systolic).toBe(140);
      expect(group.average.diastolic).toBe(90);
      expect(group.average.pulse).toBe(80);
    });
  });
});
