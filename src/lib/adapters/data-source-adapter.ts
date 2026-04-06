import { AuthProvider } from '@/lib/types/auth';
import { DateRange, HealthMetric, MetricType } from '@/lib/types/metrics';

export interface DataSourceAdapter {
  fetchMetrics<T>(
    type: MetricType,
    dateRange: DateRange,
    auth: AuthProvider
  ): Promise<HealthMetric<T>[]>;

  getSupportedMetrics(): MetricType[];
}
