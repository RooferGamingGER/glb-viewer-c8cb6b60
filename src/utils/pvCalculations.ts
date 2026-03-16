import { Point, PVModuleInfo, PVModuleSpec, Measurement, PVMaterials, PVMountingSystem, PVElectricalSystem } from '@/types/measurements';
import { calculatePolygonArea, calculateQuadrilateralDimensions, generateSegments } from './measurementCalculations';
import { isPointInPolygon } from './rectangleFinder';
import * as THREE from 'three';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.134;
export const DEFAULT_MODULE_HEIGHT = 1.722;

// Norm-compliant distances in meters
export const DEFAULT_EDGE_DISTANCE = 0.30;    // 30cm from roof edge (Norm: 30-50cm)
export const DEFAULT_RIDGE_DISTANCE = 0.50;   // 50cm from ridge
export const DEFAULT_MODULE_SPACING = 0.02;   // 2cm between modules

// Common PV module templates
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  { name: "Standard 420W", width: 1.134, height: 1.722, power: 420, efficiency: 21.4 },
  { name: "Standard 450W", width: 1.140, height: 1.770, power: 450, efficiency: 21.0 },
  { name: "Standard 400W", width: 1.052, height: 1.757, power: 400, efficiency: 21.6 },
  { name: "Hochleistung 500W", width: 1.134, height: 2.094, power: 500, efficiency: 22.3 },
];

// Electrical constants
const MAX_SYSTEM_VOLTAGE = 600;        // V DC (residential standard)
const MODULE_VOC = 41.5;              // Typical Voc for ~420-450W module
const MAX_MODULES_PER_STRING = Math.floor(MAX_SYSTEM_VOLTAGE / MODULE_VOC); // ~14

// Inverter sizes available (kW)
const INVERTER_SIZES = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25];

// Mounting system constants
const ROOF_HOOK_SPACING = 1.2;        // 1 hook per 1.2m of rail
const RAIL_STANDARD_LENGTH = 3.15;    // Standard rail length in meters

// Yield constants
const ANNUAL_YIELD_FACTOR_DEFAULT = 950; // kWh/kWp (Germany average)

// Flat roof constants
const FLAT_ROOF_INCLINATION_THRESHOLD = 5; // degrees - below this = flat roof
const DEFAULT_FLAT_ROOF_EDGE_DISTANCE = 0.50; // 50cm for wind load ballast
const DEFAULT_TILT_ANGLE_SOUTH = 25; // degrees for south-facing tilt
const DEFAULT_TILT_ANGLE_EW = 12; // degrees for east-west tilt
const WINTER_SUN_ELEVATION_DE = 15; // degrees - sun elevation Dec 21 noon in Germany
const EW_PAIR_GAP = 0.05; // 5cm gap between adjacent E-W pairs
const EW_MAINTENANCE_GAP = 0.40; // 40cm maintenance gang between pair groups
const EW_MAINTENANCE_INTERVAL = 3; // maintenance gang after every 3rd pair

// Exclusion zone safety radius for point elements (vents, hooks) in meters
// Roof element types that create exclusion zones
const EXCLUSION_ELEMENT_TYPES = ['chimney', 'skylight', 'deductionarea', 'vent', 'hook', 'other'];

const POINT_ELEMENT_SAFETY_RADIUS = 0.30; // 30cm

/**
 * Extract exclusion zones from measurements (roof elements that block PV modules).
 * Polygon elements (chimney, skylight, deductionarea) → polygon zones.
 * Point elements (vent, hook) → square zones with safety radius.
 */
export const extractExclusionZones = (measurements: Measurement[]): Point[][] => {
  const zones: Point[][] = [];
  
  for (const m of measurements) {
    if (!EXCLUSION_ELEMENT_TYPES.includes(m.type)) continue;
    if (!m.points || m.points.length === 0) continue;
    
    if (m.points.length >= 3) {
      // Polygon element (chimney, skylight, deductionarea, etc.)
      zones.push([...m.points]);
    } else if (m.points.length === 1 || m.points.length === 2) {
      // Point element (vent, hook) — create a square exclusion zone around it
      const center = m.points[0];
      const r = POINT_ELEMENT_SAFETY_RADIUS;
      zones.push([
        { x: center.x - r, y: center.y, z: center.z - r },
        { x: center.x + r, y: center.y, z: center.z - r },
        { x: center.x + r, y: center.y, z: center.z + r },
        { x: center.x - r, y: center.y, z: center.z + r },
      ]);
    }
  }
  
  return zones;
};

/**
 * Check if any corner of a module (in world XZ coords) overlaps with any exclusion zone.
 */
const isModuleOverlappingExclusion = (
  worldCorners: { x: number; z: number }[],
  exclusionZones: Point[][]
): boolean => {
  if (!exclusionZones || exclusionZones.length === 0) return false;
  
  // Check if any module corner is inside any exclusion zone
  for (const zone of exclusionZones) {
    if (zone.length < 3) continue;
    for (const corner of worldCorners) {
      if (isPointInPolygon(corner, zone)) {
        return true;
      }
    }
    // Also check if center of module is inside exclusion zone
    const cx = worldCorners.reduce((s, c) => s + c.x, 0) / worldCorners.length;
    const cz = worldCorners.reduce((s, c) => s + c.z, 0) / worldCorners.length;
    if (isPointInPolygon({ x: cx, z: cz }, zone)) {
      return true;
    }
  }
  
  return false;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate least-squares best-fit plane for a set of 3D points.
 * Returns { normal, point } where point is the centroid.
 */
const fitPlane = (points: Point[]): { normal: THREE.Vector3; centroid: THREE.Vector3; plane: THREE.Plane } => {
  const n = points.length;
  const centroid = new THREE.Vector3(
    points.reduce((s, p) => s + p.x, 0) / n,
    points.reduce((s, p) => s + p.y, 0) / n,
    points.reduce((s, p) => s + p.z, 0) / n
  );

  if (n < 3) {
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), centroid);
    return { normal: new THREE.Vector3(0, 1, 0), centroid, plane };
  }

  // Compute covariance matrix
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of points) {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const dz = p.z - centroid.z;
    xx += dx * dx; xy += dx * dy; xz += dx * dz;
    yy += dy * dy; yz += dy * dz; zz += dz * dz;
  }

  // Find normal via smallest eigenvalue (power iteration on cross-covariance)
  // For simplicity, use cross product of two dominant directions
  const v1 = new THREE.Vector3().subVectors(
    new THREE.Vector3(points[1].x, points[1].y, points[1].z),
    new THREE.Vector3(points[0].x, points[0].y, points[0].z)
  );

  // Find the point farthest from line p0-p1
  let maxDist = 0;
  let bestIdx = 2;
  const lineDir = v1.clone().normalize();
  for (let i = 2; i < n; i++) {
    const v = new THREE.Vector3(points[i].x - points[0].x, points[i].y - points[0].y, points[i].z - points[0].z);
    const proj = v.clone().projectOnVector(lineDir);
    const dist = v.clone().sub(proj).length();
    if (dist > maxDist) {
      maxDist = dist;
      bestIdx = i;
    }
  }

  const v2 = new THREE.Vector3().subVectors(
    new THREE.Vector3(points[bestIdx].x, points[bestIdx].y, points[bestIdx].z),
    new THREE.Vector3(points[0].x, points[0].y, points[0].z)
  );

  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  // Ensure normal points upward
  if (normal.y < 0) normal.negate();

  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(normal, centroid);

  return { normal, centroid, plane };
};

/**
 * Find the two longest edges of a polygon and derive orthogonal grid axes.
 * Returns { v1, v2 } where v1 is along the longest edge and v2 is perpendicular in the plane.
 */
const findGridAxes = (points: Point[], planeNormal: THREE.Vector3): { v1: THREE.Vector3; v2: THREE.Vector3 } => {
  const edges: { v: THREE.Vector3; len: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const v = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    edges.push({ v, len: v.length() });
  }

  // Sort by length descending
  edges.sort((a, b) => b.len - a.len);

  // v1 = longest edge direction, projected into the plane
  let v1 = edges[0].v.clone().normalize();
  v1.sub(planeNormal.clone().multiplyScalar(v1.dot(planeNormal))).normalize();

  // v2 = perpendicular to v1 in the plane
  let v2 = new THREE.Vector3().crossVectors(planeNormal, v1).normalize();

  return { v1, v2 };
};

/**
 * Inset a polygon by a given distance (shrink all edges inward).
 * Works in 3D by projecting to 2D, insetting, then projecting back.
 */
const insetPolygon = (
  points: Point[], 
  distance: number,
  planeNormal: THREE.Vector3,
  centroid: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3
): { x: number; z: number }[] => {
  // Project points to 2D (v1, v2 coordinate system)
  const pts2D = points.map(p => {
    const v = new THREE.Vector3(p.x - centroid.x, p.y - centroid.y, p.z - centroid.z);
    return { x: v.dot(v1), z: v.dot(v2) };
  });

  // Simple inset: move each edge inward by 'distance'
  const n = pts2D.length;
  const insetPts: { x: number; z: number }[] = [];

  for (let i = 0; i < n; i++) {
    const prev = pts2D[(i - 1 + n) % n];
    const curr = pts2D[i];
    const next = pts2D[(i + 1) % n];

    // Edge vectors
    const e1 = { x: curr.x - prev.x, z: curr.z - prev.z };
    const e2 = { x: next.x - curr.x, z: next.z - curr.z };

    // Inward normals (rotate 90° CW for clockwise polygon, CCW for counter-clockwise)
    const n1 = { x: e1.z, z: -e1.x };
    const n2 = { x: e2.z, z: -e2.x };
    const len1 = Math.sqrt(n1.x * n1.x + n1.z * n1.z) || 1;
    const len2 = Math.sqrt(n2.x * n2.x + n2.z * n2.z) || 1;
    n1.x /= len1; n1.z /= len1;
    n2.x /= len2; n2.z /= len2;

    // Average normal at vertex
    const avgN = { x: (n1.x + n2.x) / 2, z: (n1.z + n2.z) / 2 };
    const avgLen = Math.sqrt(avgN.x * avgN.x + avgN.z * avgN.z) || 1;
    avgN.x /= avgLen;
    avgN.z /= avgLen;

    // Check direction (should point inward)
    // Use centroid as reference
    const centroid2D = { x: 0, z: 0 }; // centroid is origin in this coord system
    const toCentroid = { x: centroid2D.x - curr.x, z: centroid2D.z - curr.z };
    const dot = avgN.x * toCentroid.x + avgN.z * toCentroid.z;
    
    if (dot < 0) {
      avgN.x = -avgN.x;
      avgN.z = -avgN.z;
    }

    // Scale by distance, accounting for angle between edges
    const sinHalf = Math.max(0.3, avgLen); // Prevent excessive scaling at sharp angles
    const scale = distance / sinHalf;

    insetPts.push({
      x: curr.x + avgN.x * Math.min(scale, distance * 3),
      z: curr.z + avgN.z * Math.min(scale, distance * 3)
    });
  }

  return insetPts;
};

/**
 * Check if all 4 corners of a module are inside a 2D polygon
 */
const isModuleInsidePolygon = (
  corners: { x: number; z: number }[],
  polygon: Point[]
): boolean => {
  return corners.every(c => isPointInPolygon(c, polygon));
};

/**
 * Project a 2D point (in v1/v2 coordinate system) back to 3D on the plane
 */
const projectTo3D = (
  u: number, 
  w: number, 
  centroid: THREE.Vector3, 
  v1: THREE.Vector3, 
  v2: THREE.Vector3,
  plane: THREE.Plane,
  normal: THREE.Vector3
): THREE.Vector3 => {
  const p = centroid.clone()
    .add(v1.clone().multiplyScalar(u))
    .add(v2.clone().multiplyScalar(w));
  
  // Project onto the plane to get correct Y
  const dist = plane.distanceToPoint(p);
  p.sub(normal.clone().multiplyScalar(dist));
  
  return p;
};

// ============================================================================
// FLAT ROOF CALCULATIONS
// ============================================================================

/**
 * Calculate minimum row spacing for flat roof south-facing layout.
 * Based on shadow avoidance at winter solstice (Dec 21) noon.
 * L = h / tan(sunElevation), where h = moduleHeight * sin(tiltAngle)
 */
export const calculateFlatRoofRowSpacing = (
  moduleHeight: number,
  tiltAngle: number,
  sunElevation: number = WINTER_SUN_ELEVATION_DE
): number => {
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const sunRad = (sunElevation * Math.PI) / 180;
  const h = moduleHeight * Math.sin(tiltRad);
  const shadowLength = h / Math.tan(sunRad);
  const moduleFootprint = moduleHeight * Math.cos(tiltRad);
  return moduleFootprint + shadowLength;
};

/**
 * Detect if roof is flat based on inclination.
 */
export const isRoofFlat = (inclination: number): boolean => {
  return inclination < FLAT_ROOF_INCLINATION_THRESHOLD;
};

/**
 * Get default flat roof configuration values.
 */
export const getDefaultFlatRoofConfig = (layout: 'south' | 'east-west' = 'south') => ({
  roofType: 'flat' as const,
  flatRoofLayout: layout,
  tiltAngle: layout === 'south' ? DEFAULT_TILT_ANGLE_SOUTH : DEFAULT_TILT_ANGLE_EW,
  flatRoofEdgeDistance: DEFAULT_FLAT_ROOF_EDGE_DISTANCE,
});

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Extract roof edge measurements from the measurements array
 */
export const extractRoofEdgeMeasurements = (measurements: Measurement[]): {
  ridgeLength?: number;
  eaveLength?: number;
  vergeWidth1?: number;
  vergeWidth2?: number;
  minVergeWidth?: number;
  minLength?: number;
  hasAllEdges: boolean;
  isValid: boolean;
  validationMessage?: string;
} => {
  const ridgeMeasurements = measurements.filter(m => m.type === 'ridge');
  const eaveMeasurements = measurements.filter(m => m.type === 'eave');
  const vergeMeasurements = measurements.filter(m => m.type === 'verge');

  const result: {
    ridgeLength?: number;
    eaveLength?: number;
    vergeWidth1?: number;
    vergeWidth2?: number;
    minVergeWidth?: number;
    minLength?: number;
    hasAllEdges: boolean;
    isValid: boolean;
    validationMessage?: string;
  } = { hasAllEdges: false, isValid: true };

  if (ridgeMeasurements.length > 0) result.ridgeLength = ridgeMeasurements[0].value;
  if (eaveMeasurements.length > 0) result.eaveLength = eaveMeasurements[0].value;
  if (vergeMeasurements.length >= 1) result.vergeWidth1 = vergeMeasurements[0].value;
  if (vergeMeasurements.length >= 2) result.vergeWidth2 = vergeMeasurements[1].value;

  if (result.ridgeLength !== undefined && result.eaveLength !== undefined) {
    result.minLength = Math.min(result.ridgeLength, result.eaveLength);
  } else {
    result.minLength = result.ridgeLength ?? result.eaveLength;
  }

  if (result.vergeWidth1 !== undefined && result.vergeWidth2 !== undefined) {
    result.minVergeWidth = Math.min(result.vergeWidth1, result.vergeWidth2);
  } else {
    result.minVergeWidth = result.vergeWidth1 ?? result.vergeWidth2;
  }

  result.hasAllEdges = result.minVergeWidth !== undefined && result.minLength !== undefined;

  return result;
};

/**
 * Calculate PV module placement on a roof area polygon.
 * Uses polygon clipping, proper axis alignment, and norm-compliant edge distances.
 */
export const calculatePVModulePlacement = (
  points: Point[],
  moduleWidth: number = DEFAULT_MODULE_WIDTH,
  moduleHeight: number = DEFAULT_MODULE_HEIGHT,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING,
  userDimensions?: { width: number; length: number },
  roofEdgeInfo?: {
    minVergeWidth?: number;
    minLength?: number;
    hasAllEdges: boolean;
    isValid?: boolean;
    validationMessage?: string;
  },
  findOptimalRectangle: boolean = true,
  forcedOrientation: 'portrait' | 'landscape' | 'auto' = 'auto',
  exclusionZones: Point[][] = []
): PVModuleInfo => {
  const area = calculatePolygonArea(points);

  // Fit plane to all points (stable for >3 points)
  const { normal, centroid, plane } = fitPlane(points);
  const { v1, v2 } = findGridAxes(points, normal);

  // Project all points to 2D for clipping
  const pts2D = points.map(p => {
    const v = new THREE.Vector3(p.x - centroid.x, p.y - centroid.y, p.z - centroid.z);
    return { x: v.dot(v1), z: v.dot(v2) };
  });

  // Compute 2D bounding box in the v1/v2 coordinate system
  let minU = Infinity, maxU = -Infinity, minW = Infinity, maxW = -Infinity;
  pts2D.forEach(p => {
    minU = Math.min(minU, p.x);
    maxU = Math.max(maxU, p.x);
    minW = Math.min(minW, p.z);
    maxW = Math.max(maxW, p.z);
  });

  const totalWidth = maxU - minU;
  const totalLength = maxW - minW;

  // Available dimensions after edge distance
  const availableWidth = Math.max(0, totalWidth - 2 * edgeDistance);
  const availableLength = Math.max(0, totalLength - 2 * edgeDistance);

  // Calculate bounding box in world coordinates for compatibility
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  });

  // Try both orientations with polygon clipping, pick the one with more modules
  const tryOrientation = (portrait: boolean): { count: number; cols: number; rows: number } => {
    // Portrait = long side vertical (along v2), short side horizontal (along v1)
    const mw = portrait ? moduleWidth : moduleHeight;   // dimension along v1 (horizontal)
    const mh = portrait ? moduleHeight : moduleWidth;    // dimension along v2 (vertical)

    const cols = Math.floor(availableWidth / (mw + moduleSpacing));
    const rows = Math.floor(availableLength / (mh + moduleSpacing));

    // Now count how many actually fit inside the polygon
    let count = 0;
    const startU = minU + edgeDistance + mw / 2;
    const startW = minW + edgeDistance + mh / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cu = startU + c * (mw + moduleSpacing);
        const cw = startW + r * (mh + moduleSpacing);

        // Module corners in 2D
        const corners = [
          { x: cu - mw / 2, z: cw - mh / 2 },
          { x: cu + mw / 2, z: cw - mh / 2 },
          { x: cu + mw / 2, z: cw + mh / 2 },
          { x: cu - mw / 2, z: cw + mh / 2 },
        ];

        // Check all corners are inside the polygon (in 2D v1/v2 space)
        // Convert back to world coords for the check
        const worldCorners = corners.map(c2 => {
          const p3d = centroid.clone()
            .add(v1.clone().multiplyScalar(c2.x))
            .add(v2.clone().multiplyScalar(c2.z));
          return { x: p3d.x, z: p3d.z };
        });

        if (isModuleInsidePolygon(worldCorners, points)) {
          // Check exclusion zones (roof elements like chimneys, skylights)
          if (!isModuleOverlappingExclusion(worldCorners, exclusionZones)) {
            count++;
          }
        }
      }
    }

    return { count, cols, rows };
  };

  const portrait = tryOrientation(true);
  const landscape = tryOrientation(false);

  // Default to portrait (Hochkant) for pitched roofs — industry standard
  const usePortrait = forcedOrientation === 'portrait'
    ? true
    : forcedOrientation === 'landscape'
      ? false
      : true; // Default: portrait (Hochkant)

  const chosen = usePortrait ? portrait : landscape;
  const moduleCount = chosen.count;
  const columns = chosen.cols;
  const rows = chosen.rows;

  const moduleArea = moduleCount * moduleWidth * moduleHeight;
  const coveragePercent = area > 0 ? Math.min((moduleArea / area) * 100, 100) : 0;

  const result: PVModuleInfo = {
    moduleWidth,
    moduleHeight,
    moduleCount,
    edgeDistance,
    moduleSpacing,
    coveragePercent,
    orientation: usePortrait ? 'portrait' : 'landscape',
    columns,
    rows,
    boundingWidth: totalWidth,
    boundingLength: totalLength,
    boundingHeight: totalWidth,
    availableWidth,
    availableLength,
    startX: minX + edgeDistance,
    startZ: minZ + edgeDistance,
    minX, maxX, minZ, maxZ,
    actualArea: area,
    manualDimensions: false,
    pvModuleSpec: PV_MODULE_TEMPLATES[0],
    points: [...points],
    exclusionZones: exclusionZones.length > 0 ? exclusionZones : undefined,
    roofType: 'pitched',
  };

  // Auto-detect flat roof based on inclination
  const { inclination } = calculateRoofOrientation(points);
  if (isRoofFlat(inclination)) {
    const flatConfig = getDefaultFlatRoofConfig('south');
    result.roofType = flatConfig.roofType;
    result.flatRoofLayout = flatConfig.flatRoofLayout;
    result.tiltAngle = flatConfig.tiltAngle;
    result.flatRoofEdgeDistance = flatConfig.flatRoofEdgeDistance;
    result.rowSpacing = calculateFlatRoofRowSpacing(
      usePortrait ? moduleHeight : moduleWidth,
      flatConfig.tiltAngle
    );
  }

  return result;
};

/**
 * Generate the grid points for PV module placement aligned with the roof surface.
 * Uses polygon clipping to ensure modules don't extend beyond roof edges.
 */
export const generatePVModuleGrid = (
  pvInfo: PVModuleInfo,
  baseY: number,
  roofEdgeSegments?: { from: Point; to: Point }[]
): {
  modulePoints: Point[][];
  moduleOriginalIndices: number[];
  gridLines: { from: Point; to: Point }[];
} => {
  const modulePoints: Point[][] = [];
  const moduleOriginalIndices: number[] = [];
  const gridLines: { from: Point; to: Point }[] = [];

  const roofPoints = pvInfo.points;
  if (!roofPoints || roofPoints.length < 3) {
    console.warn("Not enough roof points for PV grid generation");
    return { modulePoints, moduleOriginalIndices, gridLines };
  }

  // Fit plane using all roof points (stable for complex polygons)
  const { normal, centroid, plane } = fitPlane(roofPoints);
  const { v1, v2 } = findGridAxes(roofPoints, normal);

  // Project roof points to 2D
  const pts2D = roofPoints.map(p => {
    const v = new THREE.Vector3(p.x - centroid.x, p.y - centroid.y, p.z - centroid.z);
    return { x: v.dot(v1), z: v.dot(v2) };
  });

  let minU = Infinity, maxU = -Infinity, minW = Infinity, maxW = -Infinity;
  pts2D.forEach(p => {
    minU = Math.min(minU, p.x); maxU = Math.max(maxU, p.x);
    minW = Math.min(minW, p.z); maxW = Math.max(maxW, p.z);
  });

  // Module dimensions based on orientation
  // Portrait = long side vertical (v2), short side horizontal (v1)
  const mw = pvInfo.orientation === 'portrait' ? pvInfo.moduleWidth : pvInfo.moduleHeight;
  const mh = pvInfo.orientation === 'portrait' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  const spacing = pvInfo.moduleSpacing || DEFAULT_MODULE_SPACING;
  const isFlatRoof = pvInfo.roofType === 'flat';
  const edge = isFlatRoof 
    ? (pvInfo.flatRoofEdgeDistance || DEFAULT_FLAT_ROOF_EDGE_DISTANCE) 
    : (pvInfo.edgeDistance || DEFAULT_EDGE_DISTANCE);

  // For flat roofs, row pitch depends on layout
  // For E-W: we calculate pair placement manually in the loop, so rowPitch is not used the same way
  let rowPitch: number;
  let ewPairWidth: number = 0; // ground footprint of one A-form pair
  if (isFlatRoof) {
    const tiltAngle = pvInfo.tiltAngle || DEFAULT_TILT_ANGLE_SOUTH;
    const tiltRad = (tiltAngle * Math.PI) / 180;
    const moduleFootprint = mh * Math.cos(tiltRad); // ground projection of one tilted module
    if (pvInfo.flatRoofLayout === 'east-west') {
      // A-form pair: 2 modules leaning together at the top, no gap at ridge
      ewPairWidth = 2 * moduleFootprint;
      // rowPitch not used directly — we iterate pairs manually
      rowPitch = mh + spacing; // fallback, not actually used for E-W
    } else {
      // South: full row spacing to avoid shadowing
      rowPitch = calculateFlatRoofRowSpacing(mh, tiltAngle);
    }
  } else {
    rowPitch = mh + spacing;
  }

  const startU = minU + edge + mw / 2;
  const startW = minW + edge + mh / 2;

  const cols = Math.floor((maxU - minU - 2 * edge) / (mw + spacing));
  // For E-W: calculate how many pairs fit in the W direction
  let rows: number;
  if (isFlatRoof && pvInfo.flatRoofLayout === 'east-west') {
    const availW = maxW - minW - 2 * edge;
    // Each pair takes ewPairWidth. Between pairs: EW_PAIR_GAP. Every EW_MAINTENANCE_INTERVAL pairs: extra EW_MAINTENANCE_GAP.
    // Binary search / iterative count for how many pairs fit
    let pairCount = 0;
    let usedW = 0;
    while (true) {
      const nextPairW = ewPairWidth;
      const gapAfter = (pairCount > 0) ? EW_PAIR_GAP : 0;
      const maintenanceGap = (pairCount > 0 && pairCount % EW_MAINTENANCE_INTERVAL === 0) ? EW_MAINTENANCE_GAP : 0;
      const needed = gapAfter + maintenanceGap + nextPairW;
      if (usedW + needed > availW) break;
      usedW += needed;
      pairCount++;
    }
    rows = pairCount; // 'rows' here means pairs for E-W
  } else {
    rows = Math.floor((maxW - minW - 2 * edge) / rowPitch);
  }

  const zFightingOffset = 0.015; // 1.5cm above roof surface

  // Grid transform: offset and rotation
  const offsetU = pvInfo.gridOffsetU || 0;
  const offsetW = pvInfo.gridOffsetW || 0;
  const rotationDeg = pvInfo.gridRotation || 0;
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotationRad);
  const sinR = Math.sin(rotationRad);

  // Grid center for rotation pivot (center of the bounding grid area)
  const gridCenterU = (minU + maxU) / 2;
  const gridCenterW = (minW + maxW) / 2;

  // Helper to apply rotation around grid center + offset
  const transformPoint = (u: number, w: number): { u: number; w: number } => {
    // Translate to grid center
    const du = u - gridCenterU;
    const dw = w - gridCenterW;
    // Rotate
    const ru = cosR * du - sinR * dw;
    const rw = sinR * du + cosR * dw;
    // Translate back + apply offset
    return { u: ru + gridCenterU + offsetU, w: rw + gridCenterW + offsetW };
  };

  // Track sequential index for removed module filtering
  let sequentialIndex = 0;
  const removedIndices = pvInfo.removedModuleIndices || [];

  // Helper to place a single module at (cu, cw) and return true if placed
  const placeModule = (cu: number, cw: number, tiltInfo?: { angle: number; direction: 'south' | 'east' | 'west' }) => {
    const rawCorners = [
      { u: cu - mw / 2, w: cw - mh / 2 },
      { u: cu + mw / 2, w: cw - mh / 2 },
      { u: cu + mw / 2, w: cw + mh / 2 },
      { u: cu - mw / 2, w: cw + mh / 2 },
    ];

    const corners2D = rawCorners.map(c2 => transformPoint(c2.u, c2.w));

    const worldCorners = corners2D.map(c2 => {
      const p3d = centroid.clone()
        .add(v1.clone().multiplyScalar(c2.u))
        .add(v2.clone().multiplyScalar(c2.w));
      return { x: p3d.x, z: p3d.z };
    });

    if (!isModuleInsidePolygon(worldCorners, roofPoints)) return;

    const exclZones = pvInfo.exclusionZones || [];
    if (isModuleOverlappingExclusion(worldCorners, exclZones)) return;

    const currentIndex = sequentialIndex;
    sequentialIndex++;
    if (removedIndices.includes(currentIndex)) return;

    // Project corners to 3D on the roof plane
    const corners3D: Point[] = corners2D.map(c2 => {
      const p3d = projectTo3D(c2.u, c2.w, centroid, v1, v2, plane, normal);
      p3d.add(normal.clone().multiplyScalar(zFightingOffset));
      return { x: p3d.x, y: p3d.y, z: p3d.z };
    });

    // For flat roof modules, apply tilt by raising appropriate edge
    if (tiltInfo && tiltInfo.angle > 0) {
      const tiltRad = (tiltInfo.angle * Math.PI) / 180;
      const liftHeight = mh * Math.sin(tiltRad);
      // corners: 0=BL(low-u,low-w), 1=BR(high-u,low-w), 2=TR(high-u,high-w), 3=TL(low-u,high-w)
      // v2/W axis runs from low-w to high-w
      if (tiltInfo.direction === 'south') {
        // South: back edge (high-w = corners 2,3) raised
        corners3D[2].y += liftHeight;
        corners3D[3].y += liftHeight;
      } else if (tiltInfo.direction === 'east') {
        // East-facing module in A-form: ridge at high-W side → raise corners 2,3
        corners3D[2].y += liftHeight;
        corners3D[3].y += liftHeight;
      } else if (tiltInfo.direction === 'west') {
        // West-facing module in A-form: ridge at low-W side → raise corners 0,1
        corners3D[0].y += liftHeight;
        corners3D[1].y += liftHeight;
      }
    }

    modulePoints.push(corners3D);
    moduleOriginalIndices.push(currentIndex);

    for (let i = 0; i < 4; i++) {
      gridLines.push({ from: corners3D[i], to: corners3D[(i + 1) % 4] });
    }
  };

  if (isFlatRoof && pvInfo.flatRoofLayout === 'east-west') {
    // East-West A-form: pairs of modules leaning together at the top (ridge)
    // Module A (east-facing): front edge on roof, back edge raised toward ridge
    // Module B (west-facing): front edge on roof, back edge raised toward ridge
    // Together they form an A/tent shape: /\
    const tiltAngle = pvInfo.tiltAngle || DEFAULT_TILT_ANGLE_EW;
    const tiltRad = (tiltAngle * Math.PI) / 180;
    const moduleFootprint = mh * Math.cos(tiltRad); // ground projection of one tilted module
    const liftHeight = mh * Math.sin(tiltRad); // ridge height
    
    // Place pairs along W direction
    let currentW = minW + edge + moduleFootprint / 2; // center of first east-module
    
    for (let pairIdx = 0; pairIdx < rows; pairIdx++) {
      // Gap before this pair (except first)
      if (pairIdx > 0) {
        currentW += EW_PAIR_GAP;
        // Maintenance gang every EW_MAINTENANCE_INTERVAL pairs
        if (pairIdx % EW_MAINTENANCE_INTERVAL === 0) {
          currentW += EW_MAINTENANCE_GAP;
        }
      }
      
      // East-module center (first module in pair, facing east / front edge at low W)
      const cwEast = currentW;
      // West-module center (second module in pair, facing west / front edge at high W)
      const cwWest = currentW + moduleFootprint; // no gap at ridge - tops touch
      
      for (let c = 0; c < cols; c++) {
        const cu = startU + c * (mw + spacing);
        
        // East-facing module: corners 2,3 (high-W edge = ridge) are raised
        placeModule(cu, cwEast, { angle: tiltAngle, direction: 'east' });
        // West-facing module: corners 0,1 (low-W edge = ridge) are raised
        placeModule(cu, cwWest, { angle: tiltAngle, direction: 'west' });
      }
      
      // Advance past this pair
      currentW = cwWest + moduleFootprint / 2;
    }
  } else {
    // Pitched roof (normal) or flat roof south
    const tiltInfo = isFlatRoof 
      ? { angle: pvInfo.tiltAngle || DEFAULT_TILT_ANGLE_SOUTH, direction: 'south' as const }
      : undefined;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cu = startU + c * (mw + spacing);
        const cw = startW + r * rowPitch;
        placeModule(cu, cw, tiltInfo);
      }
    }
  }

  console.log(`PV Grid: ${modulePoints.length} modules placed (${cols}×${rows} grid, ${pvInfo.orientation})`);

  return { modulePoints, moduleOriginalIndices, gridLines };
};

// ============================================================================
// MOUNTING SYSTEM
// ============================================================================

export const calculateMountingSystem = (pvInfo: PVModuleInfo): PVMountingSystem => {
  if (!pvInfo.columns || !pvInfo.rows || !pvInfo.moduleCount) {
    return { railLength: 0, roofHookCount: 0, middleClampCount: 0, endClampCount: 0, railConnectorCount: 0 };
  }

  const actualModules = pvInfo.moduleCount;
  const cols = pvInfo.columns;
  const rows = pvInfo.rows;

  // 2 rails per row, each rail spans all columns
  const mw = pvInfo.orientation === 'portrait' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  const spacing = pvInfo.moduleSpacing || DEFAULT_MODULE_SPACING;
  const singleRailLength = cols * mw + (cols - 1) * spacing;
  const totalRails = rows * 2;
  const totalRailLength = totalRails * singleRailLength;

  // Rail connectors: each rail that exceeds standard length needs connectors
  let railConnectorCount = 0;
  for (let i = 0; i < totalRails; i++) {
    if (singleRailLength > RAIL_STANDARD_LENGTH) {
      railConnectorCount += Math.ceil(singleRailLength / RAIL_STANDARD_LENGTH) - 1;
    }
  }

  // Roof hooks: 1 per 1.2m of rail
  const hooksPerRail = Math.max(2, Math.ceil(singleRailLength / ROOF_HOOK_SPACING) + 1);
  const roofHookCount = hooksPerRail * totalRails;

  // Clamps: 2 end clamps per rail end (4 per rail), middle clamps between modules
  const endClampCount = totalRails * 2; // 1 end clamp per rail end
  // Between each pair of adjacent modules on a rail: 1 middle clamp
  const middleClampCount = totalRails * Math.max(0, cols - 1);

  return {
    railLength: Math.ceil(totalRailLength * 10) / 10,
    roofHookCount,
    middleClampCount,
    endClampCount,
    railConnectorCount,
  };
};

// ============================================================================
// ELECTRICAL SYSTEM
// ============================================================================

/**
 * Select the best inverter size for a given generator power
 */
const selectInverterSize = (generatorPowerKw: number): number => {
  // Inverter should be 0.85-1.0x of generator power
  const targetMin = generatorPowerKw * 0.85;
  const targetMax = generatorPowerKw * 1.0;

  // Find the best match
  for (const size of INVERTER_SIZES) {
    if (size >= targetMin && size <= targetMax * 1.15) {
      return size;
    }
  }

  // If no perfect match, pick the closest one ≥ 85% of generator
  for (const size of INVERTER_SIZES) {
    if (size >= targetMin) return size;
  }

  return INVERTER_SIZES[INVERTER_SIZES.length - 1];
};

export const calculateElectricalSystem = (
  pvInfo: PVModuleInfo,
  inverterDistance: number = 10
): PVElectricalSystem => {
  const modulePower = pvInfo.pvModuleSpec?.power || 420;
  const totalPowerKw = (pvInfo.moduleCount * modulePower) / 1000;

  // String calculation based on voltage limits
  const modulesPerString = Math.min(MAX_MODULES_PER_STRING, pvInfo.moduleCount);
  const stringCount = Math.max(1, Math.ceil(pvInfo.moduleCount / modulesPerString));

  // Adjust modules per string to distribute evenly
  const actualModulesPerString = Math.ceil(pvInfo.moduleCount / stringCount);

  // Inverter sizing
  const inverterPower = selectInverterSize(totalPowerKw);
  const inverterCount = totalPowerKw > 20 ? Math.ceil(totalPowerKw / 15) : 1;

  // Cable lengths
  const stringCableLength = pvInfo.moduleCount * 1.0; // ~1m per module within string
  const mainCableLength = stringCount * inverterDistance * 2; // + and - per string
  const acCableLength = inverterCount * 8; // ~8m per inverter to distribution board

  // MC4 connector pairs
  const connectorPairCount = stringCount * 2 + pvInfo.moduleCount; // inter-module + string ends

  return {
    stringCableLength: Math.ceil(stringCableLength),
    mainCableLength: Math.ceil(mainCableLength),
    acCableLength: Math.ceil(acCableLength),
    connectorPairCount,
    inverterCount,
    inverterPower: Math.round(inverterPower * 10) / 10,
    stringCount,
    modulesPerString: actualModulesPerString,
  };
};

// ============================================================================
// MATERIALS
// ============================================================================

export const calculatePVMaterials = (
  pvInfo: PVModuleInfo,
  inverterDistance: number = 10
): PVMaterials => {
  if (!pvInfo.moduleCount || !pvInfo.pvModuleSpec) {
    return {
      totalModuleCount: 0,
      totalPower: 0,
      moduleSpec: PV_MODULE_TEMPLATES[0],
      mountingSystem: { railLength: 0, roofHookCount: 0, middleClampCount: 0, endClampCount: 0, railConnectorCount: 0 },
      electricalSystem: { stringCableLength: 0, mainCableLength: 0, acCableLength: 0, connectorPairCount: 0, inverterCount: 0, inverterPower: 0, stringCount: 0, modulesPerString: 0 },
      includesSurgeProtection: true,
      includesMonitoringSystem: true,
      notes: ["Keine Materialliste verfügbar."],
    };
  }

  const modulePower = pvInfo.pvModuleSpec.power || 420;
  const totalPower = (pvInfo.moduleCount * modulePower) / 1000;

  const mountingSystem = calculateMountingSystem(pvInfo);
  const electricalSystem = calculateElectricalSystem(pvInfo, inverterDistance);

  const notes: string[] = [];

  // Yield estimate
  const yieldFactor = pvInfo.yieldFactor || ANNUAL_YIELD_FACTOR_DEFAULT;
  const annualYield = Math.round(totalPower * yieldFactor);
  notes.push(`Geschätzter Jahresertrag: ca. ${annualYield.toLocaleString('de-DE')} kWh/Jahr (${yieldFactor} kWh/kWp)`);

  // String info
  notes.push(`Stringaufteilung: ${electricalSystem.stringCount} String(s) à ${electricalSystem.modulesPerString} Module`);

  // Inverter recommendation
  notes.push(`Wechselrichter-Empfehlung: ${electricalSystem.inverterCount}× ${electricalSystem.inverterPower} kW`);

  if (totalPower > 10) {
    notes.push("Anlage >10 kWp: Dreiphasige Einspeisung prüfen.");
  }

  if (totalPower > 25) {
    notes.push("Anlage >25 kWp: Direktvermarktungspflicht beachten.");
  }

  return {
    totalModuleCount: pvInfo.moduleCount,
    totalPower,
    moduleSpec: pvInfo.pvModuleSpec,
    mountingSystem,
    electricalSystem,
    includesSurgeProtection: true,
    includesMonitoringSystem: true,
    notes,
  };
};

// ============================================================================
// UTILITY FUNCTIONS (keep existing API)
// ============================================================================

export const calculatePVPower = (moduleCount: number, powerPerModule: number = 420): number => {
  return (moduleCount * powerPerModule) / 1000;
};

export const formatPVModuleInfo = (pvInfo: PVModuleInfo): string => {
  const orientationText = pvInfo.orientation === 'portrait' ? 'Hochkant' : 'Quer';
  const roofText = pvInfo.roofType === 'flat' 
    ? ` | ${pvInfo.flatRoofLayout === 'east-west' ? 'O/W' : 'Süd'} ${pvInfo.tiltAngle || 25}°`
    : '';
  return `${pvInfo.moduleCount} Module (${orientationText}${roofText}), ${pvInfo.coveragePercent.toFixed(1)}% Abdeckung`;
};

export const calculateTotalPVPower = (measurements: Measurement[]): number => {
  const pvModules = measurements.filter(m => m.type === 'pvmodule' && m.powerOutput);
  const totalWatts = pvModules.reduce((sum, module) => sum + (module.powerOutput || 0), 0);
  return totalWatts / 1000;
};

export const calculatePVModuleDimensions = (
  points: Point[],
  moduleSpec: PVModuleSpec
): { area: number; powerOutput: number } => {
  const area = calculatePolygonArea(points);
  return { area, powerOutput: moduleSpec.power };
};

export const formatPVMaterials = (materials: PVMaterials): string => {
  if (!materials || !materials.mountingSystem || !materials.electricalSystem) {
    return "Keine Materialliste verfügbar";
  }
  return `${materials.totalModuleCount} Module (${materials.totalPower.toFixed(1)} kWp), ${materials.mountingSystem.railLength.toFixed(1)}m Schienen`;
};

export const calculateAnnualYield = (
  totalPower: number,
  orientation: string = 'default',
  location: string = 'germany'
): number => {
  let yieldFactor = ANNUAL_YIELD_FACTOR_DEFAULT;
  let locationFactor = 1.0;
  if (location === 'southern_germany') locationFactor = 1.05;
  else if (location === 'northern_germany') locationFactor = 0.95;
  return totalPower * yieldFactor * locationFactor;
};

export const calculateRoofOrientation = (points: Point[]): {
  azimuth: number;
  direction: string;
  inclination: number;
} => {
  if (points.length < 3) {
    return { azimuth: 180, direction: 'S', inclination: 30 };
  }

  try {
    const { normal } = fitPlane(points);
    
    // Inclination: angle between normal and vertical (Y-axis)
    const inclination = Math.acos(Math.min(1, Math.abs(normal.y))) * (180 / Math.PI);

    // Downslope direction = horizontal projection of the normal
    // In Three.js: +X = East, +Z = South (camera convention)
    // Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
    const hx = normal.x;
    const hz = normal.z;
    
    // If roof is nearly flat, default to South
    if (Math.sqrt(hx * hx + hz * hz) < 0.01) {
      return { azimuth: 180, direction: 'S', inclination };
    }

    // atan2(x, -z) gives angle from South=0. We want North=0.
    // Downslope points in the direction the normal's horizontal component points
    let azimuth = Math.atan2(hx, -hz) * (180 / Math.PI);
    if (azimuth < 0) azimuth += 360;

    // German cardinal directions
    const directions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW", "N"];
    const direction = directions[Math.round(azimuth / 45)];

    return { azimuth, direction, inclination };
  } catch {
    return { azimuth: 180, direction: 'S', inclination: 30 };
  }
};

// ============================================================================
// DGS-BASED YIELD CALCULATION FOR GERMANY
// ============================================================================

/**
 * DGS (Deutsche Gesellschaft für Sonnenenergie) correction factors.
 * Reference: 100% = South, 30° tilt = 1000 kWh/kWp in Central Germany.
 * Rows: tilt angles. Columns: orientation categories.
 */
const DGS_TILT_ANGLES = [0, 15, 30, 45, 60, 90];
const DGS_TABLE: Record<string, number[]> = {
  // tilt →               0°     15°    30°    45°    60°    90°
  'S':                  [0.87,  0.95,  1.00,  0.97,  0.88,  0.55],
  'SO_SW':              [0.87,  0.93,  0.96,  0.92,  0.82,  0.52],
  'O_W':                [0.87,  0.88,  0.85,  0.78,  0.67,  0.42],
  'NO_NW':              [0.87,  0.82,  0.72,  0.60,  0.47,  0.32],
  'N':                  [0.87,  0.80,  0.65,  0.50,  0.37,  0.25],
};

const REFERENCE_YIELD = 1000; // kWh/kWp at optimal (South, 30°) in Germany

/**
 * Map azimuth (0-360°) to DGS orientation category
 */
const azimuthToDGSCategory = (azimuth: number): string => {
  // Normalize to 0-360
  const a = ((azimuth % 360) + 360) % 360;
  // Symmetric: distance from South (180°)
  const diff = Math.abs(a - 180);
  
  if (diff <= 22.5) return 'S';           // 157.5 - 202.5
  if (diff <= 67.5) return 'SO_SW';       // SO: 112.5-157.5, SW: 202.5-247.5
  if (diff <= 112.5) return 'O_W';        // O: 67.5-112.5, W: 247.5-292.5
  if (diff <= 157.5) return 'NO_NW';      // NO: 22.5-67.5, NW: 292.5-337.5
  return 'N';                              // 0-22.5, 337.5-360
};

/**
 * Linear interpolation
 */
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Bilinear interpolation in the DGS table for precise yield factor.
 * Returns factor as fraction (0-1) relative to optimal.
 */
const interpolateDGS = (category: string, tilt: number): number => {
  const factors = DGS_TABLE[category];
  if (!factors) return 0.87; // fallback: flat roof

  const clampedTilt = Math.max(0, Math.min(90, tilt));
  
  // Find surrounding tilt angles
  let lowerIdx = 0;
  for (let i = 0; i < DGS_TILT_ANGLES.length - 1; i++) {
    if (clampedTilt >= DGS_TILT_ANGLES[i]) lowerIdx = i;
  }
  const upperIdx = Math.min(lowerIdx + 1, DGS_TILT_ANGLES.length - 1);
  
  if (lowerIdx === upperIdx) return factors[lowerIdx];
  
  const t = (clampedTilt - DGS_TILT_ANGLES[lowerIdx]) / (DGS_TILT_ANGLES[upperIdx] - DGS_TILT_ANGLES[lowerIdx]);
  return lerp(factors[lowerIdx], factors[upperIdx], t);
};

/**
 * Calculate yield factor in kWh/kWp based on azimuth and tilt,
 * using DGS correction factors for Germany.
 */
export const calculateYieldFactorFromOrientation = (
  azimuth: number,
  inclination: number
): number => {
  const category = azimuthToDGSCategory(azimuth);
  const factor = interpolateDGS(category, inclination);
  return Math.round(REFERENCE_YIELD * factor);
};

export const updatePVModuleInfoWithOrientation = (
  pvInfo: PVModuleInfo,
  points: Point[]
): PVModuleInfo => {
  const { azimuth, direction, inclination } = calculateRoofOrientation(points);
  const yieldFactor = calculateYieldFactorFromOrientation(azimuth, inclination);

  return {
    ...pvInfo,
    roofAzimuth: azimuth,
    roofDirection: direction,
    roofInclination: inclination,
    yieldFactor,
  };
};

export const calculateAnnualYieldWithOrientation = (
  totalPower: number,
  pvInfo: PVModuleInfo
): number => {
  // For flat roofs, use tilt angle as effective inclination and azimuth based on layout
  if (pvInfo.roofType === 'flat' && pvInfo.tiltAngle) {
    const effectiveInclination = pvInfo.tiltAngle;
    let effectiveAzimuth: number;
    if (pvInfo.flatRoofLayout === 'east-west') {
      // Average of east (90°) and west (270°) yields
      const eastYield = calculateYieldFactorFromOrientation(90, effectiveInclination);
      const westYield = calculateYieldFactorFromOrientation(270, effectiveInclination);
      const avgFactor = (eastYield + westYield) / 2;
      return totalPower * avgFactor;
    } else {
      effectiveAzimuth = 180; // South
    }
    const factor = calculateYieldFactorFromOrientation(effectiveAzimuth, effectiveInclination);
    return totalPower * factor;
  }

  const yieldFactor = pvInfo.yieldFactor ||
    (pvInfo.roofAzimuth && pvInfo.roofInclination
      ? calculateYieldFactorFromOrientation(pvInfo.roofAzimuth, pvInfo.roofInclination)
      : ANNUAL_YIELD_FACTOR_DEFAULT);
  return totalPower * yieldFactor;
};
