

## Flachdach E/W: Wartungswege wie im Referenzbild

### Beobachtung aus dem Referenzbild
Das Foto zeigt die typische Ost/West-Aufständerung auf einem Flachdach:
- **E/W-Paare berühren sich am Hochpunkt (First/Ridge)** — kein Abstand oben ✓ (schon implementiert)
- **Zwischen jedem Paar-Paar gibt es einen deutlich sichtbaren Abstand am Tiefpunkt (Tal)** — ca. 30-40cm, damit eine Person sich bewegen kann
- **Kein zentraler Querweg sichtbar** — die Module füllen die gesamte Breite aus, nur die Längsabstände zwischen den Reihen (am Tal) dienen als Wartungszugang

### Aktuelles Problem
Die gelben/hellen Artefakte am **Hochpunkt** (Ridge) der E/W-Module kommen von **Z-Fighting der Seitenflächen** der 3D-Box-Module. Wo East- und West-Modul am First aufeinandertreffen, überlagern sich die Seitenflächen (front/back faces) und erzeugen visuelle Artefakte.

### Lösung

| Datei | Änderung |
|-------|----------|
| `src/utils/measurementVisuals.ts` | **Ridge-Seitenflächen ausblenden**: Bei E/W-Modulpaaren die inneren Seitenflächen (Back-Face des East-Moduls, Front-Face des West-Moduls) nicht rendern, um Z-Fighting am First zu eliminieren |
| `src/utils/pvCalculations.ts` | **Modul-Metadaten erweitern**: `direction` ('east'/'west') in die Modul-Daten durchreichen, damit der Renderer weiß, welche Seitenfläche am Ridge liegt |

### Technischer Ansatz

1. **`generatePVModuleGrid`**: Die `direction` Info ('east'/'west') pro Modul bereits zurückgeben (wird schon an `placeModule` übergeben, muss nur in die Rückgabe-Daten)

2. **`renderPVModuleGrid`**: Für E/W-Module die Ridge-seitige Seitenfläche der Box-Geometrie weglassen:
   - East-Modul: **Back-Face** (Vertices 18-23) ausblenden → dort trifft es auf das West-Modul
   - West-Modul: **Front-Face** (Vertices 12-17) ausblenden → dort trifft es auf das East-Modul
   - Umsetzung: Die entsprechende Face-Group auf 0 Vertices setzen oder das Material transparent machen

