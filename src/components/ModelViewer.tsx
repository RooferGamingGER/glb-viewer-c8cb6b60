
import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment, Html, useProgress, Stats } from '@react-three/drei';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';
import MeasurementTools from '@/components/MeasurementTools';
import { useMeasurements } from '@/hooks/useMeasurements';

type ModelViewerProps = {
  fileUrl: string;
  fileName: string;
};

function Loader3D() {
  const { progress } = useProgress();
  return <Html center>
      <div className="flex flex-col items-center glass-panel px-8 py-6 rounded-lg">
        <Loader2 className="animate-spin mb-4 h-8 w-8 text-primary" />
        <div className="text-sm font-medium">{progress.toFixed(0)}% geladen</div>
      </div>
    </Html>;
}

function Model({
  url
}: {
  url: string;
  onClick?: (event: THREE.Intersection) => void;
}) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const isMobile = useIsMobile();

  const modelScene = React.useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.position.set(0, 0, 0);
      modelRef.current.rotation.set(-Math.PI / 2, 0, 0);
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (camera instanceof THREE.PerspectiveCamera) {
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.5;
        cameraZ = Math.max(cameraZ, 1.0);
        const mobileFactor = isMobile ? 1.2 : 1.0;
        camera.position.set(center.x, center.y + cameraZ * 0.15 * mobileFactor, center.z + cameraZ * mobileFactor);
        camera.lookAt(center);
      } else {
        const distance = maxDim * (isMobile ? 1.2 : 1.0);
        camera.position.set(center.x, center.y + distance * 0.15, center.z + distance);
        camera.lookAt(center);
      }
      modelRef.current.position.x = -center.x;
      modelRef.current.position.y = -center.y;
      modelRef.current.position.z = -center.z;
      toast.success('Modell erfolgreich geladen');
    }
  }, [modelScene, camera, isMobile]);

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
  const { scene, camera, gl, get } = useThree();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    canvasRef.current = gl.domElement;
    
    if (scene && camera && gl && canvasRef.current) {
      scene.traverse(obj => {
        if (obj instanceof THREE.Group) {
          if (obj.name === '') {
            obj.name = "unnamed_group";
          }
        }
      });
      
      onSceneReady(scene, camera, gl, canvasRef.current);
    }
  }, [scene, camera, gl, onSceneReady]);

  return null;
}

const ModelCanvas = ({
  fileUrl,
  onSceneReady,
  canvasRef
}: {
  fileUrl: string;
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
  const isMobile = useIsMobile();
  
  return <Canvas shadows style={{
    background: '#222222',
    position: 'absolute', 
    top: 0, 
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    touchAction: 'none'
  }} className="w-full h-full" ref={canvasRef}>
      <SceneSetup onSceneReady={onSceneReady} />
      <Suspense fallback={<Loader3D />}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} />
        
        <Environment preset="city" />
        
        <Model url={fileUrl} />
        
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
  fileName
}) => {
  const [threeContext, setThreeContext] = useState<ThreeContextProps>({
    scene: null,
    camera: null,
    renderer: null,
    canvas: null
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  
  const [measurementsEnabled] = useState(true);
  const [measurementToolsEverEnabled] = useState(true);
  
  const { measurements } = useMeasurements();

  useEffect(() => {
    return () => {
      if (fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handleSceneReady = (
    newScene: THREE.Scene, 
    newCamera: THREE.Camera, 
    newRenderer: THREE.WebGLRenderer, 
    canvas: HTMLCanvasElement
  ) => {
    if (newRenderer) {
      // Reduzierte Pixel-Ratio für geringere RAM-Nutzung
      newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    }
    
    setThreeContext({
      scene: newScene,
      camera: newCamera,
      renderer: newRenderer,
      canvas: canvas
    });
  };

  return (
    <ThreeContext.Provider value={threeContext}>
      <div className="relative w-full h-full overflow-hidden">
        <div className="absolute inset-0">
          <ModelCanvas 
            fileUrl={fileUrl} 
            onSceneReady={handleSceneReady} 
            canvasRef={canvasRef} 
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
  );
};

export default ModelViewer;
