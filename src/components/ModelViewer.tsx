
import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  useGLTF, 
  Environment, 
  Html, 
  useProgress,
  Stats,
  AccumulativeShadows,
  RandomizedLight
} from '@react-three/drei';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import * as THREE from 'three';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Loader, 
  Grid as GridIcon, 
  Eye, 
  EyeOff,
  RefreshCw
} from 'lucide-react';

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

function Model({ url }: { url: string }) {
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
  
  // Add rotation animation
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  
  useFrame((state, delta) => {
    if (modelRef.current && autoRotate) {
      // Adjust rotation axis to account for the model's new orientation
      modelRef.current.rotation.z += delta * 0.2 * rotationSpeed;
    }
  });
  
  return (
    <>
      <group ref={modelRef}>
        <primitive object={modelScene} />
      </group>
    </>
  );
}

const ModelViewer: React.FC<ModelViewerProps> = ({ fileUrl, fileName }) => {
  const isMobile = useIsMobile();
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    // Clean up when component unmounts
    return () => {
      // Release the blob URL when the component unmounts
      if (fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  return (
    <div className="relative w-full h-full">
      <Canvas shadows style={{ background: '#222222' }}>
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
          <Model url={fileUrl} />
          
          {/* Controls */}
          <OrbitControls 
            makeDefault 
            enableDamping 
            dampingFactor={0.1}
            rotateSpeed={isMobile ? 0.5 : 1}
            zoomSpeed={isMobile ? 0.5 : 1}
            panSpeed={isMobile ? 0.5 : 1}
            minDistance={0.5}
            maxDistance={100}
          />
          
          {/* Stats display (FPS, etc.) */}
          {showStats && <Stats />}
        </Suspense>
      </Canvas>
      
      {/* UI Controls - only the stats toggle is kept */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="glass-button" 
          onClick={() => setShowStats(!showStats)}
        >
          <Eye size={16} className={showStats ? 'text-primary' : ''} />
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
    </div>
  );
};

export default ModelViewer;
