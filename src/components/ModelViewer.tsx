
import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ThreeJsProvider } from '@/contexts/ThreeJsContext';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';
import LoadingIndicator from './LoadingIndicator';
import EnhancedMeasurementSidebar from './measurement/EnhancedMeasurementSidebar';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useMeasurementCore } from '@/hooks/useMeasurementCore';
import { useMeasurementEditing } from '@/hooks/useMeasurementEditing';
import { useMeasurementDrawing } from '@/hooks/useMeasurementDrawing';
import { useMeasurementToolToggle } from '@/hooks/useMeasurementToolToggle';
import { useSidebarState } from '@/hooks/useSidebarState';
import TabletOptimizedControls from './viewer/TabletOptimizedControls';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import PVModuleManager from './pv/PVModuleManager'; // Import the PV Module Manager

// Extend ThreeContext with necessary fields
export interface ThreeContext {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  orbitControls: OrbitControls | null;
}

export interface ModelViewerProps {
  fileUrl: string;
  fileName: string;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ fileUrl, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Measurement visualization refs
  const pointsRef = useRef<THREE.Group>(new THREE.Group());
  const linesRef = useRef<THREE.Group>(new THREE.Group());
  const measurementsRef = useRef<THREE.Group>(new THREE.Group());
  const editPointsRef = useRef<THREE.Group>(new THREE.Group());
  const labelsRef = useRef<THREE.Group>(new THREE.Group());
  const segmentLabelsRef = useRef<THREE.Group>(new THREE.Group());
  
  // Sidebar state
  const { open, setOpen } = useSidebarState(true);
  
  // Measurement core hook provides foundational state and functions
  const measurementCore = useMeasurementCore();
  
  // Destructure items from measurementCore
  const { 
    measurements, 
    setMeasurements,
    activeMode,
    setActiveMode,
    currentPoints,
    editMeasurementId,
    setEditMeasurementId,
    editingPointIndex,
    setEditingPointIndex,
    addPoint,
    clearCurrentPoints,
    finalizeMeasurement,
    updateMeasurementPoint,
    undoLastPoint,
    clearMeasurements 
  } = measurementCore;
  
  // Measurement editing hook provides editing functionality
  const measurementEditing = useMeasurementEditing(
    measurements, 
    setMeasurements, 
    editMeasurementId, 
    setEditMeasurementId,
    setEditingPointIndex
  );
  
  // Create a Three.js context value to pass to children
  const threeContextValue: ThreeContext = {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    orbitControls: controlsRef.current
  };
  
  // Initialize scene
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      60, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: true // Needed for screenshots
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    
    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controlsRef.current = controls;
    
    // Add measurement groups to scene
    pointsRef.current.name = 'points';
    linesRef.current.name = 'lines';
    measurementsRef.current.name = 'measurements';
    editPointsRef.current.name = 'editPoints';
    labelsRef.current.name = 'labels';
    segmentLabelsRef.current.name = 'segmentLabels';
    
    scene.add(pointsRef.current);
    scene.add(linesRef.current);
    scene.add(measurementsRef.current);
    scene.add(editPointsRef.current);
    scene.add(labelsRef.current);
    scene.add(segmentLabelsRef.current);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(0, -5, 5);
    scene.add(directionalLight2);
    
    // Load 3D model
    loadModel();
    
    // Handle window resize
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    
    return () => {
      // Clean up
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      // Revoke the blob URL to prevent memory leaks
      URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);
  
  // Load 3D model
  const loadModel = () => {
    if (!sceneRef.current || !cameraRef.current) return;
    
    // Create and configure the GLTF loader
    const gltfLoader = new GLTFLoader();
    
    // Set up Draco decoder for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    
    // Load the model from the provided URL
    gltfLoader.load(
      fileUrl,
      (gltf) => {
        if (!sceneRef.current) return;
        
        const model = gltf.scene;
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // Add to scene
        sceneRef.current.add(model);
        
        // Adjust camera to fit model
        fitCameraToObject(cameraRef.current, model, 1.2);
        
        console.log('Model loaded successfully');
        setLoading(false);
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        setLoadingProgress(percent);
      },
      (error) => {
        console.error('Error loading model:', error);
        setError('Fehler beim Laden des 3D-Modells.');
        setLoading(false);
        toast.error('Fehler beim Laden des 3D-Modells.', {
          description: 'Bitte versuchen Sie es mit einer anderen Datei oder melden Sie den Fehler.',
          action: {
            label: "OK",
            onClick: () => {}
          }
        });
      }
    );
  };
  
  // Fit camera to object
  const fitCameraToObject = (camera: THREE.PerspectiveCamera, object: THREE.Object3D, offset: number) => {
    const box = new THREE.Box3().setFromObject(object);
    
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.tan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);
    
    // Set camera position at a suitable distance from the object
    camera.position.copy(center);
    camera.position.z += distance;
    camera.lookAt(center);
    
    // Update controls
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  };
  
  // Measurement tool toggle hook integrates with the core
  const { 
    enabled, 
    toggleMeasurementTool,
    isModeActive,
    isLineMode,
    isAreaMode,
    isPointMode,
    toggleRuler,
    rulerEnabled 
  } = useMeasurementToolToggle({
    activeMode,
    setActiveMode,
    currentPoints
  });
  
  // Measurement drawing hook for visualization
  const { drawMeasurements } = useMeasurementDrawing(
    sceneRef.current,
    cameraRef.current,
    pointsRef.current,
    linesRef.current,
    measurementsRef.current,
    editPointsRef.current,
    labelsRef.current,
    segmentLabelsRef.current,
    measurements,
    currentPoints,
    true, // allMeasurementsVisible
    true, // allLabelsVisible
    editMeasurementId,
    editingPointIndex
  );
  
  // Update measurements display when they change
  useEffect(() => {
    drawMeasurements();
  }, [drawMeasurements, measurements, currentPoints, editMeasurementId, editingPointIndex]);
  
  // Measurement interaction hook handles user interactions
  const measurementInteraction = useMeasurementInteraction(
    enabled,
    sceneRef.current,
    cameraRef.current,
    open,
    {
      pointsRef,
      linesRef,
      measurementsRef,
      editPointsRef,
      labelsRef,
      segmentLabelsRef
    },
    measurements,
    currentPoints,
    activeMode,
    {
      addPoint,
      startPointEdit: measurementEditing.startPointEdit,
      updateMeasurementPoint
    },
    editMeasurementId,
    editingPointIndex
  );
  
  // Fit object to view
  const fitToView = () => {
    if (!sceneRef.current || !cameraRef.current) return;
    
    // Find all visible objects in the scene excluding measurement helpers
    const objects: THREE.Object3D[] = [];
    sceneRef.current.traverse((object) => {
      // Skip measurement visualization objects
      if (
        object === pointsRef.current ||
        object === linesRef.current ||
        object === measurementsRef.current ||
        object === editPointsRef.current ||
        object === labelsRef.current ||
        object === segmentLabelsRef.current ||
        (object.userData && (
          object.userData.isMeasurementPoint ||
          object.userData.isMeasurementLine ||
          object.userData.isEditPoint ||
          object.userData.isAreaPoint ||
          object.userData.isAreaLine
        ))
      ) {
        return;
      }
      
      // Only include visible objects with geometry
      if (object.visible && (object instanceof THREE.Mesh)) {
        objects.push(object);
      }
    });
    
    // If no objects found, return
    if (objects.length === 0) return;
    
    // Create a bounding box encompassing all objects
    const boundingBox = new THREE.Box3();
    objects.forEach((obj) => {
      boundingBox.expandByObject(obj);
    });
    
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Calculate the distance to fit the object in view
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.tan(Math.PI * cameraRef.current.fov / 360));
    const fitWidthDistance = fitHeightDistance / cameraRef.current.aspect;
    const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance);
    
    // Set camera position
    cameraRef.current.position.copy(center);
    cameraRef.current.position.z += distance;
    cameraRef.current.lookAt(center);
    
    // Update controls target
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
    
    toast.success('Ansicht angepasst');
  };

  // Screen orientation for responsive adjustments
  const { isLandscape } = useScreenOrientation();
  
  // Function to toggle info panel/sidebar
  const toggleInfo = () => {
    setOpen(!open);
  };
  
  return (
    <ThreeJsProvider>
      <PointSnappingProvider>
        <div className="model-viewer h-full w-full relative">
          {/* Main canvas for Three.js renderer */}
          <canvas 
            ref={canvasRef} 
            className="w-full h-full block"
          />
          
          {loading && <LoadingIndicator progress={loadingProgress} />}
          
          {/* Tablet-optimized controls */}
          <TabletOptimizedControls
            onToggleSidebar={() => setOpen(!open)}
            onToggleInfo={toggleInfo}
            onFitToView={fitToView}
            sidebarVisible={open}
          />
          
          {/* Sidebar with measurement controls and list */}
          {isLandscape && (
            <EnhancedMeasurementSidebar
              measurements={measurements}
              activeMode={activeMode}
              hasCurrentPoints={currentPoints.length > 0}
              toggleMeasurementTool={toggleMeasurementTool}
              isModeActive={isModeActive}
              isLineMode={isLineMode}
              isAreaMode={isAreaMode}
              isPointMode={isPointMode}
              toggleMeasurementVisibility={measurementEditing.updateMeasurement}
              toggleEditMode={measurementEditing.toggleEditMode}
              deleteMeasurement={measurementEditing.deleteMeasurement}
              deletePoint={measurementEditing.deletePoint}
              updateMeasurement={measurementEditing.updateMeasurement}
              handleStartPointEdit={measurementEditing.startPointEdit}
              finalizeMeasurement={finalizeMeasurement}
              undoLastPoint={undoLastPoint}
              clearCurrentPoints={clearCurrentPoints}
              clearMeasurements={clearMeasurements}
              cancelEditing={measurementEditing.cancelEditing}
              toggleRuler={toggleRuler}
              rulerEnabled={rulerEnabled}
              displayName={fileName}
              open={open}
              onClose={() => setOpen(false)}
            />
          )}
          
          {/* PV Module Manager */}
          {sceneRef.current && cameraRef.current && (
            <PVModuleManager 
              scene={sceneRef.current}
              camera={cameraRef.current}
              measurements={measurements}
              updateMeasurement={measurementEditing.updateMeasurement}
            />
          )}
        </div>
      </PointSnappingProvider>
    </ThreeJsProvider>
  );
};

export default ModelViewer;
