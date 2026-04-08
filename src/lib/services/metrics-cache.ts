import { HealthMetric, MetricType } from '@/lib/types/metrics';

interface CacheEntry<T> {
  data: HealthMetric<T>[];
  createdAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * In-memory cache for Withings API responses.
 * Keyed by userId + metricType + date range. Historic BP readings don't change,
 * so a 5-minute TTL avoids redundant API calls (Withings limit: 1 call / 10 min / user).
 */
class MetricsCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private buildKey(userId: string, type: MetricType, fromISO: string, toISO: string): string {
    return `${userId}:${type}:${fromISO}:${toISO}`;
  }

  get<T>(userId: string, type: MetricType, fromISO: string, toISO: string): HealthMetric<T>[] | null {
    const key = this.buildKey(userId, type, fromISO, toISO);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as HealthMetric<T>[];
  }

  set<T>(userId: string, type: MetricType, fromISO: string, toISO: string, data: HealthMetric<T>[]): void {
    const key = this.buildKey(userId, type, fromISO, toISO);
    this.cache.set(key, { data, createdAt: Date.now() });
  }

  /** Remove all entries for a given user (e.g., on logout). */
  invalidateUser(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance shared across API routes (server-side only)
export const metricsCache = new MetricsCache();

// Exported for testing
export { MetricsCache };
