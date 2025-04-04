import { Point, PVModuleInfo, PVModuleSpec, Measurement, PVMaterials, PVMountingSystem, PVElectricalSystem } from '@/types/measurements';
import { calculatePolygonArea, calculateQuadrilateralDimensions, generateSegments } from './measurementCalculations';
import * as THREE from 'three';

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

// Default values for material calculations
export const DEFAULT_ROOF_HOOK_SPACING = 0.8; // meters (80cm between hooks)
export const DEFAULT_CABLE_PER_MODULE = 1.2; // meters of string cable per module
export const DEFAULT_INVERTER_SIZING_FACTOR = 0.85; // Inverter should be 85% of module power
export const DEFAULT_MODULES_PER_STRING = 10; // Default modules per string

// Constants for material calculation
const RAIL_LENGTH_PER_MODULE = 0.35; // meters of rail per module (approximation)
const RAIL_STANDARD_LENGTH = 3.0; // Standard rail length in meters
const END_CLAMPS_PER_ARRAY = 4; // 4 end clamps per array (one at each corner)

// Constants for yield calculation
const ANNUAL_YIELD_FACTOR_DEFAULT = 950; // kWh/kWp (estimated annual yield per kWp in Germany)
const YIELD_FACTORS: Record<string, number> = {
  'hochformat': 950, // Portrait orientation
  'querformat': 970, // Landscape orientation
  'default': 950
};

/**
 * Berechnet den Durchschnitt der Y-Koordinaten für eine Reihe von Punkten
 * @param points - Array von Punkten
 * @returns Durchschnittliche Y-Koordinate
 */
const calculateAverageY = (points: Point[]): number => {
  if (points.length === 0) return 0;
  return points.reduce((sum, point) => sum + point.y, 0) / points.length;
};

/**
 * Berechnet die Neigung einer Linie zwischen zwei Punkten
 * @param p1 - Erster Punkt
 * @param p2 - Zweiter Punkt
 * @returns Neigung in Grad
 */
const calculateLineInclination = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  // Horizontale Distanz
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  
  // Vermeiden von Division durch Null
  if (horizontalDistance === 0) return 0;
  
  // Berechnen der Neigung in Grad
  const inclinationRad = Math.atan(dy / horizontalDistance);
  return Math.abs(inclinationRad * (180 / Math.PI));
};

/**
 * Extract roof edge measurements from the measurements array
 * and classify them correctly based on their height and inclination
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
  // Sammle alle Kanten-Messungen nach Typ
  const ridgeMeasurements = measurements.filter(m => m.type === 'ridge');
  const eaveMeasurements = measurements.filter(m => m.type === 'eave');
  const vergeMeasurements = measurements.filter(m => m.type === 'verge');
  
  // Ergebnisse initialisieren
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
  
  // Wenn es Messungen vom Typ 'ridge' und 'eave' gibt, überprüfe, welche höher liegt (First vs. Traufe)
  if (ridgeMeasurements.length > 0 && eaveMeasurements.length > 0) {
    // Berechne den durchschnittlichen Y-Wert für alle Messungen vom Typ 'ridge'
    const ridgeY = ridgeMeasurements.reduce((sum, m) => {
      if (m.points?.length >= 2) {
        return sum + calculateAverageY(m.points);
      }
      return sum;
    }, 0) / ridgeMeasurements.length;
    
    // Berechne den durchschnittlichen Y-Wert für alle Messungen vom Typ 'eave'
    const eaveY = eaveMeasurements.reduce((sum, m) => {
      if (m.points?.length >= 2) {
        return sum + calculateAverageY(m.points);
      }
      return sum;
    }, 0) / eaveMeasurements.length;
    
    // Bestimme First und Traufe basierend auf der Höhe
    if (ridgeY > eaveY) {
      // 'ridge' ist die höhere Kante, also First
      result.ridgeLength = ridgeMeasurements[0].value;
      result.eaveLength = eaveMeasurements[0].value;
    } else {
      // 'eave' ist die höhere Kante, also tauschen wir die Bezeichnungen
      console.log("Korrigiere Kennzeichnung: 'eave' ist höher als 'ridge', tausche Bezeichnungen");
      result.ridgeLength = eaveMeasurements[0].value;
      result.eaveLength = ridgeMeasurements[0].value;
    }
  } else {
    // Wenn nur eine Art von Messung vorhanden ist, nehmen wir sie wie markiert
    if (ridgeMeasurements.length > 0) {
      result.ridgeLength = ridgeMeasurements[0].value;
    }
    
    if (eaveMeasurements.length > 0) {
      result.eaveLength = eaveMeasurements[0].value;
    }
  }
  
  // Verarbeite Ortgang-Messungen und prüfe ihre Neigung
  if (vergeMeasurements.length >= 1) {
    result.vergeWidth1 = vergeMeasurements[0].value;
    
    // Überprüfe, ob die Messung tatsächlich eine Neigung hat (Ortgang sollte geneigt sein)
    if (vergeMeasurements[0].points?.length >= 2) {
      const inclination = calculateLineInclination(
        vergeMeasurements[0].points[0],
        vergeMeasurements[0].points[1]
      );
      if (inclination < 5) { // Wenn die Neigung weniger als 5 Grad beträgt
        console.warn(`Ortgang 1 hat eine sehr geringe Neigung (${inclination.toFixed(2)}°), könnte falsch markiert sein`);
      }
    }
  }
  
  if (vergeMeasurements.length >= 2) {
    result.vergeWidth2 = vergeMeasurements[1].value;
    
    // Überprüfe, ob die Messung tatsächlich eine Neigung hat
    if (vergeMeasurements[1].points?.length >= 2) {
      const inclination = calculateLineInclination(
        vergeMeasurements[1].points[0],
        vergeMeasurements[1].points[1]
      );
      if (inclination < 5) { // Wenn die Neigung weniger als 5 Grad beträgt
        console.warn(`Ortgang 2 hat eine sehr geringe Neigung (${inclination.toFixed(2)}°), könnte falsch markiert sein`);
      }
    }
  }
  
  // Calculate minimum dimensions (instead of averages) for boundary calculation
  if (result.ridgeLength !== undefined && result.eaveLength !== undefined) {
    // Use the shorter of ridge and eave lengths
    result.minLength = Math.min(result.ridgeLength, result.eaveLength);
    
    // Validate consistency between ridge and eave
    const lengthDifference = Math.abs(result.ridgeLength - result.eaveLength);
    const maxAllowedDifference = Math.max(result.ridgeLength, result.eaveLength) * 0.2; // Allow 20% difference
    
    if (lengthDifference > maxAllowedDifference) {
      console.warn(`Große Differenz zwischen First (${result.ridgeLength.toFixed(2)}m) und Traufe (${result.eaveLength.toFixed(2)}m) Messungen: ${lengthDifference.toFixed(2)}m`);
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
      console.warn(`Große Differenz zwischen Ortgang-Messungen: ${widthDifference.toFixed(2)}m`);
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
    
    console.log("Flächenvalidierung:", {
      erwarteteFlaeche: expectedArea,
      tatsaechlicheFlaeche: actualArea,
      flaechenDifferenz: areaDifference,
      flaechenDifferenzProzent: areaDifferencePercent
    });
    
    // If the areas differ by more than 30%, flag as potentially invalid
    if (areaDifferencePercent > 30) {
      console.warn(`Große Differenz zwischen erwarteter Fläche aus Kanten (${expectedArea.toFixed(2)}m²) und tatsächlicher Dachfläche (${actualArea.toFixed(2)}m²): ${areaDifferencePercent.toFixed(1)}%`);
      result.validationMessage = result.validationMessage 
        ? result.validationMessage + " Die berechnete Fläche weicht stark von der gemessenen Fläche ab."
        : "Die berechnete Fläche weicht stark von der gemessenen Fläche ab.";
      result.isValid = false;
    }
  }
  
  console.log("Extrahierte Dachkantenmessungen:", result);
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
 * Berechne den Richtungsvektor zwischen zwei Punkten in der XZ-Ebene
 * @param p1 - Startpunkt
 * @param p2 - Endpunkt
 * @returns Normalisierter Richtungsvektor {x, z}
 */
const calculateDirectionVector = (p1: Point, p2: Point): {x: number, z: number} => {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  
  // Länge des Vektors berechnen
  const length = Math.sqrt(dx * dx + dz * dz);
  
  // Normalisieren (Einheitsvektor)
  if (length === 0) return {x: 1, z: 0}; // Standardrichtung, falls Punkte identisch
  
  return {
    x: dx / length,
    z: dz / length
  };
};

/**
 * Berechne den Winkel (in Radiant) zwischen dem Richtungsvektor und der X-Achse
 * @param direction - Richtungsvektor {x, z}
 * @returns Winkel in Radiant
 */
const calculateAngle = (direction: {x: number, z: number}): number => {
  return Math.atan2(direction.z, direction.x);
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
  
  // CORRECTED ORIENTATION DEFINITIONS:
  // Landscape (Querformat): Module's LONGER side (height) is aligned with the roof's LENGTH (ridge/eave)
  // Portrait (Hochformat): Module's LONGER side (height) is aligned with the roof's HEIGHT (verge/Ortgang)
  
  // Landscape orientation calculations (Querformat)
  // In landscape, the longer side of the module (height) is parallel to eave/ridge (Traufe/First)
  // and the shorter side (width) is parallel to verge (Ortgang)
  const landscapeModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing)); // Modules across width (parallel to eave/ridge)
  const landscapeModulesY = Math.floor(availableLength / (moduleHeight + moduleSpacing));  // Modules across length (parallel to verge)
  
  // Total modules in landscape orientation
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
  // Portrait orientation calculations (Hochformat)
  // In portrait, the longer side of the module (height) is parallel to verge (Ortgang)
  // and the shorter side (width) is parallel to eave/ridge (Traufe/First)
  const portraitModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));  // Modules across width (parallel to eave/ridge)
  const portraitModulesY = Math.floor(availableLength / (moduleWidth + moduleSpacing)); // Modules across length (parallel to verge)
  
  // Total modules in portrait orientation
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // DEBUG: Log the module counts with clear orientation descriptions
  console.log("PV Module Counts:", {
    portrait: {
      description: "Hochformat: Module LONGER side (height) parallel to verge (Ortgang), shorter side parallel to eave (Traufe)",
      modulesAcrossWidth: portraitModulesX,
      modulesAcrossLength: portraitModulesY,
      totalModules: portraitModuleCount,
      formula: `Modules across width: floor(${availableWidth.toFixed(3)} / (${moduleHeight.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${portraitModulesX}`,
      formula2: `Modules across length: floor(${availableLength.toFixed(3)} / (${moduleWidth.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${portraitModulesY}`
    },
    landscape: {
      description: "Querformat: Module LONGER side (height) parallel to eave (Traufe), shorter side parallel to verge (Ortgang)",
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
 * Generate the grid points for PV module placement aligned with roof edges
 * 
 * @param pvInfo - PV module information
 * @param baseY - The Y-coordinate (height) to place the modules at
 * @param roofEdgeSegments - Optional array of roof edge segments to align with
 * @returns Array of module corner points and grid lines
 */
export const generatePVModuleGrid = (
  pvInfo: PVModuleInfo, 
  baseY: number,
  roofEdgeSegments?: {from: Point, to: Point}[]
): {
  modulePoints: Point[][],  // Array of 4 points for each module
  gridLines: {from: Point, to: Point}[]  // Lines for the grid
} => {
  const modulePoints: Point[][] = [];
  const gridLines: {from: Point, to: Point}[] = [];
  
  // Determine module dimensions based on orientation
  const moduleWidth = pvInfo.orientation === 'landscape' ? pvInfo.moduleWidth : pvInfo.moduleHeight;
  const moduleHeight = pvInfo.orientation === 'landscape' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  
  // Get the starting position (add edge distance to min coordinates)
  const startX = pvInfo.startX || (pvInfo.minX + pvInfo.edgeDistance!);
  const startZ = pvInfo.startZ || (pvInfo.minZ + pvInfo.edgeDistance!);
  
  // Standard orthogonal vectors (default alignment with coordinate system)
  let directionX = { x: 1, z: 0 };
  let directionZ = { x: 0, z: 1 };
  let alignmentAngle = 0;
  
  // Versuche, eine Trauflinie (eave) zu finden, um die Module daran auszurichten
  if (roofEdgeSegments && roofEdgeSegments.length > 0) {
    // Wähle das längste Segment für eine stabilere Ausrichtung
    let longestSegment = roofEdgeSegments[0];
    let maxLength = 0;
    
    roofEdgeSegments.forEach(segment => {
      // Create THREE.Vector3 objects to calculate length
      const from = new THREE.Vector3(segment.from.x, segment.from.y, segment.from.z);
      const to = new THREE.Vector3(segment.to.x, segment.to.y, segment.to.z);
      const length = new THREE.Vector3().subVectors(to, from).length();
      
      if (length > maxLength) {
        maxLength = length;
        longestSegment = segment;
      }
    });
    
    console.log("Längste Dachkante für Ausrichtung gefunden:", {
      from: [longestSegment.from.x, longestSegment.from.y, longestSegment.from.z],
      to: [longestSegment.to.x, longestSegment.to.y, longestSegment.to.z],
      length: maxLength
    });
    
    // Berechne Richtungsvektor entlang der Dachkante (nur in XZ-Ebene projiziert)
    const dx = longestSegment.to.x - longestSegment.from.x;
    const dz = longestSegment.to.z - longestSegment.from.z;
    const length2D = Math.sqrt(dx * dx + dz * dz);
    
    if (length2D > 0.1) { // Mindestlänge für sinnvolle Ausrichtung
      // Normalisierter Richtungsvektor entlang der Dachkante
      directionX = { 
        x: dx / length2D, 
        z: dz / length2D 
      };
      
      // Orthogonaler Vektor (90° gedreht) für die zweite Richtung
      directionZ = { 
        x: -directionX.z, 
        z: directionX.x 
      };
      
      // Berechne Winkel zur X-Achse für Debug-Zwecke
      alignmentAngle = Math.atan2(directionX.z, directionX.x) * (180 / Math.PI);
      
      console.log("Module werden ausgerichtet mit Winkel:", alignmentAngle, "Grad");
      console.log("Richtungsvektoren:", { 
        x: directionX, 
        z: directionZ,
        length2D
      });
    } else {
      console.log("Dachkante zu kurz für sinnvolle Ausrichtung, verwende Standard-Ausrichtung");
    }
  } else {
    console.log("Keine Dachkanten-Segmente verfügbar, verwende Standard-Ausrichtung");
  }
  
  console.log("PV Module Grid Generation mit Dachausrichtung:", {
    moduleWidth,
    moduleHeight,
    startX,
    startZ,
    rows: pvInfo.rows,
    columns: pvInfo.columns,
    orientation: pvInfo.orientation,
    baseY,
    alignmentAngle
  });
  
  // Generate module placement grid
  for (let row = 0; row < pvInfo.rows!; row++) {
    for (let col = 0; col < pvInfo.columns!; col++) {
      // Berechne die Basisposition dieses Moduls im Standard-Koordinatensystem
      const xOffset = col * (moduleWidth + pvInfo.moduleSpacing!);
      const zOffset = row * (moduleHeight + pvInfo.moduleSpacing!);
      
      // Transformiere die Position gemäß der Dachausrichtung
      const x = startX + xOffset * directionX.x + zOffset * directionZ.x;
      const z = startZ + xOffset * directionX.z + zOffset * directionZ.z;
      
      // Reduced module height offset from 30cm to 5cm above the roof surface for better visibility
      const yOffset = 0.05; // 5cm above the roof surface
      
      // Berechne die vier Eckpunkte des Moduls mit korrekter Ausrichtung
      const moduleCorners: Point[] = [
        { // Ecke 0 (linke obere Ecke)
          x,
          y: baseY + yOffset,
          z
        },
        { // Ecke 1 (rechte obere Ecke) - entlang der Dachkante
          x: x + moduleWidth * directionX.x,
          y: baseY + yOffset,
          z: z + moduleWidth * directionX.z
        },
        { // Ecke 2 (rechte untere Ecke) - diagonal
          x: x + moduleWidth * directionX.x + moduleHeight * directionZ.x,
          y: baseY + yOffset,
          z: z + moduleWidth * directionX.z + moduleHeight * directionZ.z
        },
        { // Ecke 3 (linke untere Ecke) - orthogonal zur Dachkante
          x: x + moduleHeight * directionZ.x,
          y: baseY + yOffset,
          z: z + moduleHeight * directionZ.z
        }
      ];
      
      modulePoints.push(moduleCorners);
      
      // Add grid lines for outline visualization of each module
      for (let i = 0; i < 4; i++) {
        const from = moduleCorners[i];
        const to = moduleCorners[(i + 1) % 4];
        gridLines.push({ from, to });
      }
    }
  }
  
  // Add detailed debug logging to track module generation
  console.log(`Generated ${modulePoints.length} PV modules with yOffset=${0.05}m und Ausrichtung ${alignmentAngle.toFixed(2)}°`);
  if (modulePoints.length > 0) {
    console.log("First module corners:", modulePoints[0]);
  }
  
  return { modulePoints, gridLines };
};

/**
 * Calculate the mounting system requirements based on PV module layout
 * 
 * @param pvInfo - PV module information
 * @returns Mounting system requirements
 */
export const calculateMountingSystem = (pvInfo: PVModuleInfo): PVMountingSystem => {
  // Safety check
  if (!pvInfo.columns || !pvInfo.rows || !pvInfo.moduleCount) {
    return {
      railLength: 0,
      roofHookCount: 0,
      middleClampCount: 0,
      endClampCount: 0,
      railConnectorCount: 0
    };
  }
  
  // Calculate rail length based on module layout
  // For portrait orientation, we need rails along the length
  // For landscape orientation, we need rails along the width
  const railsPerRow = 2; // Typically 2 rails per row of modules
  
  let totalRailLength = 0;
  let totalRails = 0;
  
  if (pvInfo.orientation === 'portrait') {
    // In portrait, rails run perpendicular to the rows (along columns)
    const railLength = pvInfo.availableLength || 0;
    totalRails = pvInfo.columns * railsPerRow;
    totalRailLength = totalRails * railLength;
  } else {
    // In landscape, rails run along the rows
    const railLength = pvInfo.availableWidth || 0;
    totalRails = pvInfo.rows * railsPerRow;
    totalRailLength = totalRails * railLength;
  }
  
  // Calculate number of standard rail pieces needed
  const railConnectorCount = Math.max(0, Math.ceil(totalRailLength / RAIL_STANDARD_LENGTH) - totalRails);
  
  // Calculate roof hooks (typically spaced 80-100cm apart along each rail)
  const hooksPerRail = Math.ceil((pvInfo.orientation === 'portrait' ? 
    pvInfo.availableLength : pvInfo.availableWidth) / DEFAULT_ROOF_HOOK_SPACING);
  const roofHookCount = hooksPerRail * totalRails;
  
  // Calculate clamps
  // End clamps at the edges of each row/column
  const endClampCount = END_CLAMPS_PER_ARRAY * Math.max(1, Math.ceil(pvInfo.moduleCount / (pvInfo.rows * pvInfo.columns)));
  
  // Middle clamps between modules
  let middleClampCount = 0;
  if (pvInfo.orientation === 'portrait') {
    // In portrait, middle clamps along rows
    middleClampCount = (pvInfo.columns - 1) * pvInfo.rows * 2; // 2 per inter-module space
  } else {
    // In landscape, middle clamps along columns
    middleClampCount = (pvInfo.rows - 1) * pvInfo.columns * 2; // 2 per inter-module space
  }
  
  return {
    railLength: Math.ceil(totalRailLength * 10) / 10, // Round up to nearest 0.1m
    roofHookCount,
    middleClampCount,
    endClampCount,
    railConnectorCount
  };
};

/**
 * Calculate the electrical system requirements based on PV module layout
 * 
 * @param pvInfo - PV module information
 * @param inverterDistance - Distance to inverter in meters (default: 10m)
 * @returns Electrical system requirements
 */
export const calculateElectricalSystem = (
  pvInfo: PVModuleInfo, 
  inverterDistance: number = 10
): PVElectricalSystem => {
  // Get module power
  const modulePower = pvInfo.pvModuleSpec?.power || 425; // Watts
  const totalPower = (pvInfo.moduleCount * modulePower) / 1000; // kWp
  
  // Calculate optimal string size
  // This is a simplified calculation; in reality, it depends on inverter specs
  const modulesPerString = Math.min(DEFAULT_MODULES_PER_STRING, pvInfo.moduleCount);
  const stringCount = Math.ceil(pvInfo.moduleCount / modulesPerString);
  
  // Calculate inverter requirements
  const inverterPower = totalPower * DEFAULT_INVERTER_SIZING_FACTOR; // 85% of module power
  const inverterCount = Math.ceil(inverterPower / 10); // Assume 10kW per inverter max
  
  // Calculate cable lengths
  // String cable connects modules within each string
  const stringCableLength = pvInfo.moduleCount * DEFAULT_CABLE_PER_MODULE;
  
  // Main DC cable from strings to inverter
  const mainCableLength = stringCount * inverterDistance * 2; // Two cables (+ and -) per string
  
  // AC cable from inverter to connection point (assumed 5m)
  const acCableLength = inverterCount * 5;
  
  // Connectors (MC4 pairs)
  const connectorPairCount = stringCount * 2; // 2 pairs per string (string ends + combiner)
  
  return {
    stringCableLength: Math.ceil(stringCableLength),
    mainCableLength: Math.ceil(mainCableLength),
    acCableLength: Math.ceil(acCableLength),
    connectorPairCount,
    inverterCount,
    inverterPower: Math.ceil(inverterPower * 10) / 10, // Round to 1 decimal place
    stringCount,
    modulesPerString
  };
};

/**
 * Calculate all materials needed for a PV system based on the PV module layout
 * 
 * @param pvInfo - PV module information with layout details
 * @param inverterDistance - Distance to inverter in meters (default: 10m)
 * @returns Complete material list for the PV system
 */
export const calculatePVMaterials = (
  pvInfo: PVModuleInfo,
  inverterDistance: number = 10
): PVMaterials => {
  // Safety check
  if (!pvInfo.moduleCount || !pvInfo.pvModuleSpec) {
    return {
      totalModuleCount: 0,
      totalPower: 0,
      moduleSpec: PV_MODULE_TEMPLATES[0],
      mountingSystem: {
        railLength: 0,
        roofHookCount: 0,
        middleClampCount: 0,
        endClampCount: 0,
        railConnectorCount: 0
      },
      electricalSystem: {
        stringCableLength: 0,
        mainCableLength: 0,
        acCableLength: 0,
        connectorPairCount: 0,
        inverterCount: 0,
        inverterPower: 0,
        stringCount: 0,
        modulesPerString: 0
      },
      includesSurgeProtection: true,
      includesMonitoringSystem: true,
      notes: ["Keine Materialliste verfügbar. Bitte PV-Layout berechnen."]
    };
  }
  
  // Calculate total power
  const modulePower = pvInfo.pvModuleSpec.power || 425; // Watts
  const totalPower = (pvInfo.moduleCount * modulePower) / 1000; // kWp
  
  // Calculate mounting system
  const mountingSystem = calculateMountingSystem(pvInfo);
  
  // Calculate electrical system
  const electricalSystem = calculateElectricalSystem(pvInfo, inverterDistance);
  
  // Generate notes and recommendations
  const notes: string[] = [];
  
  // Add notes based on calculations
  if (totalPower > 15) {
    notes.push("Große Anlage: Prüfen Sie, ob eine Dreiphasige Einspeisung erforderlich ist.");
  }
  
  if (mountingSystem.roofHookCount > 40) {
    notes.push("Hohe Anzahl an Dachhaken: Prüfen Sie die Statik des Daches.");
  }
  
  if (electricalSystem.stringCount > 2) {
    notes.push("Mehrere Strings: Ein Stringwechselrichter oder Moduloptimierer wird empfohlen.");
  }
  
  // Default note if none were added
  if (notes.length === 0) {
    notes.push("Standardanlage: Keine besonderen Hinweise.");
  }
  
  return {
    totalModuleCount: pvInfo.moduleCount,
    totalPower,
    moduleSpec: pvInfo.pvModuleSpec,
    mountingSystem,
    electricalSystem,
    includesSurgeProtection: true,  // Default to including these
    includesMonitoringSystem: true, // Default to including these
    notes
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

/**
 * Format the materials list as a human-readable string
 * 
 * @param materials - The PV materials object
 * @returns Formatted string with materials information
 */
export const formatPVMaterials = (materials: PVMaterials): string => {
  if (!materials || !materials.mountingSystem || !materials.electricalSystem) {
    return "Keine Materialliste verfügbar";
  }
  
  return `${materials.totalModuleCount} Module (${materials.totalPower.toFixed(1)} kWp), ${materials.mountingSystem.railLength.toFixed(1)}m Schienen`;
};

/**
 * Calculate the estimated annual yield for a PV system
 * 
 * @param totalPower - Total installed power in kWp
 * @param orientation - Module orientation ('hochformat' or 'querformat')
 * @param location - Optional location factor (default is Germany)
 * @returns Estimated annual yield in kWh
 */
export const calculateAnnualYield = (
  totalPower: number,
  orientation: string = 'default',
  location: string = 'germany'
): number => {
  // Get the yield factor based on orientation
  const yieldFactor = YIELD_FACTORS[orientation] || ANNUAL_YIELD_FACTOR_DEFAULT;
  
  // Apply location adjustment if needed
  let locationFactor = 1.0;
  if (location === 'southern_germany') {
    locationFactor = 1.05; // 5% more in southern Germany
  } else if (location === 'northern_germany') {
    locationFactor = 0.95; // 5% less in northern Germany
  }
  
  // Calculate and return the annual yield
  return totalPower * yieldFactor * locationFactor;
};

/**
 * Calculate the roof orientation (azimuth) from 3D points
 * @param points - Array of 3D points defining the roof surface
 * @returns Roof orientation in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export const calculateRoofOrientation = (points: Point[]): {
  azimuth: number;  // Azimuth in degrees (0=North, 90=East, 180=South, 270=West)
  direction: string; // Cardinal direction (N, NE, E, SE, S, SW, W, NW)
  inclination: number; // Roof inclination in degrees
} => {
  if (points.length < 3) {
    return { azimuth: 180, direction: 'S', inclination: 30 }; // Default to South if not enough points
  }
  
  try {
    // Calculate the normal vector of the roof plane
    // We need at least 3 points to define a plane
    const p1 = points[0];
    const p2 = points[1];
    const p3 = points[2];
    
    // Create vectors for two edges of the triangle
    const v1 = { 
      x: p2.x - p1.x,
      y: p2.y - p1.y,
      z: p2.z - p1.z
    };
    
    const v2 = {
      x: p3.x - p1.x,
      y: p3.y - p1.y,
      z: p3.z - p1.z
    };
    
    // Calculate the cross product to get the normal vector
    const normal = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    };
    
    // Normalize the normal vector
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
    
    // Calculate inclination (roof pitch)
    // Angle between normal vector and vertical (Y) axis
    const inclination = Math.acos(Math.abs(normal.y)) * (180 / Math.PI);
    
    // Project the normal vector onto the XZ plane for azimuth calculation
    const projectedNormal = {
      x: normal.x,
      z: normal.z
    };
    
    // Calculate azimuth (roof orientation)
    // Azimuth is the angle between the projection of the normal vector on XZ plane and the north direction
    // In our coordinate system, Z axis might be aligned with North, and X with East (check your system)
    // We'll assume Z is South and X is East for this calculation
    
    let azimuth = Math.atan2(projectedNormal.x, -projectedNormal.z) * (180 / Math.PI);
    
    // Make sure azimuth is between 0 and 360 degrees
    if (azimuth < 0) {
      azimuth += 360;
    }
    
    // Determine cardinal direction
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
    const index = Math.round(azimuth / 45);
    const direction = directions[index];
    
    console.log("Roof orientation calculated:", {
      azimuth,
      direction,
      inclination,
      normalVector: normal
    });
    
    return { 
      azimuth, 
      direction,
      inclination
    };
  } catch (error) {
    console.error("Error calculating roof orientation:", error);
    // Default to South facing if calculation fails
    return { azimuth: 180, direction: 'S', inclination: 30 };
  }
};

/**
 * Calculate the yield factor based on roof orientation and inclination
 * @param azimuth - Roof azimuth in degrees (0=North, 90=East, 180=South, 270=West)
 * @param inclination - Roof inclination in degrees
 * @returns Yield factor in kWh/kWp per year
 */
export const calculateYieldFactorFromOrientation = (
  azimuth: number, 
  inclination: number
): number => {
  // Optimal orientation is South (180°) with inclination around 30-40°
  
  // Base yield factor for Germany (optimal conditions)
  let baseFactor = 1000; // kWh/kWp for optimal conditions
  
  // Penalty for non-optimal azimuth
  // South is optimal (180°), reduce yield as we move away from south
  const azimuthDiff = Math.abs(azimuth - 180);
  let azimuthFactor = 1;
  
  if (azimuthDiff <= 45) {
    // Within 45° of south (SE to SW): small reduction
    azimuthFactor = 1 - (azimuthDiff / 180);
  } else if (azimuthDiff <= 90) {
    // East or West: moderate reduction
    azimuthFactor = 0.8 - ((azimuthDiff - 45) / 450);
  } else {
    // Facing north: significant reduction
    azimuthFactor = 0.7 - ((azimuthDiff - 90) / 900);
  }
  
  // Penalty for non-optimal inclination
  // 30-40° is optimal, reduce yield as we move away
  let inclinationFactor = 1;
  
  if (inclination < 10) {
    // Almost flat: moderate reduction
    inclinationFactor = 0.9;
  } else if (inclination >= 10 && inclination <= 40) {
    // Optimal range: little to no reduction
    inclinationFactor = 0.95 + ((inclination - 10) / 300);
  } else {
    // Too steep: progressive reduction
    inclinationFactor = 1 - ((inclination - 40) / 100);
  }
  
  // Combined yield factor
  const yieldFactor = baseFactor * azimuthFactor * inclinationFactor;
  
  console.log("Yield calculation:", {
    azimuth,
    azimuthDiff,
    azimuthFactor,
    inclination,
    inclinationFactor,
    yieldFactor
  });
  
  return Math.round(yieldFactor);
};

/**
 * Update an existing PVModuleInfo with orientation data from the 3D points
 */
export const updatePVModuleInfoWithOrientation = (
  pvInfo: PVModuleInfo,
  points: Point[]
): PVModuleInfo => {
  // Calculate the roof orientation
  const { azimuth, direction, inclination } = calculateRoofOrientation(points);
  
  // Calculate the yield factor based on orientation
  const yieldFactor = calculateYieldFactorFromOrientation(azimuth, inclination);
  
  // Create updated PV info with orientation data
  return {
    ...pvInfo,
    roofAzimuth: azimuth,
    roofDirection: direction,
    roofInclination: inclination,
    yieldFactor: yieldFactor
  };
};

/**
 * Calculate the estimated annual yield for a PV system with orientation data
 * 
 * @param totalPower - Total installed power in kWp
 * @param pvInfo - PV module information with orientation data
 * @returns Estimated annual yield in kWh
 */
export const calculateAnnualYieldWithOrientation = (
  totalPower: number,
  pvInfo: PVModuleInfo
): number => {
  // Use either the calculated yield factor or fall back to the default
  const yieldFactor = pvInfo.yieldFactor || 
                     (pvInfo.roofAzimuth && pvInfo.roofInclination 
                      ? calculateYieldFactorFromOrientation(pvInfo.roofAzimuth, pvInfo.roofInclination) 
                      : ANNUAL_YIELD_FACTOR_DEFAULT);
  
  // Calculate and return the annual yield
  return totalPower * yieldFactor;
};
