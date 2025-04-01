
import * as THREE from 'three';

/**
 * Captures a screenshot of the current camera view
 * @param renderer The WebGL renderer
 * @param scene The current scene
 * @param camera The camera to use for capturing
 * @param enhanceText Whether to enhance text visibility for exports
 * @returns Base64 data URL of the screenshot
 */
export const captureViewScreenshot = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  enhanceText: boolean = false
): string | null => {
  if (!renderer || !scene || !camera) {
    console.error('Missing required parameters for screenshot capture');
    return null;
  }

  try {
    // Store original renderer settings
    const originalClearColor = renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = renderer.getClearAlpha();
    const originalColorSpace = renderer.outputColorSpace;
    const originalToneMapping = renderer.toneMapping;
    const originalToneMappingExposure = renderer.toneMappingExposure;
    
    // Enhance renderer settings for better quality screenshot
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    // If enhanceText is true, find any text sprites in the scene and make them larger
    if (enhanceText) {
      scene.traverse((object) => {
        if (object instanceof THREE.Sprite && object.userData && object.userData.isLabel) {
          // Store original scale
          if (!object.userData.originalScale) {
            object.userData.originalScale = object.scale.clone();
          }
          
          // Increase scale for text readability
          object.scale.multiplyScalar(1.5);
        }
      });
    }
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Capture the rendered image
    const dataUrl = renderer.domElement.toDataURL('image/png');
    
    // Restore original scales if we enhanced text
    if (enhanceText) {
      scene.traverse((object) => {
        if (object instanceof THREE.Sprite && object.userData && object.userData.isLabel && object.userData.originalScale) {
          object.scale.copy(object.userData.originalScale);
        }
      });
    }
    
    // Restore original renderer settings
    renderer.setClearColor(originalClearColor, originalClearAlpha);
    renderer.outputColorSpace = originalColorSpace;
    renderer.toneMapping = originalToneMapping;
    renderer.toneMappingExposure = originalToneMappingExposure;
    
    // Re-render the scene with the original settings
    renderer.render(scene, camera);
    
    return dataUrl;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
};
