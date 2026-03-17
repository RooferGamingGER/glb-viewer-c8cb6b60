

# Fix: Messdaten vollständig beim Teilen übertragen

## Problem

Die Messungen werden als rohe Context-Objekte an die Share-Funktion übergeben. Diese enthalten `THREE.Vector3`-Instanzen (in `points`), die bei der JSON-Serialisierung nicht korrekt konvertiert werden. Außerdem fehlt eine explizite Serialisierung der PV-Planungsdaten.

## Lösung

Die bewährte Serialisierungslogik aus `measurementStorage.ts` wiederverwenden, damit alle Felder (inkl. `pvModuleInfo`, `segments`, `color`, `subType` etc.) sauber als Plain-JSON gespeichert werden.

### Änderungen

**`src/pages/Viewer.tsx`** — `getShareParams`:
- Statt `(window as any).__currentMeasurements` direkt zu übergeben, die Messungen mit derselben Serialisierungslogik wie beim Speichern aufbereiten
- Points von `THREE.Vector3` zu `{x, y, z}` konvertieren
- Alle relevanten Felder explizit mappen (pvModuleInfo, segments, color, subType, dimensions, etc.)

**`src/utils/shareView.ts`** — Serialisierungsfunktion:
- Eine `serializeMeasurementsForShare()` Hilfsfunktion hinzufügen (analog zu `serializeMeasurements` in measurementStorage.ts), die alle Measurement-Felder sauber serialisiert

Das stellt sicher, dass beim Öffnen des Share-Links alle Messungen, PV-Planungen, Dachelemente und sonstige Daten korrekt geladen und angezeigt werden.

