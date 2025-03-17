
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
  url,
  onClick
}: {
  url: string;
  onClick: (event: THREE.Intersection) => void;
}) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

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
        camera.position.set(center.x, center.y + cameraZ * 0.15, center.z + cameraZ);
        camera.lookAt(center);
      } else {
        const distance = maxDim * 1.0;
        camera.position.set(center.x, center.y + distance * 0.15, center.z + distance);
        camera.lookAt(center);
      }
      modelRef.current.position.x = -center.x;
      modelRef.current.position.y = -center.y;
      modelRef.current.position.z = -center.z;
      toast.success('Modell erfolgreich geladen');
    }
  }, [modelScene, camera]);

  return <group ref={modelRef}>
      <primitive object={modelScene} />
    </group>;
}

function SceneSetup({
  onSceneReady
}: {
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera) => void;
}) {
  const { scene, camera } = useThree();

  useEffect(() => {
    if (scene && camera) {
      onSceneReady(scene, camera);
    }
  }, [scene, camera, onSceneReady]);

  return null;
}

const ModelCanvas = ({
  fileUrl,
  onMeasurementClick,
  onSceneReady,
  canvasRef
}: {
  fileUrl: string;
  onMeasurementClick: (event: React.MouseEvent) => void;
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (onMeasurementClick) {
      onMeasurementClick(event);
    }
  };

  return <Canvas shadows style={{
    background: '#222222'
  }} onClick={handleCanvasClick} className="w-full h-full" ref={canvasRef}>
      <SceneSetup onSceneReady={onSceneReady} />
      <Suspense fallback={<Loader3D />}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} />
        
        <Environment preset="city" />
        
        <Model url={fileUrl} onClick={() => {}} />
        
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} rotateSpeed={1} zoomSpeed={1} panSpeed={1} minDistance={0.5} maxDistance={100} />
      </Suspense>
    </Canvas>;
};

const ModelViewer: React.FC<ModelViewerProps> = ({
  fileUrl,
  fileName
}) => {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Always enable measurements
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

  const handleSceneReady = (newScene: THREE.Scene, newCamera: THREE.Camera) => {
    setScene(newScene);
    setCamera(newCamera);
  };

  const handleMeasurementClick = (event: React.MouseEvent) => {
    // Empty handler, kept for compatibility
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 z-0">
        <ModelCanvas 
          fileUrl={fileUrl} 
          onMeasurementClick={handleMeasurementClick} 
          onSceneReady={handleSceneReady} 
          canvasRef={canvasRef} 
        />
      </div>
      
      {scene && camera && (
        <MeasurementTools 
          enabled={measurementsEnabled} 
          scene={scene} 
          camera={camera} 
          autoOpenSidebar={measurementToolsEverEnabled} 
        />
      )}
    </div>
  );
};

export default ModelViewer;
