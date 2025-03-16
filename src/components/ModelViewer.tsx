
import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  useGLTF, 
  Environment, 
  Html, 
  useProgress,
  Stats
} from '@react-three/drei';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import * as THREE from 'three';
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff,
  Ruler
} from 'lucide-react';
import MeasurementTools from '@/components/MeasurementTools';

type ModelViewerProps = {
  fileUrl: string;
  fileName: string;
};

function Loader3D() {
  const { progress } = useProgress();
  
  return (
    <Html center>
      <div className="flex flex-col items-center glass-panel px-8 py-6 rounded-lg">
        <Loader className="animate-spin mb-4 h-8 w-8 text-primary" />
        <div className="text-sm font-medium">{progress.toFixed(0)}% geladen</div>
      </div>
    </Html>
  );
}

// Import Loader icon from lucide-react
import { Loader } from 'lucide-react';

function Model({ url, onMeasurementClick }: { url: string, onMeasurementClick: (event: React.MouseEvent) => void }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  // Clone the scene to avoid issues with reusing the same object
  const modelScene = React.useMemo(() => scene.clone(), [scene]);
  
  useEffect(() => {
    // Reset model position
    if (modelRef.current) {
      modelRef.current.position.set(0, 0, 0);
      
      // Apply a -90 degree rotation around the X-axis to fix the orientation
      // This will rotate the model so that what was previously "left side down" is now upright
      modelRef.current.rotation.set(-Math.PI / 2, 0, 0);
      
      // Center the model
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // Adjust camera to fit the model
      const maxDim = Math.max(size.x, size.y, size.z);
      
      // Check if camera is a PerspectiveCamera before accessing fov
      if (camera instanceof THREE.PerspectiveCamera) {
        const fov = camera.fov * (Math.PI / 180);
        // Adjust cameraZ to make the object appear closer/larger
        // Using a multiplier of 0.5 to bring the camera much closer than before
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 0.5;
        
        // Set a minimum distance to prevent tiny models
        cameraZ = Math.max(cameraZ, 1.0);
        
        // Position camera to get a good view of the now-rotated model
        // Adjust the vertical position to account for the rotation
        camera.position.set(center.x, center.y + cameraZ * 0.15, center.z + cameraZ);
        camera.lookAt(center);
      } else {
        // Handle OrthographicCamera case
        // Adjust distance to make the object appear closer/larger
        const distance = maxDim * 1.0;
        camera.position.set(center.x, center.y + distance * 0.15, center.z + distance);
        camera.lookAt(center);
      }
      
      // Center the model
      modelRef.current.position.x = -center.x;
      modelRef.current.position.y = -center.y;
      modelRef.current.position.z = -center.z;
      
      toast.success('Modell erfolgreich geladen');
    }
  }, [modelScene, camera]);
  
  return (
    <group ref={modelRef} onClick={onMeasurementClick}>
      <primitive object={modelScene} />
    </group>
  );
}

const ModelCanvas = ({ fileUrl, onMeasurementClick }: { fileUrl: string, onMeasurementClick: (event: React.MouseEvent) => void }) => {
  const [showStats, setShowStats] = useState(false);
  const sceneRef = useRef<THREE.Scene>(null);
  const cameraRef = useRef<THREE.Camera>(null);
  
  const SceneCapture = () => {
    const { scene, camera } = useThree();
    
    useEffect(() => {
      if (sceneRef.current !== scene) {
        sceneRef.current = scene;
      }
      if (cameraRef.current !== camera) {
        cameraRef.current = camera;
      }
    }, [scene, camera]);
    
    return null;
  };

  return (
    <Canvas shadows style={{ background: '#222222' }}>
      <SceneCapture />
      <Suspense fallback={<Loader3D />}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        
        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} />
        
        {/* Environment map for reflections */}
        <Environment preset="city" />
        
        {/* The 3D model */}
        <Model url={fileUrl} onMeasurementClick={onMeasurementClick} />
        
        {/* Controls */}
        <OrbitControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.1}
          rotateSpeed={1}
          zoomSpeed={1}
          panSpeed={1}
          minDistance={0.5}
          maxDistance={100}
        />
        
        {/* Stats display (FPS, etc.) */}
        {showStats && <Stats />}
      </Suspense>
    </Canvas>
  );
};

const ModelViewer: React.FC<ModelViewerProps> = ({ fileUrl, fileName }) => {
  const isMobile = useIsMobile();
  const [showStats, setShowStats] = useState(false);
  const [measurementsEnabled, setMeasurementsEnabled] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

  useEffect(() => {
    // Clean up when component unmounts
    return () => {
      // Release the blob URL when the component unmounts
      if (fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handleMeasurementClick = (event: React.MouseEvent) => {
    if (!measurementsEnabled) return;
    
    // Measurements will be handled by the MeasurementTools component
    event.stopPropagation();
  };

  return (
    <div className="relative w-full h-full">
      <ModelCanvas 
        fileUrl={fileUrl}
        onMeasurementClick={handleMeasurementClick} 
      />
      
      {/* UI Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="glass-button" 
          onClick={() => setShowStats(!showStats)}
        >
          <Eye size={16} className={showStats ? 'text-primary' : ''} />
        </Button>
        
        <Button 
          size="sm" 
          variant={measurementsEnabled ? "default" : "outline"} 
          className="glass-button" 
          onClick={() => setMeasurementsEnabled(!measurementsEnabled)}
        >
          <Ruler size={16} className={measurementsEnabled ? 'text-primary-foreground' : ''} />
        </Button>
      </div>
      
      {/* Model name display */}
      <div className="absolute top-4 left-4">
        <div className="glass-panel px-4 py-2 rounded-md">
          <p className="text-sm font-medium truncate max-w-[200px]">
            {fileName}
          </p>
        </div>
      </div>
      
      {/* Measurement Tools */}
      <MeasurementTools 
        enabled={measurementsEnabled}
        scene={sceneRef.current}
        camera={cameraRef.current}
      />
    </div>
  );
};

export default ModelViewer;
