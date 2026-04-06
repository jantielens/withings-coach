import { NextResponse } from 'next/server';
import { getAllMetricConfigs } from '@/lib/registry/metric-registry';

export async function GET() {
  const configs = getAllMetricConfigs();

  const types = configs.map((config) => ({
    id: config.type,
    label: config.label,
    unit: config.unit,
    available: config.available,
  }));

  return NextResponse.json({ types });
}
