
import { Measurement, PVModuleInfo, PVMaterials, PVModuleSpec } from '@/types/measurements';
import * as THREE from 'three';

// Constants for PV module calculations
export const DEFAULT_EDGE_DISTANCE = 0.2;  // 20cm default edge distance
export const DEFAULT_MODULE_SPACING = 0.02;  // 2cm default module spacing

// Standard PV module templates
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  {
    name: "Standard 425W",
    width: 1.04,
    height: 1.77,
    power: 425,
    efficiency: 21.5
  },
  {
    name: "Premium 450W",
    width: 1.08,
    height: 1.83,
    power: 450,
    efficiency: 22.8
  },
  {
    name: "Economy 380W",
    width: 1.02,
    height: 1.71,
    power: 380,
    efficiency: 19.7
  },
  {
    name: "Square 400W",
    width: 1.15,
    height: 1.15,
    power: 400,
    efficiency: 20.5
  }
];

// Calculate PV power output based on module count and module power
export const calculatePVPower = (moduleCount: number, modulePower: number = 300): number => {
  return (moduleCount * modulePower) / 1000; // Return in kWp
};

// Format PV module info for display
export const formatPVModuleInfo = (pvModuleInfo?: PVModuleInfo): string => {
  if (!pvModuleInfo) return 'Keine Angaben';
  
  const { moduleCount, orientation, moduleWidth, moduleHeight } = pvModuleInfo;
  const orientationText = orientation === 'portrait' ? 'Hochformat' : 'Querformat';
  
  return `${moduleCount} Module (${orientationText}, ${moduleWidth.toFixed(2)}m × ${moduleHeight.toFixed(2)}m)`;
};

// Format PV materials for display
export const formatPVMaterials = (pvMaterials?: PVMaterials): string => {
  if (!pvMaterials) return 'Keine Angaben';
  
  return `${pvMaterials.totalModuleCount} Module, ${pvMaterials.totalPower.toFixed(2)} kWp`;
};

// Calculate annual yield based on kWp and location factor
export const calculateAnnualYield = (kWp: number, orientationType: string = 'hochformat'): number => {
  // Base yield factor depends on orientation
  const baseYieldFactor = orientationType === 'hochformat' ? 950 : 920;
  return kWp * baseYieldFactor;
};

// Calculate roof orientation based on normal vector
export const calculateRoofOrientation = (points: THREE.Vector3[]): { azimuth: number; direction: string } => {
  // Default values if calculation fails
  const defaultResult = { azimuth: 180, direction: 'S' };
  
  if (points.length < 3) return defaultResult;
  
  try {
    // Calculate normal vector of the roof plane
    const edge1 = new THREE.Vector3().subVectors(points[1], points[0]);
    const edge2 = new THREE.Vector3().subVectors(points[2], points[0]);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    
    // Project normal vector onto XZ plane (ignore Y component)
    const projectedNormal = new THREE.Vector2(normal.x, normal.z).normalize();
    
    // Calculate angle in degrees (0° is north, 90° is east, 180° is south, 270° is west)
    let azimuth = Math.atan2(projectedNormal.x, -projectedNormal.y) * (180 / Math.PI);
    if (azimuth < 0) azimuth += 360;
    
    // Determine cardinal direction
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(azimuth / 45) % 8;
    const direction = directions[index];
    
    return { azimuth, direction };
  } catch (error) {
    console.error('Error calculating roof orientation:', error);
    return defaultResult;
  }
};

// Calculate annual yield with orientation factor
export const calculateAnnualYieldWithOrientation = (
  kWp: number, 
  pvModuleInfo: PVModuleInfo
): number => {
  const azimuth = pvModuleInfo.roofAzimuth || 180; // Default to south
  const inclination = pvModuleInfo.roofInclination || 30; // Default to 30 degrees
  const baseYieldFactor = pvModuleInfo.yieldFactor || 1000; // Default yield factor
  
  // Simplified orientation factor calculation
  // Best yield at azimuth = 180° (south) and inclination around 30-35°
  
  // Azimuth factor (1.0 for south, decreasing towards east/west)
  const azimuthDiff = Math.abs(180 - azimuth);
  const azimuthFactor = 1 - (azimuthDiff / 180) * 0.2; // 20% reduction at north
  
  // Inclination factor (1.0 at optimal angle, decreasing for flat or steep)
  const optimalInclination = 35;
  const inclinationDiff = Math.abs(optimalInclination - inclination);
  const inclinationFactor = 1 - (inclinationDiff / 90) * 0.3; // 30% reduction at 0° or 90°
  
  // Combined factor
  const combinedFactor = azimuthFactor * inclinationFactor;
  
  // Apply to base yield factor
  const adjustedYieldFactor = baseYieldFactor * combinedFactor;
  
  return kWp * adjustedYieldFactor;
};

// Update PV module info with orientation data
export const updatePVModuleInfoWithOrientation = (
  pvModuleInfo: PVModuleInfo,
  points: { x: number; y: number; z: number }[]
): PVModuleInfo => {
  if (!points || points.length < 3) return pvModuleInfo;
  
  // Convert points to Vector3 for calculations
  const points3D = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  
  // Calculate orientation
  const { azimuth, direction } = calculateRoofOrientation(points3D);
  
  // Calculate inclination (angle from horizontal)
  const edge1 = new THREE.Vector3().subVectors(points3D[1], points3D[0]);
  const edge2 = new THREE.Vector3().subVectors(points3D[2], points3D[0]);
  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  const inclination = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0))) * (180 / Math.PI);
  
  // Calculate yield factor based on orientation and inclination
  const baseYieldFactor = 1000; // Default annual yield factor in kWh/kWp for ideal conditions
  
  // Update PV module info
  return {
    ...pvModuleInfo,
    roofAzimuth: azimuth,
    roofDirection: direction,
    roofInclination: inclination,
    yieldFactor: baseYieldFactor
  };
};

// Calculate PV module placement on roof area
export const calculatePVModulePlacement = (
  points: { x: number; y: number; z: number }[],
  moduleWidth: number = PV_MODULE_TEMPLATES[0].width,
  moduleHeight: number = PV_MODULE_TEMPLATES[0].height,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING,
  manualDimensions?: { width: number; length: number }
): PVModuleInfo => {
  if (points.length < 3) {
    return {
      moduleWidth,
      moduleHeight,
      moduleCount: 0,
      coveragePercent: 0,
      orientation: 'portrait',
      actualArea: 0
    };
  }
  
  // Calculate area in m²
  const area = calculatePolygonArea(points);
  
  // Determine available dimensions for module placement
  let availableWidth = 0;
  let availableLength = 0;
  
  if (manualDimensions) {
    // Use manual dimensions if provided
    availableWidth = manualDimensions.width;
    availableLength = manualDimensions.length;
  } else {
    // Calculate dimensions from points
    // For simplicity, just use a rectangle approximation
    const boundingBox = calculateBoundingBox(points);
    availableWidth = boundingBox.max.x - boundingBox.min.x - (2 * edgeDistance);
    availableLength = boundingBox.max.z - boundingBox.min.z - (2 * edgeDistance);
  }
  
  // Try both portrait and landscape to see which fits better
  const portraitLayout = calculateModuleLayout(
    availableWidth,
    availableLength,
    moduleWidth,
    moduleHeight,
    moduleSpacing
  );
  
  const landscapeLayout = calculateModuleLayout(
    availableWidth,
    availableLength,
    moduleHeight,
    moduleWidth,
    moduleSpacing
  );
  
  // Choose the layout with more modules
  const usePortrait = portraitLayout.moduleCount >= landscapeLayout.moduleCount;
  const layout = usePortrait ? portraitLayout : landscapeLayout;
  
  // Calculate coverage percentage
  const moduleArea = moduleWidth * moduleHeight * layout.moduleCount;
  const coveragePercent = (moduleArea / area) * 100;
  
  // Create the PV module info
  return {
    moduleWidth: usePortrait ? moduleWidth : moduleHeight,
    moduleHeight: usePortrait ? moduleHeight : moduleWidth,
    moduleCount: layout.moduleCount,
    coveragePercent: Math.min(coveragePercent, 100), // Cap at 100%
    orientation: usePortrait ? 'portrait' : 'landscape',
    columns: layout.columns,
    rows: layout.rows,
    boundingWidth: availableWidth + (2 * edgeDistance),
    boundingLength: availableLength + (2 * edgeDistance),
    availableWidth,
    availableLength,
    actualArea: area,
    edgeDistance,
    moduleSpacing
  };
};

// Helper function to calculate how many modules fit in the available space
const calculateModuleLayout = (
  availableWidth: number,
  availableLength: number,
  moduleWidth: number,
  moduleHeight: number,
  moduleSpacing: number
): { moduleCount: number; columns: number; rows: number } => {
  // Calculate how many modules can fit in each dimension
  const columns = Math.floor((availableWidth + moduleSpacing) / (moduleWidth + moduleSpacing));
  const rows = Math.floor((availableLength + moduleSpacing) / (moduleHeight + moduleSpacing));
  
  // Calculate total module count
  const moduleCount = columns * rows;
  
  return { moduleCount, columns, rows };
};

// Calculate the area of a polygon defined by a set of points
export const calculatePolygonArea = (points: { x: number; y: number; z: number }[]): number => {
  if (points.length < 3) return 0;
  
  // Project points onto dominant plane for area calculation
  // For simplicity, we'll project onto the XZ plane (ignoring Y) for roof surfaces
  let area = 0;
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].z;
    area -= points[j].x * points[i].z;
  }
  
  return Math.abs(area) / 2;
};

// Calculate bounding box for a set of points
export const calculateBoundingBox = (points: { x: number; y: number; z: number }[]): {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
} => {
  if (points.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 }
    };
  }
  
  const min = { ...points[0] };
  const max = { ...points[0] };
  
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    
    min.x = Math.min(min.x, p.x);
    min.y = Math.min(min.y, p.y);
    min.z = Math.min(min.z, p.z);
    
    max.x = Math.max(max.x, p.x);
    max.y = Math.max(max.y, p.y);
    max.z = Math.max(max.z, p.z);
  }
  
  return { min, max };
};

// Extract roof edge measurements from a set of measurements
export const extractRoofEdgeMeasurements = (measurements: Measurement[]): {
  ridgeMeasurements: Measurement[];
  eaveMeasurements: Measurement[];
  vergeMeasurements: Measurement[];
  valleyMeasurements: Measurement[];
  hipMeasurements: Measurement[];
} => {
  const ridgeMeasurements = measurements.filter(m => m.type === 'ridge');
  const eaveMeasurements = measurements.filter(m => m.type === 'eave');
  const vergeMeasurements = measurements.filter(m => m.type === 'verge');
  const valleyMeasurements = measurements.filter(m => m.type === 'valley');
  const hipMeasurements = measurements.filter(m => m.type === 'hip');
  
  return {
    ridgeMeasurements,
    eaveMeasurements,
    vergeMeasurements,
    valleyMeasurements,
    hipMeasurements
  };
};
