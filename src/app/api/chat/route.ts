import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createAzureAIClient, getDeploymentName, AzureConfigError } from '@/lib/chat/azure-client';
import { detectTimeRange } from '@/lib/chat/time-range';
import { buildChatSystemPrompt, type ChatContext } from '@/lib/chat/system-prompt';
import { HealthDataService } from '@/lib/services/health-data-service';
import { requireAuth, WithingsTokenRefreshError } from '@/lib/auth/require-auth';
import { getMetricConfig } from '@/lib/registry/metric-registry';
import { getEntriesInRange } from '@/lib/services/diary-service';
import { getContextNotes } from '@/lib/services/context-service';
import { MetricType, type BloodPressureData, type ReadingGroup } from '@/lib/types/metrics';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Parse request body
  let body: { messages?: UIMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: '"messages" array is required and must not be empty.' },
      { status: 400 }
    );
  }

  if (messages.length > 50) {
    return NextResponse.json(
      { error: 'Too many messages. Start a new conversation.' },
      { status: 400 }
    );
  }

  // Find the latest user message for time range detection
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    return NextResponse.json(
      { error: 'At least one user message is required.' },
      { status: 400 }
    );
  }

  // Extract text content from the UIMessage parts
  const lastUserText = lastUserMessage.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ');

  try {
    // Authenticate
    const { result: authResult, error: authError } = await requireAuth();
    if (authError) return authError;

    // Determine time range from the latest user message
    const dateRange = detectTimeRange(lastUserText);
    const dayCount =
      Math.ceil(
        (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    // Fetch health data, diary entries, and context notes in parallel
    const bpConfig = getMetricConfig(MetricType.BLOOD_PRESSURE)!;
    const healthService = new HealthDataService(bpConfig.adapter, authResult.auth);

    const [bpResponse, diaryEntries, contextNotes] = await Promise.all([
      healthService.getMetrics<BloodPressureData>(
        MetricType.BLOOD_PRESSURE,
        {
          from: new Date(dateRange.from),
          to: new Date(dateRange.to + 'T23:59:59.999Z'),
        },
        false
      ),
      getEntriesInRange(authResult.userId, dateRange.from, dateRange.to),
      getContextNotes(authResult.userId),
    ]);

    const readings = bpResponse.metrics as ReadingGroup<BloodPressureData>[];

    // Build system prompt with all context
    const chatContext: ChatContext = {
      readings,
      diaryEntries,
      contextNotes,
      dateRange,
      dayCount,
    };
    const systemPrompt = buildChatSystemPrompt(chatContext);

    // Create Azure AI client and stream response
    const azure = createAzureAIClient();
    const deploymentName = getDeploymentName();

    // Filter out any system messages — system prompt is provided separately
    const chatMessages = messages.filter((m) => m.role !== 'system');
    const modelMessages = await convertToModelMessages(chatMessages);

    const result = streamText({
      model: azure(deploymentName),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 2048,
      temperature: 0.5,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof WithingsTokenRefreshError) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    if (error instanceof AzureConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Auth failures from DefaultAzureCredential
    if (
      error instanceof Error &&
      (error.name === 'CredentialUnavailableError' ||
        error.message.includes('DefaultAzureCredential') ||
        error.message.includes('authentication') ||
        error.message.includes('WITHINGS_ACCESS_TOKEN'))
    ) {
      return NextResponse.json(
        { error: 'Authentication failed. Check your credentials configuration.' },
        { status: 401 }
      );
    }

    // Azure API errors (upstream failures)
    if (
      error instanceof Error &&
      (error.message.includes('Azure') ||
        error.message.includes('openai') ||
        error.message.includes('429') ||
        error.message.includes('503'))
    ) {
      console.error('Azure API error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from AI service.' },
        { status: 502 }
      );
    }

    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
