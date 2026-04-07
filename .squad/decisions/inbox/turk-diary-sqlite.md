# Decision: SQLite for Diary Storage

**From:** Turk (Backend Developer)
**Date:** 2025-07-23
**Status:** Implemented

## Context

Users need the ability to add, edit, and review diary notes for any date (past, present, future) in their health timeline. These notes provide context for LLM-generated blood pressure analysis and the doctor view.

## Decision

Use **better-sqlite3** (embedded SQLite) for diary persistence with a service layer and REST API.

### Key Choices

1. **SQLite over external DB** — Zero infrastructure, synchronous API, single-file database. Perfect for a single-user health app. Migration to Postgres is straightforward if needed later.
2. **One entry per user per date** — `UNIQUE(userId, date)` constraint. Upsert semantics on POST — simpler API, no duplicate management.
3. **Preserve `createdAt` on upsert** — INSERT OR REPLACE would normally reset all columns. We check for existing row and carry forward `createdAt` so the original creation timestamp survives edits.
4. **DB file in `data/diary.db`** — Project root, gitignored. Auto-creates directory on first access.
5. **WAL journal mode** — Better concurrent read performance for Next.js (build-time vs runtime reads).

### API Shape

- `GET /api/diary?date=YYYY-MM-DD` — single entry
- `GET /api/diary?from=...&to=...` — date range
- `POST /api/diary` — create or update
- `DELETE /api/diary?date=YYYY-MM-DD` — remove

### Files Created/Modified

- `src/lib/types/diary.ts` — DiaryEntry, DiaryEntryInput types
- `src/lib/db/diary-db.ts` — SQLite init, singleton, schema
- `src/lib/services/diary-service.ts` — CRUD operations
- `src/app/api/diary/route.ts` — REST API route
- `src/lib/llm-prompt/prompt-builder.ts` — Added diary integration (Patient Context section + Diary column)
- `.gitignore` — Added `/data/`

## Consequences

- Database file is local-only; no cloud sync without additional infrastructure
- Single-user design (userId defaults to "default"); multi-user would need auth layer
- Prompt builder change is backward-compatible (optional parameter)
