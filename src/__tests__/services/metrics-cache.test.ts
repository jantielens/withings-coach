import { MetricsCache } from '@/lib/services/metrics-cache';
import { MetricType, BPCategory, HealthMetric, BloodPressureData } from '@/lib/types/metrics';

function makeBPMetric(id: string): HealthMetric<BloodPressureData> {
  return {
    id,
    type: MetricType.BLOOD_PRESSURE,
    timestamp: '2025-07-15T08:00:00Z',
    source: 'withings',
    data: { systolic: 120, diastolic: 80, pulse: 72, category: BPCategory.NORMAL },
  };
}

describe('MetricsCache', () => {
  let cache: MetricsCache;

  beforeEach(() => {
    cache = new MetricsCache(5000); // 5-second TTL for tests
  });

  it('returns null on cache miss', () => {
    const result = cache.get('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');
    expect(result).toBeNull();
  });

  it('returns cached data on cache hit', () => {
    const metrics = [makeBPMetric('1'), makeBPMetric('2')];
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', metrics);

    const result = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');
    expect(result).toHaveLength(2);
    expect(result![0].id).toBe('1');
  });

  it('returns null after TTL expires', () => {
    jest.useFakeTimers();
    const timedCache = new MetricsCache(1000); // 1-second TTL
    timedCache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1')]);

    // Still cached before TTL
    expect(timedCache.get('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15')).not.toBeNull();

    // Advance past TTL
    jest.advanceTimersByTime(1001);

    const result = timedCache.get('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');
    expect(result).toBeNull();
    jest.useRealTimers();
  });

  it('uses different keys for different users', () => {
    const metricsA = [makeBPMetric('a')];
    const metricsB = [makeBPMetric('b')];

    cache.set('userA', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', metricsA);
    cache.set('userB', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', metricsB);

    const resultA = cache.get<BloodPressureData>('userA', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');
    const resultB = cache.get<BloodPressureData>('userB', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');

    expect(resultA![0].id).toBe('a');
    expect(resultB![0].id).toBe('b');
  });

  it('uses different keys for different date ranges', () => {
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('range1')]);
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-06-01', '2025-07-15', [makeBPMetric('range2')]);

    const r1 = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');
    const r2 = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-06-01', '2025-07-15');

    expect(r1![0].id).toBe('range1');
    expect(r2![0].id).toBe('range2');
  });

  it('invalidateUser removes all entries for that user', () => {
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1')]);
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-06-01', '2025-07-15', [makeBPMetric('2')]);
    cache.set('user2', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('3')]);

    cache.invalidateUser('user1');

    expect(cache.get('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15')).toBeNull();
    expect(cache.get('user1', MetricType.BLOOD_PRESSURE, '2025-06-01', '2025-07-15')).toBeNull();
    expect(cache.get<BloodPressureData>('user2', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15')).toHaveLength(1);
  });

  it('clear removes all entries', () => {
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1')]);
    cache.set('user2', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('2')]);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('tracks size correctly', () => {
    expect(cache.size).toBe(0);
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1')]);
    expect(cache.size).toBe(1);
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-06-01', '2025-07-15', [makeBPMetric('2')]);
    expect(cache.size).toBe(2);
  });

  it('normalizes timestamps to date-only for cache key (same day = cache hit)', () => {
    const metrics = [makeBPMetric('1')];
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01T08:00:00.000Z', '2025-07-15T08:00:00.000Z', metrics);

    // Different time-of-day, same date → should hit
    const result = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-07-01T14:30:12.456Z', '2025-07-15T14:30:12.456Z');
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe('1');
  });
});
