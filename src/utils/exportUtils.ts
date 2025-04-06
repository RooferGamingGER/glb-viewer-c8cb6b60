
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
