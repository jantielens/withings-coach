import { NextRequest, NextResponse } from 'next/server';
import {
  getEntry,
  getEntriesInRange,
  upsertEntry,
  deleteEntry,
} from '@/lib/services/diary-service';
import type { DiaryEntryInput } from '@/lib/types/diary';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  return DATE_RE.test(s) && !isNaN(Date.parse(s));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get('userId') ?? 'default';
  const date = params.get('date');
  const from = params.get('from');
  const to = params.get('to');

  // Range query
  if (from && to) {
    if (!isValidDate(from) || !isValidDate(to)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    const entries = await getEntriesInRange(userId, from, to);
    return NextResponse.json({ entries });
  }

  // Single entry
  if (date) {
    if (!isValidDate(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    const entry = await getEntry(userId, date);
    if (!entry) {
      return NextResponse.json(
        { error: 'No diary entry found for this date.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ entry });
  }

  return NextResponse.json(
    { error: 'Provide "date" or "from"+"to" query parameters.' },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  let body: DiaryEntryInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  if (!body.date || !body.text) {
    return NextResponse.json(
      { error: '"date" and "text" are required.' },
      { status: 400 }
    );
  }

  if (!isValidDate(body.date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  const userId = body.userId ?? 'default';
  const existing = await getEntry(userId, body.date);
  const entry = await upsertEntry(body);
  const status = existing ? 200 : 201;

  return NextResponse.json({ entry }, { status });
}

export async function DELETE(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get('userId') ?? 'default';
  const date = params.get('date');

  if (!date) {
    return NextResponse.json(
      { error: '"date" query parameter is required.' },
      { status: 400 }
    );
  }

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  const deleted = await deleteEntry(userId, date);
  if (!deleted) {
    return NextResponse.json(
      { error: 'No diary entry found for this date.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
