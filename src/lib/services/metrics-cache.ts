import { HealthMetric, MetricType } from '@/lib/types/metrics';

interface CacheEntry<T> {
  data: HealthMetric<T>[];
  fromDay: string; // YYYY-MM-DD
  toDay: string;   // YYYY-MM-DD
  createdAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function toDay(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * In-memory cache for Withings API responses.
 *
 * Keyed by userId + metricType (not date range). When a request's date range
 * fits inside the cached range, the cached data is filtered and returned —
 * so the dashboard's 30-day fetch also serves 7-day chat queries.
 *
 * If the requested range is broader than the cache, it's a miss and a fresh
 * fetch replaces the entry. TTL is 5 minutes (Withings limit: 1 req / 10 min / user).
 */
class MetricsCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private buildKey(userId: string, type: MetricType): string {
    return `${userId}:${type}`;
  }

  get<T>(userId: string, type: MetricType, fromISO: string, toISO: string): HealthMetric<T>[] | null {
    const key = this.buildKey(userId, type);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // TTL check
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    const reqFrom = toDay(fromISO);
    const reqTo = toDay(toISO);

    // Cache hit only if the cached range covers the requested range
    if (reqFrom < entry.fromDay || reqTo > entry.toDay) {
      return null;
    }

    // Filter to the requested range
    const data = entry.data as HealthMetric<T>[];
    return data.filter((m) => {
      const day = toDay(m.timestamp);
      return day >= reqFrom && day <= reqTo;
    });
  }

  set<T>(userId: string, type: MetricType, fromISO: string, toISO: string, data: HealthMetric<T>[]): void {
    const key = this.buildKey(userId, type);
    const existing = this.cache.get(key);
    const newFrom = toDay(fromISO);
    const newTo = toDay(toISO);

    // If there's a valid existing entry, merge to keep the broadest range
    if (existing && Date.now() - existing.createdAt <= this.ttlMs) {
      const mergedFrom = newFrom < existing.fromDay ? newFrom : existing.fromDay;
      const mergedTo = newTo > existing.toDay ? newTo : existing.toDay;

      // Merge readings, deduplicate by id
      const seen = new Set<string>();
      const merged: HealthMetric<unknown>[] = [];
      for (const m of [...data, ...existing.data] as HealthMetric<unknown>[]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          merged.push(m);
        }
      }

      this.cache.set(key, { data: merged, fromDay: mergedFrom, toDay: mergedTo, createdAt: Date.now() });
    } else {
      this.cache.set(key, { data, fromDay: newFrom, toDay: newTo, createdAt: Date.now() });
    }
  }

  /** Remove all entries for a given user (e.g., on refresh or logout). */
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
