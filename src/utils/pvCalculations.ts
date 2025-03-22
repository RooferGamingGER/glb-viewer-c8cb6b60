import { Point, PVModuleInfo, PVModuleSpec, Measurement } from '@/types/measurements';
import { calculatePolygonArea, calculateQuadrilateralDimensions, generateSegments } from './measurementCalculations';

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
 * Find the related roof edge measurements for a given area measurement
 * @param measurements - All measurements
 * @param areaId - ID of the area measurement
 * @returns Object containing ridge, eave, and verge measurements if found
 */
export const findRoofEdges = (measurements: Measurement[], areaId: string): {
  ridge: Measurement | null;
  eave: Measurement | null;
  verge: Measurement | null;
} => {
  const ridge = measurements.find(m => 
    m.type === 'ridge' && 
    m.relatedMeasurements?.includes(areaId)
  ) || null;
  
  const eave = measurements.find(m => 
    m.type === 'eave' && 
    m.relatedMeasurements?.includes(areaId)
  ) || null;
  
  const verge = measurements.find(m => 
    m.type === 'verge' && 
    m.relatedMeasurements?.includes(areaId)
  ) || null;
  
  return { ridge, eave, verge };
};

/**
 * Calculate the distance between two points in 3D space
 */
const calculateDistance3D = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Find parallel line segments in a quadrilateral
 * @param points - Array of 4 points defining the quadrilateral 
 * @returns An object with pairs of parallel sides
 */
const findParallelSides = (points: Point[]): { 
  pair1: {length1: number, length2: number}, 
  pair2: {length1: number, length2: number} 
} => {
  if (points.length !== 4) {
    throw new Error("Expected exactly 4 points for parallel sides calculation");
  }
  
  // Calculate all side lengths
  const side1 = calculateDistance3D(points[0], points[1]);
  const side2 = calculateDistance3D(points[1], points[2]);
  const side3 = calculateDistance3D(points[2], points[3]);
  const side4 = calculateDistance3D(points[3], points[0]);
  
  // Calculate diagonals to determine which sides are more parallel
  const diagonal1 = calculateDistance3D(points[0], points[2]);
  const diagonal2 = calculateDistance3D(points[1], points[3]);
  
  // By default, assume sides 1,3 and 2,4 are parallel pairs
  // This is a simplification but works for most rectangular-like shapes
  return {
    pair1: { length1: side1, length2: side3 },
    pair2: { length1: side2, length2: side4 }
  };
};

/**
 * Use detected roof edges to determine optimal PV module placement
 * @param edges - Detected roof edges
 * @returns Object with width and length based on roof edges
 */
const getDimensionsFromRoofEdges = (edges: {
  ridge: Measurement | null;
  eave: Measurement | null;
  verge: Measurement | null;
}): { width: number; length: number } | null => {
  // If we have ridge and eave, use those for length calculation
  // If we have verge, use that for width calculation
  
  let length = 0;
  let width = 0;
  let hasValidDimensions = false;
  
  // Calculate length based on ridge/eave
  if (edges.ridge && edges.eave) {
    // Find the average distance between ridge and eave
    const ridgeCenter = {
      x: (edges.ridge.points[0].x + edges.ridge.points[1].x) / 2,
      y: (edges.ridge.points[0].y + edges.ridge.points[1].y) / 2,
      z: (edges.ridge.points[0].z + edges.ridge.points[1].z) / 2
    };
    
    const eaveCenter = {
      x: (edges.eave.points[0].x + edges.eave.points[1].x) / 2,
      y: (edges.eave.points[0].y + edges.eave.points[1].y) / 2,
      z: (edges.eave.points[0].z + edges.eave.points[1].z) / 2
    };
    
    length = calculateDistance3D(ridgeCenter, eaveCenter);
    hasValidDimensions = true;
  }
  
  // Calculate width based on verge
  if (edges.verge) {
    width = edges.verge.value;
    hasValidDimensions = true;
  } else if (edges.ridge) {
    // Use ridge length as width if no verge is available
    width = edges.ridge.value;
    hasValidDimensions = true;
  }
  
  if (hasValidDimensions) {
    return { width, length };
  }
  
  return null;
};

/**
 * Calculates the optimal placement of PV modules on a roof area
 * 
 * @param points - The 3D points defining the roof area polygon
 * @param moduleWidth - Width of a single PV module in meters (default: 1.041m)
 * @param moduleHeight - Height of a single PV module in meters (default: 1.767m)
 * @param edgeDistance - Distance from the roof edge in meters (default: 0.1m)
 * @param moduleSpacing - Spacing between modules in meters (default: 0.05m)
 * @param userDimensions - Optional user-provided dimensions for non-rectangular areas
 * @param allMeasurements - All measurements for the area
 * @param areaId - ID of the area measurement
 * @returns Information about PV module placement
 */
export const calculatePVModulePlacement = (
  points: Point[], 
  moduleWidth: number = DEFAULT_MODULE_WIDTH, 
  moduleHeight: number = DEFAULT_MODULE_HEIGHT,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING,
  userDimensions?: {width: number, length: number},
  allMeasurements?: Measurement[],
  areaId?: string
): PVModuleInfo => {
  // Calculate the actual area of the polygon
  const area = calculatePolygonArea(points);
  
  // Initialize dimensions variables
  let availableWidth: number;
  let availableLength: number;
  let boundingWidth: number;
  let boundingLength: number;
  let manualDimensions = false;
  
  // Calculate minimum and maximum coordinates for visualization
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  
  // Use user-defined dimensions if provided (highest priority)
  if (userDimensions && userDimensions.width > 0 && userDimensions.length > 0) {
    availableWidth = userDimensions.width;
    availableLength = userDimensions.length;
    manualDimensions = true;
    
    // Adjust bounding dimensions to match user values plus edge distance
    boundingWidth = availableWidth + (2 * edgeDistance);
    boundingLength = availableLength + (2 * edgeDistance);
  }
  // Try to use roof edge measurements if available
  else if (allMeasurements && areaId) {
    const edges = findRoofEdges(allMeasurements, areaId);
    const edgeDimensions = getDimensionsFromRoofEdges(edges);
    
    if (edgeDimensions) {
      console.log("Using dimensions from roof edges:", edgeDimensions);
      
      boundingWidth = edgeDimensions.width;
      boundingLength = edgeDimensions.length;
      
      // Derive the available area by accounting for edge distances
      availableWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
      availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
    } else {
      // Fall back to normal calculation if edges don't provide valid dimensions
      console.log("Detected edges don't provide valid dimensions, falling back to normal calculation");
      
      // Use existing calculation logic (parallel sides or quadrilateral dimensions)
      try {
        // Find parallel sides using the new approach
        const parallelSides = findParallelSides(points);
        
        // Calculate width and length as average of parallel sides
        const width1 = (parallelSides.pair1.length1 + parallelSides.pair1.length2) / 2;
        const width2 = (parallelSides.pair2.length1 + parallelSides.pair2.length2) / 2;
        
        // Assign width and length (width should be shorter than length by convention)
        if (width1 < width2) {
          boundingWidth = width1;
          boundingLength = width2;
        } else {
          boundingWidth = width2;
          boundingLength = width1;
        }
      } catch (error) {
        console.warn("Error calculating parallel sides, falling back to quadrilateral dimensions", error);
        
        // Fallback to the quadrilateral dimensions calculation
        const dimensions = calculateQuadrilateralDimensions(points);
        boundingWidth = dimensions.width;
        boundingLength = dimensions.length;
      }
      
      // Derive the available area by accounting for edge distances
      availableWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
      availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
    }
  } else {
    // No edges or user dimensions, use existing calculation logic
    try {
      // Make sure we're working with a quadrilateral (4 points)
      // If not, we'll create a representative quadrilateral
      let quadPoints = [...points];
      if (points.length !== 4) {
        console.warn("PV module placement works best with exactly 4 points. Using approximation.");
        
        // Create a quadrilateral from the min/max points (bounding box)
        quadPoints = [
          { x: minX, y: points[0].y, z: minZ },
          { x: maxX, y: points[0].y, z: minZ },
          { x: maxX, y: points[0].y, z: maxZ },
          { x: minX, y: points[0].y, z: maxZ }
        ];
      }
      
      // Find parallel sides
      const parallelSides = findParallelSides(quadPoints);
      
      // Calculate width and length as average of parallel sides
      const width1 = (parallelSides.pair1.length1 + parallelSides.pair1.length2) / 2;
      const width2 = (parallelSides.pair2.length1 + parallelSides.pair2.length2) / 2;
      
      // Assign width and length (width should be shorter than length by convention)
      if (width1 < width2) {
        boundingWidth = width1;
        boundingLength = width2;
      } else {
        boundingWidth = width2;
        boundingLength = width1;
      }
    } catch (error) {
      console.warn("Error calculating parallel sides, falling back to quadrilateral dimensions", error);
      
      // Fallback to the quadrilateral dimensions calculation
      const dimensions = calculateQuadrilateralDimensions(points);
      boundingWidth = dimensions.width;
      boundingLength = dimensions.length;
    }
    
    // Derive the available area by accounting for edge distances
    availableWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
    availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
  }
  
  // Sanity check for available area (keep this for all calculation paths)
  const availableArea = availableWidth * availableLength;
  
  // If the available area is significantly larger than the actual area, adjust dimensions
  if (availableArea > area * 1.5) {
    // Scale dimensions based on the actual area
    const scaleFactor = Math.sqrt(area / availableArea);
    availableWidth *= scaleFactor;
    availableLength *= scaleFactor;
    
    // Update bounding dimensions
    boundingWidth = availableWidth + (2 * edgeDistance);
    boundingLength = availableLength + (2 * edgeDistance);
    
    console.log("Dimensions adjusted after area sanity check:", {
      scaleFactor,
      availableWidth,
      availableLength,
      boundingWidth, 
      boundingLength
    });
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
  
  // Portrait orientation calculations 
  const portraitModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing));
  const portraitModulesY = Math.floor(availableLength / (moduleHeight + moduleSpacing));
  
  // Total modules in portrait orientation
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Landscape orientation calculations
  const landscapeModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));
  const landscapeModulesY = Math.floor(availableLength / (moduleWidth + moduleSpacing));
  
  // Total modules in landscape orientation
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
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
    userDefinedLength: manualDimensions ? availableLength : undefined,
    pvModuleSpec: {
      name: "Standard (380W)", // The required 'name' property
      width: moduleWidth,
      height: moduleHeight,
      power: 380, // Default power value
      efficiency: 19.5 // Default efficiency value
    }
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
