import { NextRequest, NextResponse } from 'next/server';
import {
  getContextNotes,
  createContextNote,
  deleteContextNote,
} from '@/lib/services/context-service';
import type { ContextNoteInput } from '@/lib/types/context';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get('userId') ?? 'default';

  const notes = await getContextNotes(userId);
  return NextResponse.json({ notes });
}

export async function POST(request: NextRequest) {
  let body: ContextNoteInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  if (!body.text) {
    return NextResponse.json(
      { error: '"text" is required.' },
      { status: 400 }
    );
  }

  const note = await createContextNote(body);
  return NextResponse.json({ note }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get('userId') ?? 'default';
  const id = params.get('id');

  if (!id) {
    return NextResponse.json(
      { error: '"id" query parameter is required.' },
      { status: 400 }
    );
  }

  const deleted = await deleteContextNote(userId, id);
  if (!deleted) {
    return NextResponse.json(
      { error: 'No context note found with this id.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
