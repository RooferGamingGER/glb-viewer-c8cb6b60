
import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// Import contexts and hooks
import { MeasurementProvider, useMeasurementContext } from '@/contexts/MeasurementContext';
import { ThreeJsProvider, useThreeJs } from '@/contexts/ThreeJsContext';
import { useVisibilityManager } from '@/hooks/useVisibilityManager';
import { useMeasurementInteractionManager } from '@/hooks/useMeasurementInteractionManager';
import { useMeasurementState } from '@/hooks/useMeasurementState';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { useLayerVisibility, LayerVisibility } from '@/hooks/useLayerVisibility';


// Import visualization utilities
import { 
  renderCurrentPoints, 
  renderEditPoints, 
  renderMeasurements,
  clearAllVisuals
} from '@/utils/measurementVisuals';

// Import components
import MeasurementToolControls from './MeasurementToolControls';
import MeasurementControls from './MeasurementControls';
import EditingAlert from './EditingAlert';
import RoofElementControls from './RoofElementControls';
import TabbedMeasurementSidebar from './TabbedMeasurementSidebar';
import { Measurement } from '@/types/measurements';
import { ScrollArea } from "@/components/ui/scroll-area";
import { SunSimulationState } from '@/hooks/useSunSimulation';

interface MeasurementToolsProps {
  enabled: boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
  autoOpenSidebar?: boolean;
  sunSimulation?: SunSimulationState;
}

// Wrapper component that provides contexts
const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera,
  autoOpenSidebar = false,
  sunSimulation
}) => {
  return (
    <MeasurementProvider>
      <ThreeJsProvider scene={scene} enabled={enabled}>
        <MeasurementToolsContent
          enabled={enabled}
          scene={scene}
          camera={camera}
          autoOpenSidebar={autoOpenSidebar}
          sunSimulation={sunSimulation}
        />
      </ThreeJsProvider>
    </MeasurementProvider>
  );
};

// Main component that uses the context
const MeasurementToolsContent: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera,
  autoOpenSidebar = false
}) => {
  const isMobile = useIsMobile();
  const { isTablet, isLandscape } = useScreenOrientation();
  
  // Layer visibility state for model view modes
  const { 
    layerVisibility, 
    updateLayerVisibility, 
    applyLayerVisibility 
  } = useLayerVisibility();
  
  // Get measurement state and actions from context
  const { 
    measurements,
    currentPoints,
    addPoint,
    activeMode,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    updateMeasurementPoint,
    allLabelsVisible,
    moveMeasurementUp,
    moveMeasurementDown,
    setUpdateVisualState,
    importMeasurements
  } = useMeasurementContext();

  // Auto-load is handled in the root MeasurementTools component

  // Three.js object references from context
  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    updateLabelScaling
  } = useThreeJs();

  // Utils for handling measurement visibility
  const { 
    handleToggleMeasurementVisibility,
    handleToggleLabelVisibility,
    updateAllLabelsVisibility,
    updateMeasurementMarkers,
    getMeasurementGroups
  } = useVisibilityManager(
    measurements,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    allLabelsVisible
  );

  // Get all measurement groups for passing to ExportPdfButton
  const [measurementGroups, setMeasurementGroups] = useState<THREE.Group[]>([]);
  
  useEffect(() => {
    setMeasurementGroups(getMeasurementGroups());
  }, [getMeasurementGroups]);

  // Define the visual update function
  const updateVisualState = useCallback((updatedMeasurements: Measurement[], labelVisible: boolean) => {
    // Update all labels visibility
    if (labelsRef.current && segmentLabelsRef.current) {
      updateAllLabelsVisibility(labelVisible);
    }
    
    // Update measurement markers visibility including PV areas
    if (measurementsRef.current) {
      updateMeasurementMarkers();
    }
    
    // Ensure the measurements are rendered with their updated state
    if (measurementsRef.current && labelsRef.current && segmentLabelsRef.current) {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        updatedMeasurements, 
        true,
        activeMode !== 'none'
      );
    }
  }, [updateAllLabelsVisibility, updateMeasurementMarkers, labelsRef, segmentLabelsRef, measurementsRef, activeMode]);

  // Set the update function in the measurements context
  useEffect(() => {
    setUpdateVisualState(updateVisualState);
  }, [setUpdateVisualState, updateVisualState]);

  // Handlers for measurement interaction
  const interactionHandlers = {
    addPoint,
    startPointEdit,
    updateMeasurementPoint
  };

  // Measurement interaction state
  const { 
    movingPointInfo, 
    setMovingPointInfo, 
    clearPreviewGroup,
    clearAddPointIndicators 
  } = useMeasurementInteractionManager(
    enabled,
    scene,
    camera,
    measurements,
    currentPoints,
    activeMode,
    interactionHandlers,
    editMeasurementId,
    editingPointIndex
  );

  // Scale labels based on camera distance
  useEffect(() => {
    if (!camera) return;
    
    const handleCameraMove = () => {
      updateLabelScaling(camera);
    };
    
    // Initial update
    handleCameraMove();
    
    // Setup listener for camera movement
    window.addEventListener('cameramove', handleCameraMove);
    
    // Fallback - update periodically
    const intervalId = setInterval(handleCameraMove, 1000);
    
    return () => {
      window.removeEventListener('cameramove', handleCameraMove);
      clearInterval(intervalId);
    };
  }, [camera, updateLabelScaling]);
  
  // Additional state and handlers for UI
  const { 
    showTable,
    setShowTable,
    segmentsOpen,
    editingSegmentId,
    setEditingSegmentId,
    toggleSegments,
    handleClearMeasurements,
    handleFinalizeMeasurement,
    handleUndoLastPoint,
    handleCancelEditing,
    handleStartPointEdit,
    handleDeleteMeasurement,
    handleDeletePoint,
    handleMoveMeasurementUp,
    handleMoveMeasurementDown
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

  // Update visibility when allLabelsVisible changes (but never while a tool is active)
  useEffect(() => {
    if (activeMode !== 'none') return;
    updateAllLabelsVisibility(allLabelsVisible);
  }, [allLabelsVisible, updateAllLabelsVisibility, activeMode]);

  // Handle label visibility based on edit/draw mode
  useEffect(() => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;

    const isEditing = editMeasurementId !== null || movingPointInfo !== null || editingSegmentId !== null;
    const isDrawingMode = activeMode !== 'none';

    const processLabel = (label: THREE.Object3D) => {
      if (!label.userData) return;

      // Preview labels are always visible
      if (label.userData.isPreview) {
        label.visible = true;
        return;
      }

      // During editing OR active drawing mode, hide all non-preview labels
      if (isEditing || isDrawingMode) {
        label.visible = false;
        return;
      }

      const measurementId = label.userData.measurementId;
      if (measurementId) {
        const measurement = measurements.find(m => m.id === measurementId);
        label.visible = measurement?.visible !== false && measurement?.labelVisible !== false;
      } else {
        label.visible = true;
      }
    };

    labelsRef.current.children.forEach(label => {
      processLabel(label);
    });

    segmentLabelsRef.current.children.forEach(label => {
      processLabel(label);
    });
  }, [editMeasurementId, movingPointInfo, editingSegmentId, measurements, allLabelsVisible, labelsRef, segmentLabelsRef, activeMode]);

  // Clean up labels when editing starts and re-render when editing is complete
  useEffect(() => {
    if ((editMeasurementId === null && !movingPointInfo) || !enabled) {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true,
        activeMode !== 'none'
      );
    }
  }, [editMeasurementId, movingPointInfo, measurements, enabled, measurementsRef, labelsRef, segmentLabelsRef, activeMode]);

  // Re-render measurements when they change or activeMode changes
  useEffect(() => {
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true,
      activeMode !== 'none'
    );
  }, [measurements, measurementsRef, labelsRef, segmentLabelsRef, activeMode]);

  // Re-render current points when they change
  useEffect(() => {
    renderCurrentPoints(
      pointsRef.current, 
      linesRef.current, 
      labelsRef.current, 
      currentPoints, 
      activeMode
    );
  }, [currentPoints, activeMode, pointsRef, linesRef, labelsRef]);

  // Re-render edit points when edit state changes
  useEffect(() => {
    renderEditPoints(
      editPointsRef.current, 
      measurements, 
      editMeasurementId, 
      editingPointIndex, 
      true
    );
  }, [measurements, editMeasurementId, editingPointIndex, editPointsRef]);

  // Clean up when enabled state changes
  useEffect(() => {
    if (!enabled) {
      clearAllVisuals(
        pointsRef.current,
        linesRef.current,
        measurementsRef.current,
        editPointsRef.current,
        labelsRef.current,
        segmentLabelsRef.current
      );
      
      // Also clear any preview visuals
      if (clearPreviewGroup) {
        clearPreviewGroup();
      }
      
      if (clearAddPointIndicators) {
        clearAddPointIndicators();
      }
    } else {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true,
        activeMode !== 'none'
      );
      
      renderEditPoints(
        editPointsRef.current, 
        measurements, 
        editMeasurementId, 
        editingPointIndex, 
        true
      );
    }
  }, [
    enabled, 
    measurements, 
    editMeasurementId, 
    editingPointIndex, 
    clearPreviewGroup, 
    clearAddPointIndicators,
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef
  ]);

  // Callback for handling cancellation of editing
  const handleCancelEditingWithCleanup = () => {
    handleCancelEditing();
    setMovingPointInfo(null);
    
    // Clear preview displays
    if (clearPreviewGroup) {
      clearPreviewGroup();
    }
    
    if (clearAddPointIndicators) {
      clearAddPointIndicators();
    }
    
    // Re-render measurements to ensure labels are displayed correctly
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true,
      false
    );
  };

  // Check if current mode is a roof element mode
  const isRoofElementMode = ![
    'length', 'height', 'area', 'none'
  ].includes(activeMode);

  // Handle label visibility toggling with direct visual update
  const handleToggleAllLabelsVisibility = () => {
    toggleAllLabelsVisibility();
  };

  // Handle layer visibility changes
  const handleLayerChange = useCallback((layer: keyof LayerVisibility, value: boolean) => {
    updateLayerVisibility(layer, value);
    
    // Handle measurements visibility toggle
    if (layer === 'showMeasurements') {
      toggleAllMeasurementsVisibility();
    }
    
    // Apply material changes to the model
    if (layer === 'showMesh' || layer === 'showTexture') {
      // Find the model in the scene
      scene.traverse((object) => {
        if (object instanceof THREE.Group && object.children.length > 0) {
          // Check if this is a model group (not measurement groups)
          const isModelGroup = !object.userData?.isMeasurement && 
                              !object.name?.includes('measurement') &&
                              !object.name?.includes('points') &&
                              !object.name?.includes('lines') &&
                              !object.name?.includes('labels');
          
          if (isModelGroup) {
            const newVisibility = { ...layerVisibility, [layer]: value };
            applyLayerVisibility(object, newVisibility);
          }
        }
      });
    }
  }, [updateLayerVisibility, toggleAllMeasurementsVisibility, scene, layerVisibility, applyLayerVisibility]);

  // Calculate if we need to show notifications in the footer
  const isEditing = editMeasurementId !== null || editingSegmentId !== null || movingPointInfo !== null;
  const showNotifications = isEditing || 
    (activeMode !== 'none' && ['length', 'height', 'area'].includes(activeMode)) || isRoofElementMode;

  // Determine if an area measurement is being edited
  const editingAreaMeasurement = editMeasurementId ? 
    measurements.find(m => m.id === editMeasurementId)?.type === 'area' || 
    measurements.find(m => m.id === editMeasurementId)?.type === 'solar'
    : false;

  // Calculate sidebar width based on screen size and orientation
  const getSidebarWidthClass = () => {
    if (isMobile) {
      return "w-full"; // Full width on phones
    } else if (isTablet) {
      return isLandscape ? "w-72" : "w-64"; // Narrower on tablets
    } else {
      return "w-80"; // Default desktop width
    }
  };

  // Component rendering with improved sidebar structure
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="w-full h-full">
        <div 
          className={`absolute top-0 right-0 h-full glass-panel border-l border-border/50 transition-transform duration-300 pointer-events-auto flex flex-col ${!enabled ? 'translate-x-full' : ''} ${getSidebarWidthClass()}`}
        >
          {/* Use our tabbed sidebar component */}
          <TabbedMeasurementSidebar
            activeMode={activeMode}
            toggleMeasurementTool={toggleMeasurementTool}
            editMeasurementId={editMeasurementId}
            editingSegmentId={editingSegmentId}
            movingPointInfo={movingPointInfo}
            measurements={measurements}
            showTable={showTable}
            setShowTable={setShowTable}
            toggleMeasurementVisibility={handleToggleMeasurementVisibility}
            toggleLabelVisibility={handleToggleLabelVisibility}
            handleStartPointEdit={handleStartPointEdit}
            handleDeleteMeasurement={handleDeleteMeasurement}
            handleDeletePoint={handleDeletePoint}
            updateMeasurement={updateMeasurement}
            segmentsOpen={segmentsOpen}
            toggleSegments={toggleSegments}
            onEditSegment={setEditingSegmentId}
            handleCancelEditing={handleCancelEditingWithCleanup}
            handleMoveMeasurementUp={handleMoveMeasurementUp}
            handleMoveMeasurementDown={handleMoveMeasurementDown}
            isEditing={showNotifications}
            editingAreaMeasurement={editingAreaMeasurement}
            handleClearMeasurements={handleClearMeasurements}
            layerVisibility={layerVisibility}
            onLayerChange={handleLayerChange}
          />
          
          {/* Active measurement controls (when creating new measurements) */}
          {(activeMode !== 'none' && ['length', 'height', 'area'].includes(activeMode) || isRoofElementMode) && !isEditing && (
            <div className="border-t border-border/30 overflow-visible">
              <ScrollArea className="max-h-[240px]" autoMaxHeight>
                {/* Standard measurement controls */}
                {activeMode !== 'none' && ['length', 'height', 'area'].includes(activeMode) && (
                  <MeasurementControls
                    activeMode={activeMode}
                    currentPoints={currentPoints}
                    handleFinalizeMeasurement={handleFinalizeMeasurement}
                    handleUndoLastPoint={handleUndoLastPoint}
                    clearCurrentPoints={clearCurrentPoints}
                  />
                )}
                
                {/* Roof element controls */}
                {isRoofElementMode && (
                  <RoofElementControls
                    activeMode={activeMode}
                    currentPoints={currentPoints}
                    handleFinalizeMeasurement={handleFinalizeMeasurement}
                    handleUndoLastPoint={handleUndoLastPoint}
                    clearCurrentPoints={clearCurrentPoints}
                  />
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeasurementTools;
