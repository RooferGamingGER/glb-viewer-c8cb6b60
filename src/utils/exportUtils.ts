
import { Measurement, Segment } from '@/types/measurements';
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
 * Formats a number for German Excel (comma as decimal separator) with optional unit
 */
const formatNumberDE = (value: number, decimals: number = 2, unit?: string): string => {
  const formatted = value.toFixed(decimals).replace('.', ',');
  return unit ? `${formatted} ${unit}` : formatted;
};

/**
 * Generates a detailed CSV export with sequential numbering and edge lengths
 */
export const generateDetailedCSV = (measurements: Measurement[]): string => {
  // Sort measurements by type priority: area, deductionarea, solar, length, height, others
  const typePriority: Record<string, number> = {
    'area': 1,
    'deductionarea': 2,
    'solar': 3,
    'skylight': 4,
    'chimney': 5,
    'length': 6,
    'height': 7,
    'ridge': 8,
    'valley': 9,
    'hip': 10,
    'eave': 11,
    'verge': 12,
    'vent': 13,
    'hook': 14,
    'other': 15
  };

  const sortedMeasurements = [...measurements].sort((a, b) => {
    const priorityA = typePriority[a.type] || 99;
    const priorityB = typePriority[b.type] || 99;
    return priorityA - priorityB;
  });

  // Group by type for sequential numbering
  const typeCounters: Record<string, number> = {};
  
  // CSV header
  const lines: string[] = [
    'Typ;Nr;Fläche;Neigung;Kanten-Nr;Kantentyp;Kantenlänge'
  ];

  // Totals for summary
  let totalArea = 0;
  let totalDeductionArea = 0;
  let totalEdgeLength = 0;
  let areaCount = 0;
  let deductionCount = 0;

  sortedMeasurements.forEach(measurement => {
    const typeName = getMeasurementTypeDisplayName(measurement.type);
    
    // Get sequential number for this type
    if (!typeCounters[measurement.type]) {
      typeCounters[measurement.type] = 0;
    }
    typeCounters[measurement.type]++;
    const sequentialNumber = typeCounters[measurement.type];

    // Handle area-type measurements (area, deductionarea, solar, skylight, chimney)
    if (['area', 'deductionarea', 'solar', 'skylight', 'chimney'].includes(measurement.type)) {
      const areaValue = formatNumberDE(measurement.value || 0, 2, 'm²');
      const inclination = measurement.inclination !== undefined 
        ? formatNumberDE(measurement.inclination, 1, '°') 
        : '-';
      
      // Track totals
      if (measurement.type === 'area') {
        totalArea += measurement.value || 0;
        areaCount++;
      } else if (measurement.type === 'deductionarea') {
        totalDeductionArea += measurement.value || 0;
        deductionCount++;
      }

      // If there are segments, output each edge
      if (measurement.segments && measurement.segments.length > 0) {
        measurement.segments.forEach((segment, index) => {
          const edgeNumber = index + 1;
          const edgeType = getSegmentTypeDisplayName(segment.type || 'edge');
          const edgeLength = formatNumberDE(segment.length || 0, 2, 'm');
          totalEdgeLength += segment.length || 0;
          
          // First line includes area info, subsequent lines only edge info
          if (index === 0) {
            lines.push(`${typeName};${sequentialNumber};${areaValue};${inclination};${edgeNumber};${edgeType};${edgeLength}`);
          } else {
            lines.push(`;;;;${edgeNumber};${edgeType};${edgeLength}`);
          }
        });
      } else {
        // No segments - calculate edge lengths from points
        const points = measurement.points || [];
        if (points.length >= 3) {
          for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const edgeLength = Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + 
              Math.pow(p2.y - p1.y, 2) + 
              Math.pow(p2.z - p1.z, 2)
            );
            totalEdgeLength += edgeLength;
            
            if (i === 0) {
              lines.push(`${typeName};${sequentialNumber};${areaValue};${inclination};${i + 1};Kante;${formatNumberDE(edgeLength, 2, 'm')}`);
            } else {
              lines.push(`;;;;${i + 1};Kante;${formatNumberDE(edgeLength, 2, 'm')}`);
            }
          }
        } else {
          lines.push(`${typeName};${sequentialNumber};${areaValue};${inclination};-;-;-`);
        }
      }
    }
    // Handle length-type measurements (length, ridge, valley, hip, eave, verge)
    else if (['length', 'ridge', 'valley', 'hip', 'eave', 'verge'].includes(measurement.type)) {
      const lengthValue = formatNumberDE(measurement.value || 0, 2, 'm');
      totalEdgeLength += measurement.value || 0;
      lines.push(`${typeName};${sequentialNumber};-;-;-;-;${lengthValue}`);
    }
    // Handle height measurements
    else if (measurement.type === 'height') {
      const heightValue = formatNumberDE(measurement.value || 0, 2, 'm');
      lines.push(`${typeName};${sequentialNumber};-;-;-;-;${heightValue}`);
    }
    // Handle point-based elements (vent, hook, other)
    else if (['vent', 'hook', 'other'].includes(measurement.type)) {
      const position = measurement.position || measurement.points?.[0];
      const posStr = position 
        ? `(${formatNumberDE(position.x, 2, 'm')}, ${formatNumberDE(position.y, 2, 'm')}, ${formatNumberDE(position.z, 2, 'm')})` 
        : '-';
      lines.push(`${typeName};${sequentialNumber};-;-;-;Position;${posStr}`);
    }
  });

  // Add empty line and summary
  lines.push('');
  lines.push('--- ZUSAMMENFASSUNG ---;;;;;;');
  
  if (areaCount > 0) {
    lines.push(`Flächen gesamt;${areaCount};${formatNumberDE(totalArea, 2, 'm²')};;;;`);
  }
  if (deductionCount > 0) {
    lines.push(`Abzugsflächen gesamt;${deductionCount};${formatNumberDE(totalDeductionArea, 2, 'm²')};;;;`);
  }
  if (areaCount > 0 || deductionCount > 0) {
    const netArea = totalArea - totalDeductionArea;
    lines.push(`Netto-Fläche;;${formatNumberDE(netArea, 2, 'm²')};;;;`);
  }
  lines.push(`Kanten gesamt;;;;;;${formatNumberDE(totalEdgeLength, 2, 'm')}`);

  return lines.join('\n');
};
