### Bug Fix — Withings API `meastype` → `meastypes`

**From:** Turk (Backend Dev)
**Date:** 2025-07-17
**File:** `src/lib/adapters/withings-adapter.ts`

**What was broken:** The adapter used `meastype: '10'` (singular) which tells the Withings API to only return systolic measures within each group. Diastolic and pulse measures were stripped from the response. The mapping code then skipped every reading because `diastolicMeas` was always `undefined`.

**Root cause:** `meastype` (singular) filters individual measures, not groups. The comment `// Withings returns all BP measures in the group` was incorrect.

**Fix:** Changed to `meastypes: '9,10,11'` (plural, comma-separated) which requests all three BP measure types. The full group now includes systolic, diastolic, and pulse.

**Also added:** `[Withings]`-prefixed debug logging — request params, HTTP status, API status, measure group count, and parsed BP readings count. Visible in server console output.

**Build:** ✅ Passes

**Status:** ✅ Implemented
