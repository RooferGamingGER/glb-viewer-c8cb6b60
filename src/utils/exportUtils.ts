
import { Measurement, Segment } from '@/types/measurements';

/**
 * Returns a user-friendly display name for a measurement type
 */
export const getMeasurementTypeDisplayName = (type: string): string => {
  const displayNames: Record<string, string> = {
    'area': 'Fläche',
    'length': 'Länge',
    'height': 'Höhe',
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
  
  return displayNames[type] || 'Undefiniert';
};

/**
 * Returns an appropriate color for a segment type
 */
export const getSegmentColor = (type: string): string => {
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
  
  return segmentColors[type] || '#000000'; // Default to black if type not found
};

/**
 * Formats a measurement value with the appropriate unit based on type
 */
export const formatMeasurementValue = (measurement: Measurement): string => {
  const { type, value } = measurement;
  
  if (type === 'area' || type === 'solar' || type === 'skylight' || type === 'chimney') {
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
  return measurements
    .filter(m => m.type === 'area')
    .reduce((sum, m) => sum + m.value, 0);
};

/**
 * Groups segments by type and calculates total length for each type
 */
export const groupSegmentsByType = (measurements: Measurement[]) => {
  const segmentGroups: Record<string, { count: number; totalLength: number }> = {};
  
  measurements.forEach(measurement => {
    if (measurement.segments) {
      measurement.segments.forEach(segment => {
        const type = segment.type || 'undefined';
        
        if (!segmentGroups[type]) {
          segmentGroups[type] = { count: 0, totalLength: 0 };
        }
        
        segmentGroups[type].count++;
        segmentGroups[type].totalLength += segment.length;
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
  ['area', 'solar', 'skylight', 'chimney'].forEach(type => {
    const elements = measurements.filter(m => m.type === type);
    if (elements.length > 0) {
      const totalArea = elements.reduce((sum, m) => sum + m.value, 0);
      summary[type] = { 
        count: elements.length,
        totalArea: Number(totalArea.toFixed(2))
      };
    }
  });
  
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
