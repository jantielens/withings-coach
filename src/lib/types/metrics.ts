export enum MetricType {
  BLOOD_PRESSURE = 'blood_pressure',
  // Future: HEART_RATE = 'heart_rate',
  // Future: ECG = 'ecg',
  // Future: WEIGHT = 'weight',
}

export interface HealthMetric<T> {
  id: string;
  type: MetricType;
  timestamp: string; // ISO 8601 timestamp
  source: string;
  data: T;
}

// ESC/ESH 2018 Blood Pressure Classification
export enum BPCategory {
  OPTIMAL = 'optimal',
  NORMAL = 'normal',
  HIGH_NORMAL = 'high_normal',
  GRADE_1 = 'grade_1',
  GRADE_2 = 'grade_2',
  GRADE_3 = 'grade_3',
  ISOLATED_SYSTOLIC = 'isolated_systolic',
}

export interface BloodPressureData {
  systolic: number;
  diastolic: number;
  pulse: number;
  category: BPCategory;
}

export type BloodPressureMetric = HealthMetric<BloodPressureData>;

export interface ReadingGroup<T> {
  id: string;
  readings: HealthMetric<T>[];
  average: T;
  timestamp: string; // ISO 8601
  isGrouped: boolean;
}

export type BloodPressureGroup = ReadingGroup<BloodPressureData>;

export interface MetricsResponse<T> {
  metrics: ReadingGroup<T>[];
  summary: MetricSummary | null;
  fetchedAt: string;
}

export interface MetricSummary {
  type: MetricType;
  period: { from: string; to: string };
  count: number;
  groupCount: number;
  stats: Record<string, { avg: number; median: number; min: number; max: number }>;
}

export interface DateRange {
  from: Date;
  to: Date;
}
