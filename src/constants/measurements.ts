
import { MeasurementMode } from '@/types/measurements';

// Minimum inclination threshold to display (below this value, we don't show the inclination)
export const MIN_INCLINATION_THRESHOLD = 1.0;

// Format measurement values with appropriate units
export const formatMeasurement = (value: number, type: MeasurementMode): string => {
  if (value === undefined || value === null) return '';
  
  if (type === 'length' || type === 'height') {
    return `${value.toFixed(2)} m`;
  } else if (type === 'area' || 
             type === 'solar' || 
             type === 'skylight' || 
             type === 'chimney' || 
             type === 'pvmodule' ||
             type === 'vent' || 
             type === 'hook' || 
             type === 'other') {
    return `${value.toFixed(2)} m²`;
  }
  
  return value.toFixed(2);
};

// Get display name for measurement type
export const getMeasurementTypeDisplayName = (type: MeasurementMode): string => {
  switch (type) {
    case 'length':
      return 'Länge';
    case 'height':
      return 'Höhe';
    case 'area':
      return 'Fläche';
    case 'solar':
      return 'Solaranlage';
    case 'skylight':
      return 'Dachfenster';
    case 'chimney':
      return 'Kamin';
    case 'vent':
      return 'Lüfter';
    case 'hook':
      return 'Dachhaken';
    case 'other':
      return 'Einbau';
    case 'pvmodule':
      return 'PV-Modul';
    case 'ridge':
      return 'First';
    case 'eave':
      return 'Traufe';
    case 'verge':
      return 'Ortgang';
    case 'valley':
      return 'Kehle';
    case 'hip':
      return 'Grat';
    default:
      return 'Messung';
  }
};
