import { DataSourceAdapter } from '@/lib/adapters/data-source-adapter';
import { WithingsAdapter } from '@/lib/adapters/withings-adapter';
import { MetricType } from '@/lib/types/metrics';

export interface MetricConfig {
  type: MetricType;
  label: string;
  unit: string;
  available: boolean;
  adapter: DataSourceAdapter;
}

const withingsAdapter = new WithingsAdapter();

const registry: Map<MetricType, MetricConfig> = new Map([
  [
    MetricType.BLOOD_PRESSURE,
    {
      type: MetricType.BLOOD_PRESSURE,
      label: 'Blood Pressure',
      unit: 'mmHg',
      available: true,
      adapter: withingsAdapter,
    },
  ],
]);

export function getMetricConfig(type: MetricType): MetricConfig | undefined {
  return registry.get(type);
}

export function getAllMetricConfigs(): MetricConfig[] {
  return Array.from(registry.values());
}

export function isValidMetricType(value: string): value is MetricType {
  return Object.values(MetricType).includes(value as MetricType);
}
