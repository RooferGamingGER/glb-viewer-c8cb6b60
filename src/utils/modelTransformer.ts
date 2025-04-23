
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export const rotateAndExportModel = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target.result as ArrayBuffer;
      
      // Initialize loaders
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
      
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      
      // Create a scene to handle the model
      const scene = new THREE.Scene();
      
      loader.parse(arrayBuffer, '', (gltf) => {
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
            const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            
            // Clean up
            dracoLoader.dispose();
            scene.clear();
            
            resolve(url);
          },
          (error) => {
            dracoLoader.dispose();
            scene.clear();
            reject(error);
          },
          { binary: true }
        );
      }, reject);
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
