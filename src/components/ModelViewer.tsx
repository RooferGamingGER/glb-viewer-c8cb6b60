import React, { useRef, useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment, Html, useProgress } from '@react-three/drei';
import { useOriginalFileStorage, fetchAndStoreOriginalFile, getOriginalFile, storeOriginalFile } from '@/hooks/useOriginalFileStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import { smartToast } from '@/utils/smartToast';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';
import MeasurementTools from '@/components/MeasurementTools';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';
import { Progress } from "@/components/ui/progress";
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { modelCacheHasBeenLoaded, modelCacheMarkAsLoaded, modelCacheClear } from '@/hooks/useModelCache';

// Configure GLTF DRACO decoder path to enable loading compressed models
try {
  // @ts-ignore - setDecoderPath is available on useGLTF in drei
  useGLTF.setDecoderPath('/draco/');
} catch {}


type ModelViewerProps = {
  fileUrl: string;
  fileName: string;
  rotateModel?: boolean;
  showTools?: boolean;
};

function Loader3D({ fileUrl }: { fileUrl?: string }) {
  const { progress, errors, loaded, total } = useProgress();
  const [smoothProgress, setSmoothProgress] = useState(0);
  
  // Smooth progress to prevent backwards jumps
  useEffect(() => {
    setSmoothProgress(prev => Math.max(prev, progress));
  }, [progress]);
  
  // Reset smooth progress when starting new load
  useEffect(() => {
    setSmoothProgress(0);
  }, [fileUrl]);
  
  // Show error if any
  useEffect(() => {
    if (errors.length > 0) {
      smartToast.error(`Fehler beim Laden: ${errors[0]}`);
    }
  }, [errors]);

  // Detect if this is a blob URL (local file) vs external URL
  const isBlobUrl = fileUrl?.startsWith('blob:') ?? false;
  
  // For blob URLs, don't show MB info if it's 0/0, show processing message instead
  const shouldShowMBInfo = !isBlobUrl && total > 0 && !(loaded === 0 && total === 0);
  
  // Determine if this is a large file
  const isLargeFile = total > 20 * 1024 * 1024 || (isBlobUrl && smoothProgress > 90);
  const loadedMB = loaded ? (loaded / (1024 * 1024)).toFixed(1) : '0';
  const totalMB = total ? (total / (1024 * 1024)).toFixed(1) : '?';
  
  return <Html center>
      <div className="flex flex-col items-center glass-panel px-8 py-6 rounded-lg">
        <Loader2 className="animate-spin mb-4 h-8 w-8 text-primary" />
        <div className="text-sm font-medium mb-2">
          {smoothProgress.toFixed(0)}% geladen
          {shouldShowMBInfo && ` (${loadedMB}/${totalMB} MB)`}
        </div>
        {isBlobUrl && smoothProgress > 50 && (
          <div className="text-xs text-muted-foreground mb-2">
            {smoothProgress > 95 ? 'Große Datei wird verarbeitet...' : 'Lokale Datei wird geladen...'}
          </div>
        )}
        {!isBlobUrl && isLargeFile && smoothProgress > 95 && (
          <div className="text-xs text-muted-foreground mb-2">
            Große Datei wird verarbeitet...
          </div>
        )}
        <Progress value={smoothProgress} className="w-48" />
      </div>
    </Html>;
}

/**
 * Model component - isolated from measurement state to prevent reloads
 * Camera initialization only happens once per URL, not on mode changes
 */
const Model = React.memo(({
  url,
  rotate = true,
  onLoadComplete,
  onRetryNeeded
}: {
  url: string;
  rotate?: boolean;
  onLoadComplete?: () => void;
  onRetryNeeded?: (originalUrl: string) => void;
}) => {
  const modelRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const isMobile = useIsMobile();
  const { qualitySettings } = usePerformanceOptimization(null, camera, gl);
  // REMOVED: activeMode dependency - model should not re-render on mode changes
  const cameraInitializedRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  const loadCompleteCalledRef = useRef(false);
  
  const { scene } = useGLTF(url, undefined, undefined, (error) => {
    let errorMessage = "Unbekannter Fehler";
    let shouldRetry = false;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (url.startsWith('blob:') && (
        error.message.includes('404') || 
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('not found')
      )) {
        shouldRetry = retryCountRef.current < maxRetries;
      }
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = (error as any).message || "Fehler beim Laden des 3D-Modells";
    } else {
      errorMessage = String(error);
    }
    
    if (shouldRetry && onRetryNeeded) {
      retryCountRef.current++;
      console.warn(`Model loading failed, attempting retry ${retryCountRef.current}/${maxRetries}:`, errorMessage);
      onRetryNeeded(url);
    } else {
      const finalMessage = retryCountRef.current > 0 
        ? `Fehler beim Laden des Modells nach ${retryCountRef.current} Versuchen: ${errorMessage}`
        : `Fehler beim Laden des Modells: ${errorMessage}`;
      smartToast.error(finalMessage);
    }
  });

  // Memoize scene to prevent unnecessary re-renders
  const modelScene = useMemo(() => scene, [scene]);

  useOriginalFileStorage(modelScene, url);

  // Fetch and store original file only once
  useEffect(() => {
    if (url && (url.endsWith('.glb') || url.endsWith('.gltf'))) {
      if (!modelCacheHasBeenLoaded(url, 'fetched')) {
        modelCacheMarkAsLoaded(url, 'fetched');
        fetchAndStoreOriginalFile(url).catch(console.warn);
      }
    }
  }, [url]);

  // Calculate model transform only when scene changes
  const modelTransform = useMemo(() => {
    if (!modelScene) return null;
    const tempGroup = new THREE.Group();
    tempGroup.add(modelScene.clone());
    tempGroup.rotation.set(rotate ? -Math.PI / 2 : 0, 0, 0);
    const box = new THREE.Box3().setFromObject(tempGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    tempGroup.clear();
    return { center, size, maxDim };
  }, [modelScene, rotate]);

  // Calculate camera position only when model transform changes
  const cameraPosition = useMemo(() => {
    if (!modelTransform || !camera) {
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
        position: new THREE.Vector3(0, cameraZ * 0.05 * mobileFactor, cameraZ * mobileFactor),
        center: new THREE.Vector3(0, 0, 0)
      };
    } else {
      const distance = maxDim * (qualitySettings.pixelRatio < 2 ? 1.3 : 1.1);
      return {
        position: new THREE.Vector3(0, distance * 0.05, distance),
        center: new THREE.Vector3(0, 0, 0)
      };
    }
  }, [modelTransform, camera, qualitySettings]);

  // Initialize model position and camera - ONLY on URL change, not on mode changes
  useEffect(() => {
    if (!modelRef.current || !modelTransform || !cameraPosition) return;
    
    // Always set model position/rotation
    modelRef.current.rotation.set(rotate ? -Math.PI / 2 : 0, 0, 0);
    const { center } = modelTransform;
    modelRef.current.position.set(-center.x, -center.y, -center.z);

    // Camera initialization: ONLY when URL changes (not on mode changes)
    const urlChanged = cameraInitializedRef.current !== url;
    if (urlChanged) {
      camera.position.copy(cameraPosition.position);
      camera.lookAt(cameraPosition.center);
      camera.updateProjectionMatrix();
      cameraInitializedRef.current = url;
    }

    // Call onLoadComplete only once per URL
    if (onLoadComplete && !loadCompleteCalledRef.current && !modelCacheHasBeenLoaded(url, 'completed')) {
      loadCompleteCalledRef.current = true;
      modelCacheMarkAsLoaded(url, 'completed');
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
  }, [modelTransform, cameraPosition, camera, rotate, onLoadComplete, url]);

  if (!modelScene) return null;

  return (
    <group ref={modelRef}>
      <primitive object={modelScene} />
    </group>
  );
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

/**
 * ModelCanvas - memoized canvas component
 * REMOVED: redundant useGLTF.preload - useGLTF in Model already handles caching
 */
const ModelCanvas = React.memo(({
  fileUrl,
  onSceneReady,
  canvasRef,
  rotateModel,
  onModelLoadComplete,
  onRetryNeeded
}: {
  fileUrl: string;
  onSceneReady: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  rotateModel?: boolean;
  onModelLoadComplete?: () => void;
  onRetryNeeded?: (url: string) => void;
}) => {
  const isMobile = useIsMobile();
  const { isLowMemory, optimizeRenderer } = useMemoryOptimization();
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = React.useRef<any>(null);

  useEffect(() => {
    if (rendererRef.current) {
      optimizeRenderer(rendererRef.current, isLowMemory);
    }
  }, [isLowMemory, optimizeRenderer]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);
  
  // Memoize onCreated handler to prevent Canvas re-renders
  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    gl.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    gl.setClearColor(0x222222, 1);
    rendererRef.current = gl;
    optimizeRenderer(gl, isLowMemory);
  }, [isMobile, isLowMemory, optimizeRenderer]);
  
  return (
    <Canvas 
      shadows 
      style={{
        background: '#222222',
        position: 'absolute', 
        top: 0, 
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        touchAction: 'none'
      }} 
      className="w-full h-full" 
      ref={canvasRef}
      onCreated={handleCanvasCreated}
    >
      <SceneSetup onSceneReady={onSceneReady} />
      <Suspense fallback={<Loader3D fileUrl={fileUrl} />}>
        <PerspectiveCamera makeDefault fov={45} near={0.1} far={1000} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-10, -10, -5]} intensity={0.8} />
        {!isLowMemory && <Environment preset="city" />}
        <Model 
          url={fileUrl} 
          rotate={rotateModel !== false} 
          onLoadComplete={onModelLoadComplete}
          onRetryNeeded={onRetryNeeded}
        />
        <OrbitControls 
          ref={controlsRef}
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
    </Canvas>
  );
});

const ModelViewer: React.FC<ModelViewerProps> = ({
  fileUrl,
  fileName,
  rotateModel = true,
  showTools = true
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
  
  // Model loading state - consolidated
  const [isModelReady, setIsModelReady] = useState(false);

  // URL resolution with stability - using ref to prevent unnecessary re-renders
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const canonicalUrlRef = useRef<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const originalBlobRef = useRef<Blob | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveUrl = async () => {
      if (!fileUrl) {
        canonicalUrlRef.current = null;
        sourceUrlRef.current = null;
        setProcessedUrl(null);
        return;
      }

      // If the source URL hasn't changed and we already have a canonical URL, reuse it
      if (sourceUrlRef.current === fileUrl && canonicalUrlRef.current) {
        setProcessedUrl(canonicalUrlRef.current);
        return;
      }

      // New source URL – reset canonical; previous cleanup handled in separate effect
      sourceUrlRef.current = fileUrl;
      canonicalUrlRef.current = null;

      // Enhanced blob: URL handling with stability improvements
      if (fileUrl.startsWith('blob:')) {
        try {
          let blob: Blob | null = null;
          
          // Try to get cached blob first
          try {
            blob = getOriginalFile(fileUrl);
          } catch {}

          // Fetch blob if not cached, with better error handling
          if (!blob) {
            const resp = await fetch(fileUrl);
            if (!resp.ok) {
              throw new Error(`Failed to fetch blob: HTTP ${resp.status} ${resp.statusText}`);
            }
            blob = await resp.blob();
            
            // Validate blob content
            if (!blob || blob.size === 0) {
              throw new Error('Received empty or invalid blob');
            }
          }

          // Store reference to original blob for retries
          originalBlobRef.current = blob;
          
          const namedBlob = new File([blob], fileName || 'model.glb', { 
            type: blob.type || 'model/gltf-binary' 
          });
          
          // Store both original and processed blobs
          try { 
            storeOriginalFile(fileUrl, namedBlob); 
            storeOriginalFile(`original_${fileUrl}`, blob);
          } catch {}
          
          // Create fresh URL with longer validity
          const freshUrl = URL.createObjectURL(namedBlob);
          try { storeOriginalFile(freshUrl, namedBlob); } catch {}

          if (!cancelled) {
            canonicalUrlRef.current = freshUrl;
            setProcessedUrl(freshUrl);
            setIsRetrying(false);
          }
          return;
        } catch (e) {
          console.error('Failed to resolve blob URL for model:', e);
          const errorMsg = e instanceof Error ? e.message : String(e);
          
          if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
            smartToast.error('Netzwerkfehler beim Laden der Datei. Bitte Internetverbindung prüfen.');
          } else {
            smartToast.error('Konnte die Modelldatei nicht laden. Bitte Datei erneut auswählen.');
          }
          
          if (!cancelled) setProcessedUrl(null);
          return;
        }
      }

      // Default: http/https or other handled schemes
      canonicalUrlRef.current = fileUrl;
      setProcessedUrl(fileUrl);
    };

    resolveUrl();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Enhanced retry mechanism for failed blob URLs
  const handleRetryNeeded = useCallback(async (failedUrl: string) => {
    if (!originalBlobRef.current || isRetrying) return;
    
    setIsRetrying(true);
    
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    // Delay retry to avoid immediate re-failure
    retryTimeoutRef.current = setTimeout(async () => {
      try {
        // Create fresh URL from original blob
        const freshUrl = URL.createObjectURL(originalBlobRef.current!);
        
        // Clean up the failed URL
        if (canonicalUrlRef.current && canonicalUrlRef.current.startsWith('blob:')) {
          try { URL.revokeObjectURL(canonicalUrlRef.current); } catch {}
        }
        
        // Update references
        canonicalUrlRef.current = freshUrl;
        
        // Store the new URL
        try { 
          storeOriginalFile(freshUrl, originalBlobRef.current!); 
        } catch {}
        
        setProcessedUrl(freshUrl);
        console.log('Model URL refreshed for retry');
        
      } catch (error) {
        console.error('Failed to create retry URL:', error);
        smartToast.error('Wiederholung fehlgeschlagen. Bitte Datei erneut laden.');
        setIsRetrying(false);
      }
    }, 1000);
  }, [isRetrying]);

  // Show success message only once per model - consolidated loading state
  const handleModelLoadComplete = useCallback(() => {
    if (!processedUrl) return;
    if (!modelCacheHasBeenLoaded(processedUrl, 'success_shown')) {
      modelCacheMarkAsLoaded(processedUrl, 'success_shown');
      smartToast.success('Modell erfolgreich geladen');
      setIsRetrying(false);
      setIsModelReady(true);
    }
  }, [processedUrl]);

  // Cleanup ONLY when component unmounts or fileUrl actually changes
  // Using a ref to track the previous URL to prevent cleanup on unrelated re-renders
  const previousFileUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Only cleanup if URL actually changed (not on every re-render)
    if (previousFileUrlRef.current && previousFileUrlRef.current !== fileUrl) {
      const urlToCleanup = canonicalUrlRef.current;
      if (urlToCleanup) {
        if (urlToCleanup.startsWith('blob:')) {
          try { URL.revokeObjectURL(urlToCleanup); } catch {}
        }
        modelCacheClear(urlToCleanup);
        clearGLTFCache(urlToCleanup);
      }
    }
    previousFileUrlRef.current = fileUrl;
    
    return () => {
      // Clear retry timeout on unmount
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Final cleanup on unmount
      const urlToCleanup = canonicalUrlRef.current;
      if (urlToCleanup) {
        if (urlToCleanup.startsWith('blob:')) {
          try { URL.revokeObjectURL(urlToCleanup); } catch {}
        }
        modelCacheClear(urlToCleanup);
        clearGLTFCache(urlToCleanup);
      }
      
      canonicalUrlRef.current = null;
      sourceUrlRef.current = null;
      originalBlobRef.current = null;
    };
  }, [fileUrl, clearGLTFCache]);

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
      <Loader2 className="animate-spin mr-2" /> 
      {isRetrying ? 'Lade Modell erneut...' : 'Bereite Modell vor...'}
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
              onRetryNeeded={handleRetryNeeded}
            />
          </div>
          
          {showTools && threeContext.scene && threeContext.camera && (
            <MeasurementTools 
              enabled={true} 
              scene={threeContext.scene} 
              camera={threeContext.camera} 
              autoOpenSidebar={!isMobile}
            />
          )}
        </div>
      </ThreeContext.Provider>
    </PointSnappingProvider>
  );
};

export default ModelViewer;
