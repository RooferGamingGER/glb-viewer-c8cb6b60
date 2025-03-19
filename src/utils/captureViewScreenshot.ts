
import * as THREE from 'three';

/**
 * Captures a screenshot of the current camera view
 * @param renderer The WebGL renderer
 * @param scene The current scene
 * @param camera The camera to use for capturing
 * @returns Base64 data URL of the screenshot
 */
export const captureViewScreenshot = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
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
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Capture the rendered image
    const dataUrl = renderer.domElement.toDataURL('image/png');
    
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
