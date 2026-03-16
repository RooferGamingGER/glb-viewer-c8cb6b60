

## Wartungswege zwischen E/W-Reihen korrigieren

### Problem
Die Wartungswege zwischen den Ost/West-Modulpaaren werden aktuell nicht korrekt dargestellt:
1. Der Wartungsweg muss am **tiefsten Punkt** der A-Form (`\_/`) sein — also zwischen der Unterkante des West-Moduls einer Reihe und der Unterkante des Ost-Moduls der nächsten Reihe
2. Der Wartungsweg muss **leer** sein (keine Module), aktuell scheinen dort Module oder zu schmale Lücken zu sein

### Ursache
- `ewPairGap = 0.03m` (3cm) ist der Abstand zwischen aufeinanderfolgenden Paaren — viel zu schmal
- `EW_ROW_MAINTENANCE_GAP = 0.80m` wird nur alle 3 Paare eingefügt
- **Zwischen jedem Paar** fehlt ein gehbarer Abstand am Tiefpunkt der V-Form

### Lösung (`src/utils/pvCalculations.ts`)

1. **Jeden Paar-Abstand auf gehbare Breite setzen**: `DEFAULT_EW_PAIR_GAP` von 0.03m auf **0.40m** erhöhen — das ist der Mindestabstand zwischen den Unterkanten zweier benachbarter A-Formen (Tal/Valley)

2. **Extra-Wartungsintervall entfernen**: Da jetzt jeder Zwischenraum begehbar ist, brauchen wir den zusätzlichen `EW_ROW_MAINTENANCE_GAP` alle 3 Paare nicht mehr — das vereinfacht die Logik und ergibt ein gleichmäßiges Bild

3. **Anpassung der Rows-Berechnung** (Zeile 727-740): Vereinfachte Schleife ohne Sonderfall für Maintenance-Interval

4. **Anpassung der Platzierungsschleife** (Zeile 881-910): Gleicher Abstand zwischen allen Paaren, kein Sonderfall mehr

### Konstanten-Änderung
```
DEFAULT_EW_PAIR_GAP = 0.40  // 40cm gehbarer Abstand zwischen A-Form-Paaren
// EW_ROW_MAINTENANCE_GAP und EW_MAINTENANCE_INTERVAL werden entfernt
```

Die 40cm am Tiefpunkt reichen für Wartungszugang zwischen den Reihen. Der zentrale Wartungsweg (quer, 80cm) bleibt unverändert bestehen.

