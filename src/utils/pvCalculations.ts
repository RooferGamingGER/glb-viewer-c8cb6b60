
import { Measurement, PVModuleInfo, PVMaterials, PVModuleSpec } from '@/types/measurements';
import * as THREE from 'three';

// Calculate PV power output based on module info and measurement
export const calculatePVPower = (measurement: Measurement): number => {
  if (!measurement.pvModuleInfo) return 0;
  
  const { moduleCount } = measurement.pvModuleInfo;
  const modulePower = measurement.pvModuleInfo.pvModuleSpec?.power || 300; // Default 300W if not specified
  
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
export const calculateAnnualYield = (kWp: number, yieldFactor: number = 950): number => {
  return kWp * yieldFactor;
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
  azimuth: number, 
  inclination: number = 30,
  baseYieldFactor: number = 1000
): number => {
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
  measurement: Measurement
): Measurement => {
  if (!measurement.points || measurement.points.length < 3) return measurement;
  
  // Convert points to Vector3 for calculations
  const points3D = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  
  // Calculate orientation
  const { azimuth, direction } = calculateRoofOrientation(points3D);
  
  // Calculate inclination (angle from horizontal)
  const edge1 = new THREE.Vector3().subVectors(points3D[1], points3D[0]);
  const edge2 = new THREE.Vector3().subVectors(points3D[2], points3D[0]);
  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  const inclination = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0))) * (180 / Math.PI);
  
  // Calculate yield factor based on orientation and inclination
  const baseYieldFactor = 1000; // Default annual yield factor in kWh/kWp for ideal conditions
  const yieldFactor = calculateAnnualYieldWithOrientation(1, azimuth, inclination, baseYieldFactor);
  
  // Update PV module info
  const updatedPvModuleInfo = {
    ...measurement.pvModuleInfo,
    roofAzimuth: azimuth,
    roofDirection: direction,
    roofInclination: inclination,
    yieldFactor
  };
  
  return {
    ...measurement,
    pvModuleInfo: updatedPvModuleInfo
  };
};
