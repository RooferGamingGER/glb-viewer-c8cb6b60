import * as THREE from 'three';
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
 * Berechnet die Dachneigung basierend auf den Punkten
 * @param points - Array von 3D-Punkten, die das Dach definieren
 * @returns Dachneigung in Grad
 */
const calculateRoofPitch = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Wir erstellen Vektoren zwischen den Punkten, um eine Ebene zu definieren
  const v1 = new THREE.Vector3(
    points[1].x - points[0].x,
    points[1].y - points[0].y,
    points[1].z - points[0].z
  );
  
  const v2 = new THREE.Vector3(
    points[2].x - points[0].x,
    points[2].y - points[0].y,
    points[2].z - points[0].z
  );
  
  // Berechnen der Normalen der Ebene mit dem Kreuzprodukt
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  // Berechnen des Winkels zwischen der Normalen und der Y-Achse
  const yAxis = new THREE.Vector3(0, 1, 0);
  const angle = Math.acos(normal.dot(yAxis));
  
  // Umrechnen in Grad und von der Normalen zur Ebene
  return 90 - (angle * 180 / Math.PI);
};

/**
 * Berechnet die horizontale Projektion einer trapezförmigen Fläche
 * @param points - Array von 3D-Punkten, die das Trapez definieren
 * @param roofPitch - Dachneigung in Grad
 * @returns Projizierte Fläche als Array von Punkten
 */
const calculateHorizontalProjection = (points: Point[], roofPitch: number): Point[] => {
  if (points.length < 4) return points;
  
  // Wenn die Dachneigung nahe 0 ist, keine Projektion notwendig
  if (Math.abs(roofPitch) < 1) return points;
  
  // Umrechnung der Neigung in Radianten
  const pitchRad = roofPitch * (Math.PI / 180);
  
  // Projektionsfaktor (cosinus der Neigung)
  const projectionFactor = Math.cos(pitchRad);
  
  // Finde die minimale y-Koordinate
  const minY = Math.min(...points.map(p => p.y));
  
  // Projiziere alle Punkte auf die horizontale Ebene
  return points.map(point => {
    // Höhenunterschied zum niedrigsten Punkt
    const heightDiff = point.y - minY;
    
    // Berechnen der horizontalen Verschiebung basierend auf der Neigung
    // Wir benötigen die Richtung der Dachneigung, nehmen wir z.B. negative z-Richtung an
    // Dies müsste in realen Anwendungen an die tatsächliche Dachausrichtung angepasst werden
    const horizontalShift = heightDiff * Math.tan(pitchRad);
    
    // Projektion auf die horizontale Ebene
    return {
      x: point.x,
      y: minY, // Alle Punkte werden auf die gleiche Höhe projiziert
      z: point.z + horizontalShift
    };
  });
};

/**
 * Identifiziert Firstkante und Traufenkante in einem trapezförmigen Dach
 * @param points - Array von 4 Punkten, die das Trapez definieren
 * @returns Objekt mit Indizes der First- und Traufenkante
 */
const identifyRidgeAndEave = (points: Point[]): { 
  ridgeIndices: [number, number], 
  eaveIndices: [number, number] 
} => {
  if (points.length !== 4) {
    throw new Error("Expected exactly 4 points for ridge and eave identification");
  }
  
  // Wir berechnen die durchschnittliche y-Koordinate für jede Kante
  const edges = [
    { indices: [0, 1], avgY: (points[0].y + points[1].y) / 2 },
    { indices: [1, 2], avgY: (points[1].y + points[2].y) / 2 },
    { indices: [2, 3], avgY: (points[2].y + points[3].y) / 2 },
    { indices: [3, 0], avgY: (points[3].y + points[0].y) / 2 }
  ];
  
  // Sortieren der Kanten nach y-Koordinate (aufsteigend)
  edges.sort((a, b) => a.avgY - b.avgY);
  
  // Die oberste Kante ist der First, die unterste die Traufe
  const eaveIndices: [number, number] = edges[0].indices as [number, number];
  const ridgeIndices: [number, number] = edges[3].indices as [number, number];
  
  return { ridgeIndices, eaveIndices };
};

/**
 * Berechnet die optimale Modulplatzierung für trapezförmige Dachflächen
 * mit Berücksichtigung der horizontalen Montage
 * 
 * @param points - Array von 3D-Punkten, die das Dachtrapez definieren
 * @param moduleWidth - Breite eines einzelnen PV-Moduls in Metern
 * @param moduleHeight - Höhe eines einzelnen PV-Moduls in Metern
 * @param edgeDistance - Abstand von der Dachkante in Metern
 * @param moduleSpacing - Abstand zwischen Modulen in Metern
 * @param userDimensions - Optional: Benutzerdefinierte Abmessungen
 * @param roofEdgeInfo - Optional: First-, Traufen- und Ortgangmaße
 * @param considerTrapezoid - Ob trapezförmige Berechnung verwendet werden soll
 * @returns Informationen zur PV-Modulplatzierung
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
  },
  considerTrapezoid: boolean = true
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
  
  // Berechnung der Dachneigung
  const roofPitch = calculateRoofPitch(points);
  console.log("Berechnete Dachneigung:", roofPitch.toFixed(2), "Grad");
  
  // Horizontale Projektion für waagerechte Montage, wenn die Neigung signifikant ist
  let projectedPoints = points;
  if (roofPitch > 5 && considerTrapezoid) {
    projectedPoints = calculateHorizontalProjection(points, roofPitch);
    console.log("Horizontale Projektion angewendet für waagerechte Montage");
  }
  
  // Initialize dimensions variables
  let availableWidth: number;
  let availableLength: number;
  let boundingHeight: number;
  let boundingLength: number;
  let manualDimensions = false;
  let isTrapezoid = false;
  let ridgeLength: number | undefined;
  let eaveLength: number | undefined;
  
  // Calculate minimum and maximum coordinates for visualization
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  projectedPoints.forEach(point => {
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
    // Behandlung von Trapezformen, wenn wir 4 Punkte haben
    if (projectedPoints.length === 4 && considerTrapezoid) {
      try {
        // Identifikation von First und Traufe
        const { ridgeIndices, eaveIndices } = identifyRidgeAndEave(projectedPoints);
        
        // Berechne die Längen von First und Traufe
        ridgeLength = calculateDistance3D(
          projectedPoints[ridgeIndices[0]], 
          projectedPoints[ridgeIndices[1]]
        );
        
        eaveLength = calculateDistance3D(
          projectedPoints[eaveIndices[0]], 
          projectedPoints[eaveIndices[1]]
        );
        
        // Überprüfe, ob es sich um ein Trapez handelt (signifikanter Unterschied zwischen First und Traufe)
        if (Math.abs(ridgeLength - eaveLength) > 0.2) {
          isTrapezoid = true;
          console.log("Trapezform erkannt:", { 
            firstLänge: ridgeLength.toFixed(2), 
            traufeLänge: eaveLength.toFixed(2) 
          });
          
          // Für das Trapez nehmen wir die kürzere Kante (konservativer Ansatz)
          boundingLength = Math.min(ridgeLength, eaveLength);
          
          // Die Breite (Ortgang) approximieren wir mit dem Abstand zwischen First und Traufe
          const midRidge = {
            x: (projectedPoints[ridgeIndices[0]].x + projectedPoints[ridgeIndices[1]].x) / 2,
            z: (projectedPoints[ridgeIndices[0]].z + projectedPoints[ridgeIndices[1]].z) / 2
          };
          
          const midEave = {
            x: (projectedPoints[eaveIndices[0]].x + projectedPoints[eaveIndices[1]].x) / 2,
            z: (projectedPoints[eaveIndices[0]].z + projectedPoints[eaveIndices[1]].z) / 2
          };
          
          boundingHeight = Math.sqrt(
            Math.pow(midRidge.x - midEave.x, 2) + Math.pow(midRidge.z - midEave.z, 2)
          );
          
          console.log("Berechnete Trapezabmessungen:", { 
            boundingHeight, 
            boundingLength 
          });
        } else {
          // Wenn der Unterschied nicht signifikant ist, Standard-Berechnung verwenden
          isTrapezoid = false;
          
          try {
            // Find parallel sides using the new approach
            const parallelSides = findParallelSides(projectedPoints);
            
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
          } catch (error) {
            console.warn("Error calculating parallel sides, falling back to quadrilateral dimensions", error);
            
            // Fallback to the quadrilateral dimensions calculation
            const dimensions = calculateQuadrilateralDimensions(projectedPoints);
            boundingHeight = dimensions.width;
            boundingLength = dimensions.length;
          }
        }
      } catch (error) {
        console.error("Fehler bei der Trapezberechnung, Standard-Ansatz wird verwendet", error);
        
        // Fallback zu Standard-Berechnung
        try {
          // ... keep existing code (standard parallel sides calculation) the same ...
        } catch (error) {
          console.warn("Error calculating parallel sides, falling back to quadrilateral dimensions", error);
          
          // Fallback to the quadrilateral dimensions calculation
          const dimensions = calculateQuadrilateralDimensions(projectedPoints);
          boundingHeight = dimensions.width;
          boundingLength = dimensions.length;
        }
      }
    } else {
      // Standard-Berechnung für nicht-trapezförmige Flächen oder wenn weniger als 4 Punkte
      try {
        // ... keep existing code (standard parallel sides calculation) the same ...
      } catch (error) {
        console.warn("Error calculating parallel sides, falling back to quadrilateral dimensions", error);
        
        // Fallback to the quadrilateral dimensions calculation
        const dimensions = calculateQuadrilateralDimensions(projectedPoints);
        boundingHeight = dimensions.width;
        boundingLength = dimensions.length;
      }
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
    roofEdgeInfo,
    isTrapezoid,
    roofPitch
  });
  
  // KORRIGIERTE ORIENTIERUNGSDEFINITIONEN:
  // Querformat: Die LÄNGERE Seite des Moduls (Höhe) ist parallel zur Dachlänge (First/Traufe)
  // Hochformat: Die LÄNGERE Seite des Moduls (Höhe) ist parallel zur Dachbreite (Ortgang)
  
  let portraitModuleCount = 0;
  let landscapeModuleCount = 0;
  let portraitModulesX = 0;
  let portraitModulesY = 0;
  let landscapeModulesX = 0;
  let landscapeModulesY = 0;
  
  // Spezialfall für Trapezform: Berechnung der Module reihenweise
  if (isTrapezoid && ridgeLength !== undefined && eaveLength !== undefined) {
    console.log("Trapezform-Berechnung wird angewendet");
    
    // Hochformat-Berechnung (längere Seite parallel zum Ortgang)
    portraitModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));
    
    // Bei Trapezform müssen wir die Anzahl der Module pro Reihe unterschiedlich berechnen
    const availableRows = Math.floor(availableLength / (moduleWidth + moduleSpacing));
    portraitModulesY = availableRows;
    
    // Geschätzte Abnahme der Breite pro Reihe
    const ridgeEaveDiff = Math.abs(ridgeLength - eaveLength);
    const widthDecreasePerRow = ridgeEaveDiff / availableRows;
    
    // Startbreite (bei First oder Traufe, je nachdem welche kürzer ist)
    let startWidth = Math.min(ridgeLength, eaveLength) - (2 * edgeDistance);
    
    // Wenn First kürzer ist als Traufe, beginnen wir beim First
    const startAtRidge = ridgeLength < eaveLength;
    
    // Berechnung der Module pro Reihe
    let totalPortraitModules = 0;
    for (let row = 0; row < availableRows; row++) {
      // Aktuelle Breite für diese Reihe
      const rowWidth = startWidth + (startAtRidge ? row * widthDecreasePerRow : (availableRows - row - 1) * widthDecreasePerRow);
      
      // Anzahl der Module, die in diese Reihe passen
      const modulesInRow = Math.floor(rowWidth / (moduleWidth + moduleSpacing));
      
      totalPortraitModules += modulesInRow;
    }
    
    // Setze die berechnete Anzahl
    portraitModuleCount = totalPortraitModules;
    
    // Querformat-Berechnung (längere Seite parallel zur Traufe)
    landscapeModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing));
    
    // Bei Trapezform müssen wir die Anzahl der Module pro Reihe unterschiedlich berechnen
    const availableLandscapeRows = Math.floor(availableLength / (moduleHeight + moduleSpacing));
    landscapeModulesY = availableLandscapeRows;
    
    // Berechnung der Module pro Reihe
    let totalLandscapeModules = 0;
    for (let row = 0; row < availableLandscapeRows; row++) {
      // Aktuelle Breite für diese Reihe
      const rowWidth = startWidth + (startAtRidge ? row * widthDecreasePerRow : (availableLandscapeRows - row - 1) * widthDecreasePerRow);
      
      // Anzahl der Module, die in diese Reihe passen
      const modulesInRow = Math.floor(rowWidth / (moduleHeight + moduleSpacing));
      
      totalLandscapeModules += modulesInRow;
    }
    
    // Setze die berechnete Anzahl
    landscapeModuleCount = totalLandscapeModules;
    
    console.log("Trapezform-Modulberechnung:", {
      hochformat: {
        modulesPerRow: portraitModulesX,
        rows: portraitModulesY,
        totalModules: portraitModuleCount
      },
      querformat: {
        modulesPerRow: landscapeModulesX,
        rows: landscapeModulesY,
        totalModules: landscapeModuleCount
      }
    });
  } else {
    // Standardberechnung für rechteckige oder andere Formen
    
    // Querformat (längere Seite parallel zu First/Traufe)
    landscapeModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing));
    landscapeModulesY = Math.floor(availableLength / (moduleHeight + moduleSpacing));
    landscapeModuleCount = landscapeModulesX * landscapeModulesY;
    
    // Hochformat (längere Seite parallel zu Ortgang)
    portraitModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));
    portraitModulesY = Math.floor(availableLength / (moduleWidth + moduleSpacing));
    portraitModuleCount = portraitModulesX * portraitModulesY;
    
    // DEBUG: Log the module counts with clear orientation descriptions
    console.log("PV Module Counts:", {
      hochformat: {
        beschreibung: "Hochformat: LÄNGERE Seite des Moduls parallel zum Ortgang, kürzere Seite parallel zur Traufe",
        moduleAcrossWidth: portraitModulesX,
        moduleAcrossLength: portraitModulesY,
        totalModules: portraitModuleCount,
        formel: `Module über Breite: floor(${availableWidth.toFixed(3)} / (${moduleHeight.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${portraitModulesX}`,
        formel2: `Module über Länge: floor(${availableLength.toFixed(3)} / (${moduleWidth.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${portraitModulesY}`
      },
      querformat: {
        beschreibung: "Querformat: LÄNGERE Seite des Moduls parallel zur Traufe, kürzere Seite parallel zum Ortgang",
        moduleAcrossWidth: landscapeModulesX,
        moduleAcrossLength: landscapeModulesY,
        totalModules: landscapeModuleCount,
        formel: `Module über Breite: floor(${availableWidth.toFixed(3)} / (${moduleWidth.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${landscapeModulesX}`,
        formel2: `Module über Länge: floor(${availableLength.toFixed(3)} / (${moduleHeight.toFixed(3)} + ${moduleSpacing.toFixed(3)})) = ${landscapeModulesY}`
      }
    });
  }
  
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
    },
    // Neue Eigenschaften für Trapezform-Berechnung
    isTrapezoid,
    roofPitch,
    ridgeLength,
    eaveLength
  };
};

/**
 * Generate the grid points for PV module placement
 * with support for trapezoidal roof shapes
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
  
  // Determine module dimensions based on CORRECTED orientation definitions:
  // Querformat (Landscape): Module's LONGER side (height) is aligned with the roof's LENGTH (ridge/eave)
  // Hochformat (Portrait): Module's LONGER side (height) is aligned with the roof's HEIGHT (verge/Ortgang)
  
  const moduleWidth = pvInfo.orientation === 'landscape' ? pvInfo.moduleWidth : pvInfo.moduleHeight;
  const moduleHeight = pvInfo.orientation === 'landscape' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  
  // Get the starting position (add edge distance to min coordinates)
  const startX = pvInfo.startX || (pvInfo.minX + pvInfo.edgeDistance!);
  const startZ = pvInfo.startZ || (pvInfo.minZ + pvInfo.edgeDistance!);
  
  // Check if we're dealing with a trapezoidal roof
  if (pvInfo.isTrapezoid && pvInfo.ridgeLength !== undefined && pvInfo.eaveLength !== undefined) {
    // Für Trapezform spezielle Berechnung
    const ridgeLength = pvInfo.ridgeLength;
    const eaveLength = pvInfo.eaveLength;
    
    // Bestimme, ob der First oder die Traufe kürzer ist
    const startAtRidge = ridgeLength < eaveLength;
    
    // Die kleinere Länge (abzüglich Randabstand) ist unsere Startbreite
    const startWidth = Math.min(ridgeLength, eaveLength) - (2 * pvInfo.edgeDistance!);
    
    // Geschätzte Abnahme der Breite pro Reihe
    const widthDecreasePerRow = Math.abs(ridgeLength - eaveLength) / pvInfo.rows!;
    
    // Generieren der Modulpositionen
    let totalModulesPlaced = 0;
    
    for (let row = 0; row < pvInfo.rows!; row++) {
      // Aktuelle Breite für diese Reihe
      const rowWidth = startWidth + (startAtRidge ? row * widthDecreasePerRow : (pvInfo.rows! - row - 1) * widthDecreasePerRow);
      
      // Anzahl der Module, die in diese Reihe passen
      const modulesInRow = Math.floor(rowWidth / (moduleWidth + pvInfo.moduleSpacing!));
      
      // Zentrieren der Module in der Reihe
      const remainingSpace = rowWidth - (modulesInRow * (moduleWidth + pvInfo.moduleSpacing!)) + pvInfo.moduleSpacing!;
      const extraOffset = remainingSpace / 2;
      
      for (let col = 0; col < modulesInRow; col++) {
        // Hier berechnen wir die Verschiebung basierend auf der Reihe
        // Wenn der First kürzer ist, müssen wir die Module in höheren Reihen mehr nach rechts verschieben
        const horizontalShift = startAtRidge 
          ? extraOffset + (row * widthDecreasePerRow / 2)
          : extraOffset + ((pvInfo.rows! - row - 1) * widthDecreasePerRow / 2);
        
        // Berechne Position dieses Moduls
        const x = startX + horizontalShift + col * (moduleWidth + pvInfo.moduleSpacing!);
        const z = startZ + row * (moduleHeight + pvInfo.moduleSpacing!);
        
        // Erstelle 4 Eckpunkte für dieses Modul
        const moduleCorners: Point[] = [
          { x, y: baseY + 0.02, z },  // Oben-Links
          { x: x + moduleWidth, y: baseY + 0.02, z },  // Oben-Rechts
          { x: x + moduleWidth, y: baseY + 0.02, z: z + moduleHeight },  // Unten-Rechts
          { x, y: baseY + 0.02, z: z + moduleHeight }  // Unten-Links
        ];
        
        modulePoints.push(moduleCorners);
        
        // Linien für dieses Modul hinzufügen
        for (let i = 0; i < 4; i++) {
          const from = moduleCorners[i];
          const to = moduleCorners[(i + 1) % 4];
          gridLines.push({ from, to });
        }
        
        totalModulesPlaced++;
      }
    }
    
    // Überprüfe, ob die Anzahl der platzierten Module mit der berechneten Anzahl übereinstimmt
    if (totalModulesPlaced !== pvInfo.moduleCount) {
      console.warn(`Warnung: Platzierte Module (${totalModulesPlaced}) unterscheiden sich von berechneter Anzahl (${pvInfo.moduleCount})`);
    }
  } else {
    // Standard-Berechnung für rechteckige Dächer
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
