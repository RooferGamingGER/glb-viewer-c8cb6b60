
import * as THREE from 'three';
import { Point, PVModuleInfo, PVModuleSpec, Measurement } from '@/types/measurements';
import { calculateBoundingBox, calculateCentroid, calculateArea } from './measurementCalculations';
import { PV_MODULE_TEMPLATES, calculateRoofInclination, calculateRoofAzimuth } from './pvCalculations';

/**
 * Generate a grid of 3D module positions
 * 
 * @param points - The points of the solar area
 * @param moduleSpec - The module specification
 * @param orientation - The module orientation
 * @param edgeDistance - Distance from the edge in meters
 * @param moduleSpacing - Spacing between modules in meters
 * @returns Module information with positions
 */
export const generateModulePositions = (
  points: Point[],
  moduleSpec: PVModuleSpec = PV_MODULE_TEMPLATES[0],
  orientation: 'portrait' | 'landscape' = 'portrait',
  edgeDistance: number = 0.5,
  moduleSpacing: number = 0.1
): { positions: Point[], corners: Point[][], info: Partial<PVModuleInfo> } => {
  // Default module dimensions
  const moduleWidth = orientation === 'portrait' ? moduleSpec.width : moduleSpec.height;
  const moduleLength = orientation === 'portrait' ? moduleSpec.height : moduleSpec.width;
  
  // Calculate bounding box and other metrics
  const { minX, maxX, minZ, maxZ } = calculateBoundingBox(points);
  const boundingWidth = maxX - minX;
  const boundingLength = maxZ - minZ;
  
  // Calculate available space after edge distance
  const availableWidth = Math.max(0, boundingWidth - (edgeDistance * 2));
  const availableLength = Math.max(0, boundingLength - (edgeDistance * 2));
  
  // Calculate number of modules that can fit
  const columns = Math.floor((availableWidth + moduleSpacing) / (moduleWidth + moduleSpacing));
  const rows = Math.floor((availableLength + moduleSpacing) / (moduleLength + moduleSpacing));
  
  // Calculate start positions (accounting for edge distance)
  const startX = minX + edgeDistance + (moduleWidth / 2);
  const startZ = minZ + edgeDistance + (moduleLength / 2);
  
  // Calculate the Y position based on the average of points
  const centroid = calculateCentroid(points);
  const averageY = centroid.y;
  
  // Create array to store module positions and corners
  const positions: Point[] = [];
  const corners: Point[][] = [];
  
  // Generate the grid of modules
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      // Calculate position
      const x = startX + col * (moduleWidth + moduleSpacing);
      const z = startZ + row * (moduleLength + moduleSpacing);
      
      // Add to positions array
      const position: Point = { x, y: averageY + 0.02, z };
      positions.push(position);
      
      // Calculate and store the four corners
      const halfWidth = moduleWidth / 2;
      const halfLength = moduleLength / 2;
      
      const cornerPoints: Point[] = [
        { x: x - halfWidth, y: averageY + 0.02, z: z - halfLength }, // Bottom left
        { x: x + halfWidth, y: averageY + 0.02, z: z - halfLength }, // Bottom right
        { x: x + halfWidth, y: averageY + 0.02, z: z + halfLength }, // Top right
        { x: x - halfWidth, y: averageY + 0.02, z: z + halfLength }  // Top left
      ];
      
      corners.push(cornerPoints);
    }
  }
  
  // Calculate additional metrics
  const moduleCount = rows * columns;
  const actualArea = moduleCount * moduleWidth * moduleLength;
  const boundingArea = boundingWidth * boundingLength;
  const coveragePercent = boundingArea > 0 ? (actualArea / boundingArea) * 100 : 0;
  
  return {
    positions,
    corners,
    info: {
      moduleWidth,
      moduleHeight: moduleSpec.height,
      moduleCount,
      coveragePercent,
      orientation,
      columns,
      rows,
      boundingWidth,
      boundingLength,
      availableWidth,
      availableLength,
      startX,
      startZ,
      minX,
      maxX,
      minZ,
      maxZ,
      actualArea,
      edgeDistance,
      moduleSpacing
    }
  };
};

/**
 * Calculate performance metrics for a PV system
 * 
 * @param measurement - The measurement containing the PV system
 * @param moduleSpec - The module specification
 * @returns Performance metrics
 */
export const calculatePerformanceMetrics = (
  measurement: Measurement,
  moduleSpec: PVModuleSpec = PV_MODULE_TEMPLATES[0]
): { 
  annualYield: number;     // kWh per year
  specificYield: number;   // kWh/kWp per year
  performance: number;     // Performance ratio
  co2Savings: number;      // kg CO2 saved per year
} => {
  const points = measurement.points || [];
  if (points.length < 3) {
    return {
      annualYield: 0,
      specificYield: 0,
      performance: 0,
      co2Savings: 0
    };
  }
  
  // Get roof inclination and azimuth
  const inclination = calculateRoofInclination(points);
  const azimuth = calculateRoofAzimuth(points);
  
  // Calculate power
  const moduleCount = measurement.pvModuleInfo?.moduleCount || 0;
  const powerInKWp = (moduleCount * moduleSpec.power) / 1000;
  
  // Estimate specific yield based on inclination and azimuth
  // This is a simplistic model - in real applications, use PV simulation software
  const baseYield = 1000; // Base yield in kWh/kWp per year
  
  // Calculate yield modifier based on orientation and tilt
  // Perfect is south-facing (180° azimuth) with optimal tilt (around 30-35° in central Europe)
  const azimuthFactor = calculateAzimuthFactor(azimuth);
  const inclinationFactor = calculateInclinationFactor(inclination);
  
  // Calculate specific yield
  const specificYield = baseYield * azimuthFactor * inclinationFactor;
  
  // Calculate annual yield
  const annualYield = specificYield * powerInKWp;
  
  // Calculate performance ratio (typically between 0.75 and 0.85)
  const performance = 0.8;
  
  // Calculate CO2 savings (average EU grid mix: 296g CO2/kWh)
  const co2Savings = annualYield * 0.296;
  
  return {
    annualYield,
    specificYield,
    performance,
    co2Savings
  };
};

// Helper function to calculate azimuth factor
function calculateAzimuthFactor(azimuth: number): number {
  // Normalize azimuth to 0-360
  const normalizedAzimuth = ((azimuth % 360) + 360) % 360;
  
  // Calculate deviation from south (180°)
  const deviation = Math.abs(normalizedAzimuth - 180);
  
  // Maximum reduction for north-facing (0.6 at 0° or 360°)
  if (deviation === 180) return 0.6;
  
  // Linear interpolation: 1.0 at south, decreasing to 0.6 at north
  return 1.0 - (0.4 * deviation / 180);
}

// Helper function to calculate inclination factor
function calculateInclinationFactor(inclination: number): number {
  // Optimal tilt around 35° for central Europe
  const optimal = 35;
  const deviation = Math.abs(inclination - optimal);
  
  // Maximum reduction for flat (0° tilt) or vertical (90° tilt)
  if (inclination === 0) return 0.85;  // Flat roof
  if (inclination === 90) return 0.7;  // Vertical wall
  
  // Parabolic function with maximum at optimal tilt
  return 1.0 - (0.3 * (deviation / optimal) ** 2);
}

// Determine cardinal roof direction based on azimuth angle
export function getCardinalDirection(azimuth: number): string {
  // Normalize azimuth to 0-360
  const normalizedAzimuth = ((azimuth % 360) + 360) % 360;
  
  // Define the direction ranges
  if (normalizedAzimuth >= 337.5 || normalizedAzimuth < 22.5) return 'N';
  if (normalizedAzimuth >= 22.5 && normalizedAzimuth < 67.5) return 'NE';
  if (normalizedAzimuth >= 67.5 && normalizedAzimuth < 112.5) return 'E';
  if (normalizedAzimuth >= 112.5 && normalizedAzimuth < 157.5) return 'SE';
  if (normalizedAzimuth >= 157.5 && normalizedAzimuth < 202.5) return 'S';
  if (normalizedAzimuth >= 202.5 && normalizedAzimuth < 247.5) return 'SW';
  if (normalizedAzimuth >= 247.5 && normalizedAzimuth < 292.5) return 'W';
  return 'NW';
}
