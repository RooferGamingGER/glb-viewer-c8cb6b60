
import { Measurement } from '@/types/measurements';

/**
 * Map measurement types to German display names
 */
export const getMeasurementTypeDisplayName = (type: string): string => {
  const typeMapping: Record<string, string> = {
    'length': 'Länge',
    'height': 'Höhe',
    'area': 'Fläche',
    'dormer': 'Gaube',
    'chimney': 'Kamin',
    'skylight': 'Dachfenster',
    'solar': 'Solaranlage',
    'gutter': 'Dachrinne',
    'vent': 'Lüfter'
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
      m.count || ''
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
  return measurements.filter(m => m.type === 'vent').reduce((sum, m) => sum + (m.count || 1), 0);
};

/**
 * Get summary data for roof elements and installations
 */
export const getRoofElementsSummary = (measurements: Measurement[]): {
  dormers: number;
  chimneys: number;
  skylights: number;
  vents: number;
  solarArea: number;
} => {
  const dormers = measurements.filter(m => m.type === 'dormer').length;
  const chimneys = measurements.filter(m => m.type === 'chimney').length;
  const skylights = measurements.filter(m => m.type === 'skylight').length;
  const vents = getPenetrationCount(measurements);
  
  // Calculate total solar area
  const solarArea = measurements
    .filter(m => m.type === 'solar')
    .reduce((sum, m) => sum + m.value, 0);
  
  return {
    dormers,
    chimneys,
    skylights,
    vents,
    solarArea
  };
};
