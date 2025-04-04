import * as THREE from 'three';
import { Point, Measurement, Segment } from '@/types/measurements';
import { nanoid } from 'nanoid';

/**
 * Function to render a 2D roof plan from 3D measurement data
 * @param measurements - Array of measurement objects
 * @param width - Width of the roof plan
 * @param height - Height of the roof plan
 * @returns A data URL containing the rendered roof plan
 */
export const renderRoofPlan = (measurements: Measurement[], width: number, height: number): string => {
  // Create a scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff); // White background

  // Create an orthographic camera
  const camera = new THREE.OrthographicCamera(
    -width / 2, width / 2, height / 2, -height / 2, 1, 1000
  );
  camera.position.z = 5; // Position the camera
  scene.add(camera);

  // Create a renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  // Function to convert 3D point to 2D
  const to2D = (point: Point) => new THREE.Vector2(point.x, point.z);

  // Render measurements as lines
  measurements.forEach(measurement => {
    if (measurement.points && measurement.points.length > 1) {
      const material = new THREE.LineBasicMaterial({ color: 0x000000 }); // Black lines
      const geometry = new THREE.BufferGeometry();
      const points = measurement.points.map(p => new THREE.Vector3(p.x, 0, p.z));
      geometry.setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    }
  });

  // Render segments as lines
  measurements.forEach(measurement => {
    if (measurement.segments) {
      measurement.segments.forEach(segment => {
        const material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue lines
        const geometry = new THREE.BufferGeometry();
        const points = segment.points.map(p => new THREE.Vector3(p.x, 0, p.z));
        geometry.setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      });
    }
  });

  // Render points as circles
  measurements.forEach(measurement => {
    if (measurement.points) {
      measurement.points.forEach(point => {
        const geometry = new THREE.CircleGeometry(0.5, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red circles
        const circle = new THREE.Mesh(geometry, material);
        circle.position.set(point.x, 0, point.z);
        scene.add(circle);
      });
    }
  });

  // Render the scene to a data URL
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL();

  // Clean up resources
  renderer.dispose();

  return dataURL;
};
