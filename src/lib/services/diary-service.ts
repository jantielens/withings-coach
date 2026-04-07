import { getDb, saveDb } from '@/lib/db/diary-db';
import type { DiaryEntry, DiaryEntryInput } from '@/lib/types/diary';

function makeId(userId: string, date: string): string {
  return `diary_${userId}_${date}`;
}

function rowToEntry(row: unknown[]): DiaryEntry {
  return {
    id: row[0] as string,
    userId: row[1] as string,
    date: row[2] as string,
    text: row[3] as string,
    createdAt: row[4] as string,
    updatedAt: row[5] as string,
  };
}

export async function getEntry(userId: string, date: string): Promise<DiaryEntry | null> {
  const db = await getDb();
  const stmt = db.prepare('SELECT id, userId, date, text, createdAt, updatedAt FROM diary_entries WHERE userId = ? AND date = ?');
  stmt.bind([userId, date]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    return rowToEntry(row);
  }
  stmt.free();
  return null;
}

export async function getEntriesInRange(
  userId: string,
  from: string,
  to: string
): Promise<DiaryEntry[]> {
  const db = await getDb();
  const stmt = db.prepare(
    'SELECT id, userId, date, text, createdAt, updatedAt FROM diary_entries WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date ASC'
  );
  stmt.bind([userId, from, to]);
  const entries: DiaryEntry[] = [];
  while (stmt.step()) {
    entries.push(rowToEntry(stmt.get()));
  }
  stmt.free();
  return entries;
}

export async function upsertEntry(input: DiaryEntryInput): Promise<DiaryEntry> {
  const db = await getDb();
  const userId = input.userId ?? 'default';
  const id = makeId(userId, input.date);
  const now = new Date().toISOString();

  // Check for existing entry to preserve createdAt
  const stmt = db.prepare('SELECT createdAt FROM diary_entries WHERE id = ?');
  stmt.bind([id]);
  let createdAt = now;
  if (stmt.step()) {
    createdAt = stmt.get()[0] as string;
  }
  stmt.free();

  db.run(
    `INSERT OR REPLACE INTO diary_entries (id, userId, date, text, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, input.date, input.text, createdAt, now]
  );

  saveDb(db);

  return {
    id,
    userId,
    date: input.date,
    text: input.text,
    createdAt,
    updatedAt: now,
  };
}

export async function deleteEntry(userId: string, date: string): Promise<boolean> {
  const db = await getDb();
  const stmt = db.prepare('SELECT COUNT(*) FROM diary_entries WHERE userId = ? AND date = ?');
  stmt.bind([userId, date]);
  stmt.step();
  const count = stmt.get()[0] as number;
  stmt.free();

  if (count === 0) return false;

  db.run('DELETE FROM diary_entries WHERE userId = ? AND date = ?', [userId, date]);
  saveDb(db);

  return true;
}
