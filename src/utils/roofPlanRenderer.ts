
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';

// Create a combined roof plan from measurements
export const createCombinedRoofPlan = (
  measurements: Measurement[],
  width: number = 1200,
  height: number = 900,
  padding: number = 0.1, // Padding as a percentage of dimensions
  renderLabels: boolean = true
): string | null => {
  try {
    // Create a scene for rendering
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Create a camera
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

    // Create a renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    
    // Calculate bounding box of all measurements
    const bbox = calculateBoundingBox(measurements);
    
    // Position camera to view entire scene
    setupCamera(camera, bbox, padding);
    
    // Add measurements to scene
    addMeasurementsToScene(scene, measurements);
    
    // Add appropriate lighting
    addLighting(scene);
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Convert to PNG data URL
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    // Clean up
    renderer.dispose();
    
    return dataURL;
  } catch (error) {
    console.error('Error generating roof plan:', error);
    return null;
  }
};

// Calculate bounding box of all measurements
const calculateBoundingBox = (measurements: Measurement[]) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  
  let hasPoints = false;
  
  measurements.forEach(measurement => {
    if (!measurement.points || measurement.points.length === 0) return;
    
    measurement.points.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
      
      hasPoints = true;
    });
  });
  
  if (!hasPoints) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };
  }
  
  return { minX, maxX, minY, maxY, minZ, maxZ };
};

// Set up camera to view all measurements
const setupCamera = (
  camera: THREE.OrthographicCamera,
  bbox: { minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number },
  padding: number
) => {
  const width = (bbox.maxX - bbox.minX) * (1 + padding * 2);
  const height = (bbox.maxZ - bbox.minZ) * (1 + padding * 2);
  
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerZ = (bbox.minZ + bbox.maxZ) / 2;
  
  // Position camera looking down at the roof
  camera.position.set(centerX, bbox.maxY + 10, centerZ);
  camera.lookAt(centerX, 0, centerZ);
  
  // Set the orthographic frustum
  const aspect = width / height;
  if (aspect > 1) {
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = width / 2 / aspect;
    camera.bottom = -width / 2 / aspect;
  } else {
    camera.left = -height / 2 * aspect;
    camera.right = height / 2 * aspect;
    camera.top = height / 2;
    camera.bottom = -height / 2;
  }
  
  camera.updateProjectionMatrix();
};

// Add measurements to the scene
const addMeasurementsToScene = (scene: THREE.Scene, measurements: Measurement[]) => {
  // Add areas first (as base)
  measurements
    .filter(m => m.type === 'area' && m.visible !== false)
    .forEach(m => addAreaToScene(scene, m));
  
  // Add solar panels
  measurements
    .filter(m => m.type === 'solar' && m.visible !== false)
    .forEach(m => addAreaToScene(scene, m, 0xff00ff));
  
  // Add skylights
  measurements
    .filter(m => m.type === 'skylight' && m.visible !== false)
    .forEach(m => addAreaToScene(scene, m, 0x00ffff));
  
  // Add chimneys
  measurements
    .filter(m => m.type === 'chimney' && m.visible !== false)
    .forEach(m => addAreaToScene(scene, m, 0x8b4513));
  
  // Add other areas
  measurements
    .filter(m => ['vent', 'hook', 'other'].includes(m.type) && m.visible !== false)
    .forEach(m => addAreaToScene(scene, m, 0xff5500));
  
  // Add length measurements
  measurements
    .filter(m => m.type === 'length' && m.visible !== false)
    .forEach(m => addLineToScene(scene, m));
};

// Add an area measurement to the scene
const addAreaToScene = (scene: THREE.Scene, measurement: Measurement, color?: number) => {
  if (!measurement.points || measurement.points.length < 3) return;
  
  const { points } = measurement;
  
  // Create shape
  const shape = new THREE.Shape();
  
  // Project points to XZ plane for top-down view
  shape.moveTo(points[0].x, points[0].z);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].z);
  }
  shape.closePath();
  
  // Create geometry
  const geometry = new THREE.ShapeGeometry(shape);
  
  // Create material
  const material = new THREE.MeshLambertMaterial({
    color: color || 0xcccccc,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  
  // Position the mesh
  // Find average Y value
  let avgY = 0;
  points.forEach(p => { avgY += p.y });
  avgY /= points.length;
  
  mesh.position.y = avgY;
  mesh.rotation.x = Math.PI / 2;
  
  scene.add(mesh);
  
  // Add outline
  const outlineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x000000,
    linewidth: 2 
  });
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1.x, avgY + 0.01, p1.z),
      new THREE.Vector3(p2.x, avgY + 0.01, p2.z)
    ]);
    
    const line = new THREE.Line(lineGeometry, outlineMaterial);
    scene.add(line);
  }
};

// Add a line measurement to the scene
const addLineToScene = (scene: THREE.Scene, measurement: Measurement) => {
  if (!measurement.points || measurement.points.length < 2) return;
  
  const p1 = measurement.points[0];
  const p2 = measurement.points[1];
  
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x0000ff,
    linewidth: 2 
  });
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p1.x, p1.y, p1.z),
    new THREE.Vector3(p2.x, p2.y, p2.z)
  ]);
  
  const line = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(line);
};

// Add lighting to the scene
const addLighting = (scene: THREE.Scene) => {
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  
  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 100, 0);
  directionalLight.lookAt(0, 0, 0);
  scene.add(directionalLight);
};
