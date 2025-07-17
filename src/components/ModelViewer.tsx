
import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment, Html, useProgress } from '@react-three/drei';
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

function Model({
  url,
  rotate = true
}: {
  url: string;
  rotate?: boolean;
  onClick?: (event: THREE.Intersection) => void;
}) {
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
  
  const modelRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const isMobile = useIsMobile();
  const { disposeObject } = useMemoryOptimization();
  const { qualitySettings } = usePerformanceOptimization(null, camera, gl);

  const modelScene = React.useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.position.set(0, 0, 0);
      modelRef.current.rotation.set(rotate ? -Math.PI / 2 : 0, 0, 0);

      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      // Check if camera is PerspectiveCamera before accessing fov property
      if (camera instanceof THREE.PerspectiveCamera) {
        // Use type assertion after the check to make TypeScript happy
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        const fov = perspectiveCamera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.5;
        cameraZ = Math.max(cameraZ, 1.0);
        const mobileFactor = qualitySettings.pixelRatio < 2 ? 1.2 : 1.0;
        camera.position.set(center.x, center.y + cameraZ * 0.15 * mobileFactor, center.z + cameraZ * mobileFactor);
        camera.lookAt(center);
      } else {
        // Handle OrthographicCamera or other camera types
        const distance = maxDim * (qualitySettings.pixelRatio < 2 ? 1.2 : 1.0);
        camera.position.set(center.x, center.y + distance * 0.15, center.z + distance);
        camera.lookAt(center);
      }
      
      modelRef.current.position.x = -center.x;
      modelRef.current.position.y = -center.y;
      modelRef.current.position.z = -center.z;
      smartToast.success('Modell erfolgreich geladen');
    }
  }, [modelScene, camera, qualitySettings, rotate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelRef.current) {
        disposeObject(modelRef.current);
      }
    };
  }, [disposeObject]);

  return <group ref={modelRef}>
      <primitive object={modelScene} />
    </group>;
}

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
    // Type casting scene to THREE.Scene to fix the error
    if (scene && camera && gl) {
      // Fix: Ensure scene is properly typed as THREE.Scene for compatibility with exportModelWithMeasurements
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

const ModelCanvas = ({
  fileUrl,
  onSceneReady,
  canvasRef,
  rotateModel
}: {
  fileUrl: string;
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  rotateModel?: boolean;
}) => {
  const isMobile = useIsMobile();
  const { clearGLTFCache } = useMemoryOptimization();
  
  // Configure loader options and cleanup
  useEffect(() => {
    useGLTF.preload(fileUrl, undefined, undefined, undefined);
    
    return () => {
      clearGLTFCache(fileUrl);
    };
  }, [fileUrl, clearGLTFCache]);
  
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
      // Configure WebGL for better performance with large models
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1;
      
      // Add event listener for WebGL context lost
      gl.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        smartToast.error('WebGL-Kontext verloren. Bitte laden Sie die Seite neu.');
      });
    }}
  >
      <SceneSetup onSceneReady={onSceneReady} />
      <Suspense fallback={<Loader3D />}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} />
        
        <Environment preset="city" />
        
        <Model url={fileUrl} rotate={rotateModel !== false} />
        
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
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
          }}
        />
      </Suspense>
    </Canvas>;
};

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

  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  useEffect(() => {
    setProcessedUrl(fileUrl);
    
    return () => {
      if (processedUrl && processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(processedUrl);
      }
      clearGLTFCache(fileUrl);
    };
  }, [fileUrl, clearGLTFCache]);

  const handleSceneReady = useCallback((
    newScene: THREE.Scene, 
    newCamera: THREE.Camera, 
    newRenderer: THREE.WebGLRenderer, 
    canvas: HTMLCanvasElement
  ) => {
    if (newRenderer) {
      newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    }
    
    setThreeContext({
      scene: newScene,
      camera: newCamera,
      renderer: newRenderer,
      canvas: canvas
    });
  }, [isMobile]);

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
            />
          </div>
          
          {threeContext.scene && threeContext.camera && (
            <MeasurementTools 
              enabled={measurementsEnabled} 
              scene={threeContext.scene} 
              camera={threeContext.camera} 
              autoOpenSidebar={!isMobile && measurementToolsEverEnabled}
              rotateModel={rotateModel}
            />
          )}
        </div>
      </ThreeContext.Provider>
    </PointSnappingProvider>
  );
};

export default ModelViewer;
