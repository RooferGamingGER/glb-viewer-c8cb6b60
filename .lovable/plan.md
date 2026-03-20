

# Kurzanleitung oberhalb der Projekte (nur RooferGaming-Server)

## Konzept

Ein aufklappbarer Anleitungsbereich (Collapsible) oberhalb der Projektliste, der nur angezeigt wird, wenn der aktive Server `drohnenvermessung-server.de` ist. Standardmäßig eingeklappt, damit erfahrene Nutzer nicht gestört werden. Der Zustand wird in `localStorage` gespeichert.

## Inhalt der Anleitung

Angepasster Text, der den DrohnenGLB-Upload-Workflow beschreibt (nicht den WebODM-Server-Upload), inkl.:

**Willkommen & Schnellstart:**
- Projekt öffnen → "Neuer Task" → Bilder hochladen
- Hinweis auf GPS-Validierung (automatische Prüfung auf fehlende/fehlerhafte GPS-Daten)
- GLB-Upload für bestehende Projekte

**Tipps für optimale Ergebnisse:**
- 60–80 Fotos für ein EFH empfohlen
- Bildüberlappung min. 65%, ideal 70–72%
- Mehr Bilder = bessere Ergebnisse

**Häufige Fehlerquellen:**
- Zu wenige Bilder
- Fehlerhafte GPS-Daten (v.a. erste Aufnahmen)
- Hinweis: GPS-Prüfung erfolgt automatisch vor dem Upload
- Erkennung: Aufgabenname statt Straßenname = fehlende GPS-Daten

**Hilfe & Links:**
- Drohnenflug-Anleitung (externer Link)
- Praxisvideo (YouTube)
- Kontakt: info@drohnenvermessung-roofergaming.de

## Umsetzung

### `src/pages/ServerProjects.tsx`

- Neuer Bereich zwischen dem "Projekte"-Header (Zeile 308-312) und der Projektliste (Zeile 313)
- Nutzt `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` aus bestehender UI-Bibliothek
- Server-Prüfung: `activeServer?.includes("roofergaming")` → nur dann anzeigen
- `localStorage`-Key `drohnenglb_guide_collapsed` für Zustand
- Icons: `BookOpen`, `Camera`, `AlertTriangle`, `Mail`, `ExternalLink`, `Youtube`
- Kompaktes Design: Glass-Panel mit Accordion-Sektionen für die einzelnen Bereiche

