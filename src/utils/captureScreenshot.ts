
import * as THREE from 'three';
import html2canvas from 'html2canvas';
import { renderPolygon2D } from './renderPolygon2D';
import { Measurement } from '../types/measurements';

/**
 * Captures a screenshot of a specific area measurement in the 3D scene
 * with the camera positioned parallel to the measured surface
 */
export const captureAreaMeasurement = async (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  measurement: Measurement,
  canvas: HTMLCanvasElement,
  use2DRendering: boolean = true
): Promise<string | null> => {
  if (!measurement || !scene || !camera || !renderer || !canvas) {
    console.error('Missing required parameters for screenshot capture');
    return null;
  }

  // If 2D rendering is enabled, use that instead of 3D screenshot
  if (use2DRendering) {
    return renderPolygon2D(measurement);
  }

  try {
    // Store original camera position and orientation
    const originalPosition = camera.position.clone();
    const originalQuaternion = camera.quaternion.clone();
    const originalFov = camera.fov;
    const originalNear = camera.near;
    const originalFar = camera.far;
    
    // Store original renderer settings
    const originalClearColor = renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = renderer.getClearAlpha();
    const originalOutputEncoding = renderer.outputEncoding;
    const originalToneMapping = renderer.toneMapping;
    const originalToneMappingExposure = renderer.toneMappingExposure;
    
    // Calculate the center of the measurement
    const points = measurement.points || [];
    if (points.length < 3) {
      console.error('Area measurement has insufficient points');
      return null;
    }

    // Calculate the center point of the area
    const center = new THREE.Vector3();
    for (const point of points) {
      center.add(new THREE.Vector3(point.x, point.y, point.z));
    }
    center.divideScalar(points.length);
    
    // Calculate the normal vector of the plane defined by the points
    // We'll use the first three points to define a plane
    const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
    const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
    const p3 = new THREE.Vector3(points[2].x, points[2].y, points[2].z);
    
    // Calculate two vectors on the plane
    const v1 = new THREE.Vector3().subVectors(p2, p1);
    const v2 = new THREE.Vector3().subVectors(p3, p1);
    
    // The normal is the cross product of these vectors
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    
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
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Find the max dimension of the area
    const maxDim = Math.max(size.x, size.y, size.z) * 1.5; // Increased padding for better view
    
    // Calculate distance needed to fit the area in the camera's field of view
    // Adjust for the camera's field of view
    const fovRadians = (45 * Math.PI) / 180; // Use a fixed 45 degree FOV for consistency
    const distance = maxDim / (1.7 * Math.tan(fovRadians / 2)); // Adjusted for better framing
    
    // Determine up vector for camera orientation
    // Default up is world up
    let upVector = new THREE.Vector3(0, 1, 0);
    
    // If the normal is mostly horizontal, we need a different up vector
    if (Math.abs(normal.dot(upVector)) > 0.9) {
      upVector = new THREE.Vector3(1, 0, 0); // Use right direction as up
    }
    
    // Position the camera above the area, looking down at it
    // We want more of a top-down view for roof measurements
    // Calculate position based on normal, but bias towards top-down view
    const topDownBias = 0.7; // 70% bias towards top-down view
    const cameraPosition = new THREE.Vector3();
    
    // Blend between pure normal direction and world-up direction
    const blendedDirection = new THREE.Vector3()
      .copy(normal)
      .multiplyScalar(1 - topDownBias)
      .add(new THREE.Vector3(0, 1, 0).multiplyScalar(topDownBias))
      .normalize();
    
    cameraPosition.copy(center).add(blendedDirection.multiplyScalar(distance));
    
    // Set the camera properties
    camera.position.copy(cameraPosition);
    camera.fov = 45; // Consistent FOV
    camera.near = 0.1; // Closer near plane
    camera.far = distance * 4; // Ensure far plane encompasses the scene
    camera.updateProjectionMatrix();
    
    // Create a camera orientation looking at the center
    camera.lookAt(center);
    
    // Enhance renderer settings for better quality screenshot
    renderer.setClearColor(0xffffff, 1); // White background
    renderer.outputEncoding = THREE.sRGBEncoding; // Better color encoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping
    renderer.toneMappingExposure = 1.2; // Slightly brighter
    
    // Make sure all materials are properly visible
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        // Check if material is an array
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => {
            if (mat.opacity !== undefined) mat.opacity = 1.0;
            if (mat.transparent !== undefined) mat.transparent = false;
            if (mat.depthTest !== undefined) mat.depthTest = true;
            mat.needsUpdate = true;
          });
        } else {
          // Single material
          if (object.material.opacity !== undefined) object.material.opacity = 1.0;
          if (object.material.transparent !== undefined) object.material.transparent = false;
          if (object.material.depthTest !== undefined) object.material.depthTest = true;
          object.material.needsUpdate = true;
        }
      }
    });
    
    // Render the scene to capture the screenshot
    renderer.render(scene, camera);
    
    // Capture the rendered image
    const dataUrl = canvas.toDataURL('image/png');
    
    // Restore original camera settings
    camera.position.copy(originalPosition);
    camera.quaternion.copy(originalQuaternion);
    camera.fov = originalFov;
    camera.near = originalNear;
    camera.far = originalFar;
    camera.updateProjectionMatrix();
    
    // Restore original renderer settings
    renderer.setClearColor(originalClearColor, originalClearAlpha);
    renderer.outputEncoding = originalOutputEncoding;
    renderer.toneMapping = originalToneMapping;
    renderer.toneMappingExposure = originalToneMappingExposure;
    
    // Re-render the scene with the original camera settings
    renderer.render(scene, camera);
    
    return dataUrl;
  } catch (error) {
    console.error('Error capturing area screenshot:', error);
    
    // If there's an error, try to restore the camera to prevent bad states
    if (camera) {
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    
    return null;
  }
};
