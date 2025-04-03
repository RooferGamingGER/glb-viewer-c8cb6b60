
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

/**
 * Captures a top-down view of the model for the cover page
 * @param renderer The WebGL renderer
 * @param scene The current scene
 * @param originalCamera The original camera (to restore after capture)
 * @returns Base64 data URL of the screenshot
 */
export const captureTopDownView = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  originalCamera: THREE.Camera
): string | null => {
  if (!renderer || !scene) {
    console.error('Missing required parameters for top-down screenshot');
    return null;
  }

  try {
    // Store original renderer settings
    const originalClearColor = renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = renderer.getClearAlpha();
    const originalSize = {
      width: renderer.domElement.width,
      height: renderer.domElement.height
    };
    
    // Create temporary orthographic camera for top-down view
    const boundingBox = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    const aspectRatio = originalSize.width / originalSize.height;
    const width = Math.max(size.x, size.z) * 1.2; // Add some padding
    const height = width / aspectRatio;
    
    const topCamera = new THREE.OrthographicCamera(
      -width / 2, width / 2, 
      height / 2, -height / 2,
      0.1, 1000
    );
    
    // Position camera above the scene looking down
    topCamera.position.set(center.x, center.y + size.y * 2, center.z);
    topCamera.lookAt(center);
    topCamera.up.set(0, 0, 1); // Set "up" direction to Z-axis for better orientation

    // Higher resolution for better quality
    renderer.setSize(1024, 1024);
    
    // Set white background for cleaner look
    renderer.setClearColor(0xffffff, 1);
    
    // Render the scene from top-down
    renderer.render(scene, topCamera);
    
    // Capture the rendered image
    const dataUrl = renderer.domElement.toDataURL('image/png');
    
    // Restore original settings
    renderer.setClearColor(originalClearColor, originalClearAlpha);
    renderer.setSize(originalSize.width, originalSize.height);
    
    // Re-render the scene with the original settings
    renderer.render(scene, originalCamera);
    
    return dataUrl;
  } catch (error) {
    console.error('Error capturing top-down screenshot:', error);
    return null;
  }
};
