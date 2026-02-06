import { Measurement } from '@/types/measurements';
import { normalizeSegmentType } from '@/pages/Viewer';

/**
 * Returns a user-friendly display name for a measurement type
 */
export const getMeasurementTypeDisplayName = (type: string): string => {
  const displayNames: Record<string, string> = {
    'area': 'Fläche',
    'length': 'Länge',
    'height': 'Höhe',
    'deductionarea': 'Abzugsfläche',
    'solar': 'Solarfläche',
    'skylight': 'Dachfenster',
    'chimney': 'Kamin',
    'vent': 'Lüfter',
    'hook': 'Dachhaken',
    'other': 'Sonstiges',
    'ridge': 'First',
    'valley': 'Kehle',
    'hip': 'Grat',
    'eave': 'Traufe',
    'verge': 'Ortgang',
    'flashing': 'Verfallung',
    'connection': 'Anschluss'
  };
  
  return displayNames[type] || type;
};

/**
 * Returns a user-friendly display name for a segment type
 */
export const getSegmentTypeDisplayName = (type: string): string => {
  // Normalize the segment type to ensure consistent case and naming
  const normalizedType = normalizeSegmentType(type);
  
  const displayNames: Record<string, string> = {
    'ridge': 'First',
    'valley': 'Kehle',
    'hip': 'Grat',
    'eave': 'Traufe',
    'verge': 'Ortgang',
    'edge': 'Kante',
    'flashing': 'Verfallung',
    'connection': 'Anschluss'
  };
  
  return displayNames[normalizedType] || 'Undefiniert';
};

/**
 * Returns an appropriate color for a segment type
 */
export const getSegmentColor = (type: string): string => {
  // Normalize the segment type to ensure consistent case and naming
  const normalizedType = normalizeSegmentType(type);
  
  const segmentColors: Record<string, string> = {
    'ridge': '#FF0000',    // Bright red for ridge
    'valley': '#0000FF',   // Blue for valley
    'hip': '#FFA500',      // Orange for hip
    'eave': '#008000',     // Green for eave
    'verge': '#800080',    // Purple for verge
    'edge': '#A0A0A0',     // Grey for edge
    'flashing': '#D946EF', // Magenta pink for flashing
    'connection': '#0EA5E9' // Ocean blue for connection
  };
  
  return segmentColors[normalizedType] || '#000000'; // Default to black if type not found
};

/**
 * Formats a measurement value with the appropriate unit based on type
 */
export const formatMeasurementValue = (measurement: Measurement): string => {
  const { type, value } = measurement;
  
  if (type === 'skylight' && measurement.dimensions) {
    const width = measurement.dimensions.width?.toFixed(2) || '0.00';
    const height = measurement.dimensions.height?.toFixed(2) || '0.00';
    return `${width} × ${height} m (${value.toFixed(2)} m²)`;
  } else if (type === 'area' || type === 'solar' || type === 'chimney' || type === 'deductionarea') {
    return `${value.toFixed(2)} m²`;
  } else if (type === 'length' || type === 'height') {
    return `${value.toFixed(2)} m`;
  } else {
    return `${value.toFixed(2)}`;
  }
};

/**
 * Calculates the total area from an array of measurements
 */
export const calculateTotalArea = (measurements: Measurement[]): number => {
  const totalRegularArea = measurements
    .filter(m => m.type === 'area')
    .reduce((sum, m) => sum + m.value, 0);
    
  return totalRegularArea;
};

/**
 * Calculates the net total area (regular areas minus deduction areas)
 */
export const calculateNetTotalArea = (measurements: Measurement[]): number => {
  const totalRegularArea = measurements
    .filter(m => m.type === 'area')
    .reduce((sum, m) => sum + m.value, 0);
    
  const totalDeductionArea = measurements
    .filter(m => m.type === 'deductionarea')
    .reduce((sum, m) => sum + m.value, 0);
    
  return Math.max(0, totalRegularArea - totalDeductionArea);
};

/**
 * Groups segments by type and calculates total length for each type
 */
export const groupSegmentsByType = (measurements: Measurement[]) => {
  const segmentGroups: Record<string, { count: number; totalLength: number }> = {};
  
  measurements.forEach(measurement => {
    if (measurement.segments) {
      measurement.segments.forEach(segment => {
        // Normalize the segment type to ensure consistent case and naming
        const normalizedType = normalizeSegmentType(segment.type || 'undefined');
        
        if (!segmentGroups[normalizedType]) {
          segmentGroups[normalizedType] = { count: 0, totalLength: 0 };
        }
        
        segmentGroups[normalizedType].count++;
        segmentGroups[normalizedType].totalLength += segment.length;
      });
    }
  });
  
  return segmentGroups;
};

/**
 * Consolidate penetration elements (skylight, chimney, vent, hook, etc.) for reporting
 */
export const consolidatePenetrations = (measurements: Measurement[]): Measurement[] => {
  // Clone the measurements to avoid modifying the original array
  const consolidatedMeasurements = [...measurements];
  
  // Group penetrations by type for simplified reporting
  const penetrationTypes = ['skylight', 'chimney', 'vent', 'hook', 'other'];
  const penetrationCounts: Record<string, number> = {};
  
  penetrationTypes.forEach(type => {
    const typeCount = measurements.filter(m => m.type === type).length;
    if (typeCount > 0) {
      penetrationCounts[type] = typeCount;
    }
  });
  
  return consolidatedMeasurements;
};

/**
 * Calculate appropriate scale factor for roof plan rendering
 */
export const calculateRoofPlanScaleFactor = (measurements: Measurement[], canvasWidth: number, canvasHeight: number): number => {
  // Default scale factor if there are no measurements
  if (measurements.length === 0) return 1.0;
  
  // Find bounds of all measurements
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  measurements.forEach(measurement => {
    if (measurement.points && measurement.points.length > 0) {
      measurement.points.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.z); // Using z as 2D y-coordinate
        maxY = Math.max(maxY, point.z);
      });
    }
  });
  
  // Calculate dimensions
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Avoid division by zero
  if (width === 0 || height === 0) return 1.0;
  
  // Calculate scale factors for both dimensions and use the smaller one
  const scaleX = (canvasWidth * 0.9) / width;
  const scaleY = (canvasHeight * 0.9) / height;
  
  return Math.min(scaleX, scaleY);
};

/**
 * Get summary of roof elements for reporting
 */
export const getRoofElementsSummary = (measurements: Measurement[]): Record<string, { count: number; totalArea?: number; totalLength?: number }> => {
  const summary: Record<string, { count: number; totalArea?: number; totalLength?: number }> = {};
  
  // Area-based elements
  ['area', 'deductionarea', 'solar', 'skylight', 'chimney'].forEach(type => {
    const elements = measurements.filter(m => m.type === type);
    if (elements.length > 0) {
      const totalArea = elements.reduce((sum, m) => sum + m.value, 0);
      summary[type] = { 
        count: elements.length,
        totalArea: Number(totalArea.toFixed(2))
      };
    }
  });
  
  // Calculate net area (regular areas - deduction areas)
  const regularAreas = measurements.filter(m => m.type === 'area');
  const deductionAreas = measurements.filter(m => m.type === 'deductionarea');
  
  if (regularAreas.length > 0 && deductionAreas.length > 0) {
    const totalRegularArea = regularAreas.reduce((sum, m) => sum + m.value, 0);
    const totalDeductionArea = deductionAreas.reduce((sum, m) => sum + m.value, 0);
    const netArea = Math.max(0, totalRegularArea - totalDeductionArea);
    
    summary['netarea'] = {
      count: 1,
      totalArea: Number(netArea.toFixed(2))
    };
  }
  
  // Length-based elements
  ['length', 'height'].forEach(type => {
    const elements = measurements.filter(m => m.type === type);
    if (elements.length > 0) {
      const totalLength = elements.reduce((sum, m) => sum + m.value, 0);
      summary[type] = { 
        count: elements.length,
        totalLength: Number(totalLength.toFixed(2))
      };
    }
  });
  
  // Point-based elements
  ['vent', 'hook', 'other'].forEach(type => {
    const count = measurements.filter(m => m.type === type).length;
    if (count > 0) {
      summary[type] = { count };
    }
  });
  
  return summary;
};

/**
 * Testversion: ABS-JSON Export aus aktuellen Messungen
 *
 * Diese Funktion baut eine vereinfachte JSON-Struktur,
 * die sich am Schema der ABS-Datei orientiert.
 *
 * TODO:
 * - Geometrie (vertices/edges/faces) aus dem Modell übernehmen
 * - assembledFaces / classifiedEdges aus echten Klassifizierungen ableiten
 */
/**
 * Generates a detailed CSV string from measurements.
 * Each roof surface lists area/inclination, followed by individual edge rows.
 */
export const generateDetailedCSV = (measurements: Measurement[]): string => {
  const separator = ';';
  const lines: string[] = [];

  // Header
  lines.push(['Nr', 'Name', 'Typ', 'Wert', 'Einheit', 'Neigung (°)', 'Kantentyp', 'Kantenlänge (m)'].join(separator));

  measurements.forEach((m, index) => {
    const nr = index + 1;
    const name = m.label || `Messung ${nr}`;
    const typeName = getMeasurementTypeDisplayName(m.type);
    const isArea = ['area', 'solar', 'chimney', 'deductionarea', 'skylight'].includes(m.type);
    const unit = isArea ? 'm²' : 'm';
    const inclination = m.inclination != null ? m.inclination.toFixed(1) : '';

    // Main measurement row
    lines.push([nr, name, typeName, m.value.toFixed(2), unit, inclination, '', ''].join(separator));

    // Edge/segment rows
    if (m.segments && m.segments.length > 0) {
      m.segments.forEach(seg => {
        const segTypeName = getSegmentTypeDisplayName(seg.type || 'edge');
        lines.push(['', '', '', '', '', '', segTypeName, seg.length.toFixed(2)].join(separator));
      });
    }
  });

  // Summary section
  lines.push('');
  lines.push(['Zusammenfassung'].join(separator));

  const summary = getRoofElementsSummary(measurements);
  Object.entries(summary).forEach(([type, data]) => {
    const typeName = type === 'netarea' ? 'Nettofläche' : getMeasurementTypeDisplayName(type);
    const value = data.totalArea != null ? data.totalArea.toFixed(2) : data.totalLength != null ? data.totalLength.toFixed(2) : '';
    const unit = data.totalArea != null ? 'm²' : 'm';
    lines.push([typeName, `${data.count}x`, value, unit].join(separator));
  });

  // Segment summary
  const segmentGroups = groupSegmentsByType(measurements);
  if (Object.keys(segmentGroups).length > 0) {
    lines.push('');
    lines.push(['Kantenzusammenfassung'].join(separator));
    Object.entries(segmentGroups).forEach(([type, data]) => {
      const typeName = getSegmentTypeDisplayName(type);
      lines.push([typeName, `${data.count}x`, data.totalLength.toFixed(2), 'm'].join(separator));
    });
  }

  return lines.join('\n');
};

export const exportMeasurementsToAbsJson = (
  measurements: Measurement[],
  options?: {
    address?: string;
    projectId?: number;
    customerNames?: string;
    customersReferencePhrase?: string;
  }
) => {
  const totalArea = calculateTotalArea(measurements); // Summe aller "area"-Messungen
  const netArea = calculateNetTotalArea(measurements); // area - deductionarea

  const skylights = measurements.filter(m => m.type === 'skylight');
  const chimneys = measurements.filter(m => m.type === 'chimney');
  const vents = measurements.filter(m => m.type === 'vent');

  const segmentGroups = groupSegmentsByType(measurements);

  // Mapping für Flachdach-Längen (testweise sehr simpel)
  const totalLengthsFlatRoof = {
    eaves: segmentGroups['eave']?.totalLength ?? 0,
    roofEdges: segmentGroups['edge']?.totalLength ?? 0,
    railings: 0,
    innerAttikas: 0,
    outerAttikas: 0,
    wallConnections: segmentGroups['connection']?.totalLength ?? 0,
    attikaConnections: 0,
    others: 0,
    otherSurfaces: 0,
  };

  // Steildach-Längen nutzen wir hier als Sammelcontainer
  const totalLengthsSteepRoof = {
    hips: segmentGroups['hip']?.totalLength ?? 0,
    eaves: segmentGroups['eave']?.totalLength ?? 0,
    rakes: segmentGroups['verge']?.totalLength ?? 0,
    breaks: 0,
    decays: 0,
    others: 0,
    ridges: segmentGroups['ridge']?.totalLength ?? 0,
    stairs: 0,
    rafters: 0,
    valleys: segmentGroups['valley']?.totalLength ?? 0,
    windows: 0, // könnte aus skylight-Umfang kommen
    chimneys: 0, // könnte aus chimney-Umfang kommen
    snowguards: 0,
  };

  const amountOfObjects = {
    amountOfVents: vents.length,
    amountOfStairs: -1,
    amountOfWindows: skylights.length,
    amountOfAntennas: -1,
    amountOfChimneys: chimneys.length,
    amountOfDownspouts: -1,
    amountOfSnowguards: -1,
  };

  const absJson = {
    areas: {
      flatRoofArea: 0,
      steepRoofArea: 0,
      totalRoofArea: 0,
      dormerRoofArea: 0,
      dormerFrontArea: 0,
      wallSurfaceArea: 0,
      attikaSurfaceArea: 0,
      totalFlatRoofArea: Number(netArea.toFixed(2)),
      dormerStringerArea: 0,
      totalSteepRoofArea: 0,
      flatRoofSurfaceArea: Number(totalArea.toFixed(2)),
      angledParapetWallArea: 0,
      otherFlatRoofSurfaceArea: 0,
      otherSteepRoofSurfacesArea: 0,
    },
    totalLengthsFlatRoof,
    totalLengthsSteepRoof,
    amountOfObjects,
    // Geometrie: vorerst leer in der Testversion
    vertices: [],
    edges: [],
    faces: [],
    assembledFaces: [],
    classifiedEdges: [],
    address: options?.address ?? '',
    projectId: options?.projectId ?? 0,
    coordinates: null,
    customerNames: options?.customerNames ?? '',
    schemaVersion: '1.1.8',
    customersReferencePhrase: options?.customersReferencePhrase ?? '',
  };

  return absJson;
};
