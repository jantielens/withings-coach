# Decision: LLM Prompt Optimization — General Context Underweighting

**From:** Laverne (AI/Prompt Engineer SME)
**Date:** 2025-07-26
**Status:** Implemented

## Problem

The generated LLM prompt includes a "General Context" section with the patient's medical records (cardiologist notes, medications, diagnoses — written in Dutch). LLMs were consistently ignoring or underweighting this section, producing generic analyses that didn't reference the patient's specific medical situation.

## Root Cause

Four compounding issues:

1. **No priority signal** — the section header was a plain `## General Context` with no instruction to treat it as important. LLMs treat all sections equally unless told otherwise.
2. **No multilingual instruction** — the prompt was entirely in English except for the Dutch context/diary content. Without an explicit instruction, LLMs may not deeply parse foreign-language content embedded in an English prompt.
3. **"Lost in the middle" effect** — the context sat between the Goal and a 100+ row data table. Research shows LLMs attend most to content at the start and end of prompts; middle content gets reduced attention.
4. **Output format gap** — the 5 requested output sections never asked the LLM to reference the medical records. If the output structure doesn't demand it, the LLM won't volunteer it.

## Solution

Four targeted changes, all conditional on whether context/diary data exists:

| Change | Technique | Why It Works |
|--------|-----------|-------------|
| **Language note** in Role section | Explicit multilingual instruction | Primes the LLM to expect and actively parse Dutch content |
| **IMPORTANT block** in Goal section | Emphasis + forward reference | Creates anticipation — LLM knows to look for the context section before encountering it |
| **Upgraded section header** with blockquote instruction | Visual salience + imperative instruction | `⚠️ CRITICAL` + blockquote breaks the LLM's tendency to skim uniform markdown |
| **Section 6: Context Integration** in Output Format | Structural forcing function | If the output format demands citations from the context, the LLM must read and reference it |

## Design Decisions

1. **Conditional enhancement** — all additions are gated behind `hasContext`/`hasDiary` booleans. Prompts without medical records remain lean and don't waste tokens on irrelevant instructions.
2. **Multi-layer reinforcement** — the context is referenced in Role (language), Goal (priority), the section itself (emphasis), and Output Format (structural requirement). This "sandwich" approach ensures the LLM encounters the instruction multiple times across the prompt.
3. **No section reordering** — considered moving General Context after the data table (closer to output instructions for recency effect), but decided against it: the context should be read *before* the data so the LLM interprets readings through the lens of the patient's medical history.
4. **No translation step** — considered adding "First translate the Dutch content to English, then analyze" but this wastes tokens and modern LLMs (GPT-4, Claude, Copilot) handle Dutch natively. A simple "read and reference" instruction suffices.

## Files Modified

- `src/lib/llm-prompt/prompt-builder.ts` — all changes in this single file

## Risks

- Slightly higher token count (~80 tokens when context exists). Negligible vs the data table.
- The emphasis formatting (⚠️, bold, blockquotes) is tuned for GPT-4/Claude/Copilot. Smaller models may respond differently to these cues.

## Validation

- `npm run build` ✅
- `npm test` ✅ (65/65 tests pass)
- No API signature changes — fully backward compatible
