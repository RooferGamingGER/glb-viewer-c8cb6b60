import * as THREE from 'three';

export interface SpriteConfig {
  text: string;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  backgroundColor?: {
    start: string;
    end: string;
  };
  textColor?: string;
  borderColor?: string;
  glowColor?: string;
  isPreview?: boolean;
}

/**
 * Creates a text sprite for 3D labels
 */
export function createTextSprite(config: SpriteConfig): THREE.Sprite {
  const {
    text,
    width = 512,
    height = 128,
    fontSize = 48,
    fontFamily = 'Inter, Arial, sans-serif',
    backgroundColor = {
      start: 'rgba(41, 50, 65, 0.95)',
      end: 'rgba(27, 32, 43, 0.95)'
    },
    textColor = 'white',
    borderColor = 'rgba(255, 255, 255, 0.3)',
    glowColor = 'rgba(45, 125, 255, 0.5)',
    isPreview = false
  } = config;

  // Create canvas and get context
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  
  if (!context) {
    console.error('Could not get canvas context');
    // Return an empty sprite if context creation fails
    return new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }));
  }

  // Set transparency for preview labels
  const opacity = isPreview ? 0.85 : 1.0;
  
  // Background with gradient
  const bgGradient = context.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, backgroundColor.start);
  bgGradient.addColorStop(1, backgroundColor.end);
  
  // Create a rounded rectangle for the background
  const cornerRadius = 12;
  
  // Clear the canvas
  context.clearRect(0, 0, width, height);
  
  // Draw the background with rounded corners
  context.beginPath();
  context.moveTo(cornerRadius, 0);
  context.lineTo(width - cornerRadius, 0);
  context.quadraticCurveTo(width, 0, width, cornerRadius);
  context.lineTo(width, height - cornerRadius);
  context.quadraticCurveTo(width, height, width - cornerRadius, height);
  context.lineTo(cornerRadius, height);
  context.quadraticCurveTo(0, height, 0, height - cornerRadius);
  context.lineTo(0, cornerRadius);
  context.quadraticCurveTo(0, 0, cornerRadius, 0);
  context.closePath();
  
  // Fill with gradient
  context.fillStyle = bgGradient;
  context.fill();
  
  // Add a subtle border
  context.strokeStyle = borderColor;
  context.lineWidth = 2;
  context.stroke();
  
  // Add inner glow effect
  const glowWidth = 6;
  context.shadowBlur = glowWidth;
  context.shadowColor = isPreview ? 'rgba(180, 100, 255, 0.6)' : glowColor;
  
  // Set text style
  context.font = `bold ${fontSize}px ${fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Create text gradient
  const textGradient = context.createLinearGradient(0, height/4, 0, height*3/4);
  textGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  textGradient.addColorStop(1, 'rgba(220, 220, 220, 1.0)');
  
  // Draw text with gradient
  context.fillStyle = textGradient;
  context.fillText(text, width / 2, height / 2);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  // Create sprite material
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: opacity,
    sizeAttenuation: true
  });
  
  // Create sprite
  const sprite = new THREE.Sprite(spriteMaterial);
  
  // Set sprite scale based on aspect ratio
  const aspectRatio = width / height;
  sprite.scale.set(aspectRatio * 0.5, 0.5, 1);
  
  return sprite;
}

/**
 * Updates the scale of a label sprite based on camera distance
 * Using a logarithmic scale for better readability at all distances
 */
export function updateLabelScale(
  sprite: THREE.Sprite, 
  camera: THREE.Camera, 
  baseScale = 0.5
): void {
  if (!sprite || !camera) return;
  
  // Get distance from camera to sprite
  const position = new THREE.Vector3();
  sprite.getWorldPosition(position);
  
  const distance = position.distanceTo(camera.position);
  
  // Use logarithmic scaling for better readability at all distances
  // Apply upper and lower bounds to prevent labels from becoming too large or too small
  const minScale = 0.6; // Minimum scale factor
  const maxScale = 1.5; // Maximum scale factor
  
  // Calculate scale factor using logarithmic function with bounds
  const scaleFactor = Math.min(maxScale, Math.max(minScale, 0.8 + Math.log10(1 + distance * 0.3)));
  
  // Get perspective camera FOV if available for additional scaling adjustment
  let fovAdjustment = 1.0;
  if (camera instanceof THREE.PerspectiveCamera && camera.fov) {
    // Wider FOV should make labels slightly larger
    fovAdjustment = 75 / camera.fov; // Normalized to standard 75 degree FOV
    fovAdjustment = Math.min(1.3, Math.max(0.8, fovAdjustment)); // Limit adjustment range
  }
  
  const aspectRatio = sprite.scale.x / sprite.scale.y;
  
  // Apply scale with FOV adjustment
  sprite.scale.set(
    baseScale * aspectRatio * scaleFactor * fovAdjustment,
    baseScale * scaleFactor * fovAdjustment,
    1
  );
}

/**
 * Formats measurement values with appropriate units
 */
export function formatMeasurementLabel(
  value: number, 
  type: 'length' | 'height' | 'area',
  inclination?: number
): string {
  if (type === 'area') {
    // Format area measurements
    if (value < 0.01) {
      return `${(value * 10000).toFixed(2)} cm²`;
    }
    return `${value.toFixed(2)} m²`;
  }
  
  // Format length or height measurements
  const baseLabel = `${value.toFixed(2)} m`;
  
  // Add inclination if provided and significant, always as positive value
  if (inclination !== undefined && Math.abs(inclination) > 1.0) {
    return `${baseLabel} | ${Math.abs(inclination).toFixed(1)}°`;
  }
  
  return baseLabel;
}

/**
 * Creates a label for a measurement
 */
export function createMeasurementLabel(
  text: string,
  position: THREE.Vector3,
  isPreview: boolean = false
): THREE.Sprite {
  // Create the sprite with custom text
  const sprite = createTextSprite({
    text,
    isPreview
  });
  
  // Position the sprite
  sprite.position.copy(position);
  
  // Add slight Y offset to avoid z-fighting with geometry
  sprite.position.y += 0.05;
  
  return sprite;
}

/**
 * Calculate midpoint between two 3D points
 */
export function calculateMidpoint(point1: THREE.Vector3, point2: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    (point1.x + point2.x) / 2,
    (point1.y + point2.y) / 2 + 0.1, // Add offset for visibility
    (point1.z + point2.z) / 2
  );
}

/**
 * Calculate centroid of a polygon
 */
export function calculateCentroid(points: THREE.Vector3[]): THREE.Vector3 {
  if (points.length === 0) return new THREE.Vector3(0, 0, 0);
  
  const centroid = new THREE.Vector3(0, 0, 0);
  points.forEach(p => {
    centroid.add(p);
  });
  
  centroid.divideScalar(points.length);
  centroid.y += 0.1; // Add offset for visibility
  
  return centroid;
}

/**
 * Calculate inclination angle between two points in degrees
 * Always returns a positive value
 */
export function calculateInclination(point1: THREE.Vector3, point2: THREE.Vector3): number {
  // Calculate the horizontal distance
  const horizontalDistance = new THREE.Vector2(
    point2.x - point1.x,
    point2.z - point1.z
  ).length();
  
  // Calculate the vertical distance (absolute value to ensure positive result)
  const verticalDistance = Math.abs(point2.y - point1.y);
  
  // Calculate angle in degrees (always positive)
  const angle = Math.atan2(verticalDistance, horizontalDistance) * (180 / Math.PI);
  
  return Math.abs(angle); // Ensure the result is always positive
}
