
import React, { useRef, useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment, Html, useProgress } from '@react-three/drei';
import { useOriginalFileStorage, fetchAndStoreOriginalFile, getOriginalFile } from '@/hooks/useOriginalFileStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import { smartToast } from '@/utils/smartToast';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';
import MeasurementTools from '@/components/MeasurementTools';
import { useMeasurements } from '@/hooks/useMeasurements';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';
import { Progress } from "@/components/ui/progress";
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

// Configure GLTF DRACO decoder path to enable loading compressed models
try {
  // @ts-ignore - setDecoderPath is available on useGLTF in drei
  useGLTF.setDecoderPath('/draco/');
} catch {}


type ModelViewerProps = {
  fileUrl: string;
  fileName: string;
  rotateModel?: boolean;
};

function Loader3D() {
  const { progress, errors } = useProgress();
  
  // Show error if any
  useEffect(() => {
    if (errors.length > 0) {
      smartToast.error(`Fehler beim Laden: ${errors[0]}`);
    }
  }, [errors]);
  
  return <Html center>
      <div className="flex flex-col items-center glass-panel px-8 py-6 rounded-lg">
        <Loader2 className="animate-spin mb-4 h-8 w-8 text-primary" />
        <div className="text-sm font-medium mb-2">{progress.toFixed(0)}% geladen</div>
        <Progress value={progress} className="w-48" />
      </div>
    </Html>;
}

// Track loaded models to prevent duplicate loading
const loadedModels = new Set<string>();

const Model = React.memo(({
  url,
  rotate = true,
  onLoadComplete
}: {
  url: string;
  rotate?: boolean;
  onLoadComplete?: () => void;
}) => {
  const modelRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const isMobile = useIsMobile();
  const { qualitySettings } = usePerformanceOptimization(null, camera, gl);
  
  // Stable reference to loaded scene - only load once per URL
  const { scene } = useGLTF(url, undefined, undefined, (error) => {
    let errorMessage = "Unbekannter Fehler";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = (error as any).message || "Fehler beim Laden des 3D-Modells";
    } else {
      errorMessage = String(error);
    }
    smartToast.error(`Fehler beim Laden des Modells: ${errorMessage}`);
  });

  // Stable scene reference - use useMemo with proper dependencies
  const modelScene = useMemo(() => {
    if (!scene) return null;
    return scene;
  }, [scene]);

  // Store original file for direct GLB manipulation - only once
  useOriginalFileStorage(modelScene, url);

  // Fetch and store original file when URL changes - with stable reference
  const stableUrl = useMemo(() => url, [url]);
  useEffect(() => {
    if (stableUrl && (stableUrl.endsWith('.glb') || stableUrl.endsWith('.gltf'))) {
      if (!loadedModels.has(stableUrl)) {
        loadedModels.add(stableUrl);
        fetchAndStoreOriginalFile(stableUrl).catch(console.warn);
      }
    }
  }, [stableUrl]);

  // Calculate model transform with stable dependencies
  const modelTransform = useMemo(() => {
    if (!modelScene) return null;
    
    // Apply rotation first, then calculate bounding box
    const tempGroup = new THREE.Group();
    tempGroup.add(modelScene.clone());
    tempGroup.rotation.set(rotate ? -Math.PI / 2 : 0, 0, 0);
    
    const box = new THREE.Box3().setFromObject(tempGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Clean up temp group
    tempGroup.clear();
    
    return { center, size, maxDim };
  }, [modelScene, rotate]);

  // Stable camera position calculation with fallback
  const cameraPosition = useMemo(() => {
    if (!modelTransform || !camera) {
      // Fallback position
      return {
        position: new THREE.Vector3(0, 2, 5),
        center: new THREE.Vector3(0, 0, 0)
      };
    }
    
    const { maxDim } = modelTransform;
    
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.42;
      cameraZ = Math.max(cameraZ, 1.5);
      const mobileFactor = qualitySettings.pixelRatio < 2 ? 1.3 : 1.1;
      return {
        position: new THREE.Vector3(
          0, 
          cameraZ * 0.05 * mobileFactor,
          cameraZ * mobileFactor
        ),
        center: new THREE.Vector3(0, 0, 0)
      };
    } else {
      const distance = maxDim * (qualitySettings.pixelRatio < 2 ? 1.3 : 1.1);
      return {
        position: new THREE.Vector3(
          0, 
          distance * 0.05,
          distance
        ),
        center: new THREE.Vector3(0, 0, 0)
      };
    }
  }, [modelTransform, camera, qualitySettings]);

  // Apply transformations with stable order - only when necessary
  useEffect(() => {
    if (modelRef.current && modelTransform && cameraPosition) {
      // 1. Set model rotation first
      modelRef.current.rotation.set(rotate ? -Math.PI / 2 : 0, 0, 0);
      
      // 2. Center the model after rotation
      const { center } = modelTransform;
      modelRef.current.position.set(-center.x, -center.y, -center.z);
      
      // 3. Set camera position last
      camera.position.copy(cameraPosition.position);
      camera.lookAt(cameraPosition.center);
      camera.updateProjectionMatrix();
      
      // 4. Call onLoadComplete only once when model is ready
      if (onLoadComplete && !loadedModels.has(`${url}_completed`)) {
        loadedModels.add(`${url}_completed`);
        setTimeout(() => {
          if (modelRef.current) {
            const box = new THREE.Box3().setFromObject(modelRef.current);
            const size = box.getSize(new THREE.Vector3());
            if (size.length() > 0) {
              onLoadComplete();
            }
          }
        }, 100);
      }
    }
  }, [modelTransform, cameraPosition, camera, rotate, onLoadComplete, url]);

  return <group ref={modelRef}>
      <primitive object={modelScene} />
    </group>;
});

export interface ThreeContextProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  canvas: HTMLCanvasElement | null;
}

export const ThreeContext = React.createContext<ThreeContextProps>({
  scene: null,
  camera: null,
  renderer: null,
  canvas: null
});

function SceneSetup({
  onSceneReady
}: {
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) => void;
}) {
  const { scene, camera, gl } = useThree();
  
  useEffect(() => {
    if (scene && camera && gl) {
      const threeScene = scene as THREE.Scene;
      
      threeScene.traverse(obj => {
        if (obj instanceof THREE.Group) {
          if (obj.name === '') {
            obj.name = "unnamed_group";
          }
        }
      });
      
      onSceneReady(threeScene, camera, gl, gl.domElement);
    }
  }, [scene, camera, gl, onSceneReady]);

  return null;
}

const ModelCanvas = React.memo(({
  fileUrl,
  onSceneReady,
  canvasRef,
  rotateModel,
  onModelLoadComplete
}: {
  fileUrl: string;
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  rotateModel?: boolean;
  onModelLoadComplete?: () => void;
}) => {
  const isMobile = useIsMobile();
  const { isLowMemory, optimizeRenderer } = useMemoryOptimization();
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (rendererRef.current) {
      optimizeRenderer(rendererRef.current, isLowMemory);
    }
  }, [isLowMemory, optimizeRenderer]);
  
  // Preload only once when fileUrl changes - prevent race conditions
  useEffect(() => {
    if (!loadedModels.has(`${fileUrl}_preloaded`)) {
      loadedModels.add(`${fileUrl}_preloaded`);
      useGLTF.preload(fileUrl, undefined, undefined, undefined);
    }
  }, [fileUrl]);
  
  return <Canvas shadows style={{
    background: '#222222',
    position: 'absolute', 
    top: 0, 
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    touchAction: 'none'
  }} className="w-full h-full" ref={canvasRef}
    onCreated={({ gl }) => {
      // Optimized WebGL settings for stability
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1;
      
      gl.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      gl.setClearColor(0x222222, 1);
      
      rendererRef.current = gl;
      optimizeRenderer(gl, isLowMemory);
      
      gl.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        if (!document.hidden) {
          smartToast.warning('WebGL-Kontext verloren. Wird automatisch wiederhergestellt...');
        }
      });
      
      gl.domElement.addEventListener('webglcontextrestored', () => {
        if (!document.hidden) {
          smartToast.success('WebGL-Kontext wiederhergestellt');
        }
        gl.setSize(gl.domElement.width, gl.domElement.height);
      });
    }}
  >
      <SceneSetup onSceneReady={onSceneReady} />
      <Suspense fallback={<Loader3D />}>
        <PerspectiveCamera makeDefault fov={45} near={0.1} far={1000} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} />
        
        {!isLowMemory && <Environment preset="city" />}
        
        <Model 
          url={fileUrl} 
          rotate={rotateModel !== false} 
          onLoadComplete={onModelLoadComplete}
        />
        
        <OrbitControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.1} 
          rotateSpeed={isMobile ? 0.7 : 1} 
          zoomSpeed={isMobile ? 0.7 : 1} 
          panSpeed={isMobile ? 0.7 : 1} 
          minDistance={0.5} 
          maxDistance={100}
          enableZoom={true}
          enablePan={true}
          screenSpacePanning={true}
          target={[0, 0, 0]}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
          }}
        />
      </Suspense>
    </Canvas>;
});

const ModelViewer: React.FC<ModelViewerProps> = ({
  fileUrl,
  fileName,
  rotateModel = true
}) => {
  const [threeContext, setThreeContext] = useState<ThreeContextProps>({
    scene: null,
    camera: null,
    renderer: null,
    canvas: null
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  const { clearGLTFCache } = useMemoryOptimization();
  
  const [measurementsEnabled] = useState(true);
  const [measurementToolsEverEnabled] = useState(true);
  
  const { measurements } = useMeasurements();

  // Build a robust URL: if we navigated with a blob: URL, regenerate from stored Blob
  const processedUrl = useMemo(() => {
    if (fileUrl && fileUrl.startsWith('blob:')) {
      try {
        const original = getOriginalFile(fileUrl);
        if (original) {
          return URL.createObjectURL(original);
        }
      } catch {}
    }
    return fileUrl;
  }, [fileUrl]);

  // Show success message only once per model
  const handleModelLoadComplete = useCallback(() => {
    if (!loadedModels.has(`${processedUrl}_success_shown`)) {
      loadedModels.add(`${processedUrl}_success_shown`);
      smartToast.success('Modell erfolgreich geladen');
    }
  }, [processedUrl]);

  // Cleanup only on unmount or when URL actually changes
  useEffect(() => {
    return () => {
      if (processedUrl && processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(processedUrl);
      }
      // Clear from loaded models cache
      loadedModels.delete(processedUrl);
      loadedModels.delete(`${processedUrl}_preloaded`);
      loadedModels.delete(`${processedUrl}_completed`);
      loadedModels.delete(`${processedUrl}_success_shown`);
      clearGLTFCache(processedUrl);
    };
  }, [processedUrl, clearGLTFCache]);

  // Stable scene ready handler
  const handleSceneReady = useCallback((
    newScene: THREE.Scene, 
    newCamera: THREE.Camera, 
    newRenderer: THREE.WebGLRenderer, 
    canvas: HTMLCanvasElement
  ) => {
    if (newRenderer) {
      newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    }

    // Mark if this is a RooferGaming model (requires rotation for proper view)
    try {
      (newScene.userData as any).isRooferGamingModel = !!(rotateModel !== false);
    } catch {}
    
    setThreeContext({
      scene: newScene,
      camera: newCamera,
      renderer: newRenderer,
      canvas: canvas
    });
  }, [isMobile, rotateModel]);

  if (!processedUrl) {
    return <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin mr-2" /> Bereite Modell vor...
    </div>;
  }

  return (
    <PointSnappingProvider>
      <ThreeContext.Provider value={threeContext}>
        <div className="relative w-full h-full overflow-hidden">
          <div className="absolute inset-0">
            <ModelCanvas 
              fileUrl={processedUrl} 
              onSceneReady={handleSceneReady} 
              canvasRef={canvasRef} 
              rotateModel={rotateModel}
              onModelLoadComplete={handleModelLoadComplete}
            />
          </div>
          
          {threeContext.scene && threeContext.camera && (
            <MeasurementTools 
              enabled={measurementsEnabled} 
              scene={threeContext.scene} 
              camera={threeContext.camera} 
              autoOpenSidebar={!isMobile && measurementToolsEverEnabled}
            />
          )}
        </div>
      </ThreeContext.Provider>
    </PointSnappingProvider>
  );
};

export default ModelViewer;
