'use client';

import { useState } from 'react';
import type { ContextNote } from '@/lib/types/context';

const MAX_CHARS = 2000;
const PLACEHOLDER = 'Add background context (e.g., medical history, medications, goals...)';

interface ContextNotesPanelProps {
  notes: ContextNote[];
  onCreate: (text: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export function ContextNotesPanel({ notes, onCreate, onDelete, isLoading }: ContextNotesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAdd();
    }
  };

  return (
    <section className="border border-gray-300 rounded-lg bg-gray-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
          📋 General Context
          {notes.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold min-w-[18px] h-[18px] px-1">
              {notes.length}
            </span>
          )}
          {isLoading && (
            <span className="text-[10px] text-gray-400">loading…</span>
          )}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {/* Existing notes */}
          {notes.length > 0 && (
            <ul className="space-y-1">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="group/note flex items-start gap-2 rounded px-2 py-1.5 hover:bg-gray-100 transition-colors"
                >
                  <p className="flex-1 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                    {note.text}
                  </p>
                  <button
                    onClick={() => onDelete(note.id)}
                    className="flex-shrink-0 rounded p-0.5 text-xs text-gray-300 opacity-0 group-hover/note:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete note"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}

          {notes.length === 0 && !isLoading && (
            <p className="text-[10px] text-gray-400 px-2">
              No context notes yet. Add persistent background info that applies to all analyses.
            </p>
          )}

          {/* Add note input */}
          <div className="space-y-1.5 pt-1 border-t border-gray-200">
            <textarea
              value={draft}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setDraft(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDER}
              rows={4}
              maxLength={MAX_CHARS}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 tabular-nums">
                {draft.length}/{MAX_CHARS}
              </span>
              <button
                onClick={handleAdd}
                disabled={!draft.trim()}
                className="rounded px-2.5 py-1 text-[11px] font-medium text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
