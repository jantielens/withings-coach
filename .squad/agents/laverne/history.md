# Laverne — AI/Prompt Engineer SME

**Project:** Withings Coach
**Stack:** Next.js / TypeScript / Tailwind
**User:** Jan Tielens

---

## 2025-07-26 — Prompt Optimization: General Context Underweighting Fix

**Problem:** LLM was ignoring the General Context section (Dutch-language medical records from a cardiologist) when generating BP analysis. This section contains the most critical clinical information.

**Root Cause Analysis:**
1. **No explicit instruction** to prioritize the General Context — the LLM had no signal it was important
2. **Dutch language barrier** — no instruction told the LLM to actively parse Dutch content
3. **"Lost in the middle" effect** — context was sandwiched between Role/Goal and a large data table (100+ rows), making it easy to skim past
4. **Output format gap** — the 5 output sections never asked the LLM to reference the medical records, so it had no structural reason to do so

**Changes Made (`src/lib/llm-prompt/prompt-builder.ts`):**
- **Role section**: Added multilingual instruction ("medical records and diary entries are written in Dutch — read, interpret, and reference them")
- **Goal section**: Added bold IMPORTANT block when context exists, telling the LLM it MUST incorporate medical records into every part of the analysis
- **General Context header**: Changed from plain `## General Context` to `## ⚠️ General Context — CRITICAL: Patient Medical Records` with a blockquote instruction to read carefully and reference specific items
- **Output Format**: Added section 6 "Context Integration" that explicitly asks the LLM to cite details from the General Context section
- **Conditional logic**: All enhancements are gated on `hasContext`/`hasDiary` booleans so prompts without context remain lean

**Build:** ✅ passes | **Tests:** ✅ 65/65 pass
