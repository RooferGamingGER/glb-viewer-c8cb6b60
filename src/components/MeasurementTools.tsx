import React, { useState, useEffect } from 'react';
import * as THREE from 'three';

// Import custom hooks
import { useThreeObjects } from '@/hooks/useThreeObjects';
import { useLabelScaling } from '@/hooks/useLabelScaling';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useMeasurementState } from '@/hooks/useMeasurementState';
import { useMeasurementCleanup } from '@/hooks/useMeasurementCleanup';
import { useMeasurementVisibility } from '@/hooks/useMeasurementVisibility';

// Import visualization utilities
import { 
  renderCurrentPoints, 
  renderEditPoints, 
  renderMeasurements,
  clearAllVisuals
} from '@/utils/measurementVisuals';

// Import components
import MeasurementSidebar from './measurement/MeasurementSidebar';
import MeasurementToolControls from './measurement/MeasurementToolControls';
import MeasurementControls from './measurement/MeasurementControls';
import EditingAlert from './measurement/EditingAlert';
import RoofElementControls from './measurement/RoofElementControls';

interface MeasurementToolsProps {
  enabled: boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
  autoOpenSidebar?: boolean;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera,
  autoOpenSidebar = false
}) => {
  // Measurement state from main hook
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
    moveMeasurementDown
  } = useMeasurements();

  // Three.js object references
  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef
  } = useThreeObjects(scene, enabled);

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
  } = useMeasurementInteraction(
    enabled,
    scene,
    camera,
    true, // Always open
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
    interactionHandlers,
    editMeasurementId,
    editingPointIndex
  );

  // Scale labels based on camera distance
  useLabelScaling(camera, labelsRef, segmentLabelsRef);
  
  // Utils for cleaning up measurement visuals
  const { clearMeasurementVisuals } = useMeasurementCleanup();
  
  // Utils for handling measurement visibility
  const { 
    handleToggleMeasurementVisibility,
    handleToggleLabelVisibility,
    updateAllLabelsVisibility,
    updateMeasurementMarkers
  } = useMeasurementVisibility(
    measurements,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    {
      pointsRef,
      linesRef,
      measurementsRef,
      labelsRef,
      segmentLabelsRef
    }
  );

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

  // Update visibility when allLabelsVisible changes
  useEffect(() => {
    updateAllLabelsVisibility(allLabelsVisible);
  }, [allLabelsVisible, updateAllLabelsVisibility]);

  // Handle label visibility based on edit mode
  useEffect(() => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;
    
    // Determine if we're in any edit mode
    const isEditing = editMeasurementId !== null || movingPointInfo !== null || editingSegmentId !== null;
    
    // Process all labels in both groups
    const processLabel = (label: THREE.Object3D, isSegmentLabel = false) => {
      if (!label.userData) return;
      
      // Preview labels are always visible
      if (label.userData.isPreview) {
        label.visible = true;
        return;
      }
      
      // During editing, hide all non-preview labels
      if (isEditing) {
        label.visible = false;
        return;
      }
      
      // When not editing, set visibility based on the measurement's visibility state
      const measurementId = label.userData.measurementId;
      if (measurementId) {
        const measurement = measurements.find(m => m.id === measurementId);
        // Only show label if measurement exists and is visible
        label.visible = measurement?.visible !== false && measurement?.labelVisible !== false;
      } else {
        // If no measurement ID, default to visible
        label.visible = true;
      }
    };
    
    // Process main labels
    labelsRef.current.children.forEach(label => {
      processLabel(label);
    });
    
    // Process segment labels
    segmentLabelsRef.current.children.forEach(label => {
      processLabel(label, true);
    });
    
  }, [editMeasurementId, movingPointInfo, editingSegmentId, measurements, allLabelsVisible]);

  // Clean up labels when editing starts and re-render when editing is complete
  useEffect(() => {
    if ((editMeasurementId === null && !movingPointInfo) || !enabled) {
      // When editing is complete, re-render all measurements to ensure labels are updated
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true
      );
    }
  }, [editMeasurementId, movingPointInfo, measurements, enabled, measurementsRef, labelsRef, segmentLabelsRef]);

  // Re-render measurements when they change
  useEffect(() => {
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
  }, [measurements]);

  // Re-render current points when they change
  useEffect(() => {
    renderCurrentPoints(
      pointsRef.current, 
      linesRef.current, 
      labelsRef.current, 
      currentPoints, 
      activeMode
    );
  }, [currentPoints, activeMode]);

  // Re-render edit points when edit state changes
  useEffect(() => {
    renderEditPoints(
      editPointsRef.current, 
      measurements, 
      editMeasurementId, 
      editingPointIndex, 
      true
    );
  }, [measurements, editMeasurementId, editingPointIndex]);

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
        true
      );
      
      renderEditPoints(
        editPointsRef.current, 
        measurements, 
        editMeasurementId, 
        editingPointIndex, 
        true
      );
    }
  }, [enabled, measurements, editMeasurementId, editingPointIndex, clearPreviewGroup, clearAddPointIndicators]);

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
      true
    );
  };

  // Check if current mode is a roof element mode
  const isRoofElementMode = ![
    'length', 'height', 'area', 'none'
  ].includes(activeMode);

  // Handle label visibility toggling
  const handleToggleAllLabelsVisibility = () => {
    toggleAllLabelsVisibility();
    updateAllLabelsVisibility(!allLabelsVisible);
  };

  // Break up the component into logical sections
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="w-full h-full flex flex-col">
        <div 
          className={`absolute top-0 right-0 bottom-[2.75rem] glass-panel border-l border-border/50 transition-transform duration-300 pointer-events-auto flex flex-col ${!enabled ? 'translate-x-full' : ''}`}
          style={{ width: '20rem', maxHeight: 'calc(100% - 2.75rem)' }}
        >
          {/* Fixed Header - Tools Section */}
          <div className="flex-shrink-0 border-b border-border/50">
            <MeasurementToolControls 
              activeMode={activeMode}
              toggleMeasurementTool={toggleMeasurementTool}
              editMeasurementId={editMeasurementId}
              measurements={measurements}
              showTable={showTable}
              setShowTable={setShowTable}
            />
            
            {/* Only render MeasurementControls for standard measurements */}
            {activeMode !== 'none' && ['length', 'height', 'area'].includes(activeMode) && (
              <MeasurementControls
                activeMode={activeMode}
                currentPoints={currentPoints}
                handleFinalizeMeasurement={handleFinalizeMeasurement}
                handleUndoLastPoint={handleUndoLastPoint}
                clearCurrentPoints={clearCurrentPoints}
              />
            )}
            
            {/* Only render RoofElementControls for roof elements */}
            {isRoofElementMode && (
              <RoofElementControls
                activeMode={activeMode}
                currentPoints={currentPoints}
                handleFinalizeMeasurement={handleFinalizeMeasurement}
                handleUndoLastPoint={handleUndoLastPoint}
                clearCurrentPoints={clearCurrentPoints}
              />
            )}
            
            {(editMeasurementId || editingSegmentId || movingPointInfo) && (
              <div className="p-3 pb-0">
                <EditingAlert 
                  editMeasurementId={editMeasurementId}
                  editingSegmentId={editingSegmentId}
                  movingPointInfo={movingPointInfo}
                  handleCancelEditing={handleCancelEditingWithCleanup}
                  editingAreaMeasurement={editMeasurementId ? 
                    measurements.find(m => m.id === editMeasurementId)?.type === 'area' || 
                    measurements.find(m => m.id === editMeasurementId)?.type === 'solar'
                    : false}
                />
              </div>
            )}
          </div>
          
          {/* Measurement list */}
          <MeasurementSidebar
            measurements={measurements}
            toggleMeasurementVisibility={handleToggleMeasurementVisibility}
            toggleLabelVisibility={handleToggleLabelVisibility}
            handleStartPointEdit={handleStartPointEdit}
            handleDeleteMeasurement={handleDeleteMeasurement}
            handleDeletePoint={handleDeletePoint}
            updateMeasurement={updateMeasurement}
            editMeasurementId={editMeasurementId}
            segmentsOpen={segmentsOpen}
            toggleSegments={toggleSegments}
            onEditSegment={setEditingSegmentId}
            movingPointInfo={movingPointInfo}
            showTable={showTable}
            handleClearMeasurements={handleClearMeasurements}
            toggleAllLabelsVisibility={handleToggleAllLabelsVisibility}
            allLabelsVisible={allLabelsVisible}
            activeMode={activeMode}
            handleMoveMeasurementUp={handleMoveMeasurementUp}
            handleMoveMeasurementDown={handleMoveMeasurementDown}
          />
        </div>
      </div>
    </div>
  );
};

export default MeasurementTools;
