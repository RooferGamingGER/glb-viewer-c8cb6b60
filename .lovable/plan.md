

## Plan: Fix Measurement Storage, UI Repositioning, Map Fixes

### 3 Problems to solve

**Problem 1: Edge Function returns error (username is `undefined`)**
The logs show `WebODM validation response status: 200` but `WebODM user: undefined`. The `/api/users/current/` endpoint returns 200 but the response JSON doesn't have a top-level `username` field. The WebODM Django REST API likely wraps the user differently. Fix: log the full response body to diagnose, and also try common WebODM patterns like checking `user.user?.username` or `user[0]?.username`. As a robust fallback, also try `/api/projects/` to validate the token and accept the client-provided username only if the token is valid for any authenticated endpoint.

**Problem 2: Move "Speichern" out of Export → own button with confirmation popup**
- Desktop: Add a standalone "Speichern" button next to the Export button in MeasurementOverlay
- Mobile: Add a 4th button "Speichern" to MobileBottomBar (4-column grid)
- Both: Clicking opens a small confirmation dialog explaining that measurements will be saved to DrohnenGLB and can be reloaded later. Only after confirmation does the save execute.
- Remove SaveMeasurementsButton from ExportDialog and MobileExportOverlay

**Problem 3: TaskBoundaryMap fixes**
- Remove `rectangle` drawing tool, keep only `polygon`
- Make photo markers non-interactive (`interactive: false`) so they don't interfere with polygon drawing
- Update hint text accordingly

**Problem 4: Auto-load → confirmation-based**
- Change `useAutoLoadMeasurements` to show a toast/dialog asking "Gespeicherte Messungen gefunden – laden?" with a confirm button, instead of loading automatically.

---

### Technical Changes

#### 1. Edge Function `measurement-storage/index.ts`
- In `validateWebODMToken`: log `JSON.stringify(user)` to see full response
- Try multiple field paths: `user?.username`, `user?.user?.username`, `user?.[0]?.username`
- If all fail but status is 200, fall back to validating token via `/api/projects/` (returns 200 if authenticated) and accept the username passed from the client (add `username` to request body as fallback)

#### 2. `SaveMeasurementsButton.tsx` → `SaveMeasurementsDialog.tsx`
- Rename/refactor to include an `AlertDialog` confirmation step
- Button click opens dialog: "Messdaten im DrohnenGLB sichern? Die Messungen werden gespeichert und können beim nächsten Öffnen dieses Tasks wieder eingelesen werden."
- On confirm: execute save logic

#### 3. `MeasurementOverlay.tsx` (Desktop)
- Add the save button in the toggles row, next to Export (visible only when server context exists)
- Remove import/usage of SaveMeasurementsButton from ExportDialog

#### 4. `MobileBottomBar.tsx`
- Add 4th button "Speichern" (CloudUpload icon) → triggers save confirmation
- Change grid from `grid-cols-3` to `grid-cols-4`
- Only show when server context (projectId/taskId) exists; otherwise keep 3 columns

#### 5. `ExportDialog.tsx` and `MobileExportOverlay.tsx`
- Remove SaveMeasurementsButton from both

#### 6. `TaskBoundaryMap.tsx`
- Remove `rectangle` from draw options (set `rectangle: false`)
- Add `interactive: false` to CircleMarker options
- Update hint text to mention only polygon

#### 7. `useAutoLoadMeasurements.ts`
- Instead of calling `importMeasurements` directly, show a confirmation toast with action button
- Only import after user clicks "Laden"

