
# ABS-JSON Kamin-Export: angle/orientation korrigieren

## Problem

Die Kamin-Metadaten (`angle` und `orientation`) in der ABS-JSON-Exportfunktion sind vertauscht im Vergleich zur Skylight-Logik. ABS/Airteam erwartet dieselbe Konvention fuer beide Elementtypen.

### Aktuell (fehlerhaft)

| Element | angle | orientation |
|---|---|---|
| Kamin Oberseite | 90 | [0, 0, -1] |
| Kamin Seiten | 0 | [0, 0, 0] |
| Dachfenster Oberseite | 0 | [0, 0, 0] |
| Dachfenster Seiten | 90 | [0, 0, -1] |

### Korrigiert

| Element | angle | orientation |
|---|---|---|
| Kamin Oberseite | **0** | **[0, 0, 0]** |
| Kamin Seiten | **90** | **[0, 0, -1]** |
| Dachfenster Oberseite | 0 | [0, 0, 0] |
| Dachfenster Seiten | 90 | [0, 0, -1] |

## Aenderungen

### Datei: `src/utils/exportUtils.ts`

Zwei Stellen werden angepasst (Zeilen 576-623):

**1. Kaminoberseite (Zeile 577-589)**
- `angle`: 90 wird zu 0 (horizontale Flaeche, analog Dachfenster oben)
- `orientation`: [0, 0, -1] wird zu [0, 0, 0] (analog Dachfenster oben)

**2. Kaminseitenflaechen (Zeile 611-623)**
- `angle`: 0 wird zu 90 (vertikale Flaeche, analog Dachfenster Seite)
- `orientation`: [0, 0, 0] wird zu [0, 0, -1] (analog Dachfenster Seite)

Die Logik dahinter: Eine flache Oberseite hat `angle=0` (keine Neigung), Seitenwaende haben `angle=90` (senkrecht). Das ist exakt dieselbe Konvention, die bereits fuer Dachfenster korrekt implementiert ist.

Keine weiteren Dateien sind betroffen.
