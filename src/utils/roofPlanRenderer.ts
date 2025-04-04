
import { Measurement, Point, Point2D } from '@/types/measurements';

// Create the combined roof plan from measurements
export function createCombinedRoofPlan(
  measurements: Measurement[],
  width: number = 1200,
  height: number = 900,
  padding: number = 0.1,
  includeSolar: boolean = true
): string | null {
  try {
    // Create a canvas for drawing the roof plan
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error("Failed to get 2D context for roof plan rendering");
      return null;
    }
    
    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Get all roof areas (measurements of type 'area')
    const roofAreas = measurements.filter(m => m.type === 'area' && m.points && m.points.length >= 3);
    
    if (roofAreas.length === 0) {
      console.error("No valid roof areas found for roof plan");
      return null;
    }
    
    // Get all points from areas to determine bounds
    const allPoints = roofAreas.flatMap(area => area.points || []);
    
    if (allPoints.length === 0) {
      console.error("No valid points found in roof areas");
      return null;
    }
    
    // Find bounding box to scale drawing
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.z || 0)); // Use Z as Y in 2D view (top-down)
    const maxY = Math.max(...allPoints.map(p => p.z || 0));
    
    const boundWidth = maxX - minX;
    const boundHeight = maxY - minY;
    
    // Calculate scale factor to fit the canvas with padding
    const paddedWidth = width * (1 - padding * 2);
    const paddedHeight = height * (1 - padding * 2);
    
    const scaleX = paddedWidth / boundWidth;
    const scaleY = paddedHeight / boundHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Function to map 3D points to 2D canvas coordinates
    const mapPointToCanvas = (point: Point): {x: number, y: number} => {
      return {
        x: (point.x - minX) * scale + width * padding,
        y: height - ((point.z || 0) - minY) * scale - height * padding // Flip Y since canvas Y goes down
      };
    };
    
    // Draw roof areas
    roofAreas.forEach(area => {
      if (!area.points || area.points.length < 3) return;
      
      ctx.beginPath();
      
      const canvasPoints = area.points.map(mapPointToCanvas);
      
      // Start from the first point
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      
      // Connect to all other points
      for (let i = 1; i < canvasPoints.length; i++) {
        ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
      }
      
      // Close the path
      ctx.closePath();
      
      // Fill with a light gray
      ctx.fillStyle = '#f0f0f0';
      ctx.fill();
      
      // Stroke with black
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // Draw special elements if available
    const specialElements = measurements.filter(m => 
      ['skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type) && 
      m.points && 
      m.points.length >= 3
    );
    
    specialElements.forEach(element => {
      if (!element.points || element.points.length < 3) return;
      
      ctx.beginPath();
      
      const canvasPoints = element.points.map(mapPointToCanvas);
      
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      
      for (let i = 1; i < canvasPoints.length; i++) {
        ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
      }
      
      ctx.closePath();
      
      // Different fill colors for different element types
      switch(element.type) {
        case 'skylight':
          ctx.fillStyle = 'rgba(135, 206, 235, 0.6)'; // Light blue
          break;
        case 'chimney':
          ctx.fillStyle = 'rgba(139, 69, 19, 0.6)'; // Brown
          break;
        case 'vent':
          ctx.fillStyle = 'rgba(169, 169, 169, 0.6)'; // Gray
          break;
        case 'hook':
          ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; // Red
          break;
        default:
          ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Yellow
      }
      
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Add labels if available
      if (element.label) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000000';
        
        // Find center point of the element
        const centerX = canvasPoints.reduce((sum, p) => sum + p.x, 0) / canvasPoints.length;
        const centerY = canvasPoints.reduce((sum, p) => sum + p.y, 0) / canvasPoints.length;
        
        ctx.textAlign = 'center';
        ctx.fillText(element.label, centerX, centerY);
      }
    });
    
    // Draw solar modules if requested
    if (includeSolar) {
      const solarAreas = measurements.filter(m => 
        m.type === 'solar' && 
        m.points && 
        m.points.length >= 3 &&
        m.pvModuleInfo?.modulePositions?.length
      );
      
      solarAreas.forEach(solarArea => {
        if (!solarArea.pvModuleInfo?.modulePositions) return;
        
        // Draw modules as rectangles
        const { moduleWidth, moduleHeight, orientation } = solarArea.pvModuleInfo;
        
        // Adjusted width/height based on orientation
        const width = orientation === 'landscape' ? moduleWidth : moduleHeight;
        const height = orientation === 'landscape' ? moduleHeight : moduleWidth;
        
        // Draw each module
        solarArea.pvModuleInfo.modulePositions.forEach(position => {
          // Map center position to canvas
          const center = mapPointToCanvas(position);
          
          // Calculate rectangle corners
          const halfWidth = (width * scale) / 2;
          const halfHeight = (height * scale) / 2;
          
          const x = center.x - halfWidth;
          const y = center.y - halfHeight;
          
          // Draw module rectangle
          ctx.fillStyle = '#2563eb'; // Blue for solar modules
          ctx.fillRect(x, y, width * scale, height * scale);
          
          // Draw border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, width * scale, height * scale);
        });
        
        // Add label with module count if available
        if (solarArea.pvModuleInfo.moduleCount) {
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = '#000000';
          
          // Find center of the first 3 points as label position
          const firstPoints = solarArea.points.slice(0, 3);
          const centerX = firstPoints.reduce((sum, p) => sum + mapPointToCanvas(p).x, 0) / 3;
          const centerY = firstPoints.reduce((sum, p) => sum + mapPointToCanvas(p).y, 0) / 3;
          
          ctx.textAlign = 'center';
          ctx.fillText(`${solarArea.pvModuleInfo.moduleCount} Module`, centerX, centerY - 10);
        }
      });
    }
    
    // Add scale bar
    const scaleBarLength = 5; // 5 meters
    const scaleBarPixels = scaleBarLength * scale;
    const scaleBarX = width * 0.1;
    const scaleBarY = height * 0.9;
    
    ctx.beginPath();
    ctx.moveTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX + scaleBarPixels, scaleBarY);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add scale labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('0m', scaleBarX, scaleBarY + 15);
    ctx.fillText(`${scaleBarLength}m`, scaleBarX + scaleBarPixels, scaleBarY + 15);
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
    
  } catch (error) {
    console.error("Error generating roof plan:", error);
    return null;
  }
}

// Convert Point2D to Point by adding a z coordinate of 0
export const mapPointsToPoints = (points2D: Point2D[]): Point[] => {
  return points2D.map(point => ({
    x: point.x,
    y: point.y,
    z: 0  // Add the missing z coordinate
  }));
};
