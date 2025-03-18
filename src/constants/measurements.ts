
// Minimum threshold for considering an inclination significant (in degrees)
export const MIN_INCLINATION_THRESHOLD = 5.0;

// Format measurement value based on measurement type
export const formatMeasurement = (value: number, type: 'length' | 'height' | 'area'): string => {
  if (type === 'area') {
    // Format area measurements
    if (value < 0.01) {
      return `${(value * 10000).toFixed(2)} cm²`;
    }
    return `${value.toFixed(2)} m²`;
  }
  
  // Format length or height measurements
  return `${value.toFixed(2)} m`;
};
