'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ContextNote } from '@/lib/types/context';

interface UseContextNotesResult {
  notes: ContextNote[];
  createNote: (text: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  isLoading: boolean;
}

export function useContextNotes(): UseContextNotesResult {
  const [notes, setNotes] = useState<ContextNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ userId: 'default' });
      const response = await fetch(`/api/context?${params}`);
      if (!response.ok) {
        // API may not exist yet (Turk building in parallel) — fail silently
        setNotes([]);
        return;
      }
      const json = await response.json();
      setNotes(json.notes ?? []);
    } catch {
      // API not available yet — silent fallback
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(
    async (text: string) => {
      try {
        const response = await fetch('/api/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'default', text }),
        });
        if (!response.ok) {
          throw new Error(`Failed to create context note (${response.status})`);
        }
      } finally {
        await fetchNotes();
      }
    },
    [fetchNotes]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        const params = new URLSearchParams({ id, userId: 'default' });
        const response = await fetch(`/api/context?${params}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`Failed to delete context note (${response.status})`);
        }
      } finally {
        await fetchNotes();
      }
    },
    [fetchNotes]
  );

  return { notes, createNote, deleteNote, isLoading };
}
