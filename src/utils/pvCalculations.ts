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
    name: "Standard (425W)",
    width: 1.04,
    height: 1.77,
    power: 425,
    efficiency: 21.0
  }
];

/**
 * Extract roof edge measurements from the measurements array
 * @param measurements - Array of all measurements
 * @returns Object with minimum dimensions for each edge type
 */
export const extractRoofEdgeMeasurements = (measurements: Measurement[]): {
  ridgeLength?: number;   // First (ridge) length
  eaveLength?: number;    // Traufe (eave) length
  vergeWidth1?: number;   // Ortgang (verge) length 1
  vergeWidth2?: number;   // Ortgang (verge) length 2
  minVergeWidth?: number; // Minimum of verge lengths (for boundingHeight)
  minLength?: number;     // Minimum of ridge and eave lengths (for boundingLength)
  hasAllEdges: boolean;   // Whether all edge measurements are available
  isValid: boolean;       // Whether the measurements are valid/consistent
  validationMessage?: string; // Optional message about validation issues
} => {
  // Find all ridge, eave, and verge measurements
  const ridgeMeasurements = measurements.filter(m => m.type === 'ridge');
  const eaveMeasurements = measurements.filter(m => m.type === 'eave');
  const vergeMeasurements = measurements.filter(m => m.type === 'verge');
  
  // Initialize result object
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
  } = {
    hasAllEdges: false,
    isValid: true
  };
  
  // Extract ridge length (if available)
  if (ridgeMeasurements.length > 0) {
    result.ridgeLength = ridgeMeasurements[0].value;
  }
  
  // Extract eave length (if available)
  if (eaveMeasurements.length > 0) {
    result.eaveLength = eaveMeasurements[0].value;
  }
  
  // Extract verge widths (if available)
  if (vergeMeasurements.length >= 1) {
    result.vergeWidth1 = vergeMeasurements[0].value;
  }
  
  if (vergeMeasurements.length >= 2) {
    result.vergeWidth2 = vergeMeasurements[1].value;
  }
  
  // Calculate minimum dimensions (instead of averages) for boundary calculation
  if (result.ridgeLength !== undefined && result.eaveLength !== undefined) {
    // Use the shorter of ridge and eave lengths
    result.minLength = Math.min(result.ridgeLength, result.eaveLength);
    
    // Validate consistency between ridge and eave
    const lengthDifference = Math.abs(result.ridgeLength - result.eaveLength);
    const maxAllowedDifference = Math.max(result.ridgeLength, result.eaveLength) * 0.2; // Allow 20% difference
    
    if (lengthDifference > maxAllowedDifference) {
      console.warn(`Large difference between ridge (${result.ridgeLength.toFixed(2)}m) and eave (${result.eaveLength.toFixed(2)}m) measurements: ${lengthDifference.toFixed(2)}m`);
      result.validationMessage = "Die Werte für First und Traufe weichen stark voneinander ab.";
      result.isValid = false;
    }
  } else if (result.ridgeLength !== undefined) {
    result.minLength = result.ridgeLength;
  } else if (result.eaveLength !== undefined) {
    result.minLength = result.eaveLength;
  }
  
  if (result.vergeWidth1 !== undefined && result.vergeWidth2 !== undefined) {
    // Use the shorter of the two verge widths
    result.minVergeWidth = Math.min(result.vergeWidth1, result.vergeWidth2);
    
    // Validate consistency between verges
    const widthDifference = Math.abs(result.vergeWidth1 - result.vergeWidth2);
    const maxAllowedDifference = Math.max(result.vergeWidth1, result.vergeWidth2) * 0.2; // Allow 20% difference
    
    if (widthDifference > maxAllowedDifference) {
      console.warn(`Large difference between verge measurements: ${widthDifference.toFixed(2)}m`);
      result.validationMessage = result.validationMessage 
        ? result.validationMessage + " Die Werte für die Ortgänge weichen stark voneinander ab."
        : "Die Werte für die Ortgänge weichen stark voneinander ab.";
      result.isValid = false;
    }
  } else if (result.vergeWidth1 !== undefined) {
    result.minVergeWidth = result.vergeWidth1;
  } else if (result.vergeWidth2 !== undefined) {
    result.minVergeWidth = result.vergeWidth2;
  }
  
  // Check if we have all edges
  result.hasAllEdges = result.minVergeWidth !== undefined && result.minLength !== undefined;
  
  // Validate against roof area measurement
  const roofAreaMeasurements = measurements.filter(m => m.type === 'area');
  if (result.hasAllEdges && roofAreaMeasurements.length > 0) {
    // Find the most recent area measurement (likely to be the roof area)
    const roofArea = roofAreaMeasurements[roofAreaMeasurements.length - 1];
    
    // Calculate expected area from edge measurements
    const expectedArea = result.minVergeWidth! * result.minLength!;
    const actualArea = roofArea.value;
    
    // Calculate the area difference percentage
    const areaDifference = Math.abs(expectedArea - actualArea);
    const areaDifferencePercent = (areaDifference / actualArea) * 100;
    
    console.log("Area validation:", {
      expectedArea,
      actualArea,
      areaDifference,
      areaDifferencePercent
    });
    
    // If the areas differ by more than 30%, flag as potentially invalid
    if (areaDifferencePercent > 30) {
      console.warn(`Large difference between expected area from edges (${expectedArea.toFixed(2)}m²) and actual roof area (${actualArea.toFixed(2)}m²): ${areaDifferencePercent.toFixed(1)}%`);
      result.validationMessage = result.validationMessage 
        ? result.validationMessage + " Die berechnete Fläche weicht stark von der gemessenen Fläche ab."
        : "Die berechnete Fläche weicht stark von der gemessenen Fläche ab.";
      result.isValid = false;
    }
  }
  
  console.log("Extracted roof edge measurements:", result);
  return result;
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
 * Calculates the optimal placement of PV modules on a roof area
 * 
 * @param points - The 3D points defining the roof area polygon
 * @param moduleWidth - Width of a single PV module in meters (default: 1.041m)
 * @param moduleHeight - Height of a single PV module in meters (default: 1.767m)
 * @param edgeDistance - Distance from the roof edge in meters (default: 0.1m)
 * @param moduleSpacing - Spacing between modules in meters (default: 0.05m)
 * @param userDimensions - Optional user-provided dimensions for non-rectangular areas
 * @param roofEdgeInfo - Optional roof edge measurements from ridge, eave, verge
 * @returns Information about PV module placement
 */
export const calculatePVModulePlacement = (
  points: Point[], 
  moduleWidth: number = DEFAULT_MODULE_WIDTH, 
  moduleHeight: number = DEFAULT_MODULE_HEIGHT,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING,
  userDimensions?: {width: number, length: number},
  roofEdgeInfo?: {
    minVergeWidth?: number;
    minLength?: number;
    hasAllEdges: boolean;
    isValid?: boolean;
    validationMessage?: string;
  }
): PVModuleInfo => {
  // Enforce exactly 4 points for PV module calculation
  if (points.length !== 4) {
    console.warn(`PV module calculation expects exactly 4 points, got ${points.length}. Using subset or adding points to make a quadrilateral.`);
    
    // If we have more than 4 points, take just the first 4
    if (points.length > 4) {
      points = points.slice(0, 4);
    } 
    // If we have fewer than 4 points, try to create a rectangle
    else if (points.length < 4) {
      // We need at least 2 points to create a rectangle
      if (points.length < 2) {
        console.error("Cannot create PV module area with fewer than 2 points");
        // Create a default small rectangle as fallback
        const defaultPoint = points.length > 0 ? points[0] : { x: 0, y: 0, z: 0 };
        points = [
          defaultPoint,
          { x: defaultPoint.x + 1, y: defaultPoint.y, z: defaultPoint.z },
          { x: defaultPoint.x + 1, y: defaultPoint.y, z: defaultPoint.z + 1 },
          { x: defaultPoint.x, y: defaultPoint.y, z: defaultPoint.z + 1 }
        ];
      } else {
        // Create a rectangle using first two points as diagonal corners
        const p1 = points[0];
        const p2 = points[1];
        points = [
          p1,
          { x: p2.x, y: p1.y, z: p1.z },
          p2,
          { x: p1.x, y: p1.y, z: p2.z }
        ];
      }
    }
  }

  // Calculate the actual area of the polygon
  const area = calculatePolygonArea(points);
  
  // Initialize dimensions variables
  let availableWidth: number;
  let availableLength: number;
  let boundingHeight: number;
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
    boundingHeight = availableWidth + (2 * edgeDistance);
    boundingLength = availableLength + (2 * edgeDistance);
    
    console.log("Using user-defined dimensions:", {
      availableWidth,
      availableLength,
      boundingHeight,
      boundingLength
    });
  } 
  // Use roof edge measurements if available, valid, and complete (second priority)
  else if (roofEdgeInfo && roofEdgeInfo.hasAllEdges && (roofEdgeInfo.isValid !== false)) {
    // Use min verge width for boundingHeight and min ridge/eave length for boundingLength
    boundingHeight = roofEdgeInfo.minVergeWidth!; 
    boundingLength = roofEdgeInfo.minLength!;
    
    // Derive the available area by accounting for edge distances
    availableWidth = Math.max(0, boundingHeight - (2 * edgeDistance));
    availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
    
    console.log("Using roof edge measurements for dimensions:", {
      boundingHeight,
      boundingLength,
      availableWidth,
      availableLength
    });
  } else {
    // Calculate dimensions based on the shape of the polygon (fallback)
    
    // Make sure we're working with a quadrilateral (4 points)
    // If not, we'll create a representative quadrilateral
    let quadPoints = [...points];
    
    try {
      // Find parallel sides using the new approach
      const parallelSides = findParallelSides(quadPoints);
      
      // Calculate width and length as average of parallel sides
      const width1 = (parallelSides.pair1.length1 + parallelSides.pair1.length2) / 2;
      const width2 = (parallelSides.pair2.length1 + parallelSides.pair2.length2) / 2;
      
      // Assign width and length (width should be shorter than length by convention)
      if (width1 < width2) {
        boundingHeight = width1;
        boundingLength = width2;
      } else {
        boundingHeight = width2;
        boundingLength = width1;
      }
      
      console.log("Calculated from parallel sides:", { boundingHeight, boundingLength });
    } catch (error) {
      console.warn("Error calculating parallel sides, falling back to quadrilateral dimensions", error);
      
      // Fallback to the quadrilateral dimensions calculation
      const dimensions = calculateQuadrilateralDimensions(quadPoints);
      boundingHeight = dimensions.width;
      boundingLength = dimensions.length;
      
      console.log("Fallback dimensions:", dimensions);
    }
    
    // Derive the available area by accounting for edge distances
    availableWidth = Math.max(0, boundingHeight - (2 * edgeDistance));
    availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
    
    // Sanity check: make sure our available area is reasonable given the total area
    const availableArea = availableWidth * availableLength;
    
    // If the available area is significantly larger than the actual area, adjust dimensions
    if (availableArea > area * 1.5) {
      // Scale dimensions based on the actual area
      const scaleFactor = Math.sqrt(area / availableArea);
      availableWidth *= scaleFactor;
      availableLength *= scaleFactor;
      
      // Update bounding dimensions
      boundingHeight = availableWidth + (2 * edgeDistance);
      boundingLength = availableLength + (2 * edgeDistance);
      
      console.log("Dimensions adjusted after area sanity check:", {
        scaleFactor,
        availableWidth,
        availableLength,
        boundingHeight, 
        boundingLength
      });
    }
  }
  
  // DEBUG: Log calculation values
  console.log("PV Calculation Debug:", {
    area,
    boundingHeight,
    boundingLength,
    availableWidth,
    availableLength,
    manualDimensions,
    moduleWidth,
    moduleHeight,
    edgeDistance,
    moduleSpacing,
    roofEdgeInfo
  });
  
  // IMPORTANT: SWAPPED ORIENTATION DEFINITIONS
  // Landscape orientation means the module's HEIGHT (longer side) is aligned with the roof's HEIGHT (verge/Ortgang)
  // Portrait orientation means the module's WIDTH (shorter side) is aligned with the roof's HEIGHT (verge/Ortgang)
  
  // Portrait orientation calculations 
  // In portrait, the shorter side of the module (width) is parallel to verge (Ortgang)
  // and the longer side (height) is parallel to eave/ridge (Traufe/First)
  const portraitModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));  // Modules across width (parallel to eave/ridge)
  const portraitModulesY = Math.floor(availableLength / (moduleWidth + moduleSpacing)); // Modules across length (parallel to verge)
  
  // Total modules in portrait orientation
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Landscape orientation calculations
  // In landscape, the shorter side of the module (width) is parallel to eave/ridge (Traufe/First)
  // and the longer side (height) is parallel to verge (Ortgang)
  const landscapeModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing)); // Modules across width (parallel to eave/ridge)
  const landscapeModulesY = Math.floor(availableLength / (moduleHeight + moduleSpacing));  // Modules across length (parallel to verge)
  
  // Total modules in landscape orientation
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
  // DEBUG: Log the module counts with clear orientation descriptions
  console.log("PV Module Counts:", {
    portrait: {
      description: "Module WIDTH parallel to verge (Ortgang), HEIGHT parallel to eave (Traufe)",
      modulesAcrossWidth: portraitModulesX,
      modulesAcrossLength: portraitModulesY,
      totalModules: portraitModuleCount,
      formula: `Modules across width: floor(${availableWidth.toFixed(3)} / (${moduleHeight.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${portraitModulesX}`,
      formula2: `Modules across length: floor(${availableLength.toFixed(3)} / (${moduleWidth.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${portraitModulesY}`
    },
    landscape: {
      description: "Module HEIGHT parallel to verge (Ortgang), WIDTH parallel to eave (Traufe)",
      modulesAcrossWidth: landscapeModulesX,
      modulesAcrossLength: landscapeModulesY,
      totalModules: landscapeModuleCount,
      formula: `Modules across width: floor(${availableWidth.toFixed(3)} / (${moduleWidth.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${landscapeModulesX}`,
      formula2: `Modules across length: floor(${availableLength.toFixed(3)} / (${moduleHeight.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${landscapeModulesY}`
    }
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
    boundingWidth: boundingHeight, // Keep property name for compatibility
    boundingLength,
    boundingHeight, // Correct property name
    availableWidth,
    availableLength,
    startX,   // Start X position for visualization
    startZ,   // Start Z position for visualization
    minX,     // For grid boundary visualization
    maxX,     // For grid boundary visualization
    minZ,     // For grid boundary visualization
    maxZ,     // For grid boundary visualization
    actualArea: area, // The actual polygon area (not just bounding box)
    manualDimensions,
    userDefinedWidth: manualDimensions ? availableWidth : undefined,
    userDefinedLength: manualDimensions ? availableLength : undefined,
    edgeInfoValid: roofEdgeInfo ? (roofEdgeInfo.isValid !== false) : undefined,
    edgeInfoMessage: roofEdgeInfo?.validationMessage,
    pvModuleSpec: {
      name: "Standard (425W)", // The required 'name' property
      width: moduleWidth,
      height: moduleHeight,
      power: 425, // Default power value
      efficiency: 21.0 // Default efficiency value
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
  
  // Determine module dimensions based on orientation - SWAPPED DEFINITIONS
  // Landscape: the longer side (height) is parallel to roof height (verge/Ortgang)
  // Portrait: the shorter side (width) is parallel to roof height (verge/Ortgang)
  const moduleWidth = pvInfo.orientation === 'landscape' ? pvInfo.moduleWidth : pvInfo.moduleHeight;
  const moduleHeight = pvInfo.orientation === 'landscape' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  
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
