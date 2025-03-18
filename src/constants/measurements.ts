
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

// Colors for different measurement types
export const MEASUREMENT_MODES_COLORS: Record<string, number> = {
  'length': 0x00ff00, // Green
  'height': 0xffaa00, // Orange
  'area': 0x2196f3,   // Blue
  'dormer': 0x9c27b0, // Purple
  'chimney': 0xff5722, // Deep Orange
  'skylight': 0x3f51b5, // Indigo
  'solar': 0xffc107,   // Amber
  'gutter': 0x8bc34a,  // Light Green
  'verge': 0x795548,   // Brown
  'valley': 0xe91e63,  // Pink
  'ridge': 0x009688,   // Teal
  'vent': 0xff0000     // Red
};

// Colors in RGBA format for text rendering
export const COLORS_RGBA = {
  white: '255, 255, 255',
  black: '0, 0, 0',
  gray: '128, 128, 128',
  red: '255, 0, 0',
  green: '0, 255, 0',
  blue: '0, 0, 255'
};

// Material for selected points
export const POINT_MATERIAL_SELECT = {
  color: 0x00ffff,
  size: 0.08
};

// Gradient colors for area fill
export const AREA_GRADIENT_COLORS = {
  start: 0x2196f3, // Light blue
  end: 0x0d47a1    // Dark blue
};

// Offset for segment labels from the midpoint of the segment
export const SEGMENT_LABEL_OFFSET = 0.2;

// Default size for measurement points
export const POINT_SIZE = 0.05;
