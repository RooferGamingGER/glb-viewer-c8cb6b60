

# Robuste Geraete-Erkennung: Touch-basiert statt Viewport-basiert

## Zusammenfassung

Aktuell wird ein schmales Desktop-Browserfenster (<= 1024px) faelschlicherweise als Tablet erkannt. Die Loesung: Eine neue `isTouchDevice()`-Funktion, die **Hardware-Signale** (Touch-Punkte, Pointer-Typ, Hover-Faehigkeit) mit dem User-Agent kombiniert. Nur echte Touch-Geraete bekommen die Mobile-UI.

## Aenderungen

### Datei 1: `src/hooks/use-mobile.tsx`

**Was aendert sich:**
- Neue exportierte Hilfsfunktion `isTouchDevice()` mit 4 kombinierten Signalen
- `useIsMobile()` baut darauf auf statt nur auf `matchMedia(max-width)` + UA
- Rueckgabewert und API bleiben identisch (boolean) -- alle bestehenden Nutzer funktionieren weiter

**Neue Logik `isTouchDevice()`:**
1. `navigator.maxTouchPoints > 0` oder `'ontouchstart' in window`
2. `matchMedia('(pointer: coarse)')` -- Finger statt Maus
3. `matchMedia('(hover: none)')` -- kein Hover moeglich
4. User-Agent Regex (android, iphone, ipad, etc.)

Ergebnis: `true` wenn UA eindeutig mobil ist ODER mindestens 2 von 3 Hardware-Signalen zutreffen. Alle Abfragen defensiv mit optionalem Chaining (`?.`) und Fallbacks.

**`useIsMobile()` vereinfacht:** Gibt `isTouchDevice()` zurueck, einmalig berechnet via `useState` + `useEffect`. Reagiert weiterhin auf `orientationchange`.

### Datei 2: `src/hooks/useScreenOrientation.tsx`

**Was aendert sich:**
- Entfernung der `TABLET_MAX_WIDTH = 1024` Konstante
- `isMobileOrTablet` basiert **nur noch auf `isTouchDevice()`** (via `useIsMobile()`), nicht mehr auf Viewport-Breite
- Phone vs. Tablet Unterscheidung ueber `Math.min(innerWidth, innerHeight) > 600`
- Kein `windowWidth` State mehr noetig fuer die Geraete-Klassifizierung

**Neue Logik:**
```text
isMobileOrTablet = useIsMobile()  // = isTouchDevice()
isTablet = isMobileOrTablet && Math.min(width, height) > 600
isPhone  = isMobileOrTablet && !isTablet
```

### Keine Aenderungen noetig in:
- `MeasurementTools.tsx` -- nutzt `useScreenOrientation()`, bekommt korrekte Werte automatisch
- `MobileBottomBar.tsx` -- wird nur gerendert wenn `useBottomSheet` true ist
- `ModelViewer.tsx`, `Index.tsx`, `Test.tsx` etc. -- nutzen `useIsMobile()` dessen API gleich bleibt
- `sidebar.tsx`, `TabbedMeasurementSidebar.tsx` etc. -- gleiche API

## Erwartetes Verhalten nach der Aenderung

| Geraet | Touch? | Pointer | Hover | UA mobil | Ergebnis |
|---|---|---|---|---|---|
| Desktop-PC (schmales Fenster) | Nein | fine | hover | Nein | Desktop-UI (Sidebar) |
| iPad / Android-Tablet | Ja | coarse | none | Ja | Mobile-UI (Bottom-Bar) |
| iPhone / Android-Handy | Ja | coarse | none | Ja | Mobile-UI (Bottom-Bar) |
| Laptop mit Touchscreen | Ja | fine/coarse | hover | Nein | Haengt von Signalen ab -- meist Desktop |

## Technische Details

- Alle `matchMedia`-Aufrufe mit `?.` und `?? false` abgesichert (SSR-safe)
- `isTouchDevice()` wird als separate exportierte Funktion bereitgestellt, damit sie auch ausserhalb von React-Hooks nutzbar ist
- Die Erkennung laeuft einmal beim Mount und aktualisiert sich bei `orientationchange`
- Keine neuen Dependencies noetig

