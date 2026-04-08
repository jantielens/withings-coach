import { MetricsCache } from '@/lib/services/metrics-cache';
import { MetricType, BPCategory, HealthMetric, BloodPressureData } from '@/lib/types/metrics';

function makeBPMetric(id: string, date: string = '2025-07-10'): HealthMetric<BloodPressureData> {
  return {
    id,
    type: MetricType.BLOOD_PRESSURE,
    timestamp: `${date}T08:00:00Z`,
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

  it('returns cached data on cache hit (exact range)', () => {
    const metrics = [makeBPMetric('1', '2025-07-05'), makeBPMetric('2', '2025-07-10')];
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', metrics);

    const result = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');
    expect(result).toHaveLength(2);
  });

  it('returns filtered data when requesting a sub-range of cached data', () => {
    const metrics = [
      makeBPMetric('1', '2025-07-02'),
      makeBPMetric('2', '2025-07-08'),
      makeBPMetric('3', '2025-07-12'),
    ];
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', metrics);

    // Request only the middle week — should filter to just the readings in that range
    const result = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-07-05', '2025-07-10');
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe('2');
  });

  it('returns null when requested range extends beyond cached range', () => {
    const metrics = [makeBPMetric('1', '2025-07-10')];
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', metrics);

    // Requesting 3 months — broader than the cached 2-week range
    const result = cache.get('user1', MetricType.BLOOD_PRESSURE, '2025-05-01', '2025-07-15');
    expect(result).toBeNull();
  });

  it('returns null after TTL expires', () => {
    jest.useFakeTimers();
    const timedCache = new MetricsCache(1000);
    timedCache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1')]);

    expect(timedCache.get('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15')).not.toBeNull();

    jest.advanceTimersByTime(1001);

    expect(timedCache.get('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15')).toBeNull();
    jest.useRealTimers();
  });

  it('uses different keys for different users', () => {
    cache.set('userA', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('a')]);
    cache.set('userB', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('b')]);

    const resultA = cache.get<BloodPressureData>('userA', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');
    const resultB = cache.get<BloodPressureData>('userB', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15');

    expect(resultA![0].id).toBe('a');
    expect(resultB![0].id).toBe('b');
  });

  it('merges data when a broader range is set over existing cache', () => {
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1', '2025-07-10')]);
    // Now fetch a broader range — should merge
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-06-01', '2025-07-15', [
      makeBPMetric('2', '2025-06-15'),
      makeBPMetric('3', '2025-07-10'),
    ]);

    // The merged cache should cover the broadest range
    const result = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-06-01', '2025-07-15');
    expect(result).not.toBeNull();
    // Should contain deduplicated readings (id '1' from first set, '2' and '3' from second)
    const ids = result!.map((m) => m.id).sort();
    expect(ids).toEqual(['1', '2', '3']);
  });

  it('invalidateUser removes all entries for that user', () => {
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1')]);
    cache.set('user2', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('2')]);

    cache.invalidateUser('user1');

    expect(cache.get('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15')).toBeNull();
    expect(cache.get<BloodPressureData>('user2', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15')).toHaveLength(1);
  });

  it('clear removes all entries', () => {
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('1')]);
    cache.set('user2', MetricType.BLOOD_PRESSURE, '2025-07-01', '2025-07-15', [makeBPMetric('2')]);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('normalizes full ISO timestamps to date-only for range matching', () => {
    const metrics = [makeBPMetric('1', '2025-07-10')];
    cache.set('user1', MetricType.BLOOD_PRESSURE, '2025-07-01T08:00:00.000Z', '2025-07-15T08:00:00.000Z', metrics);

    // Different time-of-day, same date → should hit
    const result = cache.get<BloodPressureData>('user1', MetricType.BLOOD_PRESSURE, '2025-07-01T14:30:12.456Z', '2025-07-15T23:59:59.999Z');
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe('1');
  });
});
