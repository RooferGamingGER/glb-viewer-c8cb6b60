

## Plan: Ost-West-Aufständerung korrigieren – A-Form / Zelt-Struktur

### Problem

Die aktuelle E-W-Logik platziert Module zwar paarweise, aber die Neigungsrichtung ist falsch. Statt einer **A-Form (Zelt)** mit sich berührenden Oberkanten entstehen seitlich gekippte Module. Die Geometrie muss grundlegend überarbeitet werden.

### Korrekte Geometrie

**A-Form-Paar ("Duo-Segment"):**
- Modul A (Ost): Neigung +β um Längsachse, Oberkante = First (höchster Punkt)
- Modul B (West): Neigung -β um Längsachse, Oberkante = First (höchster Punkt)
- Beide Module treffen sich an der Oberkante (First), die Unterkanten liegen auf dem Dach

```text
Querschnitt eines Paares:

        First (Oberkante)
           /\
          /  \
    Ost  /    \  West
        /      \
  ─────/────────\──────  Dachfläche
       ← Paar →
```

**Grundfläche eines Paares:**
- Modulprojektion = `moduleHeight × cos(β)` (Grundfläche eines geneigten Moduls)
- Paarbreite = `2 × moduleHeight × cos(β)` (kein Spalt am First)
- Zwischen Paaren: kleiner Montage-Spalt (~5cm)
- Nach jedem 3. Paar: Wartungsgang (40cm)
- Firsthöhe = `moduleHeight × sin(β)`

### Änderungen in `src/utils/pvCalculations.ts`

**1. Konstanten anpassen:**
- `EW_PAIR_GAP = 0.05` bleibt (Spalt zwischen Paaren)
- `EW_MAINTENANCE_GAP = 0.40` auf 40cm setzen (statt 30cm)
- Neu: `EW_MAINTENANCE_INTERVAL = 3` (Wartungsgang nach jedem 3. Paar)

**2. `rowPitch` für E-W korrigieren:**
- Aktuell: `moduleFootprint * 2 + EW_PAIR_GAP + EW_MAINTENANCE_GAP` (Wartungsgang bei jedem Paar)
- Neu: Basis-Paarbreite = `2 × moduleFootprint` + `EW_PAIR_GAP`
- Wartungsgang nur alle 3 Paare → separate Berechnung in der Schleife

**3. E-W Platzierungslogik komplett überarbeiten:**

```text
Für jedes Paar p an Position rowBaseW:
  
  Modul A (Ost-geneigt):
    - Zentrum bei cw = rowBaseW
    - Corners 2,3 (hintere/obere Kante Richtung First) werden angehoben
    - Pivot: Vorderkante (corners 0,1) bleibt auf Dach
  
  Modul B (West-geneigt):  
    - Zentrum bei cw = rowBaseW + moduleFootprint + kleiner Spalt
    - Corners 0,3 (vordere Kante Richtung First) werden angehoben
    - Pivot: Hinterkante (corners 1,2) bleibt auf Dach
    
  → Beide "First-Kanten" treffen sich in der Mitte auf gleicher Höhe
```

**4. Corner-Lifting korrigieren:**

Aktuell hebt der Code die falschen Ecken an. Korrekte Zuordnung (corners: 0=BL, 1=BR, 2=TR, 3=TL im v2/W-Richtung):

- **Ost-Modul** (vorderes Modul im Paar): Oberkante = höheres W → Corners **2,3 anheben** um `moduleHeight × sin(β)`
- **West-Modul** (hinteres Modul im Paar): Oberkante = niedrigeres W → Corners **0,3 anheben** um `moduleHeight × sin(β)` 
  - Korrektur: Da West-Modul mit höherem W-Offset platziert wird, sind dessen First-Corners die mit **niedrigerem W** (also 0,1) → **Corners 0,1 anheben**

**5. Rows-Berechnung für E-W:**
- Berechne Gesamtanzahl Paare die in W-Richtung passen
- Berücksichtige Wartungsgänge alle 3 Paare
- Gesamtbreite = `n_pairs × pairWidth + (n_pairs-1) × EW_PAIR_GAP + floor(n_pairs/3) × EW_MAINTENANCE_GAP`

### Keine Änderungen nötig an:
- **Datenmodell** (types bleiben gleich)
- **UI** (SolarMeasurementContent bleibt gleich)
- **pvModuleRenderer.ts** (3D-Rendering nutzt die Corner-Punkte direkt)

### Zusammenfassung
Nur `src/utils/pvCalculations.ts` wird geändert: Die E-W-Schleife wird komplett neu geschrieben, damit Module paarweise als A-Form platziert werden mit korrektem Corner-Lifting und Wartungsgängen alle 3 Paare.

