import { Measurement, Point, Point2D, PVModuleInfo } from '../types/measurements';
import * as THREE from 'three';

/**
 * Projects 3D points onto a 2D plane
 * This creates a normalized 2D representation of a measurement
 */
export const projectPointsTo2D = (points: Point[]): Point2D[] => {
  if (points.length < 3) {
    console.error('Need at least 3 points to create a 2D projection');
    return [];
  }

  return projectPointsTo2DRaw(points);
};

/**
 * Raw 2D projection: projects 3D points onto the polygon's plane
 * and normalizes to 0-1 range with padding.
 */
const projectPointsTo2DRaw = (points: Point[]): Point2D[] => {
  const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
  const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
  const p3 = new THREE.Vector3(points[2].x, points[2].y, points[2].z);
  
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p3, p1);
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  const origin = p1.clone();
  const xAxis = new THREE.Vector3().subVectors(p2, p1).normalize();
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  const raw2D: Point2D[] = [];
  for (const point of points) {
    const rel = new THREE.Vector3(point.x - origin.x, point.y - origin.y, point.z - origin.z);
    const x = rel.dot(xAxis);
    const y = rel.dot(yAxis);
    raw2D.push({ x, y });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  
  const maxRange = Math.max(maxX - minX, maxY - minY);
  if (maxRange === 0) return raw2D.map(() => ({ x: 0.5, y: 0.5 }));

  return raw2D.map(p => ({
    x: (p.x - minX) / (maxRange * 1.2) + 0.1,
    y: (maxY - p.y) / (maxRange * 1.2) + 0.1,
  }));
};

/**
 * Projects 3D points to 2D with the eave (Traufe = lowest 3D Y edge) at the bottom.
 * 1. Project onto polygon plane
 * 2. Find the edge with lowest average 3D Y
 * 3. Rotate 2D so that edge is horizontal at the bottom
 * 4. Normalize to 0-1
 */
export const projectPointsTo2DWithEaveDown = (
  points: Point[],
  roofPointCount?: number
): Point2D[] => {
  if (points.length < 3) return [];

  const roofCount = roofPointCount ?? points.length;

  // Step 1: project onto plane (unnormalized)
  const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
  const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
  const p3 = new THREE.Vector3(points[2].x, points[2].y, points[2].z);
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p3, p1);
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  const origin = p1.clone();
  const xAxis = new THREE.Vector3().subVectors(p2, p1).normalize();
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

  const raw2D: Point2D[] = [];
  for (const point of points) {
    const rel = new THREE.Vector3(point.x - origin.x, point.y - origin.y, point.z - origin.z);
    raw2D.push({ x: rel.dot(xAxis), y: rel.dot(yAxis) });
  }

  // Step 2: find eave edge (lowest avg 3D Y among roof polygon edges)
  let lowestAvgY = Infinity;
  let eaveIdx1 = 0;
  let eaveIdx2 = 1;
  for (let i = 0; i < roofCount; i++) {
    const j = (i + 1) % roofCount;
    const avgY = (points[i].y + points[j].y) / 2;
    if (avgY < lowestAvgY) {
      lowestAvgY = avgY;
      eaveIdx1 = i;
      eaveIdx2 = j;
    }
  }

  // Step 3: calculate rotation to make eave edge horizontal
  const eave2D1 = raw2D[eaveIdx1];
  const eave2D2 = raw2D[eaveIdx2];
  const edgeDx = eave2D2.x - eave2D1.x;
  const edgeDy = eave2D2.y - eave2D1.y;
  const edgeAngle = Math.atan2(edgeDy, edgeDx);
  // We want this edge horizontal → rotate by -edgeAngle
  const cosA = Math.cos(-edgeAngle);
  const sinA = Math.sin(-edgeAngle);

  const rotated: Point2D[] = raw2D.map(p => ({
    x: p.x * cosA - p.y * sinA,
    y: p.x * sinA + p.y * cosA,
  }));

  // Step 4: ensure eave is at bottom (highest canvas Y = bottom)
  // After rotation, the eave edge should have the same Y for both points.
  // The eave should be at the bottom → it should have the LARGEST normalized Y.
  const eaveRotY = (rotated[eaveIdx1].y + rotated[eaveIdx2].y) / 2;
  const roofCenterY = rotated.slice(0, roofCount).reduce((s, p) => s + p.y, 0) / roofCount;
  
  // If the eave is above center (smaller Y), we need to flip
  const needsFlip = eaveRotY < roofCenterY;

  let finalPoints = rotated;
  if (needsFlip) {
    // Flip vertically around center
    const allCenterY = rotated.reduce((s, p) => s + p.y, 0) / rotated.length;
    finalPoints = rotated.map(p => ({ x: p.x, y: 2 * allCenterY - p.y }));
  }

  // Step 5: normalize to 0-1 with padding
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of finalPoints) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const maxRange = Math.max(maxX - minX, maxY - minY);
  if (maxRange === 0) return finalPoints.map(() => ({ x: 0.5, y: 0.5 }));

  // Canvas Y grows downward, so larger Y → bottom.
  // After our rotation + flip, larger Y = eave = should be bottom of canvas.
  return finalPoints.map(p => ({
    x: (p.x - minX) / (maxRange * 1.2) + 0.1,
    y: (p.y - minY) / (maxRange * 1.2) + 0.1,
  }));
};

/**
 * Renders a measurement as a 2D polygon on a canvas
 * Returns a base64 data URL of the rendered polygon
 */
export const renderPolygon2D = (measurement: Measurement, width = 800, height = 600): string => {
  if (!measurement || !measurement.points || measurement.points.length < 3) {
    console.error('Invalid measurement for 2D rendering');
    return '';
  }
  
  try {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return '';
    }
    
    // Set the background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Project 3D points to 2D
    const points2D = projectPointsTo2D(measurement.points);
    
    if (points2D.length < 3) {
      console.error('Failed to project points to 2D');
      return '';
    }
    
    // Draw the polygon
    ctx.beginPath();
    
    // Start at the first point
    ctx.moveTo(points2D[0].x * width, points2D[0].y * height);
    
    // Connect all points
    for (let i = 1; i < points2D.length; i++) {
      ctx.lineTo(points2D[i].x * width, points2D[i].y * height);
    }
    
    // Close the polygon
    ctx.closePath();
    
    // Fill with a semi-transparent color
    ctx.fillStyle = 'rgba(0, 128, 255, 0.2)';
    ctx.fill();
    
    // Draw the outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0066cc';
    ctx.stroke();
    
    // Draw the segments and labels
    if (measurement.segments) {
      for (let i = 0; i < measurement.segments.length; i++) {
        const segment = measurement.segments[i];
        const p1Index = measurement.points.findIndex(p => 
          p.x === segment.points[0].x && 
          p.y === segment.points[0].y && 
          p.z === segment.points[0].z
        );
        const p2Index = measurement.points.findIndex(p => 
          p.x === segment.points[1].x && 
          p.y === segment.points[1].y && 
          p.z === segment.points[1].z
        );
        
        if (p1Index >= 0 && p2Index >= 0 && p1Index < points2D.length && p2Index < points2D.length) {
          const p1 = points2D[p1Index];
          const p2 = points2D[p2Index];
          
          // Draw the segment line
          ctx.beginPath();
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ff6600';
          ctx.stroke();
          
          // Draw the length label
          const midX = (p1.x + p2.x) / 2 * width;
          const midY = (p1.y + p2.y) / 2 * height;
          
          ctx.font = '12px Arial';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${segment.length.toFixed(2)} m`, midX, midY - 10);
        }
      }
    }
    
    // Draw the area label
    const centerX = points2D.reduce((sum, p) => sum + p.x, 0) / points2D.length * width;
    const centerY = points2D.reduce((sum, p) => sum + p.y, 0) / points2D.length * height;
    
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Fläche: ${measurement.value.toFixed(2)} m²`, centerX, centerY);
    
    if (measurement.description) {
      ctx.font = '12px Arial';
      ctx.fillText(measurement.description, centerX, centerY + 20);
    }
    
    // Draw vertices
    points2D.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0066cc';
      ctx.fill();
      
      // Vertex numbers
      ctx.font = '10px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, point.x * width, point.y * height - 10);
    });
    
    // Convert to base64
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering 2D polygon:', error);
    return '';
  }
};

/**
 * Draws a single module rectangle on the canvas.
 * Used by both moduleCorners and modulePositions paths.
 */
function drawModuleRect(
  ctx: CanvasRenderingContext2D,
  corners: Point2D[],
  moduleIndex: number,
  moduleNumber: number,
  canvasWidth: number,
  canvasHeight: number,
  stringAssignments?: Record<number, { stringId: string; color: string }>
) {
  let strokeColor = '#2563eb';
  let fillColor = 'rgba(37, 99, 235, 0.55)';

  if (stringAssignments && stringAssignments[moduleIndex]) {
    strokeColor = stringAssignments[moduleIndex].color;
    const hex = strokeColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    fillColor = `rgba(${r}, ${g}, ${b}, 0.55)`;
  }

  ctx.beginPath();
  ctx.moveTo(corners[0].x * canvasWidth, corners[0].y * canvasHeight);
  for (let c = 1; c < corners.length; c++) {
    ctx.lineTo(corners[c].x * canvasWidth, corners[c].y * canvasHeight);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  const cx = corners.reduce((s, p) => s + p.x, 0) / corners.length * canvasWidth;
  const cy = corners.reduce((s, p) => s + p.y, 0) / corners.length * canvasHeight;
  ctx.font = 'bold 8px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${moduleNumber}`, cx, cy);
}

/**
 * Renders a solar layout with roof polygon and PV modules as a 2D canvas image.
 * Shows numbered module rectangles on the roof polygon with string coloring.
 */
export const renderSolarLayout2D = (
  measurement: Measurement,
  width = 800,
  height = 700,
  stringAssignments?: Record<number, { stringId: string; color: string }>
): string => {
  if (!measurement || !measurement.points || measurement.points.length < 3) {
    console.error('Invalid measurement for solar layout rendering');
    return '';
  }

  const pvInfo = measurement.pvModuleInfo;
  if (!pvInfo) {
    console.error('No PV module info for solar layout rendering');
    return '';
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const roofPoints2D = projectPointsTo2D(measurement.points);
    if (roofPoints2D.length < 3) return '';

    // Draw roof polygon
    ctx.beginPath();
    ctx.moveTo(roofPoints2D[0].x * width, roofPoints2D[0].y * height);
    for (let i = 1; i < roofPoints2D.length; i++) {
      ctx.lineTo(roofPoints2D[i].x * width, roofPoints2D[i].y * height);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(200, 220, 240, 0.3)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333333';
    ctx.stroke();

    // ── MODULE DRAWING ──────────────────────────────────────────────────

    const removedIndices = new Set(pvInfo.removedModuleIndices || []);

    // PATH A: moduleCorners available — project real 3D corner points
    if (pvInfo.moduleCorners && pvInfo.moduleCorners.length > 0) {
      const allModulePoints: Point[] = [];
      pvInfo.moduleCorners.forEach(corners => corners.forEach(c => allModulePoints.push(c)));
      const allPoints = [...measurement.points, ...allModulePoints];
      const allProjected = projectPointsTo2D(allPoints);
      const roofCount = measurement.points.length;

      let cornerIdx = roofCount;
      let moduleNumber = 0;

      for (let mIdx = 0; mIdx < pvInfo.moduleCorners.length; mIdx++) {
        const corners = pvInfo.moduleCorners[mIdx];
        if (removedIndices.has(mIdx)) {
          cornerIdx += corners.length;
          continue;
        }
        moduleNumber++;

        const projectedCorners: Point2D[] = [];
        for (let c = 0; c < corners.length; c++) {
          if (cornerIdx + c < allProjected.length) {
            projectedCorners.push(allProjected[cornerIdx + c]);
          }
        }
        cornerIdx += corners.length;
        if (projectedCorners.length < 4) continue;

        drawModuleRect(ctx, projectedCorners, mIdx, moduleNumber, width, height, stringAssignments);
      }

    // PATH B: Fallback — modulePositions + module dimensions
    } else if (pvInfo.modulePositions && pvInfo.modulePositions.length > 0) {
      const allPoints = [...measurement.points, ...pvInfo.modulePositions];
      const allProjected = projectPointsTo2D(allPoints);
      const roofCount = measurement.points.length;

      const roofProj = allProjected.slice(0, roofCount);
      const roofMinX = Math.min(...roofProj.map(p => p.x));
      const roofMaxX = Math.max(...roofProj.map(p => p.x));
      const roofMinY = Math.min(...roofProj.map(p => p.y));
      const roofMaxY = Math.max(...roofProj.map(p => p.y));
      const roofSpanX = roofMaxX - roofMinX;
      const roofSpanY = roofMaxY - roofMinY;

      const roofWidthM = pvInfo.boundingWidth || pvInfo.availableWidth || 10;
      const roofLengthM = pvInfo.boundingLength || pvInfo.availableLength || 10;

      const pxPerMeterX = (roofSpanX * width) / roofWidthM;
      const pxPerMeterY = (roofSpanY * height) / roofLengthM;
      const pxPerMeter = Math.min(pxPerMeterX, pxPerMeterY) * 0.9;

      const moduleWpx = (pvInfo.moduleWidth || 1.134) * pxPerMeter;
      const moduleHpx = (pvInfo.moduleHeight || 1.722) * pxPerMeter;

      let moduleNumber = 0;
      for (let mIdx = 0; mIdx < pvInfo.modulePositions.length; mIdx++) {
        if (removedIndices.has(mIdx)) continue;
        moduleNumber++;

        const proj = allProjected[roofCount + mIdx];
        if (!proj) continue;

        const cx = proj.x * width;
        const cy = proj.y * height;
        const halfW = moduleWpx / 2;
        const halfH = moduleHpx / 2;

        const rectCorners: Point2D[] = [
          { x: (cx - halfW) / width, y: (cy - halfH) / height },
          { x: (cx + halfW) / width, y: (cy - halfH) / height },
          { x: (cx + halfW) / width, y: (cy + halfH) / height },
          { x: (cx - halfW) / width, y: (cy + halfH) / height },
        ];

        drawModuleRect(ctx, rectCorners, mIdx, moduleNumber, width, height, stringAssignments);
      }
    }

    // Title and legend
    const activeModules = (pvInfo.moduleCount || 0) - (pvInfo.removedModuleIndices?.length || 0);
    const modulePowerW = pvInfo.pvModuleSpec?.power || 425;
    const totalPowerKWp = (activeModules * modulePowerW) / 1000;

    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PV-Belegungsplan', 10, 10);

    ctx.font = '12px Arial';
    ctx.fillStyle = '#333333';
    ctx.fillText(`${activeModules} Module | ${totalPowerKWp.toFixed(2)} kWp`, 10, 30);

    if (pvInfo.roofDirection) {
      ctx.fillText(`Ausrichtung: ${pvInfo.roofDirection} (${pvInfo.roofAzimuth?.toFixed(0) || '?'}°)`, 10, 48);
    }
    if (pvInfo.roofInclination !== undefined) {
      ctx.fillText(`Dachneigung: ${pvInfo.roofInclination.toFixed(1)}°`, 10, 66);
    }

    // String legend
    if (stringAssignments) {
      const strings = new Map<string, string>();
      Object.values(stringAssignments).forEach(sa => strings.set(sa.stringId, sa.color));
      let legendY = height - 20 - strings.size * 18;
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#000000';
      ctx.fillText('Stringplanung:', 10, legendY - 20);
      strings.forEach((color, stringId) => {
        ctx.fillStyle = color;
        ctx.fillRect(10, legendY, 14, 14);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, legendY, 14, 14);
        ctx.fillStyle = '#333333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(stringId, 30, legendY + 11);
        legendY += 18;
      });
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering solar layout:', error);
    return '';
  }
};