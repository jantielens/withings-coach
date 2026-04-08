import { NextRequest, NextResponse } from 'next/server';
import { HealthDataService } from '@/lib/services/health-data-service';
import { requireAuth, WithingsTokenRefreshError } from '@/lib/auth/require-auth';
import {
  getMetricConfig,
  isValidMetricType,
} from '@/lib/registry/metric-registry';
import { DateRange, MetricType } from '@/lib/types/metrics';
import { WithingsAuthError } from '@/lib/adapters/withings-adapter';
import { METRIC_DEFAULTS } from '@/config/metrics';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const summaryParam = searchParams.get('summary');

  // Validate metric type
  if (!type) {
    return NextResponse.json(
      { error: 'Missing required parameter: type' },
      { status: 400 }
    );
  }

  if (!isValidMetricType(type)) {
    return NextResponse.json(
      { error: `Invalid metric type: ${type}. Valid types: ${Object.values(MetricType).join(', ')}` },
      { status: 400 }
    );
  }

  const metricConfig = getMetricConfig(type as MetricType);
  if (!metricConfig) {
    return NextResponse.json(
      { error: `Metric type not configured: ${type}` },
      { status: 400 }
    );
  }

  // Parse date range
  const now = new Date();
  const dateRange: DateRange = {
    from: from
      ? new Date(from)
      : new Date(now.getTime() - METRIC_DEFAULTS.defaultDays * 24 * 60 * 60 * 1000),
    to: to ? new Date(to) : now,
  };

  if (isNaN(dateRange.from.getTime()) || isNaN(dateRange.to.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO 8601 date strings.' },
      { status: 400 }
    );
  }

  const includeSummary =
    summaryParam !== null ? summaryParam !== 'false' : METRIC_DEFAULTS.defaultSummary;

  // Authenticate
  const { result: authResult, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const service = new HealthDataService(metricConfig.adapter, authResult.auth);
    const response = await service.getMetrics(
      type as MetricType,
      dateRange,
      includeSummary
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof WithingsTokenRefreshError) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    if (error instanceof WithingsAuthError) {
      return NextResponse.json(
        { error: 'Authentication failed. Check your Withings access token.' },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes('WITHINGS_ACCESS_TOKEN')
    ) {
      return NextResponse.json(
        { error: 'Access token not configured. Set WITHINGS_ACCESS_TOKEN in .env.local.' },
        { status: 401 }
      );
    }

    console.error('Health metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health data from upstream provider.' },
      { status: 502 }
    );
  }
}
