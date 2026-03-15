
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
  isPointLabel?: boolean;
}

/**
 * Creates a text sprite for 3D labels with clean white background
 */
export function createTextSprite(config: SpriteConfig): THREE.Sprite {
  const {
    text,
    isPointLabel = false,
    fontSize = isPointLabel ? 28 : 48,
    fontFamily = 'system-ui, -apple-system, sans-serif',
    backgroundColor = {
      start: 'rgba(255, 255, 255, 0.95)',
      end: 'rgba(245, 245, 245, 0.95)'
    },
    textColor = '#1a1a2e',
    borderColor = 'rgba(0, 0, 0, 0.15)',
    isPreview = false
  } = config;

  // Calculate dynamic dimensions based on text content
  const basePadding = isPointLabel ? 12 : 28;
  const minWidth = isPointLabel ? 48 : 140;
  const charWidth = isPointLabel ? 14 : 22;
  
  const calculatedWidth = Math.max(minWidth, text.length * charWidth + (basePadding * 2));
  const width = isPointLabel ? Math.min(calculatedWidth, 96) : Math.min(calculatedWidth, 512);
  const height = isPointLabel ? 48 : 80;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  
  if (!context) {
    return new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }));
  }

  const opacity = isPreview ? 0.9 : 1.0;
  
  // Clear canvas
  context.clearRect(0, 0, width, height);
  
  // Shadow for depth
  context.shadowColor = 'rgba(0, 0, 0, 0.15)';
  context.shadowBlur = 8;
  context.shadowOffsetY = 2;
  
  // Rounded rect background
  const cornerRadius = isPointLabel ? 8 : 10;
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
  
  // Fill with white gradient
  const bgGradient = context.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, backgroundColor.start);
  bgGradient.addColorStop(1, backgroundColor.end);
  context.fillStyle = bgGradient;
  context.fill();
  
  // Subtle border
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.strokeStyle = borderColor;
  context.lineWidth = isPointLabel ? 1 : 1.5;
  context.stroke();
  
  // Text
  context.font = `600 ${fontSize}px ${fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = textColor;
  context.fillText(text, width / 2, height / 2);
  
  // Texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: opacity,
    sizeAttenuation: true,
    depthTest: true,
    depthWrite: false
  });
  
  const sprite = new THREE.Sprite(spriteMaterial);
  
  const aspectRatio = width / height;
  const baseScale = isPointLabel ? 0.25 : 0.4;
  sprite.scale.set(aspectRatio * baseScale, baseScale, 1);
  sprite.renderOrder = 20;
  sprite.userData.isPointLabel = isPointLabel;
  
  return sprite;
}

/**
 * Updates an existing text sprite with new text
 */
export function updateTextSprite(sprite: THREE.Sprite, newText: string): void {
  if (!sprite || !(sprite.material instanceof THREE.SpriteMaterial) || !sprite.material.map) {
    return;
  }
  
  const isPointLabel = sprite.userData?.isPointLabel || false;
  
  const basePadding = isPointLabel ? 12 : 28;
  const minWidth = isPointLabel ? 48 : 140;
  const charWidth = isPointLabel ? 14 : 22;
  
  const calculatedWidth = Math.max(minWidth, newText.length * charWidth + (basePadding * 2));
  const width = isPointLabel ? Math.min(calculatedWidth, 96) : Math.min(calculatedWidth, 512);
  const height = isPointLabel ? 48 : 80;
  
  const texture = sprite.material.map;
  let canvas = texture.image as HTMLCanvasElement;
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  
  canvas.width = width;
  canvas.height = height;
  
  const context = canvas.getContext('2d');
  if (!context) return;
  
  const isPreview = sprite.userData?.isPreview || false;
  
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Shadow
  context.shadowColor = 'rgba(0, 0, 0, 0.15)';
  context.shadowBlur = 8;
  context.shadowOffsetY = 2;
  
  // Rounded rect
  const cornerRadius = isPointLabel ? 8 : 10;
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
  
  const bgGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  bgGradient.addColorStop(1, 'rgba(245, 245, 245, 0.95)');
  context.fillStyle = bgGradient;
  context.fill();
  
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  context.lineWidth = isPointLabel ? 1 : 1.5;
  context.stroke();
  
  const fontSize = isPointLabel ? 28 : 48;
  context.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#1a1a2e';
  context.fillText(newText, canvas.width / 2, canvas.height / 2);
  
  texture.needsUpdate = true;
  
  const aspectRatio = width / height;
  const baseScale = isPointLabel ? 0.25 : 0.4;
  sprite.scale.set(aspectRatio * baseScale, baseScale, 1);
}

/**
 * Updates the scale of a label sprite based on camera distance
 */
export function updateLabelScale(
  sprite: THREE.Sprite, 
  camera: THREE.Camera, 
  baseScale = 0.5
): void {
  if (!sprite || !camera) return;
  
  const isPointLabel = sprite.userData?.isPointLabel || false;
  const isModuleLabel = sprite.userData?.isModuleLabel || false;
  
  let adjustedBaseScale = isPointLabel ? baseScale * 0.6 : baseScale;
  if (isModuleLabel) adjustedBaseScale *= 0.4;
  
  const position = new THREE.Vector3();
  sprite.getWorldPosition(position);
  const distance = position.distanceTo(camera.position);
  
  let fov = 45;
  if ((camera as THREE.PerspectiveCamera).fov) {
    fov = (camera as THREE.PerspectiveCamera).fov;
  }
  
  const isModule = isModuleLabel;
  const minScaleFactor = isPointLabel ? 0.4 : (isModule ? 0.25 : 0.3);
  const maxScaleFactor = isPointLabel ? 1.5 : (isModule ? 0.9 : 2.0);
  const logBase = 4;
  const scaleFactor = Math.min(
    maxScaleFactor,
    Math.max(
      minScaleFactor,
      0.6 + Math.log(Math.max(1, distance)) / Math.log(logBase) * 0.4
    )
  );
  
  const fovCompensation = Math.min(1.4, Math.max(0.7, fov / 40));
  const aspectRatio = sprite.scale.x / sprite.scale.y;
  const finalScale = adjustedBaseScale * scaleFactor / fovCompensation;
  
  sprite.scale.set(finalScale * aspectRatio, finalScale, 1);
  
  const minSize = isPointLabel ? 0.04 : (isModule ? 0.03 : 0.08);
  if (sprite.scale.y < minSize) {
    const adjustedAspectRatio = sprite.scale.x / sprite.scale.y;
    sprite.scale.set(minSize * adjustedAspectRatio, minSize, 1);
  }
  
  if (sprite.material instanceof THREE.SpriteMaterial) {
    sprite.material.opacity = 1.0;
  }
}

/**
 * Formats measurement values with appropriate units
 * @param showInclination - Whether to show inclination angle (default true for angles > 5°)
 */
export function formatMeasurementLabel(
  value: number, 
  type: 'length' | 'height' | 'area' | 'solar' | 'skylight' | 'chimney' | 'vent' | 'hook' | 'other' | string,
  inclination?: number,
  showInclination?: boolean
): string {
  if (type === 'vent' || type === 'hook' || type === 'other') {
    return '';
  }
  
  if (type === 'area' || type === 'solar' || type === 'skylight' || type === 'chimney') {
    if (value < 0.01) {
      return `${(value * 10000).toFixed(2)} cm²`;
    }
    return `${value.toFixed(2)} m²`;
  }
  
  const baseLabel = `${value.toFixed(2)} m`;
  
  // Check localStorage preference for inclination display (default: true)
  const shouldShowInclination = showInclination ?? getInclinationPreference();
  
  // Show inclination if enabled and angle > 5°
  if (shouldShowInclination && inclination !== undefined && Math.abs(inclination) > 5.0) {
    return `${baseLabel} | ${Math.abs(inclination).toFixed(1)}°`;
  }
  
  return baseLabel;
}

/**
 * Get inclination display preference from localStorage
 */
export function getInclinationPreference(): boolean {
  try {
    const pref = localStorage.getItem('showInclination');
    return pref !== 'false'; // default to true
  } catch {
    return true;
  }
}

/**
 * Set inclination display preference
 */
export function setInclinationPreference(show: boolean): void {
  try {
    localStorage.setItem('showInclination', String(show));
  } catch {}
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
  if (type === 'vent' || type === 'hook' || type === 'other') {
    const iconText = type === 'vent' ? '⚪' : type === 'hook' ? '⚓' : '✖';
    const sprite = createTextSprite({ text: iconText, isPreview, isPointLabel });
    sprite.position.copy(position);
    sprite.position.y += 0.2;
    return sprite;
  }
  
  const sprite = createTextSprite({ text, isPreview, isPointLabel });
  sprite.position.copy(position);
  sprite.position.y += 0.2;
  return sprite;
}

/**
 * Calculate midpoint between two 3D points
 */
export function calculateMidpoint(point1: THREE.Vector3, point2: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    (point1.x + point2.x) / 2,
    (point1.y + point2.y) / 2 + 0.3,
    (point1.z + point2.z) / 2
  );
}

/**
 * Calculate centroid of a polygon
 */
export function calculateCentroid(points: THREE.Vector3[]): THREE.Vector3 {
  if (points.length === 0) return new THREE.Vector3(0, 0, 0);
  
  const centroid = new THREE.Vector3(0, 0, 0);
  points.forEach(p => { centroid.add(p); });
  centroid.divideScalar(points.length);
  centroid.y += 0.3;
  return centroid;
}

/**
 * Calculate inclination angle between two points in degrees
 */
export function calculateInclination(point1: THREE.Vector3, point2: THREE.Vector3): number {
  const horizontalDistance = new THREE.Vector2(
    point2.x - point1.x,
    point2.z - point1.z
  ).length();
  const verticalDistance = Math.abs(point2.y - point1.y);
  return Math.atan2(verticalDistance, horizontalDistance) * (180 / Math.PI);
}
