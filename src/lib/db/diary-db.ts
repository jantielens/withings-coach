// Use the asm.js build — pure JavaScript, no WASM file needed.
// This avoids Turbopack path resolution issues with .wasm files.
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'diary.db');

let db: Database | null = null;
let dbReady: Promise<Database> | null = null;

async function initDb(): Promise<Database> {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  let instance: Database;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    instance = new SQL.Database(buffer);
  } else {
    instance = new SQL.Database();
  }

  instance.run(`
    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL DEFAULT 'default',
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, date)
    );
  `);

  instance.run(`
    CREATE TABLE IF NOT EXISTS context_notes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL DEFAULT 'default',
      text TEXT NOT NULL,
      orderIdx INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  saveDb(instance);
  return instance;
}

export function saveDb(instance: Database): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = instance.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (!dbReady) {
    dbReady = initDb().then((instance) => {
      db = instance;
      return instance;
    });
  }
  return dbReady;
}
