
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
 * Exportiert Messungen als CSV-Datei, gruppiert nach Messetyp wie in der Tabelle
 */
export const exportMeasurementsToCSV = (measurements: Measurement[]): void => {
  const sortedMeasurements = sortMeasurementsForExport(measurements);
  const consolidatedMeasurements = consolidatePenetrations(sortedMeasurements);
  
  // Gruppiere die Messungen nach Typ
  const lengthMeasurements = consolidatedMeasurements.filter(m => m.type === 'length');
  const heightMeasurements = consolidatedMeasurements.filter(m => m.type === 'height');
  const areaMeasurements = consolidatedMeasurements.filter(m => m.type === 'area');
  const skylightMeasurements = consolidatedMeasurements.filter(m => m.type === 'skylight');
  const otherMeasurements = consolidatedMeasurements.filter(m => 
    !['length', 'height', 'area', 'skylight'].includes(m.type)
  );
  
  // CSV-Inhalte vorbereiten
  let csvContent = '';
  
  // Längenmessungen
  if (lengthMeasurements.length > 0) {
    csvContent += 'Längenmessungen;\n';
    csvContent += 'Nr.;Wert;Neigung;Beschreibung;\n';
    
    lengthMeasurements.forEach((m, index) => {
      const value = m.label || `${m.value.toFixed(2)} ${m.unit || 'm'}`;
      const inclination = m.inclination !== undefined ? `${Math.abs(m.inclination).toFixed(1)}°` : '–';
      const description = m.description || '–';
      
      csvContent += `${index + 1};${value};${inclination};${description};\n`;
    });
    
    csvContent += '\n';
  }
  
  // Höhenmessungen
  if (heightMeasurements.length > 0) {
    csvContent += 'Höhenmessungen;\n';
    csvContent += 'Nr.;Wert;Beschreibung;\n';
    
    heightMeasurements.forEach((m, index) => {
      const value = m.label || `${m.value.toFixed(2)} ${m.unit || 'm'}`;
      const description = m.description || '–';
      
      csvContent += `${index + 1};${value};${description};\n`;
    });
    
    csvContent += '\n';
  }
  
  // Dachfenster
  if (skylightMeasurements.length > 0) {
    csvContent += 'Dachfenster;\n';
    csvContent += 'Nr.;Wert;Beschreibung;\n';
    
    skylightMeasurements.forEach((m, index) => {
      const value = formatMeasurementValue(m);
      const description = m.description || '–';
      
      csvContent += `${index + 1};${value};${description};\n`;
    });
    
    csvContent += '\n';
  }
  
  // Flächenmessungen
  if (areaMeasurements.length > 0) {
    csvContent += 'Flächenmessungen;\n';
    csvContent += 'Nr.;Wert;Beschreibung;\n';
    
    areaMeasurements.forEach((m, index) => {
      const value = m.label || `${m.value.toFixed(2)} ${m.unit || 'm²'}`;
      const description = m.description || '–';
      
      csvContent += `${index + 1};${value};${description};\n`;
      
      // Füge Teilmessungen hinzu, falls vorhanden
      if (m.segments && m.segments.length > 0) {
        csvContent += `;Teilmessungen für Fläche ${index + 1};\n`;
        csvContent += `;Teilmessung;Länge;\n`;
        
        m.segments.forEach((segment, sIndex) => {
          csvContent += `;;${sIndex + 1};${segment.length.toFixed(2)} m;\n`;
        });
        
        csvContent += '\n';
      }
    });
    
    csvContent += '\n';
  }
  
  // Dacheinbauten und sonstige Messungen
  if (otherMeasurements.length > 0) {
    csvContent += 'Dacheinbauten;\n';
    csvContent += 'Nr.;Typ;Anzahl;Beschreibung;\n';
    
    otherMeasurements.forEach((m, index) => {
      let typeName;
      switch(m.type) {
        case 'chimney': typeName = 'Kamin'; break;
        case 'vent': typeName = 'Lüfter'; break;
        case 'hook': typeName = 'Dachhaken'; break;
        case 'solar': typeName = 'Solaranlage'; break;
        case 'other': typeName = 'Sonstiges'; break;
        default: typeName = m.type;
      }
      
      const value = formatMeasurementValue(m);
      const description = m.description || '–';
      
      csvContent += `${index + 1};${typeName};${value};${description};\n`;
    });
  }
  
  // Verwende Semikolon als Trennzeichen für deutsche Excel-Kompatibilität
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
  // Special formatting for skylights, vents, hooks, and other penetrations
  if (measurement.type === 'skylight' || measurement.type === 'vent' || 
      measurement.type === 'hook' || measurement.type === 'other') {
    const count = measurement.count || 1;
    return `${count} ${measurement.unit || 'Stk'}`;
  }
  
  // Standard formatting for other measurement types
  let valueText = `${measurement.value.toFixed(2)} ${measurement.unit || (measurement.type === 'area' ? 'm²' : 'm')}`;
  
  // Add count information for other items if needed
  if (measurement.count && measurement.count > 1 && 
      !['skylight', 'vent', 'hook', 'other'].includes(measurement.type)) {
    valueText += ` (${measurement.count} Stück)`;
  }
  
  return valueText;
};

/**
 * Sort measurements in the specified order for PDF export
 * 
 * Sort order:
 * 1. Standard measurements: length, area, height
 * 2. Roof elements: skylight, chimney, solar
 * 3. Installations: vent, hook, other
 */
export const sortMeasurementsForExport = (measurements: Measurement[]): Measurement[] => {
  // Define type order for sorting
  const typeOrder: Record<string, number> = {
    // Standard measurements
    'length': 1,
    'area': 2,
    'height': 3,
    // Roof elements
    'skylight': 4,
    'chimney': 5,
    'solar': 6,
    // Installations
    'vent': 7,
    'hook': 8,
    'other': 9
  };
  
  // Create a copy of the measurements array and sort it
  return [...measurements].sort((a, b) => {
    // Get the order values for each measurement type
    const orderA = typeOrder[a.type] || 999; // Use a high number for unknown types
    const orderB = typeOrder[b.type] || 999;
    
    return orderA - orderB;
  });
};

/**
 * Group penetration items (vents, hooks, other) by type and subtype
 * to consolidate them in the PDF report
 */
export const consolidatePenetrations = (measurements: Measurement[]): Measurement[] => {
  // Get all measurements that aren't penetrations
  const nonPenetrations = measurements.filter(
    m => !['vent', 'hook', 'other'].includes(m.type)
  );
  
  // Group penetrations by type and subtype
  const penetrationGroups: Record<string, Record<string, Measurement[]>> = {};
  
  measurements.forEach(m => {
    if (['vent', 'hook', 'other'].includes(m.type)) {
      if (!penetrationGroups[m.type]) {
        penetrationGroups[m.type] = {};
      }
      
      // Group by subType if available, otherwise use description or a default key
      const groupKey = m.subType || m.description || 'default';
      
      if (!penetrationGroups[m.type][groupKey]) {
        penetrationGroups[m.type][groupKey] = [];
      }
      
      penetrationGroups[m.type][groupKey].push(m);
    }
  });
  
  // Create consolidated measurements for each group
  const consolidatedPenetrations: Measurement[] = [];
  
  Object.entries(penetrationGroups).forEach(([type, subtypeGroups]) => {
    Object.entries(subtypeGroups).forEach(([subtype, items]) => {
      if (items.length > 0) {
        // Use the first item as a template
        const template = items[0];
        const totalCount = items.reduce((sum, item) => sum + (item.count || 1), 0);
        
        // Create a consolidated measurement
        consolidatedPenetrations.push({
          ...template,
          id: template.id, // Keep ID of the first item
          count: totalCount,
          description: template.description || getMeasurementTypeDisplayName(type),
          // Add a note about consolidated items if multiple
          notes: items.length > 1 
            ? `${totalCount} Stück ${getMeasurementTypeDisplayName(type)}${template.subType ? ` (${template.subType})` : ''}`
            : template.notes
        });
      }
    });
  });
  
  // Return all non-penetration measurements plus the consolidated ones
  return [...nonPenetrations, ...consolidatedPenetrations];
};
