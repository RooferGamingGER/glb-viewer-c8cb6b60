
import { Point, PVModuleInfo, PVModuleSpec, Measurement } from '@/types/measurements';
import { calculatePolygonArea } from './measurementCalculations';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;

// Default distances in meters
export const DEFAULT_EDGE_DISTANCE = 0.1;  // 10cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.05;  // 5cm between modules

// Common PV module templates that users can select from
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  {
    name: "Standard (380W)",
    width: 1.041,
    height: 1.767,
    power: 380,
    efficiency: 19.5
  },
  {
    name: "Hochleistung (415W)",
    width: 1.052,
    height: 1.776,
    power: 415,
    efficiency: 21.3
  },
  {
    name: "Kompakt (365W)",
    width: 1.030,
    height: 1.692,
    power: 365,
    efficiency: 20.1
  },
  {
    name: "Maxi (425W)",
    width: 1.134,
    height: 2.094,
    power: 425,
    efficiency: 20.8
  }
];

/**
 * Calculates the optimal placement of PV modules on a roof area
 * 
 * @param points - The 3D points defining the roof area polygon
 * @param moduleWidth - Width of a single PV module in meters (default: 1.041m)
 * @param moduleHeight - Height of a single PV module in meters (default: 1.767m)
 * @param edgeDistance - Distance from the roof edge in meters (default: 0.1m)
 * @param moduleSpacing - Spacing between modules in meters (default: 0.05m)
 * @returns Information about PV module placement
 */
export const calculatePVModulePlacement = (
  points: Point[], 
  moduleWidth: number = DEFAULT_MODULE_WIDTH, 
  moduleHeight: number = DEFAULT_MODULE_HEIGHT,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING
): PVModuleInfo => {
  // Calculate the area of the polygon
  const area = calculatePolygonArea(points);
  
  // Calculate the minimum and maximum X and Z coordinates (not Y, because Y is height)
  // This ensures we get the actual roof surface dimensions
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  
  // Calculate approximate dimensions of the bounding rectangle
  const boundingWidth = maxX - minX;
  const boundingLength = maxZ - minZ;
  
  // Calculate the available area after applying edge distance
  const availableWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
  const availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
  
  // DEBUG: Log calculation values to diagnose the issue
  console.log("PV Calculation Debug:", {
    area,
    boundingWidth,
    boundingLength,
    availableWidth,
    availableLength,
    moduleWidth,
    moduleHeight,
    edgeDistance,
    moduleSpacing
  });
  
  // FIXED CALCULATION: The issue is with how module spacing is incorporated
  
  // Portrait orientation calculations - corrected formula
  // For n modules, we need (n-1) spaces between them
  // The total available width must accommodate: n*moduleWidth + (n-1)*moduleSpacing
  // Solving for n: n = (availableWidth + moduleSpacing) / (moduleWidth + moduleSpacing)
  const portraitModulesX = Math.floor((availableWidth + moduleSpacing) / (moduleWidth + moduleSpacing));
  const portraitModulesY = Math.floor((availableLength + moduleSpacing) / (moduleHeight + moduleSpacing));
  
  // Total modules in portrait orientation
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Landscape orientation calculations - corrected formula
  const landscapeModulesX = Math.floor((availableWidth + moduleSpacing) / (moduleHeight + moduleSpacing));
  const landscapeModulesY = Math.floor((availableLength + moduleSpacing) / (moduleWidth + moduleSpacing));
  
  // Total modules in landscape orientation
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
  // DEBUG: Log the module counts to diagnose the issue
  console.log("PV Module Counts:", {
    portraitModulesX,
    portraitModulesY,
    portraitModuleCount,
    landscapeModulesX,
    landscapeModulesY,
    landscapeModuleCount,
    portraitFormula: `(${availableWidth} + ${moduleSpacing}) / (${moduleWidth} + ${moduleSpacing}) = ${(availableWidth + moduleSpacing) / (moduleWidth + moduleSpacing)}`,
    landscapeFormula: `(${availableWidth} + ${moduleSpacing}) / (${moduleHeight} + ${moduleSpacing}) = ${(availableWidth + moduleSpacing) / (moduleHeight + moduleSpacing)}`
  });
  
  // Choose the orientation that fits more modules
  const usePortrait = portraitModuleCount >= landscapeModuleCount;
  
  // Final module count, rows, and columns
  const moduleCount = usePortrait ? portraitModuleCount : landscapeModuleCount;
  const columns = usePortrait ? portraitModulesX : landscapeModulesX;
  const rows = usePortrait ? portraitModulesY : landscapeModulesY;
  
  // Calculate the actual area covered by the modules (without spacing at the outer edges)
  const moduleArea = moduleCount * moduleWidth * moduleHeight;
  
  // Calculate coverage percentage
  const coveragePercent = (area > 0) ? (moduleArea / area) * 100 : 0;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount,
    edgeDistance,
    moduleSpacing,
    coveragePercent: Math.min(coveragePercent, 100), // Cap at 100%
    orientation: usePortrait ? 'portrait' : 'landscape',
    columns, // Add columns property
    rows,    // Add rows property
    boundingWidth,
    boundingLength,
    availableWidth,
    availableLength
  };
};

/**
 * Calculate the total power capacity of PV modules in kWp (kilowatt peak)
 * 
 * @param moduleCount - Number of PV modules
 * @param powerPerModule - Peak power per module in watts (default: 380W)
 * @returns Total power capacity in kWp
 */
export const calculatePVPower = (moduleCount: number, powerPerModule: number = 380): number => {
  return (moduleCount * powerPerModule) / 1000; // Convert watts to kilowatts
};

/**
 * Formats PV module information into a human-readable string
 */
export const formatPVModuleInfo = (pvInfo: PVModuleInfo): string => {
  const orientationText = pvInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat';
  return `${pvInfo.moduleCount} Module (${orientationText}), ${pvInfo.coveragePercent.toFixed(1)}% Abdeckung`;
};

/**
 * Calculate the total power output of all individually drawn PV modules
 * 
 * @param measurements - Array of all measurements
 * @returns Total power in kWp
 */
export const calculateTotalPVPower = (measurements: Measurement[]): number => {
  const pvModules = measurements.filter(m => m.type === 'pvmodule' && m.powerOutput);
  const totalWatts = pvModules.reduce((sum, module) => sum + (module.powerOutput || 0), 0);
  return totalWatts / 1000; // Convert to kWp
};

/**
 * Calculate the dimensions and power output for a single PV module
 * based on its placement points
 * 
 * @param points - The four corner points of the module
 * @param moduleSpec - The specification of the module
 * @returns Calculated dimensions and power information
 */
export const calculatePVModuleDimensions = (
  points: Point[], 
  moduleSpec: PVModuleSpec
): { area: number; powerOutput: number } => {
  const area = calculatePolygonArea(points);
  // We return the nominal power since it's a standard module
  return {
    area,
    powerOutput: moduleSpec.power
  };
};
