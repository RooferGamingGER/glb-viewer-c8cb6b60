import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Measurement, Point } from '@/types/measurements';
import { triangulate3D, calculate3DTriangleArea } from '@/utils/triangulation';
import { rotateGLBDirect, getOriginalGLBBlob } from './glbDirectManipulation';

// Eturnity Export Settings Interface
export interface EturnityExportSettings {
  format: 'glb';
  applyModifiers: boolean;
  includeSelectedObjects: boolean;
  compression: 'none' | 'draco';
  materials: 'keep' | 'combine';
  embedImages: boolean;
  binary: boolean;
}

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

// Pure model extraction and export for Eturnity with configurable settings
export const exportModelOnlyForEturnity = (
  modelScene: THREE.Scene | THREE.Group,
  fileName: string = 'eturnity-export.glb',
  onProgress?: (progress: number) => void,
  rotateModel: boolean = true,
  exportSettings: Partial<EturnityExportSettings> = {}
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Default Eturnity settings
      const defaultSettings: EturnityExportSettings = {
        format: 'glb',
        applyModifiers: true,
        includeSelectedObjects: true,
        compression: 'none',
        materials: 'combine',
        embedImages: true,
        binary: true
      };
      
      const settings = { ...defaultSettings, ...exportSettings };
      
      onProgress?.(5);
      console.log('Eturnity export with settings:', settings);
      
      // Try direct GLB manipulation first (preserves original file size)
      if (!settings.includeSelectedObjects && settings.materials !== 'combine') {
        console.log('Attempting direct GLB manipulation...');
        try {
          const originalBlob = await getOriginalGLBBlob(modelScene);
          
          if (originalBlob) {
            console.log('Original GLB blob found, using direct manipulation');
            onProgress?.(20);
            
            const result = await rotateGLBDirect(
              originalBlob,
              fileName,
              (directProgress) => {
                // Map direct manipulation progress to 20-90% of total
                onProgress?.(20 + Math.round(directProgress * 0.7));
              }
            );
            
            onProgress?.(100);
            console.log('Direct GLB manipulation successful');
            resolve(result);
            return;
          }
        } catch (directError) {
          console.warn('Direct GLB manipulation failed, falling back to traditional export:', directError);
        }
      }
      
      // Use advanced export method with Eturnity settings
      console.log('Using advanced export method with Eturnity settings...');
      onProgress?.(15);
      
      // Select relevant objects based on settings
      const selectedModel = settings.includeSelectedObjects ? 
        selectRelevantObjects(modelScene) : extractPureModel(modelScene);
      
      if (!selectedModel) {
        console.warn('No relevant model found, using entire scene');
        const fallbackModel = modelScene.clone(true);
        if (fallbackModel.children.length === 0) {
          reject(new Error('Kein gültiges 3D-Modell in der Szene gefunden'));
          return;
        }
        console.log('Using fallback model with', fallbackModel.children.length, 'children');
      } else {
        console.log('Selected model extracted successfully:', selectedModel.type, 'with', selectedModel.children.length, 'children');
      }
      
      const modelToExport = selectedModel || modelScene;
      
      onProgress?.(30);
      
      // Create optimized scene with deep cloning to preserve geometry
      const exportScene = new THREE.Scene();
      
      // Use deep clone to preserve all geometry and textures
      const modelClone = modelToExport.clone(true);
      
      // Apply modifiers if requested
      if (settings.applyModifiers) {
        applyModifiersToModel(modelClone);
      }
      
      // Apply rotation for Eturnity format only if requested
      if (rotateModel) {
        modelClone.rotation.x = -Math.PI / 2;
      }
      modelClone.updateMatrixWorld(true);
      
      exportScene.add(modelClone);
      
      onProgress?.(40);
      
      // Combine materials if requested
      if (settings.materials === 'combine') {
        console.log('Combining materials...');
        await combineMaterials(exportScene);
        onProgress?.(60);
      } else {
        onProgress?.(50);
      }
      
      // Count meshes for validation
      let meshCount = 0;
      exportScene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const hasVertices = child.geometry.attributes.position?.count > 0;
          if (hasVertices) meshCount++;
        }
      });
      console.log('Export scene contains', meshCount, 'valid meshes');
      
      if (meshCount === 0) {
        reject(new Error('Keine Meshes im Export-Modell gefunden'));
        return;
      }
      
      onProgress?.(70);
      
      // Eturnity-specific export options
      const exportOptions = {
        binary: settings.binary,
        onlyExportVisible: true,
        embedImages: settings.embedImages,
        includeCustomExtensions: false,
        animations: [],
        forcePowerOfTwoTextures: false,
        maxTextureSize: Infinity,
        trs: !settings.applyModifiers  // Disable TRS decomposition when applying modifiers
      };
      
      onProgress?.(80);
      
      console.log('Starting Eturnity GLB export...');
      const exporter = new GLTFExporter();
      
      // Ensure no Draco compression - initialize exporter without draco
      const gltfExporter = settings.compression === 'none' ? 
        new GLTFExporter() : new GLTFExporter();
      
      gltfExporter.parse(
        exportScene,
        (result) => {
          try {
            const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
            const fileSizeMB = blob.size / (1024 * 1024);
            console.log(`Traditional export successful! File size: ${fileSizeMB.toFixed(2)}MB`);
            
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            if (fileName) {
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              link.click();
            }
            
            onProgress?.(100);
            resolve(url);
          } catch (exportError) {
            console.error('Export creation error:', exportError);
            reject(new Error(`Fehler beim Erstellen der Eturnity-Datei: ${(exportError instanceof Error) ? exportError.message : String(exportError)}`));
          }
        },
        (error) => {
          console.error('Export parsing error:', error);
          reject(new Error(`Fehler beim Eturnity-Export: ${(error instanceof Error) ? error.message : String(error)}`));
        },
        exportOptions
      );
    } catch (error) {
      console.error('Export setup error:', error);
      reject(new Error(`Fehler beim Vorbereiten des Eturnity-Exports: ${(error instanceof Error) ? error.message : String(error)}`));
    }
  });
};

// Extract only the original GLB model (no measurement objects, UI elements, etc.)
const extractPureModel = (scene: THREE.Scene | THREE.Group): THREE.Object3D | null => {
  console.log('Starting model extraction from scene with', scene.children.length, 'children');
  
  let bestCandidate: THREE.Object3D | null = null;
  let maxVertexCount = 0;
  let candidates: Array<{obj: THREE.Object3D, vertices: number}> = [];
  
  scene.traverse((child) => {
    // Debug logging
    if (child.name) {
      console.log('Found object:', child.name, 'type:', child.type);
    }
    
    // Skip only clearly identified measurement objects
    const isMeasurementObject = child.name && (
      child.name.startsWith('Measurement') ||
      child.name.startsWith('Point_') ||
      child.name.startsWith('Line_') ||
      child.name.startsWith('Area_') ||
      child.name.includes('_measurement') ||
      child.name.includes('_segment')
    );
    
    const hasMeasurementUserData = child.userData && (
      child.userData.measurementId ||
      child.userData.isMeasurement ||
      child.userData.isSegment ||
      child.userData.type === 'measurement'
    );
    
    if (isMeasurementObject || hasMeasurementUserData) {
      console.log('Skipping measurement object:', child.name);
      return;
    }
    
    // Look for meshes with geometry
    if (child instanceof THREE.Mesh && child.geometry && child.material) {
      const vertexCount = child.geometry.attributes.position?.count || 0;
      console.log('Found mesh:', child.name || 'unnamed', 'vertices:', vertexCount);
      
      candidates.push({obj: child, vertices: vertexCount});
      
      if (vertexCount > maxVertexCount) {
        maxVertexCount = vertexCount;
        bestCandidate = child;
      }
    }
    
    // Also consider groups that might contain the model
    if (child instanceof THREE.Group && child.children.length > 0) {
      let groupVertices = 0;
      child.traverse((grandchild) => {
        if (grandchild instanceof THREE.Mesh && grandchild.geometry) {
          groupVertices += grandchild.geometry.attributes.position?.count || 0;
        }
      });
      
      if (groupVertices > maxVertexCount) {
        maxVertexCount = groupVertices;
        bestCandidate = child;
      }
    }
  });
  
  console.log('Found', candidates.length, 'mesh candidates');
  console.log('Best candidate:', bestCandidate?.name || 'unnamed', 'with', maxVertexCount, 'vertices');
  
  // If we found a candidate, find its root parent or return it directly
  if (bestCandidate) {
    // Try to find the root model container, but be less aggressive
    let currentCandidate = bestCandidate;
    let parent = bestCandidate.parent;
    
    while (parent && parent !== scene && parent.children.length < 50) {
      // Only move up if the parent doesn't contain too many objects (likely UI clutter)
      const hasReasonableChildCount = parent.children.length < 20;
      const hasMainlyMeshes = parent.children.filter(child => 
        child instanceof THREE.Mesh || child instanceof THREE.Group
      ).length > parent.children.length * 0.7;
      
      if (hasReasonableChildCount && hasMainlyMeshes) {
        currentCandidate = parent;
        parent = parent.parent;
      } else {
        break;
      }
    }
    
    console.log('Selected candidate:', currentCandidate.name || 'unnamed', 'type:', currentCandidate.type);
    return currentCandidate;
  }
  
  console.warn('No suitable model candidate found');
  return null;
};

// Select only relevant objects for Eturnity export (no measurements, UI elements, etc.)
const selectRelevantObjects = (scene: THREE.Scene | THREE.Group): THREE.Object3D | null => {
  console.log('Selecting relevant objects for Eturnity export...');
  
  const relevantObjects = new THREE.Group();
  relevantObjects.name = 'EturnityRelevantObjects';
  
  scene.traverse((child) => {
    // Skip measurement objects
    const isMeasurementObject = child.name && (
      child.name.includes('Measurement') ||
      child.name.includes('Point_') ||
      child.name.includes('Line_') ||
      child.name.includes('Area_') ||
      child.name.includes('_measurement') ||
      child.name.includes('_segment') ||
      child.name.includes('Label') ||
      child.name.includes('Gizmo') ||
      child.name.includes('Helper')
    );
    
    const hasMeasurementUserData = child.userData && (
      child.userData.measurementId ||
      child.userData.isMeasurement ||
      child.userData.isSegment ||
      child.userData.type === 'measurement' ||
      child.userData.debug
    );
    
    // Skip debug and UI objects
    if (isMeasurementObject || hasMeasurementUserData || child.userData?.export === false) {
      return;
    }
    
    // Include meshes with valid geometry and materials
    if (child instanceof THREE.Mesh && child.geometry && child.material) {
      const vertexCount = child.geometry.attributes.position?.count || 0;
      if (vertexCount > 0) {
        console.log('Including relevant mesh:', child.name || 'unnamed', 'vertices:', vertexCount);
        const meshClone = child.clone(true);
        // Preserve world transformation
        meshClone.applyMatrix4(child.matrixWorld);
        relevantObjects.add(meshClone);
      }
    }
    
    // Include groups that contain relevant meshes
    if (child instanceof THREE.Group && child.children.length > 0) {
      let hasRelevantContent = false;
      child.traverse((grandchild) => {
        if (grandchild instanceof THREE.Mesh && grandchild.geometry && grandchild.material) {
          hasRelevantContent = true;
        }
      });
      
      if (hasRelevantContent && !isMeasurementObject && !hasMeasurementUserData) {
        console.log('Including relevant group:', child.name || 'unnamed');
        const groupClone = child.clone(true);
        relevantObjects.add(groupClone);
      }
    }
  });
  
  console.log('Selected', relevantObjects.children.length, 'relevant objects for export');
  return relevantObjects.children.length > 0 ? relevantObjects : null;
};

// Apply modifiers to model (transforms, etc.)
const applyModifiersToModel = (object: THREE.Object3D) => {
  console.log('Applying modifiers to model...');
  
  object.traverse((child) => {
    // Update all matrix transformations
    child.updateMatrix();
    child.updateMatrixWorld(true);
    
    // For meshes, apply transformations to geometry
    if (child instanceof THREE.Mesh && child.geometry) {
      // Apply the object's transformation matrix to the geometry
      child.geometry.applyMatrix4(child.matrix);
      
      // Reset the object's transformation since it's now baked into geometry
      child.position.set(0, 0, 0);
      child.rotation.set(0, 0, 0);
      child.scale.set(1, 1, 1);
      child.updateMatrix();
    }
  });
  
  console.log('Modifiers applied successfully');
};

// Combine similar materials to reduce complexity
const combineMaterials = async (scene: THREE.Scene): Promise<void> => {
  console.log('Combining materials...');
  
  const materialMap = new Map<string, THREE.Material>();
  const materialKey = (material: THREE.Material): string => {
    // Create a key based on material properties
    if (material instanceof THREE.MeshStandardMaterial) {
      return `standard_${material.color.getHexString()}_${material.roughness}_${material.metalness}`;
    } else if (material instanceof THREE.MeshBasicMaterial) {
      return `basic_${material.color.getHexString()}`;
    }
    return `other_${material.type}`;
  };
  
  // Collect all materials and group similar ones
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      
      materials.forEach((material, index) => {
        const key = materialKey(material);
        
        if (!materialMap.has(key)) {
          // Create a simplified version of the material
          let combinedMaterial: THREE.Material;
          
          if (material instanceof THREE.MeshStandardMaterial) {
            combinedMaterial = new THREE.MeshStandardMaterial({
              color: material.color.clone(),
              roughness: material.roughness,
              metalness: material.metalness,
              transparent: material.transparent,
              opacity: material.opacity,
              side: material.side
            });
          } else if (material instanceof THREE.MeshBasicMaterial) {
            combinedMaterial = new THREE.MeshBasicMaterial({
              color: material.color.clone(),
              transparent: material.transparent,
              opacity: material.opacity,
              side: material.side
            });
          } else {
            combinedMaterial = material.clone();
          }
          
          materialMap.set(key, combinedMaterial);
        }
        
        // Replace the material with the combined version
        if (Array.isArray(child.material)) {
          child.material[index] = materialMap.get(key)!;
        } else {
          child.material = materialMap.get(key)!;
        }
      });
    }
  });
  
  console.log(`Combined materials from many to ${materialMap.size} unique materials`);
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

// Smart texture compression for optimal file size
const compressTexturesForFileSize = (object: THREE.Object3D) => {
  const processedTextures = new Set<THREE.Texture>();
  const maxTextureSize = 1024; // Reasonable size for Eturnity
  
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      
      materials.forEach(material => {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
          // Optimize main texture if present
          if (material.map && !processedTextures.has(material.map)) {
            optimizeTexture(material.map, maxTextureSize);
            processedTextures.add(material.map);
          }
          
          // Keep only essential maps, remove detailed maps
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
          if (material.lightMap) {
            material.lightMap = null;
          }
          
          // Simplify material properties
          if (material instanceof THREE.MeshStandardMaterial) {
            material.roughness = 0.7;
            material.metalness = 0.1;
            material.envMapIntensity = 0.5;
          }
          
          material.needsUpdate = true;
        }
      });
    }
  });
};

// Optimize individual texture for file size
const optimizeTexture = (texture: THREE.Texture, maxSize: number) => {
  // Disable mipmaps to reduce file size
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  // Set wrapping to reduce data
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  
  // Force texture update
  texture.needsUpdate = true;
};

// Smart geometry optimization for file size reduction
const optimizeGeometryForFileSize = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;
      
      // Remove unnecessary attributes
      const attributesToRemove = ['color', 'uv2', 'tangent', 'bitangent'];
      attributesToRemove.forEach(attr => {
        if (geometry.attributes[attr]) {
          geometry.deleteAttribute(attr);
        }
      });
      
      // Merge vertices only if not indexed to avoid breaking geometry
      if (!geometry.index && geometry.attributes.position) {
        try {
          const positionCount = geometry.attributes.position.count;
          if (positionCount < 50000) { // Only for reasonably sized geometries
            geometry.mergeVertices();
          }
        } catch (e) {
          console.warn('Could not merge vertices:', e);
        }
      }
      
      // Compute bounds for optimization
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  });
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
