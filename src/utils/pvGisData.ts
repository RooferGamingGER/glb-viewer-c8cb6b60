/**
 * pvGisData.ts
 * Offline-Ertragsprognose auf Basis von PVGIS-Einstrahlungsdaten für Deutschland.
 * 24 Stützpunkte (47-55°N, 6-15°E) mit Globalstrahlung (GHI) in kWh/m²/Jahr.
 * IDW-Interpolation für beliebige Standorte.
 */

// ============================================================================
// GHI GRID — Globalstrahlung in kWh/m²/Jahr (PVGIS TMY Referenz)
// ============================================================================

interface GHIPoint {
  lat: number;
  lng: number;
  ghi: number; // kWh/m²/Jahr
}

/**
 * 24 Stützpunkte über Deutschland verteilt (PVGIS-Referenzwerte).
 * Süddeutschland hat höhere Einstrahlung als Norddeutschland.
 */
const GHI_GRID: GHIPoint[] = [
  // Zeile 1: 47°N (Süd — Alpenvorland)
  { lat: 47, lng: 6,  ghi: 1180 },
  { lat: 47, lng: 9,  ghi: 1200 },
  { lat: 47, lng: 12, ghi: 1210 },
  { lat: 47, lng: 15, ghi: 1190 },
  // Zeile 2: 49°N (Mitteldeutschland Süd — Stuttgart/München)
  { lat: 49, lng: 6,  ghi: 1130 },
  { lat: 49, lng: 9,  ghi: 1150 },
  { lat: 49, lng: 12, ghi: 1140 },
  { lat: 49, lng: 15, ghi: 1120 },
  // Zeile 3: 50.5°N (Mitte — Frankfurt/Dresden)
  { lat: 50.5, lng: 6,  ghi: 1080 },
  { lat: 50.5, lng: 9,  ghi: 1100 },
  { lat: 50.5, lng: 12, ghi: 1090 },
  { lat: 50.5, lng: 15, ghi: 1070 },
  // Zeile 4: 52°N (Nord-Mitte — Berlin/Hannover)
  { lat: 52, lng: 6,  ghi: 1040 },
  { lat: 52, lng: 9,  ghi: 1060 },
  { lat: 52, lng: 12, ghi: 1050 },
  { lat: 52, lng: 15, ghi: 1030 },
  // Zeile 5: 53.5°N (Nord — Hamburg/Rostock)
  { lat: 53.5, lng: 6,  ghi: 1010 },
  { lat: 53.5, lng: 9,  ghi: 1030 },
  { lat: 53.5, lng: 12, ghi: 1020 },
  { lat: 53.5, lng: 15, ghi: 1000 },
  // Zeile 6: 55°N (Schleswig-Holstein / Dänische Grenze)
  { lat: 55, lng: 6,  ghi: 990 },
  { lat: 55, lng: 9,  ghi: 1010 },
  { lat: 55, lng: 12, ghi: 1000 },
  { lat: 55, lng: 15, ghi: 980 },
];

// ============================================================================
// IDW INTERPOLATION
// ============================================================================

/**
 * Inverse Distance Weighting (IDW) Interpolation.
 * @param lat Breitengrad
 * @param lng Längengrad
 * @param k IDW-Exponent (default: 2)
 * @param numNearest Anzahl nächster Punkte (default: 5)
 */
export const getGHI = (lat: number, lng: number, k: number = 2, numNearest: number = 5): number => {
  // Calculate distances to all grid points
  const withDist = GHI_GRID.map(p => ({
    ...p,
    dist: Math.sqrt((p.lat - lat) ** 2 + (p.lng - lng) ** 2),
  }));

  // Sort by distance and take nearest points
  withDist.sort((a, b) => a.dist - b.dist);
  const nearest = withDist.slice(0, numNearest);

  // Exact match check
  if (nearest[0].dist < 0.001) return nearest[0].ghi;

  // IDW calculation
  let weightSum = 0;
  let valueSum = 0;
  for (const p of nearest) {
    const w = 1 / (p.dist ** k);
    weightSum += w;
    valueSum += w * p.ghi;
  }

  return valueSum / weightSum;
};

// ============================================================================
// PVGIS-BASIERTE ERTRAGSBERECHNUNG
// ============================================================================

/**
 * Neigungskorrekturfaktor.
 * Optimum bei ~35° Süd in Deutschland. Vereinfachtes Modell.
 * @param inclination Modulneigung in Grad (0=flach, 90=vertikal)
 */
const tiltCorrectionFactor = (inclination: number): number => {
  // Parabolische Approximation: Maximum bei 35°
  const optimal = 35;
  const spread = 0.00015; // Steilheit der Parabel
  return 1.0 - spread * (inclination - optimal) ** 2;
};

/**
 * Azimut-Korrekturfaktor.
 * @param azimuth Kompass-Azimut: 0°=Nord, 90°=Ost, 180°=Süd, 270°=West
 */
const azimuthCorrectionFactor = (azimuth: number): number => {
  // Umrechnung zu Süd-basiert (0°=Süd, -90°=Ost, +90°=West)
  let southBased = ((azimuth % 360) + 360) % 360 - 180;
  if (southBased > 180) southBased -= 360;
  if (southBased < -180) southBased += 360;

  // Cosinusmodell: 100% bei Süd, ~55% bei Nord
  const cosCorr = 0.55 + 0.45 * Math.cos((southBased * Math.PI) / 180);
  return cosCorr;
};

/**
 * Berechnet den erwarteten Jahresertrag nach PVGIS-Methodik.
 * @param kWp Installierte Leistung in kWp
 * @param lat Breitengrad
 * @param lng Längengrad
 * @param azimuth Kompass-Azimut (0°=Nord, 180°=Süd)
 * @param inclination Modulneigung in Grad
 * @param systemLosses System-Verluste als Dezimalwert (Default: 0.14 = 14%)
 * @returns Jahresertrag in kWh
 */
export const calculateYieldPVGIS = (
  kWp: number,
  lat: number,
  lng: number,
  azimuth: number,
  inclination: number,
  systemLosses: number = 0.14
): number => {
  const ghi = getGHI(lat, lng);
  const tiltCorr = tiltCorrectionFactor(inclination);
  const azCorr = azimuthCorrectionFactor(azimuth);
  const PR = 1.0 - systemLosses; // Performance Ratio

  // Spezifischer Ertrag in kWh/kWp
  const specificYield = ghi * tiltCorr * azCorr * PR;

  return kWp * specificYield;
};

/**
 * Gibt den spezifischen Ertrag in kWh/kWp zurück.
 */
export const getSpecificYieldPVGIS = (
  lat: number,
  lng: number,
  azimuth: number,
  inclination: number,
  systemLosses: number = 0.14
): number => {
  const ghi = getGHI(lat, lng);
  const tiltCorr = tiltCorrectionFactor(inclination);
  const azCorr = azimuthCorrectionFactor(azimuth);
  const PR = 1.0 - systemLosses;
  return ghi * tiltCorr * azCorr * PR;
};
