import { Measurement } from '@/types/measurements';
import { normalizeSegmentType } from '@/pages/Viewer';
import { triangulate3D } from '@/utils/triangulation';

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
    .filter(m => m.type === 'area' || m.type === 'solar')
    .reduce((sum, m) => sum + m.value, 0);
    
  return totalRegularArea;
};

/**
 * Calculates the net total area (regular areas minus deduction areas)
 */
export const calculateNetTotalArea = (measurements: Measurement[]): number => {
  const totalRegularArea = measurements
    .filter(m => m.type === 'area' || m.type === 'solar')
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
 * Testversion: ABS-JSON Export aus aktuellen Messungen
 *
 * Diese Funktion baut eine vereinfachte JSON-Struktur,
 * die sich am Schema der ABS-Datei orientiert.
 *
 * TODO:
 * - Geometrie (vertices/edges/faces) aus dem Modell übernehmen
 * - assembledFaces / classifiedEdges aus echten Klassifizierungen ableiten
 */
/**
 * Generates a detailed CSV string from measurements.
 * Each roof surface lists area/inclination, followed by individual edge rows.
 */
export const generateDetailedCSV = (measurements: Measurement[]): string => {
  const separator = ';';
  const lines: string[] = [];

  // Header
  lines.push(['Nr', 'Name', 'Typ', 'Wert', 'Einheit', 'Neigung (°)', 'Kantentyp', 'Kantenlänge (m)'].join(separator));

  measurements.forEach((m, index) => {
    const nr = index + 1;
    const name = m.label || `Messung ${nr}`;
    const typeName = getMeasurementTypeDisplayName(m.type);
    const isArea = ['area', 'solar', 'chimney', 'deductionarea', 'skylight'].includes(m.type);
    const unit = isArea ? 'm²' : 'm';
    const inclination = m.inclination != null ? m.inclination.toFixed(1) : '';

    // Main measurement row
    lines.push([nr, name, typeName, m.value.toFixed(2), unit, inclination, '', ''].join(separator));

    // Edge/segment rows
    if (m.segments && m.segments.length > 0) {
      m.segments.forEach(seg => {
        const segTypeName = getSegmentTypeDisplayName(seg.type || 'edge');
        lines.push(['', '', '', '', '', '', segTypeName, seg.length.toFixed(2)].join(separator));
      });
    }
  });

  // Summary section
  lines.push('');
  lines.push(['Zusammenfassung'].join(separator));

  const summary = getRoofElementsSummary(measurements);
  Object.entries(summary).forEach(([type, data]) => {
    const typeName = type === 'netarea' ? 'Nettofläche' : getMeasurementTypeDisplayName(type);
    const value = data.totalArea != null ? data.totalArea.toFixed(2) : data.totalLength != null ? data.totalLength.toFixed(2) : '';
    const unit = data.totalArea != null ? 'm²' : 'm';
    lines.push([typeName, `${data.count}x`, value, unit].join(separator));
  });

  // Segment summary
  const segmentGroups = groupSegmentsByType(measurements);
  if (Object.keys(segmentGroups).length > 0) {
    lines.push('');
    lines.push(['Kantenzusammenfassung'].join(separator));
    Object.entries(segmentGroups).forEach(([type, data]) => {
      const typeName = getSegmentTypeDisplayName(type);
      lines.push([typeName, `${data.count}x`, data.totalLength.toFixed(2), 'm'].join(separator));
    });
  }

  return lines.join('\n');
};

export const exportMeasurementsToAbsJson = (
  measurements: Measurement[],
  options?: {
    address?: string;
    projectId?: number;
    customerNames?: string;
    customersReferencePhrase?: string;
  }
) => {
  const totalArea = calculateTotalArea(measurements); // Summe aller "area"-Messungen
  const netArea = calculateNetTotalArea(measurements); // area - deductionarea

  const skylights = measurements.filter(m => m.type === 'skylight');
  const chimneys = measurements.filter(m => m.type === 'chimney');
  const vents = measurements.filter(m => m.type === 'vent');

  const segmentGroups = groupSegmentsByType(measurements);

  // Erste Höhenmessung definiert die absolute Dachhöhe in Metern
  const heightMeasurement = measurements.find(m => m.type === 'height');
  const baseHeight = heightMeasurement?.value ?? 0; // z.B. 4.09 m wie im Airteam-Modell

  // Erste Flächenmessung als Dachpolygon verwenden (falls vorhanden)
  const areaMeasurement = measurements.find(m => m.type === 'area' && m.points && m.points.length >= 3) || null;

  const vertices: { x: number; y: number; z: number }[] = [];
  const faces: { vertexKeys: number[] }[] = [];
  const assembledFaces: any[] = [];
  const classifiedEdges: { category: string; vertexKeys: number[] }[] = [];

  // Hilfsfunktion für 2D-Abstand (x / z-Ebene)
  const distance2D = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  let windowsPerimeter = 0;
  let chimneysPerimeter = 0;
  let innerAttikaPerimeter = 0;

  // 1) Dachfläche exportieren
  if (areaMeasurement) {
    const roofVertexOffset = vertices.length;

    // Basis-Vertexliste aus den Punkten der Flächenmessung
    // Three.js nutzt x/z als Ebene, y als Höhe.
    // Für ABS projizieren wir in eine 2D-Ebene: x -> x, z -> y, Höhe -> 0.
    areaMeasurement.points.forEach((p) => {
      vertices.push({ x: p.x, y: p.z, z: baseHeight });
    });

    // Triangulation im 3D-Raum (nutzt Originalpunkte mit Höhe)
    const triResult = triangulate3D(areaMeasurement.points);

    const roofFaceStartIndex = faces.length;

    triResult.triangles.forEach((tri) => {
      faces.push({
        vertexKeys: tri.map((i) => i + roofVertexOffset),
      });
    });

    if (triResult.triangles.length > 0) {
      const roofFaceKeys = triResult.triangles.map((_, idx) => roofFaceStartIndex + idx);

      const roofPolylineVertexKeys = areaMeasurement.points.map((_, idx) => roofVertexOffset + idx);

      assembledFaces.push({
        area: triResult.area,
        angle: 0,
        category: 'Dachoberflaeche',
        faceKeys: roofFaceKeys,
        polylines: [
          {
            category: 'Default',
            vertexKeys: roofPolylineVertexKeys,
          },
        ],
        orientation: [0, 0, 0],
      });

      // Attika-Innenkante entlang der Dachpolygon-Perimeterkante
      for (let i = 0; i < roofPolylineVertexKeys.length; i++) {
        const aIndex = roofPolylineVertexKeys[i];
        const bIndex = roofPolylineVertexKeys[(i + 1) % roofPolylineVertexKeys.length];

        classifiedEdges.push({
          category: 'Attika_Innenkante',
          vertexKeys: [aIndex, bIndex],
        });

        const a = vertices[aIndex];
        const b = vertices[bIndex];
        innerAttikaPerimeter += distance2D(a, b);
      }
    }
  }

  // 2) Dachfenster (skylight) als Oberlichter exportieren
  const skylightAreas = measurements.filter(
    (m) => m.type === 'skylight' && m.points && m.points.length >= 3,
  );

  skylightAreas.forEach((skylight) => {
    const baseOffset = vertices.length;
    const skylightHeight = 0.3; // 30 cm Oberlichthöhe

    // Unteres Polygon (Dachfenster-Ausschnitt) auf Dachhöhe projizieren
    skylight.points.forEach((p) => {
      vertices.push({ x: p.x, y: p.z, z: baseHeight });
    });

    const triResult = triangulate3D(skylight.points);

    // Oberes Polygon (Oberkante Dachfenster) mit fixer Höhe
    const topOffset = vertices.length;
    skylight.points.forEach((p) => {
      vertices.push({ x: p.x, y: p.z, z: baseHeight + skylightHeight });
    });

    const baseFaceStartIndex = faces.length;

    // Untere Fläche (kann ABS zur Orientierung nutzen)
    triResult.triangles.forEach((tri) => {
      faces.push({
        vertexKeys: tri.map((i) => i + baseOffset),
      });
    });

    // Obere Fläche als Dachfenster-Oberfläche
    const topFaceStartIndex = faces.length;
    triResult.triangles.forEach((tri) => {
      faces.push({
        vertexKeys: tri.map((i) => i + topOffset),
      });
    });

    if (triResult.triangles.length > 0) {
      const baseFaceKeys = triResult.triangles.map((_, idx) => baseFaceStartIndex + idx);
      const topFaceKeys = triResult.triangles.map((_, idx) => topFaceStartIndex + idx);

      const basePolyVertexKeys = skylight.points.map((_, idx) => baseOffset + idx);
      const topPolyVertexKeys = skylight.points.map((_, idx) => topOffset + idx);

      // Oberseite des Dachfensters (ABS interessiert sich primär für die obere Fläche)
      assembledFaces.push({
        area: triResult.area,
        angle: 0,
        category: 'Dachfenster_Oben_Flaechen',
        faceKeys: topFaceKeys,
        polylines: [
          {
            category: 'Default',
            vertexKeys: topPolyVertexKeys,
          },
        ],
        orientation: [0, 0, 0],
      });

      // Seitenflächen des Dachfensters (extrudiert auf 30 cm)
      const sideFaceStartIndex = faces.length;
      let sideAreaSum = 0;

      for (let i = 0; i < basePolyVertexKeys.length; i++) {
        const next = (i + 1) % basePolyVertexKeys.length;
        const aBase = basePolyVertexKeys[i];
        const bBase = basePolyVertexKeys[next];
        const aTop = topPolyVertexKeys[i];
        const bTop = topPolyVertexKeys[next];

        // Zwei Dreiecke pro Rechteck-Seitenfläche
        faces.push({ vertexKeys: [aBase, bBase, bTop] });
        faces.push({ vertexKeys: [aBase, bTop, aTop] });

        const edgeLen = distance2D(vertices[aBase], vertices[bBase]);
        sideAreaSum += edgeLen * skylightHeight;
      }

      const sideFaceCount = basePolyVertexKeys.length * 2;
      const sideFaceKeys = Array.from({ length: sideFaceCount }, (_, idx) => sideFaceStartIndex + idx);

      assembledFaces.push({
        area: sideAreaSum,
        angle: 90,
        category: 'Dachfenster_Seite_Flaechen',
        faceKeys: sideFaceKeys,
        polylines: [
          {
            category: 'Default',
            vertexKeys: basePolyVertexKeys,
          },
        ],
        orientation: [0, 0, -1],
      });

      // Fenster-Anschlusskanten + Umfang (am Dach, daher Basispolygon)
      for (let i = 0; i < basePolyVertexKeys.length; i++) {
        const aIndex = basePolyVertexKeys[i];
        const bIndex = basePolyVertexKeys[(i + 1) % basePolyVertexKeys.length];

        classifiedEdges.push({
          category: 'Fenster_Anschluss',
          vertexKeys: [aIndex, bIndex],
        });

        const a = vertices[aIndex];
        const b = vertices[bIndex];
        windowsPerimeter += distance2D(a, b);
      }
    }
  });

  // 3) Kamine (chimney) als 1m hohe Quader
  const chimneyAreas = measurements.filter(
    (m) => m.type === 'chimney' && m.points && m.points.length >= 3,
  );

  chimneyAreas.forEach((chimney) => {
    const baseOffset = vertices.length;
    const chimneyHeight = 1.0; // 1 m Kaminhöhe

    // Untere Kaminfläche auf Dachhöhe
    chimney.points.forEach((p) => {
      vertices.push({ x: p.x, y: p.z, z: baseHeight });
    });

    const triResult = triangulate3D(chimney.points);

    // Obere Kaminfläche (Dachhöhe + 1m)
    const topOffset = vertices.length;
    chimney.points.forEach((p) => {
      vertices.push({ x: p.x, y: p.z, z: baseHeight + chimneyHeight });
    });

    const baseFaceStartIndex = faces.length;
    triResult.triangles.forEach((tri) => {
      faces.push({ vertexKeys: tri.map((i) => i + baseOffset) });
    });

    const topFaceStartIndex = faces.length;
    triResult.triangles.forEach((tri) => {
      faces.push({ vertexKeys: tri.map((i) => i + topOffset) });
    });

    if (triResult.triangles.length > 0) {
      const topFaceKeys = triResult.triangles.map((_, idx) => topFaceStartIndex + idx);
      const basePolyVertexKeys = chimney.points.map((_, idx) => baseOffset + idx);
      const topPolyVertexKeys = chimney.points.map((_, idx) => topOffset + idx);

      // Kaminoberseite
      assembledFaces.push({
        area: triResult.area,
        angle: 0,
        category: 'Kamin_Oben_Flaechen',
        faceKeys: topFaceKeys,
        polylines: [
          {
            category: 'Default',
            vertexKeys: topPolyVertexKeys,
          },
        ],
        orientation: [0, 0, 0],
      });

      // Kaminseitenflächen
      const sideFaceStartIndex = faces.length;
      let sideAreaSum = 0;
      for (let i = 0; i < basePolyVertexKeys.length; i++) {
        const next = (i + 1) % basePolyVertexKeys.length;
        const aBase = basePolyVertexKeys[i];
        const bBase = basePolyVertexKeys[next];
        const aTop = topPolyVertexKeys[i];
        const bTop = topPolyVertexKeys[next];

        faces.push({ vertexKeys: [aBase, bBase, bTop] });
        faces.push({ vertexKeys: [aBase, bTop, aTop] });

        const edgeLen = distance2D(vertices[aBase], vertices[bBase]);
        sideAreaSum += edgeLen * chimneyHeight;
      }

      const sideFaceCount = basePolyVertexKeys.length * 2;
      const sideFaceKeys = Array.from({ length: sideFaceCount }, (_, idx) => sideFaceStartIndex + idx);

      assembledFaces.push({
        area: sideAreaSum,
        angle: 90,
        category: 'Kamin_Seite_Flaechen',
        faceKeys: sideFaceKeys,
        polylines: [
          {
            category: 'Default',
            vertexKeys: basePolyVertexKeys,
          },
        ],
        orientation: [0, 0, -1],
      });

      // Kamin-Anschlusskanten + Umfang
      for (let i = 0; i < basePolyVertexKeys.length; i++) {
        const aIndex = basePolyVertexKeys[i];
        const bIndex = basePolyVertexKeys[(i + 1) % basePolyVertexKeys.length];

        classifiedEdges.push({
          category: 'Kamin_Anschluss',
          vertexKeys: [aIndex, bIndex],
        });

        const a = vertices[aIndex];
        const b = vertices[bIndex];
        chimneysPerimeter += distance2D(a, b);
      }
    }
  });

  // 4) Lüfter (vent) als 0.3m hohe Zylinder (8-Eck approximation)
  const ventMeasurements = measurements.filter((m) => m.type === 'vent');

  const ventRadius = 0.05; // 100 mm Durchmesser
  const ventHeight = 0.3; // 30 cm Höhe
  const ventSegments = 8;

  ventMeasurements.forEach((vent) => {
    if (!vent.position && (!vent.points || vent.points.length === 0)) return;

    const center = vent.position || vent.points[0];

    const baseOffset = vertices.length;

    // Basisring
    for (let i = 0; i < ventSegments; i++) {
      const angle = (2 * Math.PI * i) / ventSegments;
      const x = center.x + Math.cos(angle) * ventRadius;
      const y = center.z + Math.sin(angle) * ventRadius;
      vertices.push({ x, y, z: baseHeight });
    }

    const topOffset = vertices.length;
    // Topring
    for (let i = 0; i < ventSegments; i++) {
      const angle = (2 * Math.PI * i) / ventSegments;
      const x = center.x + Math.cos(angle) * ventRadius;
      const y = center.z + Math.sin(angle) * ventRadius;
      vertices.push({ x, y, z: baseHeight + ventHeight });
    }

    // Deckelfläche (oben) triangulieren (Fan vom ersten Top-Vertex)
    const topCenterIndex = vertices.length;
    vertices.push({ x: center.x, y: center.z, z: baseHeight + ventHeight });

    const topFaceStartIndex = faces.length;
    for (let i = 0; i < ventSegments; i++) {
      const next = (i + 1) % ventSegments;
      faces.push({ vertexKeys: [topCenterIndex, topOffset + i, topOffset + next] });
    }

    const topFaceKeys = Array.from({ length: ventSegments }, (_, idx) => topFaceStartIndex + idx);
    const topRingKeys = Array.from({ length: ventSegments }, (_, idx) => topOffset + idx);

    assembledFaces.push({
      area: Math.PI * ventRadius * ventRadius,
      angle: 0,
      category: 'Lueftungsrohre_Oben_Flaechen',
      faceKeys: topFaceKeys,
      polylines: [
        {
          category: 'Default',
          vertexKeys: topRingKeys,
        },
      ],
      orientation: [0, 0, 0],
    });

    // Mantelfläche
    const sideFaceStartIndex = faces.length;
    let sideAreaSum = 0;
    const baseRingKeys = Array.from({ length: ventSegments }, (_, idx) => baseOffset + idx);

    for (let i = 0; i < ventSegments; i++) {
      const next = (i + 1) % ventSegments;
      const aBase = baseRingKeys[i];
      const bBase = baseRingKeys[next];
      const aTop = topRingKeys[i];
      const bTop = topRingKeys[next];

      faces.push({ vertexKeys: [aBase, bBase, bTop] });
      faces.push({ vertexKeys: [aBase, bTop, aTop] });

      const edgeLen = distance2D(vertices[aBase], vertices[bBase]);
      sideAreaSum += edgeLen * ventHeight;
    }

    const sideFaceCount = ventSegments * 2;
    const sideFaceKeys = Array.from({ length: sideFaceCount }, (_, idx) => sideFaceStartIndex + idx);

    assembledFaces.push({
      area: sideAreaSum,
      angle: 90,
      category: 'Lueftungsrohre_Seite_Flaechen',
      faceKeys: sideFaceKeys,
      polylines: [
        {
          category: 'Default',
          vertexKeys: baseRingKeys,
        },
      ],
      orientation: [0, 0, -1],
    });

    // Anschlusskanten am Dach
    for (let i = 0; i < ventSegments; i++) {
      const aIndex = baseRingKeys[i];
      const bIndex = baseRingKeys[(i + 1) % ventSegments];

      classifiedEdges.push({
        category: 'Lueftungsrohre_Anschluss',
        vertexKeys: [aIndex, bIndex],
      });
    }
  });

  // Mapping für Flachdach-Längen (jetzt inkl. Attika)
  const totalLengthsFlatRoof = {
    eaves: segmentGroups['eave']?.totalLength ?? 0,
    roofEdges: segmentGroups['edge']?.totalLength ?? 0,
    railings: 0,
    innerAttikas: Number(innerAttikaPerimeter.toFixed(2)),
    outerAttikas: 0,
    wallConnections: segmentGroups['connection']?.totalLength ?? 0,
    attikaConnections: 0,
    others: 0,
    otherSurfaces: 0,
  };

  // Steildach-Längen nutzen wir hier als Sammelcontainer
  const totalLengthsSteepRoof = {
    hips: segmentGroups['hip']?.totalLength ?? 0,
    eaves: segmentGroups['eave']?.totalLength ?? 0,
    rakes: segmentGroups['verge']?.totalLength ?? 0,
    breaks: 0,
    decays: 0,
    others: 0,
    ridges: segmentGroups['ridge']?.totalLength ?? 0,
    stairs: 0,
    rafters: 0,
    valleys: segmentGroups['valley']?.totalLength ?? 0,
    windows: Number(windowsPerimeter.toFixed(2)), // Umfang der Dachfenster-Anschlusskanten
    chimneys: Number(chimneysPerimeter.toFixed(2)),
    snowguards: 0,
  };

  const amountOfObjects = {
    amountOfVents: vents.length,
    amountOfStairs: -1,
    amountOfWindows: skylights.length,
    amountOfAntennas: -1,
    amountOfChimneys: chimneys.length,
    amountOfDownspouts: -1,
    amountOfSnowguards: -1,
  };

  const absJson = {
    areas: {
      flatRoofArea: 0,
      steepRoofArea: 0,
      totalRoofArea: 0,
      dormerRoofArea: 0,
      dormerFrontArea: 0,
      wallSurfaceArea: 0,
      attikaSurfaceArea: 0,
      totalFlatRoofArea: Number(netArea.toFixed(2)),
      dormerStringerArea: 0,
      totalSteepRoofArea: 0,
      flatRoofSurfaceArea: Number(totalArea.toFixed(2)),
      angledParapetWallArea: 0,
      otherFlatRoofSurfaceArea: 0,
      otherSteepRoofSurfacesArea: 0,
    },
    totalLengthsFlatRoof,
    totalLengthsSteepRoof,
    amountOfObjects,
    vertices,
    edges: [],
    faces,
    assembledFaces,
    classifiedEdges,
    address: options?.address ?? '',
    projectId: options?.projectId ?? 0,
    coordinates: null,
    customerNames: options?.customerNames ?? '',
    schemaVersion: '1.1.8',
    customersReferencePhrase: options?.customersReferencePhrase ?? '',
  };

  return absJson;
};
