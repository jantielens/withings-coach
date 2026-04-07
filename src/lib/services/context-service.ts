import { getDb, saveDb } from '@/lib/db/diary-db';
import type { ContextNote, ContextNoteInput } from '@/lib/types/context';

function rowToNote(row: unknown[]): ContextNote {
  return {
    id: row[0] as string,
    userId: row[1] as string,
    text: row[2] as string,
    orderIdx: row[3] as number,
    createdAt: row[4] as string,
    updatedAt: row[5] as string,
  };
}

export async function getContextNotes(userId: string): Promise<ContextNote[]> {
  const db = await getDb();
  const stmt = db.prepare(
    'SELECT id, userId, text, orderIdx, createdAt, updatedAt FROM context_notes WHERE userId = ? ORDER BY orderIdx ASC'
  );
  stmt.bind([userId]);
  const notes: ContextNote[] = [];
  while (stmt.step()) {
    notes.push(rowToNote(stmt.get()));
  }
  stmt.free();
  return notes;
}

export async function createContextNote(input: ContextNoteInput): Promise<ContextNote> {
  const db = await getDb();
  const userId = input.userId ?? 'default';
  const id = `ctx_${userId}_${Date.now()}`;
  const now = new Date().toISOString();

  // Auto-assign next orderIdx if not provided
  let orderIdx = input.orderIdx;
  if (orderIdx === undefined) {
    const stmt = db.prepare('SELECT MAX(orderIdx) FROM context_notes WHERE userId = ?');
    stmt.bind([userId]);
    stmt.step();
    const maxIdx = stmt.get()[0] as number | null;
    stmt.free();
    orderIdx = (maxIdx ?? -1) + 1;
  }

  db.run(
    `INSERT INTO context_notes (id, userId, text, orderIdx, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, input.text, orderIdx, now, now]
  );

  saveDb(db);

  return { id, userId, text: input.text, orderIdx, createdAt: now, updatedAt: now };
}

export async function updateContextNote(
  id: string,
  text: string,
  orderIdx?: number
): Promise<ContextNote> {
  const db = await getDb();
  const now = new Date().toISOString();

  if (orderIdx !== undefined) {
    db.run(
      'UPDATE context_notes SET text = ?, orderIdx = ?, updatedAt = ? WHERE id = ?',
      [text, orderIdx, now, id]
    );
  } else {
    db.run(
      'UPDATE context_notes SET text = ?, updatedAt = ? WHERE id = ?',
      [text, now, id]
    );
  }

  saveDb(db);

  const stmt = db.prepare(
    'SELECT id, userId, text, orderIdx, createdAt, updatedAt FROM context_notes WHERE id = ?'
  );
  stmt.bind([id]);
  stmt.step();
  const note = rowToNote(stmt.get());
  stmt.free();
  return note;
}

export async function deleteContextNote(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const stmt = db.prepare('SELECT COUNT(*) FROM context_notes WHERE userId = ? AND id = ?');
  stmt.bind([userId, id]);
  stmt.step();
  const count = stmt.get()[0] as number;
  stmt.free();

  if (count === 0) return false;

  db.run('DELETE FROM context_notes WHERE userId = ? AND id = ?', [userId, id]);
  saveDb(db);

  return true;
}
