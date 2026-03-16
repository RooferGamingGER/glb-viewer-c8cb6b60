

## Fläche darf nicht durch Solar ersetzt werden

### Problem
Wenn eine Fläche in eine Solarfläche umgewandelt wird, ändert der Code den `type` von `'area'` auf `'solar'`. Dadurch verschwindet die Fläche aus der Messungsliste (`otherMeasurements = measurements.filter(m => m.type !== 'solar')`) und wird nur noch als Solarfläche angezeigt. Die eigentliche Flächenmessung geht verloren.

### Lösung: PV-Daten als Overlay statt Typ-Ersetzung

Die Fläche behält ihren Typ `area`. PV-Daten werden als zusätzliche Eigenschaft (`pvModuleInfo`) auf der bestehenden Fläche gespeichert, ohne den Typ zu ändern.

**Betroffene Dateien und Änderungen:**

1. **`src/components/MeasurementTools.tsx`** (~Zeile 232)
   - `handleConvertAreaToSolar`: Statt `type: 'solar' as any` nur `pvModuleInfo` setzen, Typ bleibt `area`

2. **`src/components/measurement/MeasurementToolControls.tsx`** (~Zeile 142-153)
   - `handleConvertAreaToSolar`: Gleiche Korrektur — kein Typ-Wechsel
   - `solarMeasurements` Filter ändern auf: `m.type === 'area' && m.pvModuleInfo` (Flächen mit PV-Daten)
   - `otherMeasurements` Filter ändern auf: `m.type !== 'solar' && !(m.type === 'area' && m.pvModuleInfo)` ODER besser: Flächen mit PV-Daten in **beiden** Listen anzeigen (einmal als Fläche in der Messliste, einmal als Solar-Content)

3. **`src/components/measurement/MeasurementToolControls.tsx`** (~Zeile 170)
   - PV-Entfernen-Button: Statt `type: 'area'` setzen (unnötig da Typ schon `area` ist), nur `pvModuleInfo: undefined` setzen

4. **`src/utils/exportUtils.ts`**
   - ABS-Export: Flächen mit `pvModuleInfo` sind bereits `type === 'area'`, keine Extra-Logik nötig — die vorherige `|| m.type === 'solar'` Erweiterung kann entfernt werden

5. **`src/components/measurement/SolarToolbar.tsx`**
   - Solar-Zeichentool (`mode === 'solar'`): Neue Solar-Zeichnungen erzeugen weiterhin `type: 'solar'` — das ist OK für direkt gezeichnete Solarflächen. Alternativ auch hier auf `type: 'area'` + `pvModuleInfo` umstellen für Konsistenz.

### Ergebnis
- Fläche bleibt immer als Fläche in der Messliste sichtbar
- PV-Planung wird als Zusatzinfo auf der Fläche dargestellt
- ABS-Export funktioniert ohne Sonderbehandlung
- PV-Daten können jederzeit entfernt werden, Fläche bleibt unverändert

