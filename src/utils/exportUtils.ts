
import { Measurement } from '@/types/measurements';

/**
 * Map measurement types to German display names
 */
export const getMeasurementTypeDisplayName = (type: string): string => {
  const typeMapping: Record<string, string> = {
    'length': 'Länge',
    'height': 'Höhe',
    'area': 'Fläche',
    'chimney': 'Kamin',
    'skylight': 'Dachfenster',
    'solar': 'Solaranlage',
    'vent': 'Lüfter',
    'hook': 'Dachhaken',
    'other': 'Sonstige Einbauten'
  };
  
  return typeMapping[type] || type;
};

/**
 * Exportiert Messungen als CSV-Datei
 */
export const exportMeasurementsToCSV = (measurements: Measurement[]): void => {
  // Header für die CSV-Datei
  const header = [
    'ID', 
    'Typ', 
    'Subtyp',
    'Wert', 
    'Einheit', 
    'Beschreibung', 
    'Neigung', 
    'Länge', 
    'Breite', 
    'Höhe', 
    'Durchmesser', 
    'Fläche',
    'Umfang',
    'Anzahl'
  ];
  
  // Daten für die CSV-Datei
  const csvData = measurements.map(m => {
    const type = getMeasurementTypeDisplayName(m.type);
    const unit = m.unit || (m.type === 'area' ? 'm²' : 'm');
    
    // Get dimensions if available
    const length = m.dimensions?.length !== undefined ? m.dimensions.length.toFixed(2) : '';
    const width = m.dimensions?.width !== undefined ? m.dimensions.width.toFixed(2) : '';
    const height = m.dimensions?.height !== undefined ? m.dimensions.height.toFixed(2) : '';
    const diameter = m.dimensions?.diameter !== undefined ? m.dimensions.diameter.toFixed(2) : '';
    const area = m.dimensions?.area !== undefined ? m.dimensions.area.toFixed(2) : '';
    const perimeter = m.dimensions?.perimeter !== undefined ? m.dimensions.perimeter.toFixed(2) : '';
    
    // Ensure penetration types always have at least 1 piece
    let count = m.count || '';
    if (m.type === 'vent' || m.type === 'hook' || m.type === 'other') {
      count = m.count && m.count > 1 ? m.count : 1;
    }
    
    return [
      m.id,
      type,
      m.subType || '',
      m.value.toFixed(2),
      unit,
      m.description || '',
      m.inclination ? `${m.inclination.toFixed(1)}°` : '',
      length,
      width,
      height,
      diameter,
      area,
      perimeter,
      count
    ];
  });
  
  // CSV-Inhalt erstellen
  const csvContent = [
    header.join(','),
    ...csvData.map(row => row.join(','))
  ].join('\n');
  
  // Datei herunterladen
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `Messungen_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Group measurements by their type for report generation
 */
export const groupMeasurementsByType = (measurements: Measurement[]) => {
  const groups: Record<string, Measurement[]> = {};
  
  measurements.forEach(measurement => {
    if (!groups[measurement.type]) {
      groups[measurement.type] = [];
    }
    
    groups[measurement.type].push(measurement);
  });
  
  return groups;
};

/**
 * Get count of penetrations (vents)
 */
export const getPenetrationCount = (measurements: Measurement[]): number => {
  return measurements.filter(m => m.type === 'vent' || m.type === 'hook' || m.type === 'other')
    .reduce((sum, m) => sum + (m.count || 1), 0);
};

/**
 * Get summary data for roof elements and installations
 */
export const getRoofElementsSummary = (measurements: Measurement[]): {
  chimneys: number;
  skylights: number;
  vents: number;
  hooks: number;
  otherPenetrations: number;
  solarArea: number;
} => {
  const chimneys = measurements.filter(m => m.type === 'chimney').length;
  const skylights = measurements.filter(m => m.type === 'skylight').length;
  
  // Updated: Count each penetration as 1 by default
  const vents = measurements.filter(m => m.type === 'vent')
    .reduce((sum, m) => sum + (m.count || 1), 0);
  
  const hooks = measurements.filter(m => m.type === 'hook')
    .reduce((sum, m) => sum + (m.count || 1), 0);
  
  const otherPenetrations = measurements.filter(m => m.type === 'other')
    .reduce((sum, m) => sum + (m.count || 1), 0);
  
  // Calculate total solar area
  const solarArea = measurements
    .filter(m => m.type === 'solar')
    .reduce((sum, m) => sum + m.value, 0);
  
  return {
    chimneys,
    skylights,
    vents,
    hooks,
    otherPenetrations,
    solarArea
  };
};

/**
 * Format the value display for a measurement based on its type
 */
export const formatMeasurementValue = (measurement: Measurement): string => {
  // For skylights, prioritize dimensions in format "L.LL m × B.BB m" if available
  if (measurement.type === 'skylight' && measurement.dimensions) {
    const width = measurement.dimensions.width;
    const height = measurement.dimensions.height;
    
    if (width !== undefined && height !== undefined) {
      // Format: "H.HH m × W.WW m (X.XX m²)"
      return `${height.toFixed(2)} m × ${width.toFixed(2)} m (${measurement.value.toFixed(2)} ${measurement.unit || 'm²'})`;
    }
  }
  
  // Special formatting for penetration types (vent, hook, other)
  if (measurement.type === 'vent' || measurement.type === 'hook' || measurement.type === 'other') {
    const count = measurement.count || 1;
    return `${count} ${measurement.unit || 'Stk'}`;
  }
  
  // Standard formatting for other measurement types
  let valueText = `${measurement.value.toFixed(2)} ${measurement.unit || (measurement.type === 'area' ? 'm²' : 'm')}`;
  
  // Add count information for other items if needed
  if (measurement.count && measurement.count > 1 && 
      !['vent', 'hook', 'other'].includes(measurement.type)) {
    valueText += ` (${measurement.count} Stück)`;
  }
  
  return valueText;
};
