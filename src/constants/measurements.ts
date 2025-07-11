
// Minimum threshold for considering an inclination significant (in degrees)
export const MIN_INCLINATION_THRESHOLD = 5.0;

// Format measurement value based on measurement type
export const formatMeasurement = (value: number, type: 'length' | 'height' | 'area' | 'solar' | 'skylight' | 'chimney' | 'pvmodule' | 'deductionarea'): string => {
  if (type === 'area' || type === 'solar' || type === 'skylight' || type === 'chimney' || type === 'pvmodule' || type === 'deductionarea') {
    // Format area measurements
    if (value < 0.01) {
      return `${(value * 10000).toFixed(2)} cm²`;
    }
    return `${value.toFixed(2)} m²`;
  }
  
  // Format length or height measurements
  return `${value.toFixed(2)} m`;
};

// Map measurement types to German display names
export const getMeasurementTypeDisplayName = (type: string): string => {
  const typeMapping: Record<string, string> = {
    'length': 'Länge',
    'height': 'Höhe',
    'area': 'Fläche',
    'deductionarea': 'Abzugsfläche',
    'dormer': 'Gaube',
    'chimney': 'Kamin',
    'skylight': 'Dachfenster',
    'solar': 'Solaranlage',
    'gutter': 'Dachrinne',
    'vent': 'Lüfter',
    'hook': 'Dachhaken',
    'other': 'Sonstiges',
    'pvmodule': 'PV-Modul'
  };
  
  return typeMapping[type] || type;
};

// Format measurement label based on measurement type
export const formatMeasurementLabel = (
  value: number, 
  type: 'length' | 'height' | 'area' | 'solar' | 'skylight' | 'chimney' | 'vent' | 'hook' | 'other' | 'pvmodule' | 'deductionarea' | string,
  inclination?: number
): string => {
  // For area-based measurements (including specialized roof elements)
  if (type === 'area' || type === 'solar' || type === 'skylight' || type === 'chimney' || type === 'deductionarea') {
    // Format area measurements
    if (value < 0.01) {
      return `${(value * 10000).toFixed(2)} cm²`;
    }
    return `${value.toFixed(2)} m²`;
  }
  
  // For length-based measurements (including specialized lines)
  const baseLabel = `${value.toFixed(2)} m`;
  
  // Add inclination if provided and significant - always use absolute value
  if (inclination !== undefined && Math.abs(inclination) > 1.0) {
    return `${baseLabel} | ${Math.abs(inclination).toFixed(1)}°`;
  }
  
  return baseLabel;
};
