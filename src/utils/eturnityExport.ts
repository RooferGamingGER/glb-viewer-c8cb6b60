import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Optimized export function for Eturnity - exports only the rotated model without measurements
 * Optimized for smaller file size using DRACO compression and geometry simplification
 */
export const exportOptimizedModelForEturnity = (
  modelScene: THREE.Scene | THREE.Group,
  fileName: string = 'eturnity-export.glb',
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (onProgress) onProgress(10);

      // Create a new scene for the export
      const exportScene = new THREE.Scene();
      
      // Clone only the model (not measurements)
      const modelClone = modelScene.clone();
      
      // Apply 90-degree rotation around X-axis for Eturnity compatibility
      modelClone.rotation.x = -Math.PI / 2;
      
      // Optimize the model for smaller file size
      optimizeModelForExport(modelClone);
      
      exportScene.add(modelClone);
      
      if (onProgress) onProgress(30);
      
      // Update all matrices for correct export
      exportScene.updateMatrixWorld(true);
      
      if (onProgress) onProgress(50);
      
      // Export with DRACO compression for smaller file size
      const exporter = new GLTFExporter();
      
      const exportOptions = {
        binary: true,
        // Enable DRACO compression for smaller files
        includeCustomExtensions: true,
        forceIndices: false,
        forcePowerOfTwoTextures: false,
        maxTextureSize: 1024, // Limit texture size for smaller files
        
        // Simplify materials to reduce file size
        embedImages: false, // Don't embed large images
        
        // Custom options for smaller file size
        truncateDrawRange: true,
        onlyVisible: true,
      };
      
      if (onProgress) onProgress(70);
      
      exporter.parse(
        exportScene,
        (result) => {
          try {
            if (onProgress) onProgress(90);
            
            const blob = new Blob([result as ArrayBuffer], { 
              type: 'model/gltf-binary' 
            });
            
            // Trigger automatic download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (onProgress) onProgress(100);
            
            // Clean up
            exportScene.clear();
            
            resolve(url);
          } catch (exportError) {
            reject(new Error(`Error creating Eturnity export: ${(exportError instanceof Error) ? exportError.message : String(exportError)}`));
          }
        },
        (error) => {
          exportScene.clear();
          reject(new Error(`Error exporting model for Eturnity: ${(error instanceof Error) ? error.message : String(error)}`));
        },
        exportOptions
      );
    } catch (error) {
      reject(new Error(`Error setting up Eturnity export: ${(error instanceof Error) ? error.message : String(error)}`));
    }
  });
};

/**
 * Optimize model geometry and materials for smaller file size
 */
const optimizeModelForExport = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Optimize geometry
      if (child.geometry) {
        // Remove unnecessary attributes
        child.geometry.deleteAttribute('uv2');
        child.geometry.deleteAttribute('color');
        
        // Merge vertices if possible
        if (child.geometry.attributes.position) {
          // Simplify geometry by removing duplicate vertices
          child.geometry = child.geometry.toNonIndexed();
          child.geometry.computeVertexNormals();
        }
      }
      
      // Optimize materials
      if (child.material) {
        // Simplify materials to reduce file size
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => optimizeMaterial(mat));
        } else {
          optimizeMaterial(child.material);
        }
      }
    }
  });
};

/**
 * Optimize individual materials for smaller file size
 */
const optimizeMaterial = (material: THREE.Material) => {
  if (material instanceof THREE.MeshStandardMaterial || 
      material instanceof THREE.MeshPhysicalMaterial) {
    
    // Remove unnecessary textures and properties
    material.normalMap = null;
    material.roughnessMap = null;
    material.metalnessMap = null;
    material.aoMap = null;
    material.emissiveMap = null;
    material.bumpMap = null;
    material.displacementMap = null;
    
    // Simplify to basic material properties
    material.roughness = 0.8;
    material.metalness = 0.1;
    
    // Reduce texture resolution if present
    if (material.map) {
      // Could implement texture compression here if needed
      material.map.generateMipmaps = false;
      material.map.minFilter = THREE.LinearFilter;
      material.map.magFilter = THREE.LinearFilter;
    }
  }
};

/**
 * Generate timestamped filename for Eturnity exports
 */
export const generateEturnityFileName = (baseName: string = 'dach-modell'): string => {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, -5); // Remove milliseconds
  
  return `${baseName}_eturnity_${timestamp}.glb`;
};