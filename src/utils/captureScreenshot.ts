
import * as THREE from 'three';
import html2canvas from 'html2canvas';

/**
 * Captures a screenshot of a specific area measurement in the 3D scene
 */
export const captureAreaMeasurement = async (
  scene: THREE.Scene,
  camera: THREE.Camera, 
  renderer: THREE.WebGLRenderer,
  measurement: any,
  canvas: HTMLCanvasElement,
): Promise<string | null> => {
  if (!measurement || !scene || !camera || !renderer || !canvas) {
    console.error('Missing required parameters for screenshot capture');
    return null;
  }

  try {
    // Store original camera position and orientation
    const originalPosition = camera.position.clone();
    const originalQuaternion = camera.quaternion.clone();
    
    // Calculate the center of the measurement
    const points = measurement.points || [];
    if (points.length < 3) {
      console.error('Area measurement has insufficient points');
      return null;
    }

    // Create a temporary group to calculate the bounding box
    const tempGroup = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    
    const vertices = [];
    for (const point of points) {
      vertices.push(point.x, point.y, point.z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geometry, material);
    tempGroup.add(mesh);
    
    // Calculate bounding box
    const boundingBox = new THREE.Box3().setFromObject(tempGroup);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Position camera to look at the area from above
    const maxDim = Math.max(size.x, size.z) * 1.2; // Give some padding
    const distance = maxDim / Math.tan((camera as THREE.PerspectiveCamera).fov * Math.PI / 360);
    
    // Position camera above the center of the area
    camera.position.set(center.x, center.y + distance, center.z);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Capture the rendered image
    const dataUrl = canvas.toDataURL('image/png');
    
    // Restore original camera position and orientation
    camera.position.copy(originalPosition);
    camera.quaternion.copy(originalQuaternion);
    camera.updateProjectionMatrix();
    
    // Re-render the scene with the original camera
    renderer.render(scene, camera);
    
    return dataUrl;
  } catch (error) {
    console.error('Error capturing area screenshot:', error);
    return null;
  }
};
