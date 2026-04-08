import { NextRequest, NextResponse } from 'next/server';
import { detectTimeRange } from '@/lib/chat/time-range';
import { buildChatSystemPrompt, type ChatContext } from '@/lib/chat/system-prompt';
import { HealthDataService } from '@/lib/services/health-data-service';
import { StaticTokenAuth } from '@/lib/auth/static-token-auth';
import { getMetricConfig } from '@/lib/registry/metric-registry';
import { getEntriesInRange } from '@/lib/services/diary-service';
import { getContextNotes } from '@/lib/services/context-service';
import { MetricType, type BloodPressureData, type ReadingGroup } from '@/lib/types/metrics';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') ?? '';
  if (!query.trim()) {
    return NextResponse.json(
      { error: '"query" parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const dateRange = detectTimeRange(query);
    const dayCount =
      Math.ceil(
        (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    const bpConfig = getMetricConfig(MetricType.BLOOD_PRESSURE)!;
    const auth = new StaticTokenAuth();
    const healthService = new HealthDataService(bpConfig.adapter, auth);

    const [bpResponse, diaryEntries, contextNotes] = await Promise.all([
      healthService.getMetrics<BloodPressureData>(
        MetricType.BLOOD_PRESSURE,
        { from: new Date(dateRange.from), to: new Date(dateRange.to) },
        false
      ),
      getEntriesInRange('default', dateRange.from, dateRange.to),
      getContextNotes('default'),
    ]);

    const readings = bpResponse.metrics as ReadingGroup<BloodPressureData>[];

    const chatContext: ChatContext = {
      readings,
      diaryEntries,
      contextNotes,
      dateRange,
      dayCount,
    };
    const prompt = buildChatSystemPrompt(chatContext);

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Debug prompt error:', error);
    return NextResponse.json(
      { error: 'Failed to build system prompt.' },
      { status: 500 }
    );
  }
}
