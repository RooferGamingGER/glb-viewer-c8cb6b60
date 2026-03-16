

## Plan: PV-Belegung erweitern – Hochkant-Standard & Flachdach-Unterstützung

### Problemstellung

1. **Steildach – Montagerichtung**: Aktuell wählt der Algorithmus automatisch die Orientierung mit den meisten Modulen (`auto`), was oft Querformat (landscape) ergibt. In der Praxis werden PV-Module auf Steildächern jedoch **standardmäßig hochkant (portrait)** montiert. Die Quermontage soll weiterhin als Option verfügbar bleiben.

2. **Flachdach – Aufständerung**: Wenn die erkannte Dachneigung < 5° beträgt, soll das Tool automatisch erkennen, dass es sich um ein Flachdach handelt, und dem Nutzer zwei Belegungsvarianten anbieten:
   - **Süd-Aufständerung** (alle Module nach Süden geneigt, mit Reihenabstand gegen Verschattung)
   - **Ost-West-Aufständerung** (Module Rücken an Rücken in A-Form, maximale Flächennutzung)

---

### Änderung 1: Datenmodell (`src/types/measurements.ts`)

Neue Felder in `PVModuleInfo`:
```typescript
roofType?: 'pitched' | 'flat';           // Steildach oder Flachdach (auto-erkannt bei < 5°)
flatRoofLayout?: 'south' | 'east-west';  // Belegungsvariante bei Flachdach
tiltAngle?: number;                       // Aufständerungswinkel in Grad
rowSpacing?: number;                      // Berechneter Reihenabstand (nur Anzeige)
flatRoofEdgeDistance?: number;            // Randabstand bei Flachdach (Standard: 0.50m für Windlast)
```

---

### Änderung 2: Standard-Orientierung auf Hochkant (`src/utils/pvCalculations.ts`)

- **`calculatePVModulePlacement`**: Wenn `forcedOrientation === 'auto'`, wird jetzt **portrait bevorzugt** (statt "mehr Module gewinnt"). Nur bei expliziter Wahl von `'landscape'` wird Querformat verwendet.
- Die bestehende Auto-Logik (`portrait.count >= landscape.count`) wird durch `portrait` als Default ersetzt.

---

### Änderung 3: Flachdach-Erkennung und Berechnung (`src/utils/pvCalculations.ts`)

**Neue Funktion: `calculateFlatRoofRowSpacing`**
```
h = moduleHeight × sin(tiltAngle)
L = h / tan(sunElevation)        // sunElevation ≈ 15° (Deutschland, 21. Dez)
Reihenabstand = moduleHeight × cos(tiltAngle) + L
```

**Erweiterte `generatePVModuleGrid`**:
- Prüft `roofType === 'flat'` 
- **Süd-Variante**: Module in Reihen mit berechnetem Reihenabstand. Modulbreite entlang v1, Reihen entlang v2 mit Abstand `rowSpacing`.
- **Ost-West-Variante**: Modulpaare Rücken an Rücken (Paarabstand ~5cm), zwischen Paaren ~30cm Wartungsgang. Doppelte Flächennutzung gegenüber Süd.
- Randabstand `flatRoofEdgeDistance` (Standard 50cm statt 30cm)

**Erweiterte `calculatePVModulePlacement`**:
- Erkennt automatisch Flachdach wenn `roofInclination < 5°`
- Setzt `roofType: 'flat'` und Standard-Werte für `tiltAngle` (25° bei Süd, 12° bei O/W)

---

### Änderung 4: 3D-Darstellung (`src/utils/pvModuleRenderer.ts`)

- **`createDetailedPVModuleMesh`**: Neuer Parameter `tiltAngle` und `tiltDirection`
- Bei Flachdach-Modulen: Nach der Ausrichtung zur Dachfläche wird eine zusätzliche Rotation um die lokale Kippachse angewendet
  - Süd: Hinterkante angehoben um `moduleHeight × sin(tiltAngle)`
  - Ost-West: Abwechselnd +tiltAngle / -tiltAngle

---

### Änderung 5: UI (`src/components/measurement/SolarMeasurementContent.tsx`)

Neuer Bereich oberhalb der bestehenden Übersicht:

**Bei erkanntem Flachdach (Neigung < 5°):**
- Info-Banner: "Flachdach erkannt – Aufständerung erforderlich"
- Toggle: **Süd-Aufständerung** / **Ost-West-Aufständerung**
- Slider: Aufständerungswinkel (5°–35°, Standard je nach Variante)
- Anzeige: Berechneter Reihenabstand (nur lesen)
- Slider: Randabstand (30–100cm, Standard 50cm)

**Bei Steildach:**
- Orientierung-Toggle zeigt jetzt drei Optionen: **Hochkant** (Standard) / **Quer** / **Auto**
- "Hochkant" ist vorausgewählt

**Ertragsberechnung:**
- Bei Flachdach wird der `tiltAngle` als effektive Dachneigung für die Ertragsberechnung verwendet (da reale Dachneigung ~0°)

---

### Änderung 6: Orientierungs-Steuerung (`src/components/measurement/PVModuleSelect.tsx`)

- `onOrientationChange` Callback: Standard-Wert auf `'portrait'` statt `'auto'`
- UI-Labels: "Hochkant" statt "Portrait", "Quer" statt "Landscape"

---

### Implementierungsreihenfolge
1. Typ-Erweiterung (PVModuleInfo)
2. Standard-Orientierung auf Hochkant umstellen
3. Flachdach-Erkennung + Reihenabstandsformel
4. Grid-Generierung für Flachdach (Süd + O/W)
5. 3D-Rendering mit Aufständerung
6. UI-Steuerung in SolarMeasurementContent

