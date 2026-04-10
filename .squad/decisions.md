# Squad Decisions

## Active Decisions

### Timezone Offset Fix — Pass Browser Timezone to Chat API (2026-04-10)

**From:** Cox (Lead / Architect)  
**Status:** 🔶 Recommended — Ready for Implementation  
**Severity:** High — User-visible data mismatch + date boundary risk

#### Diagnosis

- Root cause: Chat prompt uses `toISOString()` (UTC) while dashboard uses `toLocaleTimeString()` (local)
- 2-hour offset for CEST users (06:00 UTC shown as 08:00 local)
- Date boundary bug: Readings between 00:00–01:59 CEST map to previous day in UTC
- Secondary bug: `Timeline.tsx:174` diary lookup inconsistent with `getDayKey()` (UTC vs. local)

#### Recommendation: Option A — Pass browser IANA timezone

**Implementation Plan:**
1. Browser sends `Intl.DateTimeFormat().resolvedOptions().timeZone` with chat requests
2. API route accepts and passes timezone to prompt builders
3. Prompt builder formats dates/times using `toLocaleString(locale, { timeZone })`
4. Timeline.tsx fixes diary lookup to use local date extraction
5. Fallback to UTC if timezone missing/invalid

**Files to modify:**
- `src/app/api/chat/route.ts` — accept timezone
- `src/app/api/chat/prompt/route.ts` — pass timezone
- `src/lib/chat/system-prompt.ts` — format locally
- `src/lib/llm-prompt/prompt-builder.ts` — format locally
- `src/components/ChatPanel.tsx` — send timezone
- `src/components/Timeline.tsx` — fix diary lookup

**Effort:** ~2–3 hours. No new dependencies, no schema changes.

---

### Vercel AI SDK v6 — useChat Body Pattern (2026-04-10)

**From:** Elliot (Frontend Dev)  
**Date:** 2026-04-10  
**Status:** ✅ Implemented

#### Issue
In Vercel AI SDK v6, `useChat({ body: {...} })` no longer works. The `body` field moved to `HttpChatTransportInitOptions`.

#### Pattern
```typescript
import { DefaultChatTransport } from 'ai';

useChat({
  transport: new DefaultChatTransport({
    body: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }),
});
```

#### Implication
All chat body customizations (including timezone from decision above) must use the `DefaultChatTransport` pattern.

---

### Chatbot Implementation — Code Review (2026-04-08)

**From:** Cox (Lead / Architect)  
**Status:** ✅ **2 Critical Bugs Fixed; Ready for Merge**

**Verdict:** Architecture is faithfully implemented. All issues identified in review have been resolved by JD.

**Critical Bugs (Fixed):**
1. Stream format mismatch — Changed `toTextStreamResponse()` → `toUIMessageStreamResponse()` in route.ts:97
2. Message format mismatch — Imported and applied `convertToModelMessages()` in route.ts:89-94

**Medium Issues (Fixed):**
3. Added `maxTokens: 2048` constraint
4. Added `temperature: 0.5` for medical data consistency
5. Added message count guard (max 50 messages per request)

**Remaining:** Error classification (fragile string matching) and API route test coverage — deferred to fast-follow.

**Decision:** All 5 issues resolved. Code is ready for merge. Tests: 103 passing.

---

### Chatbot Feature Architecture — Context-in-Prompt & Vercel AI SDK Integration

**Session:** 2026-04-08 Chatbot Architecture Alignment  
**Agents:** Cox (Lead), Elliot (Frontend), JD (AI Engineer), Turk (Backend)  
**Status:** ✅ **Implementation Complete — Chat Feature Live**

---

## Architecture Decision: Integrated Chatbot / Coaching Agent

**From:** Cox (Lead / Architect)  
**Date:** 2026-04-08  
**Status:** ✅ Team alignment complete

### Summary

Jan wants an integrated chatbot: VS Code-like split layout with health dashboard (left) and ChatGPT-style chat panel (right). LLM on Azure AI Foundry with managed identity. Chat accesses user's health data, diary entries, and context notes.

### Key Decisions

1. **Context-in-Prompt** — No RAG. BP data (~15K tokens/year) fits comfortably in 128K context window.
2. **3 Azure Resources** — AI Foundry (hub + project + deployment) + App Service. No search, vector DB, Redis.
3. **Managed Identity Auth** — DefaultAzureCredential. Local: `az login`. Prod: system-assigned identity.
4. **Single API Endpoint** — `POST /api/chat` returning SSE stream. No server-side chat history.
5. **UI Stack** — Vercel AI SDK + shadcn/ui + react-resizable-panels. Streaming out-of-the-box.
6. **System Prompt** — Refactor existing prompt builder. Add conversational instructions, date awareness. Rebuild per request.
7. **Timeline** — 3 weeks: Week 1 (spike + foundation), Week 2 (API + UI), Week 3 (polish + deploy).
8. **Risk** — Managed identity auth spike Week 1 (highest priority). If fails, fallback to API key.

---

## Chat UI Libraries — Research & Recommendation

**By:** Elliot (Frontend Dev)  
**Date:** 2026-04-08  
**Status:** ✅ Complete

### Recommendation

**🏆 Vercel AI SDK + shadcn/ui + react-resizable-panels**

- ✅ Native streaming via `useChat` hook
- ✅ React 19 native
- ✅ ~25 kB bundle (Vercel SDK)
- ✅ Tailwind-first, minimal CSS
- ✅ Active maintenance, production-proven

### Rejected Options

- ❌ @chatscope/chat-ui-kit-react — No streaming, React 19 untested, 40–60 kB
- ❌ react-chat-elements — Too minimal, no streaming, small community
- ❌ Build custom — 2–3 weeks dev, redundant given Vercel SDK
- ❌ Stream Chat React — Overkill for AI chat, 100+ kB

---

## Chatbot LLM Integration Patterns

**By:** JD (AI Engineer)  
**Date:** 2026-04-08  
**Status:** ✅ Complete

### Recommendation

**Context-in-Prompt with Azure AI Foundry (GPT-4o-mini) via Vercel AI SDK**

### Token Math

| Scenario | Tokens | % of 128K Window |
|----------|--------|-----------------|
| 1 year BP data | ~15K | 12% |
| 2 years + diary | ~41K | 32% |

**Conclusion:** RAG is unnecessary. Data fits comfortably.

### Data Flow

1. User message → detect time intent ("last week" = 7 days)
2. Fetch BP readings, diary, context from DB
3. Build user context (markdown table)
4. Construct: [system prompt, user context, ...history]
5. Stream response via Azure → Vercel SDK → SSE → Frontend

### Model: GPT-4o-mini

- 128K context window
- Outperforms GPT-3.5 Turbo
- 60% cheaper than GPT-3.5
- Best price/performance for MVP

---

## Azure AI Foundry Backend Integration

**By:** Turk (Backend Developer)  
**Date:** 2026-04-08  
**Status:** ✅ Complete

### Recommendation

**Vercel AI SDK (`ai` + `@ai-sdk/azure`) + DefaultAzureCredential**

- Zero-boilerplate streaming (SSE auto-conversion)
- Managed identity first-class support
- React hook integration (`useChat`)
- Battle-tested in production

### Packages

```
npm install ai @ai-sdk/azure @azure/identity
```

### Auth Pattern

**DefaultAzureCredential tries (in order):**
1. Environment variables
2. Azure CLI (`az login` — local dev) ✅
3. VSCode extension (optional)
4. Managed identity (App Service — prod) ✅

**Local:** `az login` auto-detected  
**Prod:** System-assigned identity auto-detected

### API Route Pattern

```typescript
import { streamText } from 'ai';
import { azure } from '@ai-sdk/azure';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const userContext = await buildUserContext(userId);
  
  const result = await streamText({
    model: azure('gpt-4o-mini'),
    system: buildSystemPrompt(userContext),
    messages,
  });
  
  return result.toDataStreamResponse();
}
```

---

### Previous Decisions

## Clinical Decisions — Blood Pressure

**From:** Kelso (Medical Advisor)  
**Date:** 2026-04-06

### Decision 1: ESC/ESH 2018 BP Classification

**Status:** ✅ **Binding** — Implemented

### Decision 2: Multi-Reading Averaging

**Status:** ✅ **Binding** — Implemented

---

## Miscellaneous

**UI Note:** Remove sparklines — don't add value, clutter interface. *Status:* Pending implementation
