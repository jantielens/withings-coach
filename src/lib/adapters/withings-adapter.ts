import { DataSourceAdapter } from '@/lib/adapters/data-source-adapter';
import { AuthProvider } from '@/lib/types/auth';
import {
  BloodPressureData,
  DateRange,
  HealthMetric,
  MetricType,
} from '@/lib/types/metrics';
import { classifyBloodPressure } from '@/lib/classification/blood-pressure';

const WITHINGS_API_URL = 'https://wbsapi.withings.net/measure';

// Withings measure types for blood pressure
const WITHINGS_MEAS_TYPE = {
  DIASTOLIC: 9,
  SYSTOLIC: 10,
  PULSE: 11,
} as const;

interface WithingsMeasure {
  value: number;
  type: number;
  unit: number;
}

interface WithingsMeasureGroup {
  grpid: number;
  date: number;
  measures: WithingsMeasure[];
}

interface WithingsResponse {
  status: number;
  body?: {
    measuregrps?: WithingsMeasureGroup[];
  };
  error?: string;
}

function realValue(measure: WithingsMeasure): number {
  return measure.value * Math.pow(10, measure.unit);
}

export class WithingsAdapter implements DataSourceAdapter {
  getSupportedMetrics(): MetricType[] {
    return [MetricType.BLOOD_PRESSURE];
  }

  async fetchMetrics<T>(
    type: MetricType,
    dateRange: DateRange,
    auth: AuthProvider
  ): Promise<HealthMetric<T>[]> {
    if (type !== MetricType.BLOOD_PRESSURE) {
      throw new Error(`Unsupported metric type: ${type}`);
    }

    const token = await auth.getAccessToken();
    const startdate = Math.floor(dateRange.from.getTime() / 1000);
    const enddate = Math.floor(dateRange.to.getTime() / 1000);

    // Request all three BP-related measure types so the full group is returned.
    // Using meastype (singular) only returns that one type within each group,
    // which causes diastolic/pulse to be missing and readings to be skipped.
    const params = new URLSearchParams({
      action: 'getmeas',
      meastypes: `${WITHINGS_MEAS_TYPE.DIASTOLIC},${WITHINGS_MEAS_TYPE.SYSTOLIC},${WITHINGS_MEAS_TYPE.PULSE}`,
      category: '1',
      startdate: startdate.toString(),
      enddate: enddate.toString(),
    });

    console.log(`[Withings] POST ${WITHINGS_API_URL}`);
    console.log(`[Withings] Params: action=getmeas, meastypes=9,10,11, category=1, startdate=${startdate}, enddate=${enddate}`);
    console.log(`[Withings] Date range: ${dateRange.from.toISOString()} → ${dateRange.to.toISOString()}`);

    const response = await fetch(WITHINGS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log(`[Withings] HTTP status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(
        `Withings API HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const data: WithingsResponse = await response.json();

    console.log(`[Withings] API status: ${data.status}${data.error ? ` — ${data.error}` : ''}`);
    console.log(`[Withings] Measure groups returned: ${data.body?.measuregrps?.length ?? 0}`);

    if (data.status === 401) {
      throw new WithingsAuthError('Withings API authentication failed. Token may be expired.');
    }

    if (data.status !== 0) {
      throw new WithingsApiError(
        `Withings API error: status ${data.status}${data.error ? ` — ${data.error}` : ''}`,
        data.status
      );
    }

    const groups = data.body?.measuregrps ?? [];
    const metrics = this.mapBloodPressureGroups(groups);

    console.log(`[Withings] Parsed ${metrics.length} complete BP readings from ${groups.length} groups`);

    return metrics as HealthMetric<T>[];
  }

  private mapBloodPressureGroups(
    groups: WithingsMeasureGroup[]
  ): HealthMetric<BloodPressureData>[] {
    return groups
      .map((group) => {
        const systolicMeas = group.measures.find(
          (m) => m.type === WITHINGS_MEAS_TYPE.SYSTOLIC
        );
        const diastolicMeas = group.measures.find(
          (m) => m.type === WITHINGS_MEAS_TYPE.DIASTOLIC
        );
        const pulseMeas = group.measures.find(
          (m) => m.type === WITHINGS_MEAS_TYPE.PULSE
        );

        // Skip incomplete readings
        if (!systolicMeas || !diastolicMeas) return null;

        const systolic = realValue(systolicMeas);
        const diastolic = realValue(diastolicMeas);
        const pulse = pulseMeas ? realValue(pulseMeas) : 0;
        const category = classifyBloodPressure(systolic, diastolic);

        return {
          id: group.grpid.toString(),
          type: MetricType.BLOOD_PRESSURE,
          timestamp: new Date(group.date * 1000).toISOString(),
          source: 'withings',
          data: { systolic, diastolic, pulse, category },
        } satisfies HealthMetric<BloodPressureData>;
      })
      .filter((m): m is HealthMetric<BloodPressureData> => m !== null)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
}

export class WithingsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WithingsAuthError';
  }
}

export class WithingsApiError extends Error {
  public readonly apiStatus: number;
  constructor(message: string, apiStatus: number) {
    super(message);
    this.name = 'WithingsApiError';
    this.apiStatus = apiStatus;
  }
}
