import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMeasurementContext } from '@/contexts/MeasurementContext'; 
import { useMeasurementState } from '@/hooks/useMeasurementState';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useVisibilityManager } from '@/hooks/useVisibilityManager';
import { MeasurementMode, Measurement } from '@/types/measurements';
import { ThreeContext } from './ModelViewer';
import MeasurementSidebar from './measurement/MeasurementSidebar';
import * as THREE from 'three';

interface MeasurementToolsProps {
  enabled: boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
  autoOpenSidebar?: boolean;
}

// Create a refs container for measurement objects
const createRefs = () => ({
  pointsRef: React.createRef<THREE.Group>(),
  linesRef: React.createRef<THREE.Group>(),
  areaLinesRef: React.createRef<THREE.Group>(),
  areasRef: React.createRef<THREE.Group>(),
  measurementsRef: React.createRef<THREE.Group>(),
  editPointsRef: React.createRef<THREE.Group>(),
  pointLabelsRef: React.createRef<THREE.Group>(),
  labelsRef: React.createRef<THREE.Group>(),
  segmentLabelsRef: React.createRef<THREE.Group>(),
  rulerRef: React.createRef<THREE.Group>(),
  previewLinesRef: React.createRef<THREE.Group>(),
  previewPointsRef: React.createRef<THREE.Group>(),
  addPointIndicatorsRef: React.createRef<THREE.Group>()
});

const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  enabled,
  scene,
  camera,
  autoOpenSidebar = false
}) => {
  const { canvas } = React.useContext(ThreeContext);
  const [open, setOpen] = useState(autoOpenSidebar);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use measurement context for shared state
  const { 
    measurements,
    currentPoints,
    activeMode,
    editMeasurementId,
    toggleMeasurementTool,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    allLabelsVisible,
    addPoint,
    startPointEdit,
    updateMeasurementPoint,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    finalizeMeasurement,
    clearCurrentPoints,
    clearMeasurements,
    cancelEditing,
    toggleMeasurementTool,
    moveMeasurementUp,
    moveMeasurementDown
  } = useMeasurementContext();

  // Create refs for measurement objects
  const refs = useRef(createRefs()).current;

  // Use the measurement state hook
  const {
    showTable,
    setShowTable,
    handleClearMeasurements,
    handleFinalizeMeasurement,
    handleUndoLastPoint,
    handleCancelEditing,
    handleStartPointEdit,
    handleDeleteMeasurement,
    handleDeletePoint,
    handleMoveMeasurementUp,
    handleMoveMeasurementDown,
    selectedModuleIndex,
    selectedMeasurementId,
    handleSelectModule,
    handleDeleteModule
  } = useMeasurementState(
    measurements,
    currentPoints,
    activeMode,
    editMeasurementId,
    {
      toggleMeasurementVisibility,
      toggleEditMode,
      deleteMeasurement,
      deletePoint,
      updateMeasurement,
      finalizeMeasurement,
      undoLastPoint,
      clearCurrentPoints,
      clearMeasurements,
      cancelEditing,
      toggleMeasurementTool,
      moveMeasurementUp,
      moveMeasurementDown
    }
  );
  
  // Use visibility manager
  const {
    updateMeasurementMarkers, 
    updateAllLabelsVisibility
  } = useVisibilityManager(
    measurements, 
    toggleMeasurementVisibility, 
    toggleLabelVisibility,
    allLabelsVisible,
    selectedModuleIndex,
    selectedMeasurementId
  );

  // Measurement interaction handling with scene objects
  const {
    initializeGroups,
    updateMeasurements,
    handleCanvasClick,
    handleCanvasMouseMove,
    handleModuleInteraction,
    handleKeyDown
  } = useMeasurementInteraction(
    enabled, 
    scene, 
    camera, 
    open, 
    refs, 
    {
      handleFinalizeMeasurement,
      handleUndoLastPoint,
      handleCancelEditing,
      addPoint,
      selectedModuleIndex,
      selectedMeasurementId,
      handleSelectModule,
      currentPoints,
      activeMode,
      editMeasurementId,
      editingPointIndex,
      updateMeasurementPoint,
      handleDeletePoint
    }
  );
  
  // Initialize groups in the scene
  useEffect(() => {
    if (scene && !isInitialized) {
      initializeGroups(scene);
      setIsInitialized(true);
    }
  }, [scene, isInitialized, initializeGroups]);
  
  // Set up the visual state update function
  useEffect(() => {
    setUpdateVisualState((updatedMeasurements, labelVisibility) => {
      updateMeasurements(updatedMeasurements);
      updateAllLabelsVisibility(labelVisibility);
    });
    
    return () => {
      // Reset the update function when unmounting
      setUpdateVisualState(() => {});
    };
  }, [setUpdateVisualState, updateMeasurements, updateAllLabelsVisibility]);
  
  // Update measurements when they change
  useEffect(() => {
    if (scene && isInitialized && measurements) {
      updateMeasurements(measurements);
      updateAllLabelsVisibility(allLabelsVisible);
    }
  }, [scene, isInitialized, measurements, updateMeasurements, updateAllLabelsVisibility, allLabelsVisible]);
  
  // Update markers visibility when activeMode or editMeasurementId changes
  useEffect(() => {
    updateMeasurementMarkers();
  }, [activeMode, editMeasurementId, selectedModuleIndex, selectedMeasurementId, updateMeasurementMarkers]);

  // Set up event listeners for canvas
  useEffect(() => {
    if (!enabled || !canvas) return;
    
    const clickHandler = (event: MouseEvent) => {
      if (event.button === 0) { // Left click
        handleCanvasClick(event);
      }
      
      // Also check for module interaction
      handleModuleInteraction(event);
    };
    
    const touchHandler = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        event.preventDefault(); // Prevent scrolling
        handleCanvasClick(event);
        handleModuleInteraction(event);
      }
    };
    
    const mouseMoveHandler = (event: MouseEvent) => {
      handleCanvasMouseMove(event);
    };
    
    const keyDownHandler = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };
    
    canvas.addEventListener('click', clickHandler);
    canvas.addEventListener('touchend', touchHandler);
    canvas.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('keydown', keyDownHandler);
    
    return () => {
      canvas.removeEventListener('click', clickHandler);
      canvas.removeEventListener('touchend', touchHandler);
      canvas.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('keydown', keyDownHandler);
    };
  }, [
    enabled, 
    canvas, 
    handleCanvasClick, 
    handleModuleInteraction,
    handleCanvasMouseMove, 
    handleKeyDown
  ]);

  // Render the sidebar
  return (
    <>
      <MeasurementSidebar
        measurements={measurements}
        activeMode={activeMode}
        toggleMeasurementTool={toggleMeasurementTool}
        open={open}
        setOpen={setOpen}
        handleClearMeasurements={handleClearMeasurements}
        toggleMeasurementVisibility={toggleMeasurementVisibility}
        toggleLabelVisibility={toggleLabelVisibility}
        toggleAllMeasurementsVisibility={toggleAllMeasurementsVisibility}
        toggleAllLabelsVisibility={toggleAllLabelsVisibility}
        allMeasurementsVisible={allMeasurementsVisible}
        allLabelsVisible={allLabelsVisible}
        editMeasurementId={editMeasurementId}
        handleStartPointEdit={handleStartPointEdit}
        handleCancelEditing={handleCancelEditing}
        handleDeleteMeasurement={handleDeleteMeasurement}
        showTable={showTable}
        setShowTable={setShowTable}
        handleMoveMeasurementUp={handleMoveMeasurementUp}
        handleMoveMeasurementDown={handleMoveMeasurementDown}
        updateMeasurement={updateMeasurement}
        selectedModuleIndex={selectedModuleIndex}
        selectedMeasurementId={selectedMeasurementId}
        handleSelectModule={handleSelectModule}
        handleDeleteModule={handleDeleteModule}
      />
    </>
  );
};

export default MeasurementTools;
