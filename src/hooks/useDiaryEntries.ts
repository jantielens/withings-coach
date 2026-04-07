'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DiaryEntry } from '@/lib/types/diary';

interface UseDiaryEntriesOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  enabled?: boolean;
}

interface UseDiaryEntriesResult {
  entries: Map<string, DiaryEntry>;
  saveEntry: (date: string, text: string) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
  isLoading: boolean;
}

export function useDiaryEntries({
  startDate,
  endDate,
  enabled = true,
}: UseDiaryEntriesOptions): UseDiaryEntriesResult {
  const [entries, setEntries] = useState<Map<string, DiaryEntry>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!enabled || !startDate || !endDate) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        from: startDate,
        to: endDate,
        userId: 'default',
      });
      const response = await fetch(`/api/diary?${params}`);
      if (!response.ok) {
        // API may not exist yet (Turk building in parallel) — fail silently
        setEntries(new Map());
        return;
      }
      const json = await response.json();
      const data: DiaryEntry[] = json.entries ?? [];
      const map = new Map<string, DiaryEntry>();
      for (const entry of data) {
        map.set(entry.date, entry);
      }
      setEntries(map);
    } catch {
      // API not available yet — silent fallback
      setEntries(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, enabled]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const saveEntry = useCallback(
    async (date: string, text: string) => {
      try {
        const response = await fetch('/api/diary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'default', date, text }),
        });
        if (!response.ok) {
          throw new Error(`Failed to save diary entry (${response.status})`);
        }
      } finally {
        await fetchEntries();
      }
    },
    [fetchEntries]
  );

  const deleteEntry = useCallback(
    async (date: string) => {
      try {
        const params = new URLSearchParams({ date, userId: 'default' });
        const response = await fetch(`/api/diary?${params}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`Failed to delete diary entry (${response.status})`);
        }
      } finally {
        await fetchEntries();
      }
    },
    [fetchEntries]
  );

  return { entries, saveEntry, deleteEntry, isLoading };
}
