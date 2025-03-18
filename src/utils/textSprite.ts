
import * as THREE from 'three';

export interface SpriteConfig {
  text: string;
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
  isPointLabel?: boolean; // Identifies point labels (P1, P2, etc.)
}

/**
 * Creates a text sprite for 3D labels with optimal sizing
 */
export function createTextSprite(config: SpriteConfig): THREE.Sprite {
  const {
    text,
    isPointLabel = false,
    fontSize = isPointLabel ? 24 : 48, // Smaller font for point labels
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

  // Calculate dynamic dimensions based on text content
  const basePadding = isPointLabel ? 10 : 24;
  const minWidth = isPointLabel ? 40 : 120; // Minimum width for any label
  const charWidth = isPointLabel ? 12 : 20; // Approximate width per character
  
  // Calculate width based on text length with min/max constraints
  const calculatedWidth = Math.max(minWidth, text.length * charWidth + (basePadding * 2));
  const width = isPointLabel ? Math.min(calculatedWidth, 80) : Math.min(calculatedWidth, 512);
  
  // Calculate height - smaller for point labels
  const height = isPointLabel ? 40 : 128; 

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
  const cornerRadius = isPointLabel ? 6 : 12; // Smaller corner radius for point labels
  
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
  context.lineWidth = isPointLabel ? 1 : 2; // Thinner border for point labels
  context.stroke();
  
  // Add inner glow effect - reduced for point labels
  const glowWidth = isPointLabel ? 2 : 6;
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
  const baseScale = isPointLabel ? 0.3 : 0.5;
  sprite.scale.set(aspectRatio * baseScale, baseScale, 1);
  
  // Ensure labels are rendered on top
  sprite.renderOrder = 100;
  
  // Store if this is a point label in userData
  sprite.userData.isPointLabel = isPointLabel;
  
  return sprite;
}

/**
 * Updates an existing text sprite with new text
 */
export function updateTextSprite(sprite: THREE.Sprite, newText: string): void {
  if (!sprite || !(sprite.material instanceof THREE.SpriteMaterial) || !sprite.material.map) {
    console.error('Invalid sprite or material for update');
    return;
  }
  
  // Get if this is a point label from user data to determine sizing
  const isPointLabel = sprite.userData?.isPointLabel || false;
  
  // Calculate dynamic dimensions based on text content
  const basePadding = isPointLabel ? 10 : 24;
  const minWidth = isPointLabel ? 40 : 120;
  const charWidth = isPointLabel ? 12 : 20;
  
  // Calculate width based on text length with min/max constraints
  const calculatedWidth = Math.max(minWidth, newText.length * charWidth + (basePadding * 2));
  const width = isPointLabel ? Math.min(calculatedWidth, 80) : Math.min(calculatedWidth, 512);
  
  // Calculate height - smaller for point labels
  const height = isPointLabel ? 40 : 128;
  
  // Get the original texture
  const texture = sprite.material.map;
  
  // Get the canvas from the texture (if it doesn't exist, we'll create a new one)
  let canvas = texture.image as HTMLCanvasElement;
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  
  // Update canvas dimensions
  canvas.width = width;
  canvas.height = height;
  
  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Could not get canvas context');
    return;
  }
  
  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Get original user data to determine if this is a preview
  const isPreview = sprite.userData?.isPreview || false;
  
  // Background with gradient
  const bgGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  bgGradient.addColorStop(0, 'rgba(41, 50, 65, 0.95)');
  bgGradient.addColorStop(1, 'rgba(27, 32, 43, 0.95)');
  
  // Create a rounded rectangle for the background
  const cornerRadius = isPointLabel ? 6 : 12;
  
  // Draw the background with rounded corners
  context.beginPath();
  context.moveTo(cornerRadius, 0);
  context.lineTo(canvas.width - cornerRadius, 0);
  context.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
  context.lineTo(canvas.width, canvas.height - cornerRadius);
  context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
  context.lineTo(cornerRadius, canvas.height);
  context.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
  context.lineTo(0, cornerRadius);
  context.quadraticCurveTo(0, 0, cornerRadius, 0);
  context.closePath();
  
  // Fill with gradient
  context.fillStyle = bgGradient;
  context.fill();
  
  // Add a subtle border
  context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  context.lineWidth = isPointLabel ? 1 : 2;
  context.stroke();
  
  // Add inner glow effect
  const glowWidth = isPointLabel ? 2 : 6;
  context.shadowBlur = glowWidth;
  context.shadowColor = isPreview ? 'rgba(180, 100, 255, 0.6)' : 'rgba(45, 125, 255, 0.5)';
  
  // Set text style
  const fontSize = isPointLabel ? 24 : 48;
  context.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Create text gradient
  const textGradient = context.createLinearGradient(0, canvas.height/4, 0, canvas.height*3/4);
  textGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  textGradient.addColorStop(1, 'rgba(220, 220, 220, 1.0)');
  
  // Draw text with gradient
  context.fillStyle = textGradient;
  context.fillText(newText, canvas.width / 2, canvas.height / 2);
  
  // Update the texture
  texture.needsUpdate = true;
  
  // Update the sprite scale based on new dimensions
  const aspectRatio = width / height;
  const baseScale = isPointLabel ? 0.3 : 0.5;
  sprite.scale.set(aspectRatio * baseScale, baseScale, 1);
}

/**
 * Updates the scale of a label sprite based on camera distance
 * with improved scaling for better readability at different zoom levels
 */
export function updateLabelScale(
  sprite: THREE.Sprite, 
  camera: THREE.Camera, 
  baseScale = 0.5
): void {
  if (!sprite || !camera) return;
  
  // Get if this is a point label from user data to adjust scaling
  const isPointLabel = sprite.userData?.isPointLabel || false;
  const adjustedBaseScale = isPointLabel ? baseScale * 0.6 : baseScale;
  
  // Get distance from camera to sprite
  const position = new THREE.Vector3();
  sprite.getWorldPosition(position);
  
  const distance = position.distanceTo(camera.position);
  
  // Get the camera's field of view for better scaling calculations
  let fov = 45;  // Default FOV
  if ((camera as THREE.PerspectiveCamera).fov) {
    fov = (camera as THREE.PerspectiveCamera).fov;
  }
  
  // Calculate logarithmic scale factor with min/max bounds
  // This gives better scaling across a wide range of distances
  const minScaleFactor = isPointLabel ? 0.4 : 0.3;  // Smaller minimum for point labels
  const maxScaleFactor = isPointLabel ? 1.5 : 2.0;  // Lower maximum for point labels
  const logBase = 4;           // Higher log base for more aggressive scaling
  const scaleFactor = Math.min(
    maxScaleFactor,
    Math.max(
      minScaleFactor,
      0.6 + Math.log(Math.max(1, distance)) / Math.log(logBase) * 0.4
    )
  );
  
  // Apply FOV compensation - smaller FOV (zoomed in) = smaller labels
  const fovCompensation = Math.min(1.4, Math.max(0.7, fov / 40));
  
  // Get aspect ratio from sprite's current scale
  const aspectRatio = sprite.scale.x / sprite.scale.y;
  
  // Calculate final scale values
  const finalScale = adjustedBaseScale * scaleFactor / fovCompensation;
  
  // Apply scale
  sprite.scale.set(
    finalScale * aspectRatio,
    finalScale,
    1
  );
  
  // Apply a minimum size for text to remain readable at far distances
  const minSize = isPointLabel ? 0.04 : 0.08;
  if (sprite.scale.y < minSize) {
    const adjustedAspectRatio = sprite.scale.x / sprite.scale.y;
    sprite.scale.set(
      minSize * adjustedAspectRatio,
      minSize,
      1
    );
  }
  
  // Ensure sprite is always visible by setting opacity to 1
  if (sprite.material instanceof THREE.SpriteMaterial) {
    sprite.material.opacity = 1.0;
  }
}

/**
 * Formats measurement values with appropriate units
 */
export function formatMeasurementLabel(
  value: number, 
  type: 'length' | 'height' | 'area' | 'solar' | 'skylight' | 'chimney' | 'vent' | 'hook' | 'other' | string,
  inclination?: number
): string {
  // For penetration elements, we only show icons, not text
  if (type === 'vent' || type === 'hook' || type === 'other') {
    return '';
  }
  
  if (type === 'area' || type === 'solar' || type === 'skylight' || type === 'chimney') {
    // Format area measurements
    if (value < 0.01) {
      return `${(value * 10000).toFixed(2)} cm²`;
    }
    return `${value.toFixed(2)} m²`;
  }
  
  // Format length or height measurements
  const baseLabel = `${value.toFixed(2)} m`;
  
  // Add inclination if provided and significant - always use absolute value
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
  isPreview: boolean = false,
  type?: string,
  isPointLabel: boolean = false
): THREE.Sprite {
  // For penetration elements, we might want to create a symbol-only label
  if (type === 'vent' || type === 'hook' || type === 'other') {
    // Create the sprite with a special icon format
    const iconText = type === 'vent' ? '⚪' : 
                     type === 'hook' ? '⚓' : '✖';
    
    const sprite = createTextSprite({
      text: iconText,
      isPreview,
      isPointLabel
    });
    
    // Position the sprite
    sprite.position.copy(position);
    
    // Add larger Y offset to float higher above the model
    sprite.position.y += 0.2; // Increased from 0.05 to 0.2
    
    return sprite;
  }
  
  // Create the sprite with custom text for other measurement types
  const sprite = createTextSprite({
    text,
    isPreview,
    isPointLabel
  });
  
  // Position the sprite
  sprite.position.copy(position);
  
  // Add larger Y offset to float higher above the model
  sprite.position.y += 0.2; // Increased from 0.05 to 0.2
  
  return sprite;
}

/**
 * Calculate midpoint between two 3D points
 */
export function calculateMidpoint(point1: THREE.Vector3, point2: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    (point1.x + point2.x) / 2,
    (point1.y + point2.y) / 2 + 0.3, // Increased from 0.1 to 0.3
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
  centroid.y += 0.3; // Increased from 0.1 to 0.3
  
  return centroid;
}

/**
 * Calculate inclination angle between two points in degrees
 */
export function calculateInclination(point1: THREE.Vector3, point2: THREE.Vector3): number {
  // Calculate the horizontal distance
  const horizontalDistance = new THREE.Vector2(
    point2.x - point1.x,
    point2.z - point1.z
  ).length();
  
  // Calculate the vertical distance
  const verticalDistance = Math.abs(point2.y - point1.y);
  
  // Calculate angle in degrees
  const angle = Math.atan2(verticalDistance, horizontalDistance) * (180 / Math.PI);
  
  return angle;
}
