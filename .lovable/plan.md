

# Fix: Solarflächen in Massenermittlung + Solarplanung im PDF

## Problem 1: Solarflächen fehlen in der Dachflächen-Auflistung

Überall im PDF-Export wird `m.type === 'area'` gefiltert — Messungen vom Typ `'solar'` werden komplett ignoriert bei:
- Gesamtfläche / Nettofläche Berechnung (`calculateTotalArea`, `calculateNetTotalArea`)
- Flächenübersicht auf Page 2 (Zusammenfassung)
- Inhaltsverzeichnis (TOC) Seitenberechnung
- Einzelflächen-Seiten (Page 4+)
- Gesamtübersicht mit Segmenttabellen

**Lösung**: An allen relevanten Stellen `'solar'` als Dachfläche mit einbeziehen:
- `exportUtils.ts`: `calculateTotalArea` und `calculateNetTotalArea` erweitern um `m.type === 'solar'`
- `pdfExport.ts`: Alle `filter(m => m.type === 'area')` Stellen erweitern zu `m.type === 'area' || m.type === 'solar'`
- Solar-Flächen bekommen eigene Einzelseiten wie normale Flächen (mit Fläche, Neigung, Segmenttabelle)

## Problem 2: Solarplanung als neue PDF-Seite

Nach den Berechnungsmethoden wird eine neue Seite "Solarplanung" eingefügt, die für jede Solar-Messung folgendes zeigt:

### Statische Inhalte (direkt aus den vorhandenen PV-Daten)
- Modultyp, Abmessungen, Leistung pro Modul
- Anzahl Module, Gesamtleistung (kWp)
- Dachneigung, Ausrichtung (Azimut)
- Materialliste (Montagesystem, Elektro)
- 2D-Polygon-Darstellung der Dachfläche mit eingezeichneten Modulpositionen (Canvas-Rendering)

### KI-generierte Stringplanung (Lovable AI)
- Neue Edge Function `solar-string-planning` die den vom User bereitgestellten Prompt nutzt
- Eingabe: Modul-Layout (Positionen, Anzahl, Dachfläche, Ausrichtung, Moduldaten)
- Ausgabe: Stringplanung als strukturierter Text (Tabelle + Beschreibung)
- Wird als optionaler Abschnitt auf der Solarplanungs-Seite eingefügt

## Technischer Ablauf

### 1. Canvas-Rendering der Modulpositionen
Neue Funktion `renderSolarLayout2D` in `renderPolygon2D.ts`:
- Zeichnet das Dach-Polygon
- Zeichnet die Module als Rechtecke an ihren `moduleCorners`-Positionen
- Nummeriert die Module
- Gibt Base64-PNG zurück

### 2. Edge Function für Stringplanung
`supabase/functions/solar-string-planning/index.ts`:
- Nimmt Moduldaten entgegen (Positionen, Specs, Dachausrichtung)
- Sendet den bereitgestellten Prompt an Lovable AI (google/gemini-3-flash-preview)
- Gibt strukturierte Stringplanung als Text zurück

### 3. PDF-Export erweitern
- Vor dem PDF-Rendering: Optional KI-Stringplanung abrufen
- Neue Seite(n) "Solarplanung" nach Berechnungsmethoden einfügen
- Modul-Layout-Zeichnung + Stringplanung-Text rendern

## Dateien

| Datei | Änderung |
|---|---|
| `src/utils/exportUtils.ts` | `calculateTotalArea`/`calculateNetTotalArea`: Solar einbeziehen |
| `src/utils/pdfExport.ts` | ~8 Stellen: Solar als Dachfläche behandeln + neue Solarplanungs-Seite |
| `src/utils/renderPolygon2D.ts` | Neue Funktion `renderSolarLayout2D` für Modul-Layout |
| `supabase/functions/solar-string-planning/index.ts` | Neue Edge Function für KI-Stringplanung |

