
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
    const maxDim = Math.max(size.x, size.y, size.z) * 1.2; // Add padding
    
    // Calculate distance needed to fit the area in the camera's field of view
    // Adjust for the camera's field of view
    const fovRadians = (camera.fov * Math.PI) / 180;
    const distance = maxDim / (2 * Math.tan(fovRadians / 2)) * 1.5; // Extra multiplier for better framing
    
    // Set up camera position perpendicular to the surface
    // Position the camera along the normal at the calculated distance
    const cameraPosition = new THREE.Vector3()
      .copy(center)
      .add(normal.clone().multiplyScalar(distance));
    
    // Set the camera position
    camera.position.copy(cameraPosition);
    
    // Determine up vector for camera orientation
    // We want the camera to be oriented with a sensible "up" direction
    // If the normal is mostly pointing up or down, we use a different up vector
    let upVector = new THREE.Vector3(0, 1, 0); // Default up is world up
    
    // If the normal is too close to the up vector, use a different up vector
    if (Math.abs(normal.dot(upVector)) > 0.9) {
      upVector = new THREE.Vector3(0, 0, 1); // Use forward direction as up
    }
    
    // Create a camera orientation looking at the center from our new position
    camera.lookAt(center);
    
    // Make sure we have the right orientation (prevent upside-down views)
    // Cross the normal with our up vector to get a perpendicular vector
    const right = new THREE.Vector3().crossVectors(normal, upVector).normalize();
    // Now cross the normal with the right vector to get the true up vector for this orientation
    const trueUp = new THREE.Vector3().crossVectors(right, normal).normalize();
    
    // Set the camera orientation using lookAt, but with our calculated up vector
    const lookAtMatrix = new THREE.Matrix4().lookAt(cameraPosition, center, trueUp);
    camera.quaternion.setFromRotationMatrix(lookAtMatrix);
    
    // Temporarily adjust FOV to ensure we see everything
    camera.fov = Math.min(90, Math.max(30, camera.fov * 1.1)); // Slightly wider FOV for clearer view
    camera.updateProjectionMatrix();
    
    // Render the scene to capture the screenshot
    renderer.render(scene, camera);
    
    // Capture the rendered image
    const dataUrl = canvas.toDataURL('image/png');
    
    // Restore original camera settings
    camera.position.copy(originalPosition);
    camera.quaternion.copy(originalQuaternion);
    camera.fov = originalFov;
    camera.updateProjectionMatrix();
    
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
