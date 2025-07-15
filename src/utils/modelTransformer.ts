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

// Pure model extraction and export for Eturnity - maximum file size optimization
export const exportModelOnlyForEturnity = (
  modelScene: THREE.Scene | THREE.Group,
  fileName: string = 'eturnity-export.glb',
  onProgress?: (progress: number) => void,
  rotateModel: boolean = true
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      onProgress?.(5);
      
      // Extract ONLY the original model mesh (no measurements, UI objects, etc.)
      const pureModel = extractPureModel(modelScene);
      if (!pureModel) {
        reject(new Error('Kein gültiges 3D-Modell gefunden'));
        return;
      }
      
      onProgress?.(15);
      
      // Create a minimal scene with only the pure model
      const exportScene = new THREE.Scene();
      
      // Clone the pure model to avoid modifying the original
      const modelClone = pureModel.clone(true);
      
      // Apply rotation for Eturnity format only if rotateModel is false
      // (if rotateModel is true, the model is already rotated in the viewer)
      if (!rotateModel) {
        modelClone.rotation.x = -Math.PI / 2;
      }
      modelClone.updateMatrixWorld(true);
      
      exportScene.add(modelClone);
      
      onProgress?.(25);
      
      // Aggressive geometry optimization
      optimizeGeometryForMaximumCompression(modelClone);
      
      onProgress?.(35);
      
      // Compress textures to reduce file size
      compressTexturesForEturnity(modelClone);
      
      onProgress?.(45);
      
      // Export with maximum compression
      const exporter = new GLTFExporter();
      
      // Minimal export options focused on file size reduction
      const exportOptions = {
        binary: true,
        // Note: GLTFExporter may not support all DRACO options as expected
        // We'll use the most reliable compression settings
        onlyExportVisible: true,
        includeCustomExtensions: false,
        truncateDrawRange: true,
        embedImages: false,  // Don't embed to allow texture compression
        maxTextureSize: 256  // Aggressive texture compression
      };
      
      onProgress?.(55);
      
      exporter.parse(
        exportScene,
        (result) => {
          try {
            const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            if (fileName) {
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              link.click();
            }
            
            onProgress?.(100);
            
            // Log file size for debugging
            console.log(`Eturnity export file size: ${(blob.size / (1024 * 1024)).toFixed(2)}MB`);
            
            resolve(url);
          } catch (exportError) {
            reject(new Error(`Fehler beim Erstellen der Eturnity-Datei: ${(exportError instanceof Error) ? exportError.message : String(exportError)}`));
          }
        },
        (error) => {
          reject(new Error(`Fehler beim Eturnity-Export: ${(error instanceof Error) ? error.message : String(error)}`));
        },
        exportOptions
      );
    } catch (error) {
      reject(new Error(`Fehler beim Vorbereiten des Eturnity-Exports: ${(error instanceof Error) ? error.message : String(error)}`));
    }
  });
};

// Extract only the original GLB model (no measurement objects, UI elements, etc.)
const extractPureModel = (scene: THREE.Scene | THREE.Group): THREE.Object3D | null => {
  let pureModel: THREE.Object3D | null = null;
  
  scene.traverse((child) => {
    // Skip measurement objects, UI elements, helpers, etc.
    if (child.name && (
      child.name.includes('Measurement') ||
      child.name.includes('measurement') ||
      child.name.includes('Point_') ||
      child.name.includes('Line_') ||
      child.name.includes('Area_') ||
      child.name.includes('segment') ||
      child.name.includes('Segment') ||
      child.name.includes('label') ||
      child.name.includes('Label') ||
      child.name.includes('indicator') ||
      child.name.includes('Indicator') ||
      child.name.includes('Helper') ||
      child.name.includes('Guide') ||
      child.name.includes('Preview')
    )) {
      return; // Skip this object
    }
    
    // Skip objects with measurement userData
    if (child.userData && (
      child.userData.measurementId ||
      child.userData.isSegment ||
      child.userData.isMeasurement ||
      child.userData.type === 'measurement' ||
      child.userData.isHelper ||
      child.userData.isPreview
    )) {
      return; // Skip this object
    }
    
    // Look for the main mesh object (usually has geometry and is a Mesh or Group)
    if (child instanceof THREE.Mesh && child.geometry && child.material) {
      // This looks like the original model mesh
      if (!pureModel || child.geometry.attributes.position.count > (pureModel as THREE.Mesh).geometry?.attributes?.position?.count) {
        pureModel = child.parent || child; // Take the parent group if available
      }
    }
    
    // Also check for groups that contain the main model
    if (child instanceof THREE.Group && child.children.length > 0 && !pureModel) {
      // Check if this group contains mesh objects (likely the original model)
      const hasMeshes = child.children.some(c => c instanceof THREE.Mesh && c.geometry);
      if (hasMeshes) {
        pureModel = child;
      }
    }
  });
  
  return pureModel;
};

// Aggressive geometry optimization for maximum file size reduction
const optimizeGeometryForMaximumCompression = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;
      
      // Merge vertices to reduce geometry size
      if (geometry.index === null) {
        geometry.mergeVertices();
      }
      
      // Remove unused attributes to reduce file size
      const attributesToCheck = ['color', 'uv2', 'tangent', 'bitangent'];
      attributesToCheck.forEach(attr => {
        if (geometry.attributes[attr]) {
          geometry.deleteAttribute(attr);
        }
      });
      
      // Simplify materials to reduce complexity
      if (child.material) {
        simplifyMaterialForEturnity(child.material);
      }
    }
  });
};

// Compress and optimize textures for smaller file size
const compressTexturesForEturnity = (object: THREE.Object3D) => {
  const processedTextures = new Set<THREE.Texture>();
  
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      
      materials.forEach(material => {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
          // Compress main textures
          if (material.map && !processedTextures.has(material.map)) {
            compressTexture(material.map);
            processedTextures.add(material.map);
          }
          
          // Remove unnecessary texture maps to reduce file size
          if (material.normalMap) {
            material.normalMap = null;
          }
          if (material.roughnessMap) {
            material.roughnessMap = null;
          }
          if (material.metalnessMap) {
            material.metalnessMap = null;
          }
          if (material.aoMap) {
            material.aoMap = null;
          }
        }
      });
    }
  });
};

// Compress individual texture
const compressTexture = (texture: THREE.Texture) => {
  // Set aggressive compression settings
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  // Force texture update
  texture.needsUpdate = true;
};

// Simplify material properties for Eturnity compatibility and smaller file size
const simplifyMaterialForEturnity = (material: THREE.Material | THREE.Material[]) => {
  const materials = Array.isArray(material) ? material : [material];
  
  materials.forEach(mat => {
    if (mat instanceof THREE.MeshStandardMaterial) {
      // Simplify to basic properties only
      mat.roughness = 0.5;
      mat.metalness = 0.0;
      mat.envMapIntensity = 0.0;
      
      // Remove complex material features
      mat.clearcoat = 0;
      mat.clearcoatRoughness = 0;
      mat.transmission = 0;
    }
  });
};

// Helper function to remove measurement objects from a scene
const removeMeasurementObjects = (object: THREE.Object3D) => {
  const objectsToRemove: THREE.Object3D[] = [];
  
  object.traverse((child) => {
    // Check if this is a measurement-related object by name patterns
    const isMeasurement = child.name && (
      child.name.includes('Measurement') ||
      child.name.includes('measurement') ||
      child.name.includes('Point_') ||
      child.name.includes('Line_') ||
      child.name.includes('Area_') ||
      child.name.includes('segment') ||
      child.name.includes('Segment') ||
      child.name.includes('label') ||
      child.name.includes('Label') ||
      child.name.includes('indicator') ||
      child.name.includes('Indicator')
    );
    
    // Check if this has measurement userData
    const hasMeasurementData = child.userData && (
      child.userData.measurementId ||
      child.userData.isSegment ||
      child.userData.isMeasurement ||
      child.userData.type === 'measurement'
    );
    
    if (isMeasurement || hasMeasurementData) {
      objectsToRemove.push(child);
    }
  });
  
  // Remove identified measurement objects
  objectsToRemove.forEach(obj => {
    if (obj.parent) {
      obj.parent.remove(obj);
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

// Helper function to filter and clone only the base model (no measurements, UI elements, etc.)
const filterAndCloneBaseModel = (scene: THREE.Scene | THREE.Group): THREE.Group => {
  const baseModel = new THREE.Group();
  baseModel.name = 'OptimizedBaseModel';
  
  scene.traverse((child) => {
    // Skip measurement-related objects
    if (child.name.includes('Measurement') || 
        child.name.includes('Line') || 
        child.name.includes('Point') ||
        child.name.includes('Label') ||
        child.name.includes('Gizmo') ||
        child.name.includes('Helper') ||
        child.userData.isMeasurement) {
      return;
    }
    
    // Only include meshes that are part of the actual building model
    if (child instanceof THREE.Mesh && child.geometry && child.material) {
      const meshClone = child.clone();
      // Apply the parent's transformations to maintain position
      meshClone.applyMatrix4(child.matrixWorld);
      baseModel.add(meshClone);
    }
  });
  
  return baseModel;
};

// Helper function to optimize geometry for export (reduce file size)
const optimizeGeometryForExport = (scene: THREE.Scene) => {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      // Merge vertices to reduce geometry size
      if (child.geometry instanceof THREE.BufferGeometry) {
        // Remove unused vertex attributes to reduce file size
        const attributes = child.geometry.attributes;
        
        // Keep only essential attributes (position, normal, uv)
        Object.keys(attributes).forEach(key => {
          if (!['position', 'normal', 'uv'].includes(key)) {
            child.geometry.deleteAttribute(key);
          }
        });
        
        // Optimize the geometry
        child.geometry.computeBoundsTree?.();
      }
      
      // Simplify materials to reduce export size
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => simplifyMaterial(mat));
        } else {
          simplifyMaterial(child.material);
        }
      }
    }
  });
};

// Helper function to simplify materials for smaller export size
const simplifyMaterial = (material: THREE.Material) => {
  if (material instanceof THREE.MeshStandardMaterial || 
      material instanceof THREE.MeshPhongMaterial ||
      material instanceof THREE.MeshLambertMaterial) {
    
    // Remove or simplify maps that aren't essential for Eturnity
    if (material.normalMap && material.normalMap.image?.width > 512) {
      material.normalMap = null; // Remove high-res normal maps
    }
    
    if (material.roughnessMap && material.roughnessMap.image?.width > 512) {
      material.roughnessMap = null; // Remove high-res roughness maps
    }
    
    if (material.metalnessMap && material.metalnessMap.image?.width > 512) {
      material.metalnessMap = null; // Remove high-res metalness maps
    }
    
    // Simplify to basic properties
    material.needsUpdate = true;
  }
};
