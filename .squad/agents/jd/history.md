# JD — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Build an LLM-powered health coaching agent that can summarize health data, detect trends, give feedback, and answer questions based on Withings health metrics
- **Key concern:** Making the LLM agent medically responsible (always disclaim, never diagnose), contextually aware, and genuinely useful as a health coach

## Clinical Input from Kelso

**Coaching Output Requirements (2026-04-06):**
- **Disclaimer requirement:** Any coaching output discussing BP or health must include context about variability and medical limitations
- **Required:** Medical disclaimer on coaching output: "This data is for informational purposes only. Blood pressure varies throughout the day. Consult your physician for medical decisions."
- **No diagnosis:** Never state or imply diagnosis. Present data with context; let patient consult physician
- **Clinical context always:** When coaching on BP, provide clinical context (Avg/Median/Range/Count) rather than single readings — prevents misinterpretation

## Learnings

_No learnings yet — project just started._
