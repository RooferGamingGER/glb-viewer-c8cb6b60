/**
 * pvShadowAnalysis.ts
 * Raycasting-basierte Jahresverschattungsanalyse für PV-Module.
 * Berechnet für jedes Modul den Anteil verschatteter Stunden über ein ganzes Jahr.
 * Ergebnis: Heatmap (grün → gelb → rot) direkt auf den Modul-Meshes.
 */

import * as THREE from 'three';
import { calculateSolarPosition, solarPositionToVector3 } from '@/utils/sunPosition';

// ============================================================================
// TYPES
// ============================================================================

export interface ShadowAnalysisConfig {
  moduleMeshes: THREE.Mesh[];           // PV-Modul-Meshes aus der Szene
  occluderMeshes: THREE.Mesh[];         // Alle Meshes, die Schatten werfen können
  latitude: number;
  longitude: number;
  tzOffset?: number;                    // Timezone offset in hours (default: 1 = CET)
  northAngle?: number;                  // North angle in degrees
  onProgress?: (progress: number) => void;
}

export interface ShadowAnalysisResult {
  moduleIndex: number;
  shadingFactor: number;  // 0 = unverschattet, 1 = voll verschattet
  annualHoursSun: number;
  annualHoursShaded: number;
}

// ============================================================================
// ANALYSIS
// ============================================================================

// Sample dates: 21st of each month (representative)
const SAMPLE_MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const SAMPLE_DAY = 21;

// Time steps per day (every 30 minutes from 6:00 to 20:00 = 29 steps)
const HOUR_START = 6;
const HOUR_END = 20;
const HOUR_STEP = 0.5;

const SUN_MIN_ELEVATION = 5; // Ignore sun positions below 5° (negligible irradiance)

/**
 * Runs shadow analysis for all module meshes.
 * Returns shading factor per module (0 = no shade, 1 = fully shaded).
 */
export const runShadowAnalysis = async (
  config: ShadowAnalysisConfig
): Promise<ShadowAnalysisResult[]> => {
  const {
    moduleMeshes,
    occluderMeshes,
    latitude,
    longitude,
    tzOffset = 1,
    northAngle = 0,
    onProgress,
  } = config;

  if (moduleMeshes.length === 0) return [];

  const raycaster = new THREE.Raycaster();
  raycaster.far = 500;

  // Pre-compute all sun directions for the year
  const sunDirections: { dir: THREE.Vector3; weight: number }[] = [];
  const year = new Date().getFullYear();

  for (const month of SAMPLE_MONTHS) {
    const date = new Date(year, month, SAMPLE_DAY);
    for (let h = HOUR_START; h <= HOUR_END; h += HOUR_STEP) {
      const totalMinutes = h * 60;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const testDate = new Date(year, month, SAMPLE_DAY, hours, minutes);

      const pos = calculateSolarPosition(latitude, longitude, testDate, tzOffset);
      if (pos.elevation < SUN_MIN_ELEVATION) continue;

      const sunVec = solarPositionToVector3(pos.azimuth, pos.elevation, northAngle, 100);
      const dir = sunVec.clone().normalize();

      // Weight by cos(zenith) ≈ sin(elevation) for irradiance weighting
      const weight = Math.sin((pos.elevation * Math.PI) / 180);

      sunDirections.push({ dir, weight });
    }
  }

  if (sunDirections.length === 0) return moduleMeshes.map((_, i) => ({
    moduleIndex: i, shadingFactor: 0, annualHoursSun: 0, annualHoursShaded: 0,
  }));

  const totalSteps = moduleMeshes.length * sunDirections.length;
  let completedSteps = 0;
  let lastProgress = 0;

  const results: ShadowAnalysisResult[] = [];

  for (let mi = 0; mi < moduleMeshes.length; mi++) {
    const mesh = moduleMeshes[mi];
    mesh.updateMatrixWorld(true);

    // Get center of module in world coordinates
    const center = new THREE.Vector3();
    mesh.getWorldPosition(center);
    // Slight offset above surface to avoid self-intersection
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
    const origin = center.clone().add(normal.clone().multiplyScalar(0.05));

    let weightedSun = 0;
    let weightedShaded = 0;

    for (const { dir, weight } of sunDirections) {
      raycaster.set(origin, dir);
      const hits = raycaster.intersectObjects(occluderMeshes, false);

      if (hits.length > 0) {
        weightedShaded += weight;
      } else {
        weightedSun += weight;
      }

      completedSteps++;
      const progress = Math.floor((completedSteps / totalSteps) * 100);
      if (progress > lastProgress) {
        lastProgress = progress;
        onProgress?.(progress);
      }
    }

    const totalWeight = weightedSun + weightedShaded;
    const shadingFactor = totalWeight > 0 ? weightedShaded / totalWeight : 0;

    const totalHoursPerYear = sunDirections.length * HOUR_STEP * (365 / 12); // rough scale
    results.push({
      moduleIndex: mi,
      shadingFactor,
      annualHoursSun: Math.round((1 - shadingFactor) * totalHoursPerYear),
      annualHoursShaded: Math.round(shadingFactor * totalHoursPerYear),
    });

    // Yield to UI thread every 10 modules
    if (mi % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
};

// ============================================================================
// HEATMAP RENDERING
// ============================================================================

const HEATMAP_COLORS = {
  green: new THREE.Color(0x22c55e),  // < 10% shading
  yellow: new THREE.Color(0xeab308), // 10-30% shading
  orange: new THREE.Color(0xf97316), // 30-50% shading
  red: new THREE.Color(0xef4444),    // > 50% shading
};

const getHeatmapColor = (shadingFactor: number): THREE.Color => {
  if (shadingFactor < 0.10) {
    return HEATMAP_COLORS.green.clone().lerp(HEATMAP_COLORS.yellow, shadingFactor / 0.10);
  } else if (shadingFactor < 0.30) {
    return HEATMAP_COLORS.yellow.clone().lerp(HEATMAP_COLORS.orange, (shadingFactor - 0.10) / 0.20);
  } else if (shadingFactor < 0.50) {
    return HEATMAP_COLORS.orange.clone().lerp(HEATMAP_COLORS.red, (shadingFactor - 0.30) / 0.20);
  } else {
    return HEATMAP_COLORS.red.clone();
  }
};

/** Store original materials to restore later */
const originalMaterials = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>();

/**
 * Apply heatmap colors to module meshes based on shadow analysis results.
 */
export const applyHeatmapToMeshes = (
  moduleMeshes: THREE.Mesh[],
  results: ShadowAnalysisResult[]
): void => {
  for (const result of results) {
    const mesh = moduleMeshes[result.moduleIndex];
    if (!mesh) continue;

    // Store original material
    if (!originalMaterials.has(mesh)) {
      originalMaterials.set(mesh, mesh.material);
    }

    const color = getHeatmapColor(result.shadingFactor);
    mesh.material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
  }
};

/**
 * Reset module meshes to their original materials.
 */
export const resetModuleMaterials = (moduleMeshes: THREE.Mesh[]): void => {
  for (const mesh of moduleMeshes) {
    const original = originalMaterials.get(mesh);
    if (original) {
      mesh.material = original;
      originalMaterials.delete(mesh);
    }
  }
};

// ============================================================================
// HEATMAP LEGEND DATA
// ============================================================================

export interface HeatmapLegendEntry {
  label: string;
  color: string;
}

export const HEATMAP_LEGEND: HeatmapLegendEntry[] = [
  { label: '< 10%', color: '#22c55e' },
  { label: '10-30%', color: '#eab308' },
  { label: '30-50%', color: '#f97316' },
  { label: '> 50%', color: '#ef4444' },
];
