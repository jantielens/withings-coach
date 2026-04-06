import { MetricType } from '@/lib/types/metrics';

export const METRIC_DEFAULTS = {
  defaultDays: 7,
  defaultSummary: true,
} as const;

export const METRIC_LABELS: Record<MetricType, string> = {
  [MetricType.BLOOD_PRESSURE]: 'Blood Pressure',
};

export const METRIC_UNITS: Record<MetricType, string> = {
  [MetricType.BLOOD_PRESSURE]: 'mmHg',
};
