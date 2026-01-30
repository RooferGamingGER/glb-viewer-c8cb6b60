
# Plan: Deckblatt-Optimierung mit Logo-Upload und Footer-Umgestaltung

## Übersicht
Drei Änderungen am PDF-Export:
1. **Footer-Text in Seitennummerierung integrieren** - Die Fußzeile vom Deckblatt entfernen und stattdessen links und rechts neben der Seitenzahl platzieren
2. **Firmenlogo-Upload** - Nutzer können ein eigenes Logo hochladen, das auf dem Deckblatt angezeigt wird
3. **Dezenter Rahmen/Hintergrund für das Deckblatt** - Visuell ansprechenderes Deckblatt

---

## Änderungen

### 1. Footer-Text zur Seitennummerierung verschieben

**Datei:** `src/utils/pdfExport.ts`

**Aktuell (Zeilen 1450-1487):**
- Footer auf dem Deckblatt mit "DrohnenGLB by RooferGaming" und Links
- Seitennummerierung nur mit "Seite X von Y" zentriert (Zeilen 2318-2327)

**Neu:**
- Footer komplett vom Deckblatt entfernen
- Seitennummerierung erweitern:
  - Links: "DrohnenGLB by RooferGaming | drohnenglb.de"
  - Mitte: "Seite X von Y"
  - Rechts: "Drohnenaufmaß ab 90€/Monat | drohnenvermessung-roofergaming.de"

```text
┌─────────────────────────────────────────────────────────────────┐
│  DrohnenGLB | drohnenglb.de    Seite 1 von 8    Aufmaß ab 90€   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Firmenlogo-Upload ermöglichen

**Datei:** `src/utils/pdfExport.ts`

- Interface `CoverPageData` erweitern um `companyLogo?: string` (Base64-Bild)

**Datei:** `src/components/measurement/ExportPdfButton.tsx`

- Neues Eingabefeld im "Berichtsinfos"-Tab für Logo-Upload
- Verwendung eines `<input type="file" accept="image/*">` mit Vorschau
- Logo als Base64 in `form` speichern und an `exportMeasurementsToPdf` übergeben

**Datei:** `src/utils/pdfExport.ts`

- Logo oben auf dem Deckblatt anzeigen (oberhalb des Titels)
- Falls kein Logo vorhanden, normales Layout beibehalten

### 3. Dezenter Rahmen/Hintergrund für Deckblatt

**Datei:** `src/utils/pdfExport.ts`

- Deckblatt-Container mit dezenter visueller Gestaltung:
  - Leichter Rahmen (1px solid #e5e7eb)
  - Dezente Hintergrundfarbe (#fafbfc)
  - Schattierung oder abgerundete Ecken für professionelles Aussehen
  - Eventuell ein farbiger Akzent-Streifen am oberen Rand

---

## Technische Details

### CoverPageData Interface-Erweiterung
```typescript
export interface CoverPageData {
  // ... bestehende Felder
  companyLogo?: string; // Base64-encoded Bild
}
```

### Neue Footer-Struktur (Seitennummerierung)
```typescript
// Anstatt nur zentrierter Seitentext:
const leftText = 'DrohnenGLB | drohnenglb.de';
const centerText = `Seite ${pageNum} von ${totalPages}`;
const rightText = 'Aufmaß ab 90€ | drohnenvermessung-roofergaming.de';

// Links ausgerichtet
pdf.text(leftText, margin, pdfHeight - 5);
// Zentriert
pdf.text(centerText, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
// Rechts ausgerichtet
pdf.text(rightText, pdfWidth - margin, pdfHeight - 5, { align: 'right' });
```

### Logo-Upload UI in ExportPdfButton.tsx
- File-Input mit Vorschau
- Konvertierung zu Base64 via `FileReader`
- Bild-Größenbeschränkung/Skalierung für PDF

---

## Betroffene Dateien
1. `src/utils/pdfExport.ts` - Interface, Deckblatt-Styling, Footer-Entfernung, Seitennummerierung
2. `src/components/measurement/ExportPdfButton.tsx` - Logo-Upload-UI, Form-Erweiterung
