import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Measurement, Point } from '@/types/measurements';
import { triangulate3D, calculate3DTriangleArea } from '@/utils/triangulation';

// Singleton pattern for DRACOLoader - better performance by reusing
let dracoLoaderInstance: DRACOLoader | null = null;
const getDracoLoader = () => {
  if (!dracoLoaderInstance) {
    const loader = new DRACOLoader();
    // Use local Draco decoder if available, otherwise fall back to CDN
    loader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
    
    // Configure decoder
    loader.setDecoderConfig({
      type: 'js', // Use JS decoder as fallback for compatibility
    });
    
    // Optimize worker load
    // For large models, use more workers to speed up decoding
    loader.setWorkerLimit(Math.min(4, navigator.hardwareConcurrency || 4)); 
    
    dracoLoaderInstance = loader;
  }
  return dracoLoaderInstance;
};

// Create a throttled progress handler to avoid too many updates
const createProgressHandler = (onProgress?: (progress: number) => void) => {
  let lastReported = 0;
  const minProgressStep = 5; // Report every 5% change
  
  return (event: ProgressEvent) => {
    if (!onProgress) return;
    
    const progress = Math.round((event.loaded / event.total) * 100);
    if (progress >= lastReported + minProgressStep || progress === 100) {
      onProgress(progress);
      lastReported = progress;
    }
  };
};

export const rotateAndExportModel = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      try {
        // Initialize loaders
        const dracoLoader = getDracoLoader();
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        
        // Create a scene to handle the model
        const scene = new THREE.Scene();
        
        const progressHandler = createProgressHandler(onProgress);
        
        loader.parse(arrayBuffer, '', 
          // Success callback
          (gltf) => {
            try {
              // Add the model to our scene
              scene.add(gltf.scene);
              
              // Rotate the entire scene 90 degrees around X axis
              gltf.scene.rotation.x = -Math.PI / 2;
              
              // Update matrix for correct export
              gltf.scene.updateMatrixWorld(true);
              
              const exporter = new GLTFExporter();
              exporter.parse(
                scene,
                (result) => {
                  try {
                    const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
                    const url = URL.createObjectURL(blob);
                    
                    // Clean up (don't dispose the singleton dracoLoader)
                    scene.clear();
                    
                    resolve(url);
                  } catch (exportError) {
                    reject(new Error(`Error creating final model blob: ${(exportError instanceof Error) ? exportError.message : String(exportError)}`));
                  }
                },
                (error) => {
                  scene.clear();
                  reject(new Error(`Error exporting model: ${(error instanceof Error) ? error.message : String(error)}`));
                },
                { binary: true }
              );
            } catch (sceneError) {
              scene.clear();
              reject(new Error(`Error processing model scene: ${(sceneError as Error).message || sceneError}`));
            }
          },
          // Error callback - Fix the type conversion issue
          (error) => {
            // Properly handle the error regardless of its type
            const errorMessage = error instanceof Error ? error.message : 
                                typeof error === 'object' && error !== null && 'message' in error ? 
                                String(error.message) : String(error);
            reject(new Error(`Error parsing model file: ${errorMessage}`));
          }
        );
        
        // Note: We removed the progressHandler argument here since GLTFLoader.parse() expects only 4 arguments
        // The correct call should be loader.parse(data, path, onLoad, onError)
      } catch (setupError) {
        reject(new Error(`Error setting up model loader: ${(setupError as Error).message || setupError}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.onprogress = createProgressHandler(onProgress);
    reader.readAsArrayBuffer(file);
  });
};

// Helper to dispose of the global Draco loader when no longer needed
export const cleanupDracoLoader = () => {
  if (dracoLoaderInstance) {
    dracoLoaderInstance.dispose();
    dracoLoaderInstance = null;
  }
};

// Function to check if a model file might have issues
export const validateModelFile = (file: File): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check file size
  if (file.size > 50 * 1024 * 1024) { // 50MB
    issues.push(`Die Dateigröße (${(file.size / (1024 * 1024)).toFixed(2)}MB) ist sehr groß und könnte zu Leistungsproblemen führen.`);
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!['glb', 'gltf'].includes(extension)) {
    issues.push(`Die Dateierweiterung .${extension} wird möglicherweise nicht unterstützt. Unterstützte Formate sind .glb und .gltf.`);
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

// New function: Export model with measurements
export const exportModelWithMeasurements = (
  modelScene: THREE.Scene | THREE.Group,
  measurements: Measurement[],
  fileName: string = 'eturnity-export.glb',
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new scene for the export
      const exportScene = new THREE.Scene();
      
      // Clone the model scene and add it to our export scene
      const modelClone = modelScene.clone();
      exportScene.add(modelClone);
      
      // Add metadata as userData to the scene
      exportScene.userData.measurements = measurements.map(m => ({
        id: m.id,
        type: m.type,
        points: m.points,
        value: m.value,
        visible: m.visible,
        color: m.color,
        label: m.label
      }));
      
      // Add measurements as visible objects
      addMeasurementsToScene(exportScene, measurements);
      
      // Update all matrices for correct export
      exportScene.updateMatrixWorld(true);
      
      // Export the scene with the GLTFExporter
      const exporter = new GLTFExporter();
      exporter.parse(
        exportScene,
        (result) => {
          try {
            const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download if fileName is provided
            if (fileName) {
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              link.click();
            }
            
            resolve(url);
          } catch (exportError) {
            reject(new Error(`Error creating Eturnity export blob: ${(exportError instanceof Error) ? exportError.message : String(exportError)}`));
          }
        },
        (error) => {
          reject(new Error(`Error exporting model with measurements: ${(error instanceof Error) ? error.message : String(error)}`));
        },
        { binary: true }
      );
    } catch (error) {
      reject(new Error(`Error setting up Eturnity export: ${(error instanceof Error) ? error.message : String(error)}`));
    }
  });
};

// Optimized function: Export ONLY the model for Eturnity (no measurements)
export const exportModelOnlyForEturnity = (
  modelScene: THREE.Scene | THREE.Group,
  fileName: string = 'eturnity-export.glb',
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new scene for the export
      const exportScene = new THREE.Scene();
      
      // Filter and clone only the actual model geometry (exclude measurement objects)
      modelScene.traverse((child) => {
        // Skip measurement-related objects and helpers
        if (child.name?.includes('Measurement') || 
            child.name?.includes('Line') || 
            child.name?.includes('Point') ||
            child.name?.includes('Label') ||
            child.name?.includes('Helper') ||
            child.type === 'GridHelper' ||
            child.type === 'AxesHelper') {
          return;
        }
        
        // Only include actual model geometry
        if (child.type === 'Mesh' && child.parent === modelScene) {
          const clonedChild = child.clone();
          
          // Optimize geometry if it exists
          if (clonedChild.geometry) {
            // Merge vertices for smaller file size
            if (typeof clonedChild.geometry.mergeVertices === 'function') {
              clonedChild.geometry.mergeVertices();
            }
            
            // Clean up unused vertex data
            clonedChild.geometry.deleteAttribute('uv2');
            clonedChild.geometry.deleteAttribute('color');
          }
          
          // Simplify materials
          if (clonedChild.material) {
            if (Array.isArray(clonedChild.material)) {
              clonedChild.material = clonedChild.material.map(mat => {
                const simpleMat = mat.clone();
                // Remove unnecessary material properties
                if ('map' in simpleMat) simpleMat.map = null;
                if ('lightMap' in simpleMat) simpleMat.lightMap = null;
                if ('aoMap' in simpleMat) simpleMat.aoMap = null;
                return simpleMat;
              });
            } else {
              const simpleMat = clonedChild.material.clone();
              // Keep only essential material properties
              if ('map' in simpleMat) simpleMat.map = null;
              if ('lightMap' in simpleMat) simpleMat.lightMap = null;
              if ('aoMap' in simpleMat) simpleMat.aoMap = null;
              clonedChild.material = simpleMat;
            }
          }
          
          exportScene.add(clonedChild);
        }
      });
      
      // Update all matrices for correct export
      exportScene.updateMatrixWorld(true);
      
      // Report progress
      if (onProgress) onProgress(50);
      
      // Export with maximum DRACO compression for smallest file size
      const exporter = new GLTFExporter();
      const exportOptions = {
        binary: true,
        draco: {
          compressionLevel: 10, // Maximum compression
          quantizePosition: 12, // Reduced precision for smaller size
          quantizeNormal: 8,
          quantizeColor: 8,
          quantizeTexcoord: 10,
          quantizeGeneric: 8
        },
        includeCustomExtensions: false,
        truncateDrawRange: true,
        embedImages: false, // Don't embed images to reduce size
        maxTextureSize: 1024 // Limit texture resolution
      };
      
      exporter.parse(
        exportScene,
        (result) => {
          try {
            const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            
            // Report completion
            if (onProgress) onProgress(100);
            
            // Trigger download if fileName is provided
            if (fileName) {
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              link.click();
            }
            
            resolve(url);
          } catch (exportError) {
            reject(new Error(`Error creating optimized Eturnity export: ${(exportError instanceof Error) ? exportError.message : String(exportError)}`));
          }
        },
        (error) => {
          reject(new Error(`Error exporting optimized model: ${(error instanceof Error) ? error.message : String(error)}`));
        },
        exportOptions
      );
    } catch (error) {
      reject(new Error(`Error setting up optimized Eturnity export: ${(error instanceof Error) ? error.message : String(error)}`));
    }
  });
};

// Helper function to add measurements as 3D objects to the scene
const addMeasurementsToScene = (scene: THREE.Scene, measurements: Measurement[]) => {
  const measurementsGroup = new THREE.Group();
  measurementsGroup.name = 'Measurements';
  
  // Create a material for the measurement lines
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  
  // Process each measurement
  measurements.forEach(measurement => {
    if (!measurement.visible || !measurement.points || measurement.points.length < 2) {
      return; // Skip invisible or invalid measurements
    }
    
    // Create a group for this measurement
    const measurementGroup = new THREE.Group();
    measurementGroup.name = `Measurement_${measurement.id}_${measurement.type}`;
    measurementGroup.userData = {
      measurementId: measurement.id,
      type: measurement.type,
      value: measurement.value,
      label: measurement.label
    };
    
    // Create the measurement visualization based on its type
    if (measurement.type === 'area' || measurement.type === 'solar') {
      // For areas, create a filled polygon and an outline
      createAreaMeasurement(measurementGroup, measurement);
    } else if (measurement.type === 'length' || measurement.type === 'height') {
      // For length/height measurements, create a line
      createLineMeasurement(measurementGroup, measurement, lineMaterial);
    } else if (['skylight', 'chimney'].includes(measurement.type)) {
      // For rectangular elements, create a filled rectangle
      createRectangularElement(measurementGroup, measurement);
    } else if (['vent', 'hook', 'other'].includes(measurement.type)) {
      // For point elements, create a sphere marker
      createPointElement(measurementGroup, measurement);
    }
    
    // Add the measurement group to the measurements group
    measurementsGroup.add(measurementGroup);
  });
  
  // Add all measurements to the scene
  scene.add(measurementsGroup);
};

// Helper function to create a line visualization for length/height measurements
const createLineMeasurement = (
  group: THREE.Group, 
  measurement: Measurement, 
  material: THREE.LineBasicMaterial
) => {
  // Create geometry for the line
  const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Create the line
  const line = new THREE.Line(geometry, material.clone());
  line.material.color.set(measurement.color || '#ffffff');
  
  // Add to the group
  group.add(line);
  
  // Add point markers at each point
  measurement.points.forEach((point, index) => {
    const pointMarker = createPointMarker(point, 0.02, measurement.color || '#ffffff');
    pointMarker.name = `Point_${index}`;
    group.add(pointMarker);
  });
};

// Helper function to create an area visualization that follows the 3D surface
const createAreaMeasurement = (group: THREE.Group, measurement: Measurement) => {
  if (!measurement.points || measurement.points.length < 3) return;
  
  // Create points for the shape
  const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  
  // Create edges/outline
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    ...points,
    points[0] // Close the loop
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: measurement.color || 0xffffff,
    linewidth: 2
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  group.add(line);
  
  // Create a 3D surface using triangulation
  try {
    // Use the triangulation utility to create a proper 3D mesh that follows the roof surface
    const { triangles } = triangulate3D(measurement.points);
    
    // Create geometry for the triangulated surface
    const geometry = new THREE.BufferGeometry();
    
    // Create array to hold vertex positions
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Add all points to vertices array
    measurement.points.forEach(point => {
      vertices.push(point.x, point.y, point.z);
    });
    
    // Add triangles as indices
    triangles.forEach(triangle => {
      indices.push(triangle[0], triangle[1], triangle[2]);
    });
    
    // Set attributes for the geometry
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    // Compute normals for proper lighting
    geometry.computeVertexNormals();
    
    // Create the mesh with proper material
    const shapeMaterial = new THREE.MeshBasicMaterial({ 
      color: measurement.color || 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, shapeMaterial);
    group.add(mesh);
  } catch (e) {
    console.warn('Failed to create triangulated area shape:', e);
    
    // Fallback to just showing the outline if triangulation fails
    console.log('Falling back to outline-only for area measurement');
  }
  
  // Add point markers
  measurement.points.forEach((point, index) => {
    const pointMarker = createPointMarker(point, 0.02, measurement.color || '#ffffff');
    pointMarker.name = `Point_${index}`;
    group.add(pointMarker);
  });
};

// Helper function to create rectangular elements like skylights, chimneys
const createRectangularElement = (group: THREE.Group, measurement: Measurement) => {
  if (!measurement.points || measurement.points.length !== 4) return;
  
  // Create outline
  const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  points.push(points[0]); // Close the loop
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: measurement.color || 0xffffff,
    linewidth: 2
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  group.add(line);
  
  // Create a filled shape
  try {
    // Simple representation using line segments connecting all points
    for (let i = 0; i < 4; i++) {
      for (let j = i+1; j < 4; j++) {
        const connectionGeometry = new THREE.BufferGeometry().setFromPoints([
          points[i], points[j]
        ]);
        const connectionLine = new THREE.Line(connectionGeometry, lineMaterial.clone());
        connectionLine.material.opacity = 0.5;
        connectionLine.material.transparent = true;
        group.add(connectionLine);
      }
    }
  } catch (e) {
    console.warn('Failed to create rectangular element:', e);
  }
  
  // Add point markers
  measurement.points.forEach((point, index) => {
    const pointMarker = createPointMarker(point, 0.02, measurement.color || '#ffffff');
    pointMarker.name = `Point_${index}`;
    group.add(pointMarker);
  });
};

// Helper function to create point elements like vents, hooks
const createPointElement = (group: THREE.Group, measurement: Measurement) => {
  if (!measurement.points || measurement.points.length < 1) return;
  
  const point = measurement.points[0];
  const marker = createPointMarker(point, 0.05, measurement.color || '#ffffff');
  marker.name = "PointElement";
  
  // Add a small text identifier above the point
  const textMesh = createTextMesh(measurement.type, 0.1);
  textMesh.position.set(point.x, point.y + 0.1, point.z);
  
  group.add(marker);
  group.add(textMesh);
};

// Helper function to create a point marker (sphere)
const createPointMarker = (point: Point, radius: number, color: string): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: color });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(point.x, point.y, point.z);
  return sphere;
};

// Helper function to create a simple text mesh (simplified for this example)
const createTextMesh = (text: string, size: number): THREE.Mesh => {
  // This is a placeholder. In a real implementation, you might use a sprite or
  // TextGeometry from three.js, but it's complex and requires font loading.
  // Here, we'll just create a cube as a placeholder
  const geometry = new THREE.BoxGeometry(size, size/4, size/10);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.text = text;
  return mesh;
};
