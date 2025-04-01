import React, { useState, useRef, useEffect, useContext, createContext } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Model } from './Model';
import { getOptimalPixelRatio } from '@/utils/lodUtils';
import PerformanceSettings from './PerformanceSettings';

// Bestehenden ThreeContext-Teil behalten
export interface ThreeContextProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  orbitControlsRef: React.RefObject<any>;
  transformControlsRef: React.RefObject<any>;
  selectedObject: THREE.Object3D | null;
  setSelectedObject: React.Dispatch<React.SetStateAction<THREE.Object3D | null>>;
  transformMode: 'translate' | 'rotate' | 'scale';
  setTransformMode: React.Dispatch<React.SetStateAction<'translate' | 'rotate' | 'scale'>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showAxes: boolean;
  setShowAxes: React.Dispatch<React.SetStateAction<boolean>>;
  backgroundColor: string;
  setBackgroundColor: React.Dispatch<React.SetStateAction<string>>;
  resetCamera: () => void;
  takeScreenshot: () => string;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadProgress: number;
  setLoadProgress: React.Dispatch<React.SetStateAction<number>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const ThreeContext = createContext<ThreeContextProps>({
  scene: null,
  camera: null,
  renderer: null,
  orbitControlsRef: { current: null },
  transformControlsRef: { current: null },
  selectedObject: null,
  setSelectedObject: () => {},
  transformMode: 'translate',
  setTransformMode: () => {},
  showGrid: true,
  setShowGrid: () => {},
  showAxes: true,
  setShowAxes: () => {},
  backgroundColor: '#f0f0f0',
  setBackgroundColor: () => {},
  resetCamera: () => {},
  takeScreenshot: () => '',
  isLoading: false,
  setIsLoading: () => {},
  loadProgress: 0,
  setLoadProgress: () => {},
  error: null,
  setError: () => {},
});

interface ModelViewerProps {
  fileUrl: string;
  fileName: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  showControls?: boolean;
  showInfo?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  backgroundColor?: string;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  cameraZoom?: number;
  enableTransformControls?: boolean;
  enableOrbitControls?: boolean;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  children?: React.ReactNode;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ 
  fileUrl, 
  fileName,
  onLoad,
  onError,
  showControls = true,
  showInfo = true,
  showGrid: initialShowGrid = true,
  showAxes: initialShowAxes = true,
  backgroundColor: initialBackgroundColor = '#f0f0f0',
  cameraPosition = [5, 5, 5],
  cameraFov = 50,
  cameraZoom = 1,
  enableTransformControls = false,
  enableOrbitControls = true,
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
  autoRotate = false,
  autoRotateSpeed = 1,
  children,
}) => {
  const [sceneRef, setSceneRef] = useState<THREE.Scene | null>(null);
  const [cameraRef, setCameraRef] = useState<THREE.Camera | null>(null);
  const [rendererRef, setRendererRef] = useState<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef(null);
  const transformControlsRef = useRef(null);
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [showGrid, setShowGrid] = useState<boolean>(initialShowGrid);
  const [showAxes, setShowAxes] = useState<boolean>(initialShowAxes);
  const [backgroundColor, setBackgroundColor] = useState<string>(initialBackgroundColor);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Optimize pixelRatio based on device capability
  const pixelRatio = getOptimalPixelRatio();

  // Erfasse Referenzen zu Three.js-Objekten
  const handleCreated = (state: any) => {
    setSceneRef(state.scene);
    setCameraRef(state.camera);
    setRendererRef(state.gl);
    
    // Set initial background color
    if (state.gl && initialBackgroundColor) {
      state.gl.setClearColor(new THREE.Color(initialBackgroundColor));
    }
    
    // Add event listeners for object selection
    if (enableTransformControls) {
      const canvas = state.gl.domElement;
      canvas.addEventListener('click', handleCanvasClick);
      
      return () => {
        canvas.removeEventListener('click', handleCanvasClick);
      };
    }
  };
  
  // Handle canvas click for object selection
  const handleCanvasClick = (event: MouseEvent) => {
    if (!sceneRef || !cameraRef || !rendererRef) return;
    
    const canvas = rendererRef.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, cameraRef);
    
    const intersects = raycaster.intersectObjects(sceneRef.children, true);
    
    if (intersects.length > 0) {
      // Find the first mesh that is not a helper or control
      const mesh = intersects.find(intersect => 
        intersect.object instanceof THREE.Mesh && 
        !intersect.object.name.includes('helper') &&
        !intersect.object.name.includes('control')
      );
      
      if (mesh) {
        setSelectedObject(mesh.object);
      } else {
        setSelectedObject(null);
      }
    } else {
      setSelectedObject(null);
    }
  };
  
  // Reset camera to initial position
  const resetCamera = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  };
  
  // Take a screenshot of the current view
  const takeScreenshot = () => {
    if (!rendererRef) return '';
    
    // Render the scene
    if (sceneRef && cameraRef) {
      rendererRef.render(sceneRef, cameraRef);
    }
    
    // Get the data URL of the canvas
    return rendererRef.domElement.toDataURL('image/png');
  };
  
  // Update background color when it changes
  useEffect(() => {
    if (rendererRef && backgroundColor) {
      rendererRef.setClearColor(new THREE.Color(backgroundColor));
    }
  }, [rendererRef, backgroundColor]);
  
  // Clean up event listeners
  useEffect(() => {
    return () => {
      if (rendererRef && enableTransformControls) {
        const canvas = rendererRef.domElement;
        canvas.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [rendererRef, enableTransformControls]);

  return (
    <div className="relative w-full h-full">
      {/* Performance-Einstellungen - z.B. in einer Ecke oder in den Einstellungen */}
      <div className="absolute top-4 right-4 z-10 w-48 bg-background/80 backdrop-blur-sm p-3 rounded-md shadow-md border border-border/50">
        <PerformanceSettings />
      </div>
      
      <Canvas
        gl={{ 
          antialias: true, 
          // Nutze optimierte Pixeldichte
          pixelRatio: pixelRatio,
          // Füge Memory Management hinzu
          powerPreference: 'high-performance'
        }}
        onCreated={handleCreated}
        shadows
        camera={{ 
          position: cameraPosition, 
          fov: cameraFov,
          zoom: cameraZoom,
          near: 0.1,
          far: 1000
        }}
        style={{ background: backgroundColor }}
      >
        <ThreeContext.Provider
          value={{
            scene: sceneRef,
            camera: cameraRef,
            renderer: rendererRef,
            orbitControlsRef,
            transformControlsRef,
            selectedObject,
            setSelectedObject,
            transformMode,
            setTransformMode,
            showGrid,
            setShowGrid,
            showAxes,
            setShowAxes,
            backgroundColor,
            setBackgroundColor,
            resetCamera,
            takeScreenshot,
            isLoading,
            setIsLoading,
            loadProgress,
            setLoadProgress,
            error,
            setError,
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          
          {/* Nutze die Model-Komponente mit LOD */}
          <Model url={fileUrl} useLod={true} />
          
          <OrbitControls 
            ref={orbitControlsRef} 
            makeDefault 
            // Reduziere Rechenleistung bei Bewegungen
            enableDamping={true}
            dampingFactor={0.1}
            enabled={enableOrbitControls}
            enablePan={enablePan}
            enableZoom={enableZoom}
            enableRotate={enableRotate}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
          />
          <Grid 
            infiniteGrid 
            fadeDistance={50} 
            fadeStrength={5}
            visible={showGrid}
          />
          
          {showAxes && <axesHelper args={[5]} />}
          
          {enableTransformControls && selectedObject && (
            <TransformControls
              ref={transformControlsRef}
              object={selectedObject}
              mode={transformMode}
              size={1}
              translationSnap={0.25}
              rotationSnap={Math.PI / 8}
              scaleSnap={0.25}
            />
          )}
          
          {children}
        </ThreeContext.Provider>
      </Canvas>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium">Lade Modell...</p>
            {loadProgress > 0 && (
              <div className="w-64 h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${loadProgress * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-destructive mb-2">Fehler beim Laden</h3>
            <p className="text-destructive/80">{error}</p>
            <button 
              className="mt-4 px-4 py-2 bg-background border border-input rounded-md hover:bg-accent"
              onClick={() => setError(null)}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelViewer;
