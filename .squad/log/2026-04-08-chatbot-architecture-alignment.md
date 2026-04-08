# Session Log — Chatbot Architecture Alignment

**Timestamp:** 2026-04-08T09:48:00Z  
**Agents:** Cox (Lead), Elliot (Frontend), JD (AI Engineer), Turk (Backend)  
**Session Type:** Architecture Alignment Spike  
**Project:** Withings Coach Chatbot Feature  

## Summary

Four-agent alignment session on chatbot feature architecture. Convergence on context-in-prompt strategy (no RAG), Vercel AI SDK + Azure AI Foundry backend, split-pane UI layout, and 3-week MVP timeline.

## Key Outcomes

1. **Context-in-Prompt Strategy** — BP data volume fits comfortably in context window (8–20K tokens/year). RAG adds 3+ Azure resources and retrieval complexity for zero benefit. Decision: Ship context-in-prompt.

2. **Tech Stack** — Vercel AI SDK + shadcn/ui + react-resizable-panels. Single `POST /api/chat` endpoint. Managed identity auth via DefaultAzureCredential.

3. **De-Risk Item** — Managed identity auth spike Week 1. If it fails in Next.js server route, fallback to API key. This is the only blocker.

4. **Timeline** — 3 weeks to production: Week 1 (spike + foundation), Week 2 (API + UI), Week 3 (polish + deploy).

## Decision Artifacts

- `.squad/decisions/inbox/cox-chatbot-architecture.md` — Architecture decisions (context-in-prompt, Azure resources, auth, API design)
- `.squad/decisions/inbox/elliot-chat-ui-libraries.md` — UI library research and recommendation (Vercel AI SDK + shadcn/ui + react-resizable-panels)
- `.squad/decisions/inbox/jd-chatbot-llm-patterns.md` — LLM integration patterns (context-in-prompt, conversational prompt design, data flow)
- `.squad/decisions/inbox/turk-azure-backend.md` — Azure backend investigation (Vercel AI SDK + DefaultAzureCredential + streaming)

## Next Steps

1. Merge decision inbox → `.squad/decisions.md`
2. Team review + approval of architecture
3. Begin Week 1: Managed identity auth spike + foundation setup
