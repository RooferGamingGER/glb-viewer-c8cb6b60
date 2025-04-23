
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export const rotateAndExportModel = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target.result as ArrayBuffer;
      const loader = new GLTFLoader();
      
      loader.parse(arrayBuffer, '', (gltf) => {
        const scene = gltf.scene;
        scene.rotation.x = -Math.PI / 2; // Rotate -90 degrees around X axis
        
        const exporter = new GLTFExporter();
        exporter.parse(
          scene, 
          (result) => {
            const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            resolve(url);
          },
          (error) => {
            reject(error);
          },
          { binary: true } // Options object as the fourth parameter
        );
      }, reject);
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
