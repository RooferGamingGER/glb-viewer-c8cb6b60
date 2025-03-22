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
 * @param userDimensions - Optional user-provided dimensions for non-rectangular areas
 * @returns Information about PV module placement
 */
export const calculatePVModulePlacement = (
  points: Point[], 
  moduleWidth: number = DEFAULT_MODULE_WIDTH, 
  moduleHeight: number = DEFAULT_MODULE_HEIGHT,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING,
  userDimensions?: {width: number, length: number}
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
  let boundingWidth = maxX - minX;
  let boundingLength = maxZ - minZ;
  
  // Use user-defined dimensions if provided
  let availableWidth: number;
  let availableLength: number;
  let manualDimensions = false;
  
  if (userDimensions && userDimensions.width > 0 && userDimensions.length > 0) {
    availableWidth = userDimensions.width;
    availableLength = userDimensions.length;
    manualDimensions = true;
    
    // Adjust bounding dimensions to match user values plus edge distance
    boundingWidth = availableWidth + (2 * edgeDistance);
    boundingLength = availableLength + (2 * edgeDistance);
  } else {
    // Calculate the available area after applying edge distance
    availableWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
    availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
  }
  
  // DEBUG: Log calculation values
  console.log("PV Calculation Debug:", {
    area,
    boundingWidth,
    boundingLength,
    availableWidth,
    availableLength,
    manualDimensions,
    moduleWidth,
    moduleHeight,
    edgeDistance,
    moduleSpacing
  });
  
  // Portrait orientation calculations - corrected formula
  // For modules in portrait orientation, width refers to the narrow side
  const portraitModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing));
  const portraitModulesY = Math.floor(availableLength / (moduleHeight + moduleSpacing));
  
  // Total modules in portrait orientation
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Landscape orientation calculations - corrected formula
  // For modules in landscape orientation, height refers to the narrow side (rotated 90 degrees)
  const landscapeModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));
  const landscapeModulesY = Math.floor(availableLength / (moduleWidth + moduleSpacing));
  
  // Total modules in landscape orientation
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
  // DEBUG: Log the module counts
  console.log("PV Module Counts:", {
    portraitModulesX,
    portraitModulesY,
    portraitModuleCount,
    landscapeModulesX,
    landscapeModulesY,
    landscapeModuleCount,
    portraitFormula: `(${availableWidth}) / (${moduleWidth} + ${moduleSpacing}) = ${availableWidth / (moduleWidth + moduleSpacing)}`,
    landscapeFormula: `(${availableWidth}) / (${moduleHeight} + ${moduleSpacing}) = ${availableWidth / (moduleHeight + moduleSpacing)}`
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
  
  // Calculate start positions (where the grid begins after edge distance)
  const startX = minX + edgeDistance;
  const startZ = minZ + edgeDistance;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount,
    edgeDistance,
    moduleSpacing,
    coveragePercent: Math.min(coveragePercent, 100), // Cap at 100%
    orientation: usePortrait ? 'portrait' : 'landscape',
    columns, // Number of columns (modules across width)
    rows,    // Number of rows (modules across length)
    boundingWidth,
    boundingLength,
    availableWidth,
    availableLength,
    startX,   // Added start X position for visualization
    startZ,   // Added start Z position for visualization
    minX,     // Added for grid boundary visualization
    maxX,     // Added for grid boundary visualization
    minZ,     // Added for grid boundary visualization
    maxZ,     // Added for grid boundary visualization
    actualArea: area, // The actual polygon area (not just bounding box)
    manualDimensions,
    userDefinedWidth: manualDimensions ? availableWidth : undefined,
    userDefinedLength: manualDimensions ? availableLength : undefined
  };
};

/**
 * Generate the grid points for PV module placement
 * 
 * @param pvInfo - PV module information
 * @param baseY - The Y-coordinate (height) to place the modules at
 * @returns Array of module corner points and grid lines
 */
export const generatePVModuleGrid = (pvInfo: PVModuleInfo, baseY: number): {
  modulePoints: Point[][],  // Array of 4 points for each module
  gridLines: {from: Point, to: Point}[]  // Lines for the grid
} => {
  const modulePoints: Point[][] = [];
  const gridLines: {from: Point, to: Point}[] = [];
  
  // Determine module dimensions based on orientation
  const moduleWidth = pvInfo.orientation === 'portrait' ? pvInfo.moduleWidth : pvInfo.moduleHeight;
  const moduleHeight = pvInfo.orientation === 'portrait' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  
  // Get the starting position (add edge distance to min coordinates)
  const startX = pvInfo.startX || (pvInfo.minX + pvInfo.edgeDistance!);
  const startZ = pvInfo.startZ || (pvInfo.minZ + pvInfo.edgeDistance!);
  
  // Generate module placement grid
  for (let row = 0; row < pvInfo.rows!; row++) {
    for (let col = 0; col < pvInfo.columns!; col++) {
      // Calculate position of this module
      const x = startX + col * (moduleWidth + pvInfo.moduleSpacing!);
      const z = startZ + row * (moduleHeight + pvInfo.moduleSpacing!);
      
      // Create 4 corner points for this module
      const moduleCorners: Point[] = [
        { x, y: baseY + 0.02, z },  // Top-left
        { x: x + moduleWidth, y: baseY + 0.02, z },  // Top-right
        { x: x + moduleWidth, y: baseY + 0.02, z: z + moduleHeight },  // Bottom-right
        { x, y: baseY + 0.02, z: z + moduleHeight }  // Bottom-left
      ];
      
      modulePoints.push(moduleCorners);
      
      // Add grid lines for this module
      for (let i = 0; i < 4; i++) {
        const from = moduleCorners[i];
        const to = moduleCorners[(i + 1) % 4];
        gridLines.push({ from, to });
      }
    }
  }
  
  // Add boundary lines showing the edge distance
  const boundaryPoints = [
    { x: pvInfo.minX, y: baseY + 0.01, z: pvInfo.minZ },
    { x: pvInfo.maxX, y: baseY + 0.01, z: pvInfo.minZ },
    { x: pvInfo.maxX, y: baseY + 0.01, z: pvInfo.maxZ },
    { x: pvInfo.minX, y: baseY + 0.01, z: pvInfo.maxZ }
  ];
  
  // Add available area boundary lines inside edge distance
  const availableAreaPoints = [
    { x: startX, y: baseY + 0.01, z: startZ },
    { x: startX + pvInfo.availableWidth, y: baseY + 0.01, z: startZ },
    { x: startX + pvInfo.availableWidth, y: baseY + 0.01, z: startZ + pvInfo.availableLength },
    { x: startX, y: baseY + 0.01, z: startZ + pvInfo.availableLength }
  ];
  
  // Add boundary lines
  for (let i = 0; i < 4; i++) {
    const from = boundaryPoints[i];
    const to = boundaryPoints[(i + 1) % 4];
    gridLines.push({ from, to });
    
    const availFrom = availableAreaPoints[i];
    const availTo = availableAreaPoints[(i + 1) % 4];
    gridLines.push({ from: availFrom, to: availTo });
  }
  
  return { modulePoints, gridLines };
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
