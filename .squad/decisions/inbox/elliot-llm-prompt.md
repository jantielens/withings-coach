# Decision: LLM Prompt Debugger

**From:** Elliot (Frontend Developer)
**Date:** 2025-07-25
**Status:** Implemented

## What

Added an "AI Prompt Builder" — a collapsible debug panel at the bottom of the dashboard that generates a copyable LLM prompt containing the user's blood pressure data in a structured format. Designed for pasting into ChatGPT, Copilot, or any AI assistant.

## Files Created / Modified

- **`src/lib/llm-prompt/prompt-builder.ts`** — Pure function `buildBPPrompt()` that assembles a 4-section prompt (Role, Goal with ESC/ESH reference, Markdown data table, Output format + disclaimer).
- **`src/components/LLMPromptDebugger.tsx`** — Collapsible UI component with copy-to-clipboard, token estimate, and read-only textarea.
- **`src/app/page.tsx`** — Integrated `<LLMPromptDebugger>` between Timeline and disclaimer footer.

## Design Decisions

1. **Pure function in `src/lib/`**: Prompt builder has zero UI dependencies — can be reused by a future API route or server-side agent.
2. **Collapsed by default**: Debug-tool aesthetic (gray border, monospace, small text) keeps it unobtrusive. Not a primary feature.
3. **Real dates, not anonymized**: Per task spec — the prompt includes actual measurement dates/times for accurate temporal analysis.
4. **Reuses `categoryConfig` labels**: Single source of truth for ESC/ESH category display names.
5. **No new dependencies**: Uses only browser APIs (`navigator.clipboard`, `document.execCommand` fallback).

## Risks

- Prompt contains real health data — user should be aware when pasting into external services. The disclaimer section in the prompt mitigates this somewhat.
- Token estimate (~4 chars/token) is a rough heuristic. Actual tokenization varies by model.
