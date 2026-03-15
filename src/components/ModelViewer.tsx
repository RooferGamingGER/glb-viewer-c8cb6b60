import React, { useRef, useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment, Html, useProgress } from '@react-three/drei';
import { useOriginalFileStorage, fetchAndStoreOriginalFile, getOriginalFile, storeOriginalFile } from '@/hooks/useOriginalFileStorage';
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
import { ProgressiveLoader3D } from '@/components/ProgressiveLoader3D';
import { BoundingBoxPlaceholder } from '@/components/BoundingBoxPlaceholder';
import { useProgressiveModelLoader, formatBytes } from '@/hooks/useProgressiveModelLoader';

// Configure GLTF DRACO decoder path using Google's CDN for reliable loading
try {
  // @ts-ignore - setDecoderPath is available on useGLTF in drei
  useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
} catch {}

class R3FErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    message?: string;
    onError?: (error: unknown) => void;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="rounded-lg border border-border bg-background/95 backdrop-blur p-4 text-center max-w-sm">
            <p className="text-sm font-medium">{this.props.message ?? 'Modell konnte nicht geladen werden.'}</p>
            <p className="text-xs text-muted-foreground mt-1">Bitte Seite neu laden oder ein anderes Modell wählen.</p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

type ModelViewerProps = {
  fileUrl: string;
  fileName: string;
  rotateModel?: boolean;
  showTools?: boolean;
};


// Enhanced Loader3D with progressive loading integration - unified single loader
function Loader3D({ fileUrl }: { fileUrl?: string }) {
  const { progress: dreiProgress, errors, active: dreiActive } = useProgress();
  const progressiveLoader = useProgressiveModelLoader(fileUrl || null);
  const hasShownProgressiveRef = useRef(false);
  
  // Show error if any
  useEffect(() => {
    if (errors.length > 0) {
      smartToast.error(`Fehler beim Laden: ${errors[0]}`);
    }
  }, [errors]);
  
  // Track if progressive loader was shown
  useEffect(() => {
    if (progressiveLoader.isLoading) {
      hasShownProgressiveRef.current = true;
    }
  }, [progressiveLoader.isLoading]);

  // Calculate effective progress - always use progressive loader style
  const effectiveProgress = useMemo(() => {
    if (progressiveLoader.isLoading) {
      return progressiveLoader.progress;
    }
    // Progressive finished but drei still loading - show 95-99%
    if (hasShownProgressiveRef.current && dreiActive) {
      return Math.max(95, Math.min(99, dreiProgress));
    }
    return dreiProgress;
  }, [progressiveLoader.isLoading, progressiveLoader.progress, dreiProgress, dreiActive]);

  // Show loader while progressive is active OR while drei still loading after progressive finished
  const showLoader = progressiveLoader.isLoading || 
    progressiveLoader.hasError || 
    (hasShownProgressiveRef.current && dreiActive);

  if (!showLoader) {
    return null;
  }

  // Always use ProgressiveLoader3D - never show the old fallback
  return (
    <>
      <ProgressiveLoader3D
        phase={progressiveLoader.isLoading ? progressiveLoader.phase : 'finalizing'}
        progress={effectiveProgress}
        phaseProgress={progressiveLoader.isLoading ? progressiveLoader.phaseProgress : 95}
        downloadedBytes={progressiveLoader.downloadedBytes}
        totalBytes={progressiveLoader.totalBytes}
        downloadSpeed={progressiveLoader.downloadSpeed}
        estimatedTimeRemaining={null}
        error={progressiveLoader.error}
        onCancel={progressiveLoader.cancel}
      />
      {progressiveLoader.isLoading && (
        <BoundingBoxPlaceholder visible={true} estimatedSize={5} />
      )}
    </>
  );
}

// Track loaded models to prevent duplicate loading
const loadedModels = new Set<string>();

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
  const { activeMode } = useMeasurements();
  const initializedForUrlRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  
  const { scene } = useGLTF(url, undefined, undefined, (error) => {
    let errorMessage = "Unbekannter Fehler";
    let shouldRetry = false;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if this is a blob URL loading error that we can retry
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
      // Final error after retries or non-retryable error
      const finalMessage = retryCountRef.current > 0 
        ? `Fehler beim Laden des Modells nach ${retryCountRef.current} Versuchen: ${errorMessage}`
        : `Fehler beim Laden des Modells: ${errorMessage}`;
      smartToast.error(finalMessage);
    }
  });

  const modelScene = useMemo(() => {
    if (!scene) return null;
    return scene;
  }, [scene]);

  useOriginalFileStorage(modelScene, url);

  const stableUrl = useMemo(() => url, [url]);
  useEffect(() => {
    if (stableUrl && (stableUrl.endsWith('.glb') || stableUrl.endsWith('.gltf'))) {
      if (!loadedModels.has(stableUrl)) {
        loadedModels.add(stableUrl);
        fetchAndStoreOriginalFile(stableUrl).catch(console.warn);
      }
    }
  }, [stableUrl]);

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

  useEffect(() => {
    if (modelRef.current && modelTransform && cameraPosition) {
      modelRef.current.rotation.set(rotate ? -Math.PI / 2 : 0, 0, 0);
      const { center } = modelTransform;
      modelRef.current.position.set(-center.x, -center.y, -center.z);

      const toolsActive = activeMode && activeMode !== 'none';
      const urlChanged = initializedForUrlRef.current !== url;

      if (!(toolsActive && initializedForUrlRef.current && !urlChanged)) {
        camera.position.copy(cameraPosition.position);
        camera.lookAt(cameraPosition.center);
        camera.updateProjectionMatrix();
        initializedForUrlRef.current = url;
      }

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
  }, [modelTransform, cameraPosition, camera, rotate, onLoadComplete, url, activeMode]);

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
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1;
      gl.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      gl.setClearColor(0x222222, 1);
      rendererRef.current = gl;
      optimizeRenderer(gl, isLowMemory);
    }}
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
    </Canvas>;
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
  
  const [measurementsEnabled] = useState(true);
  const [measurementToolsEverEnabled] = useState(true);
  
  const { measurements } = useMeasurements();

  // Enhanced URL resolution with retry capability
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const canonicalUrlRef = useRef<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const originalBlobRef = useRef<Blob | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Show success message only once per model
  const handleModelLoadComplete = useCallback(() => {
    if (!processedUrl) return;
    if (!loadedModels.has(`${processedUrl}_success_shown`)) {
      loadedModels.add(`${processedUrl}_success_shown`);
      smartToast.success('Modell erfolgreich geladen');
      setIsRetrying(false);
    }
  }, [processedUrl]);

  // Enhanced cleanup with retry timeout handling
  useEffect(() => {
    return () => {
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      const urlToCleanup = canonicalUrlRef.current;
      if (urlToCleanup) {
        if (urlToCleanup.startsWith('blob:')) {
          try { URL.revokeObjectURL(urlToCleanup); } catch {}
        }
        // Clear from loaded models cache and GLTF cache
        loadedModels.delete(urlToCleanup);
        loadedModels.delete(`${urlToCleanup}_preloaded`);
        loadedModels.delete(`${urlToCleanup}_completed`);
        loadedModels.delete(`${urlToCleanup}_success_shown`);
        clearGLTFCache(urlToCleanup);
      }
      
      // Clear references
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
