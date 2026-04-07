'use client';

import { useState, useRef, useEffect } from 'react';
import type { DiaryEntry } from '@/lib/types/diary';

const MAX_CHARS = 500;
const PLACEHOLDER = 'Add context for this day (e.g., started medication, stressful day, cold/fever...)';

interface DiaryNoteProps {
  date: string;
  entry?: DiaryEntry;
  onSave: (date: string, text: string) => void;
  onDelete: (date: string) => void;
}

export function DiaryNote({ date, entry, onSave, onDelete }: DiaryNoteProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry?.text ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync text when entry changes externally
  useEffect(() => {
    if (!editing) {
      setText(entry?.text ?? '');
    }
  }, [entry, editing]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, [editing, text.length]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSave(date, trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setText(entry?.text ?? '');
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  // Auto-expand textarea height
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setText(value);
    }
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  };

  // Edit mode
  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          rows={3}
          maxLength={MAX_CHARS}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 tabular-nums">
            {text.length}/{MAX_CHARS}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="rounded px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className="rounded px-3 py-1 text-xs font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display mode — no entry
  if (!entry) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1 group"
      >
        <span className="text-sm group-hover:scale-110 transition-transform">📝</span>
        <span>Add note</span>
      </button>
    );
  }

  // Display mode — has entry
  return (
    <div className="flex items-start gap-2 group/diary">
      <p className="flex-1 text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
        {entry.text}
      </p>
      <div className="flex items-center gap-1 opacity-0 group-hover/diary:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Edit note"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(date)}
          className="rounded p-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete note"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
