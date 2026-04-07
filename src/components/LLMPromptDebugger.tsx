'use client';

import { useState, useMemo } from 'react';
import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import type { DiaryEntry } from '@/lib/types/diary';
import { buildBPPrompt } from '@/lib/llm-prompt/prompt-builder';

interface LLMPromptDebuggerProps {
  readings: ReadingGroup<BloodPressureData>[];
  dayCount: number;
  diaryEntries?: Map<string, DiaryEntry>;
}

export function LLMPromptDebugger({ readings, dayCount, diaryEntries }: LLMPromptDebuggerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => buildBPPrompt(readings, dayCount, diaryEntries),
    [readings, dayCount, diaryEntries]
  );

  const charCount = prompt.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="border border-gray-300 rounded-lg bg-gray-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors rounded-lg"
      >
        <span className="text-sm font-medium text-gray-600">
          🤖 AI Prompt Builder
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
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">
            Copy this prompt and paste it into ChatGPT, Copilot, or any AI assistant for blood pressure trend analysis.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">
              {charCount.toLocaleString()} chars · ~{tokenEstimate.toLocaleString()} tokens
            </span>
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

          <textarea
            readOnly
            value={prompt}
            rows={16}
            className="w-full rounded border border-gray-300 bg-white p-3 text-xs font-mono text-gray-700 leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
      )}
    </section>
  );
}
