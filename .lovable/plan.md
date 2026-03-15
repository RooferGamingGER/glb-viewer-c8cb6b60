

## Issues Found in Solar PDF Export

Based on the uploaded report, there are several problems on the Solarplanung pages:

### 1. Leistung / Gesamtleistung shows "0.00 kWp"
The code uses `pvInfo.pvMaterials?.totalPower || 0` which relies on a pre-calculated materials object that is often not set. Should instead calculate directly: `activeModules * (pvModuleSpec?.power || 425) / 1000`.

### 2. Jahresertrag shows "0 kWh/Jahr"
Depends on the broken totalPower value above. Needs the same fix -- calculate power inline and multiply by yieldFactor.

### 3. Raster shows "- x -"
The code reads `(pvInfo as any).gridCols || '-'` and `gridRows`, but the actual type uses `pvInfo.columns` and `pvInfo.rows`. Simple property name fix.

### 4. Solarplanung comes AFTER Anhang (Berechnungsmethoden)
In the TOC and page order, solar pages are appended after the calculation methods appendix. They should come before the appendix, which should always be last.

### 5. No module visualization in the 2D layout
The 2D layout only shows the polygon outline with edge lengths but no module rectangles are drawn inside. This is likely a separate rendering issue in `renderSolarLayout2D`, but the immediate data fixes are higher priority.

---

## Plan

### File: `src/utils/pdfExport.ts`

**Fix 1 -- Power calculation (lines ~2313-2314)**
Replace `pvInfo.pvMaterials?.totalPower` with inline calculation:
```typescript
const activeModules = (pvInfo.moduleCount || 0) - (pvInfo.removedModuleIndices?.length || 0);
const modulePower = pvInfo.pvModuleSpec?.power || 425;
const totalPower = (activeModules * modulePower) / 1000; // kWp
```

**Fix 2 -- Raster (lines ~2374-2375)**
Change `gridCols`/`gridRows` to `pvInfo.columns` and `pvInfo.rows`.

**Fix 3 -- Page order (TOC + rendering)**
- Move Solarplanung TOC entry before Anhang (swap lines ~1493-1501)
- Move the solar page rendering block before the calculation methods block (swap the two sections around line ~2231)

**Fix 4 -- Jahresertrag calculation (line ~2389)**
Use the corrected `totalPower` value instead of the materials-based one:
```typescript
specRows.push(['Jahresertrag', `${(totalPower * (pvInfo.yieldFactor || 950)).toFixed(0)} kWh/Jahr`]);
```
And always show it (remove the conditional).

