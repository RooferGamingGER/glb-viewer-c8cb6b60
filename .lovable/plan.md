

## Plan: Fix Measurement Auto-Load + UI Improvements

### Problem 1: Auto-Load Never Fires (Root Cause)
The Viewer renders `src/components/MeasurementTools.tsx` (root). The `useAutoLoadMeasurements` hook is only called in `src/components/measurement/MeasurementTools.tsx` which is **never mounted by the Viewer**. The hook simply runs in the wrong file.

**Fix:** Add `useAutoLoadMeasurements` call to `src/components/MeasurementTools.tsx` (the root component that ModelViewer actually uses).

### Problem 2: Load Dialog — Replace vs Append
When both GLB-embedded measurements AND server-saved measurements exist, the user wants to choose.

**Fix:** Update `useAutoLoadMeasurements` to show a toast/dialog with two actions:
- **"Ersetzen"** — replaces all measurements (`append: false`)
- **"Ergänzen"** — appends to existing (`append: true`)

### Problem 3: Edge Function Username Resolution
`/api/users/current/` returns an array of ALL users, not the current user. The code falls back to `/api/projects/` which works but is wasteful (downloads full user list first).

**Fix:** In the edge function, check if the response is an array. If so, skip to fallback immediately. Also try the WebODM endpoint `/api/users/?format=json` with the token to find the authenticated user, or just rely on the fallback path directly (it's already working).

### Changes

1. **`src/components/MeasurementTools.tsx`** — Add `useAutoLoadMeasurements(importMeasurements, measurements)` import and call

2. **`src/hooks/useAutoLoadMeasurements.ts`** — Update the load toast to offer two buttons: "Ersetzen" and "Ergänzen" when `existingMeasurements.length > 0`, or just "Laden" when no existing measurements

3. **`supabase/functions/measurement-storage/index.ts`** — Optimize `validateWebODMToken`: if response is array, skip to fallback immediately; remove redundant parsing

4. **Remove duplicate hook call** from `src/components/measurement/MeasurementTools.tsx` (the unused one) to avoid confusion

