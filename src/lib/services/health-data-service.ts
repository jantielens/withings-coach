import { DataSourceAdapter } from '@/lib/adapters/data-source-adapter';
import { AuthProvider } from '@/lib/types/auth';
import {
  DateRange,
  HealthMetric,
  MetricSummary,
  MetricType,
  MetricsResponse,
  BloodPressureData,
  ReadingGroup,
} from '@/lib/types/metrics';
import { classifyBloodPressure } from '@/lib/classification/blood-pressure';

export class HealthDataService {
  constructor(
    private adapter: DataSourceAdapter,
    private auth: AuthProvider
  ) {}

  async getMetrics<T>(
    type: MetricType,
    dateRange: DateRange,
    includeSummary: boolean = true
  ): Promise<MetricsResponse<T>> {
    const metrics = await this.adapter.fetchMetrics<T>(type, dateRange, this.auth);

    let groups: ReadingGroup<T>[];
    if (type === MetricType.BLOOD_PRESSURE) {
      groups = groupReadings(
        metrics as unknown as HealthMetric<BloodPressureData>[]
      ) as unknown as ReadingGroup<T>[];
    } else {
      groups = metrics.map((m) => ({
        id: m.id,
        readings: [m],
        average: m.data,
        timestamp: m.timestamp,
        isGrouped: false,
      }));
    }

    const summary = includeSummary
      ? this.computeSummary<T>(type, groups, dateRange)
      : null;

    return {
      metrics: groups,
      summary,
      fetchedAt: new Date().toISOString(),
    };
  }

  private computeSummary<T>(
    type: MetricType,
    groups: ReadingGroup<T>[],
    dateRange: DateRange
  ): MetricSummary | null {
    if (groups.length === 0) return null;

    if (type === MetricType.BLOOD_PRESSURE) {
      return this.computeBPSummary(
        groups as unknown as ReadingGroup<BloodPressureData>[],
        dateRange
      );
    }

    return null;
  }

  private computeBPSummary(
    groups: ReadingGroup<BloodPressureData>[],
    dateRange: DateRange
  ): MetricSummary {
    // Use averaged values from each group for summary stats
    const systolicValues = groups.map((g) => g.average.systolic);
    const diastolicValues = groups.map((g) => g.average.diastolic);
    const pulseValues = groups.map((g) => g.average.pulse).filter((p) => p > 0);

    const totalReadings = groups.reduce((sum, g) => sum + g.readings.length, 0);

    return {
      type: MetricType.BLOOD_PRESSURE,
      period: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      count: totalReadings,
      groupCount: groups.length,
      stats: {
        systolic: computeStats(systolicValues),
        diastolic: computeStats(diastolicValues),
        ...(pulseValues.length > 0 && { pulse: computeStats(pulseValues) }),
      },
    };
  }
}

/**
 * Group consecutive BP readings taken within 10 minutes of each other.
 * These represent multi-reading sessions from devices that take 3 readings in a row.
 * Classification is applied to the averaged values, not individual readings.
 */
export function groupReadings(
  metrics: HealthMetric<BloodPressureData>[]
): ReadingGroup<BloodPressureData>[] {
  if (metrics.length === 0) return [];

  const sorted = [...metrics].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const groups: ReadingGroup<BloodPressureData>[] = [];
  let currentGroup: HealthMetric<BloodPressureData>[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = new Date(currentGroup[currentGroup.length - 1].timestamp).getTime();
    const currTime = new Date(sorted[i].timestamp).getTime();
    const diffMinutes = (currTime - prevTime) / (1000 * 60);

    if (diffMinutes <= 10) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(buildReadingGroup(currentGroup));
      currentGroup = [sorted[i]];
    }
  }

  groups.push(buildReadingGroup(currentGroup));

  // Return newest first
  return groups.reverse();
}

function buildReadingGroup(
  readings: HealthMetric<BloodPressureData>[]
): ReadingGroup<BloodPressureData> {
  // Per ESC/ESH 2018/2023 & AHA/ACC 2017: drop first reading, average remaining
  const readingsForAverage = readings.length >= 2 ? readings.slice(1) : readings;

  const avgSystolic = Math.round(
    readingsForAverage.reduce((s, r) => s + r.data.systolic, 0) / readingsForAverage.length
  );
  const avgDiastolic = Math.round(
    readingsForAverage.reduce((s, r) => s + r.data.diastolic, 0) / readingsForAverage.length
  );
  const avgPulse = Math.round(
    readingsForAverage.reduce((s, r) => s + r.data.pulse, 0) / readingsForAverage.length
  );

  const category = classifyBloodPressure(avgSystolic, avgDiastolic);

  return {
    id: readings[0].id,
    readings,
    average: {
      systolic: avgSystolic,
      diastolic: avgDiastolic,
      pulse: avgPulse,
      category,
    },
    timestamp: readings[0].timestamp,
    isGrouped: readings.length > 1,
  };
}

function computeStats(values: number[]): {
  avg: number;
  median: number;
  min: number;
  max: number;
} {
  if (values.length === 0) {
    return { avg: 0, median: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mid = Math.floor(sorted.length / 2);

  return {
    avg: Math.round(sum / sorted.length),
    median:
      sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}
