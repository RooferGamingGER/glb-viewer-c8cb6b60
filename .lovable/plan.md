

# Fix: Boundary-Schritt öffnet sich nicht nach GPS-Prüfung

## Problem

`proceedToBoundary` hat eine leere Dependency-Array `[]`, referenziert aber `handleStartUpload`, das zu diesem Zeitpunkt noch nicht stabil ist. Die Funktion wird mit einer veralteten/undefined Referenz gecaptured und funktioniert daher nicht korrekt.

## Lösung

In `src/components/CreateTaskDialog.tsx`:

1. **`proceedToBoundary`** — `handleStartUpload` aus dem Callback entfernen und stattdessen den Upload-Pfad separat behandeln. Wenn `photosToUse.length === 0`, direkt `setStep("config")` setzen statt `handleStartUpload()` aufzurufen (kein Boundary = zurück zur Config mit Toast). Alternativ `handleStartUpload` in die Dependency-Array aufnehmen, aber das erzeugt eine zirkuläre Abhängigkeit.

   Konkret: Zeile 88-96 ändern zu:
   ```typescript
   const proceedToBoundary = useCallback((photosToUse: PhotoGps[]) => {
     setGpsPhotos(photosToUse);
     if (photosToUse.length === 0) {
       toast.info("Keine GPS-Daten in den Bildern gefunden. Karte wird übersprungen.");
       setStep("config");
       return;
     }
     setStep("boundary");
   }, []);
   ```

   Das ist die sicherste Lösung — wenn keine GPS-Daten vorhanden sind, geht es zurück zur Config-Seite statt direkt den Upload zu starten (der User kann dann von dort aus starten).

   Oder besser: Die leere Dependency-Array ist das Hauptproblem. Die Funktion sollte korrekte Dependencies haben. Da `handleStartUpload` erst später definiert wird, ist die sauberste Lösung, den direkten Aufruf zu vermeiden.

