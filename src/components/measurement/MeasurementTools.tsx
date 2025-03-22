import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';

import { useThreeObjects } from '@/hooks/useThreeObjects';
import { useLabelScaling } from '@/hooks/useLabelScaling';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useMeasurementState } from '@/hooks/useMeasurementState';
import { useMeasurementCleanup } from '@/hooks/useMeasurementCleanup';
import { useMeasurementVisibility } from '@/hooks/useMeasurementVisibility';

import { 
  renderCurrentPoints, 
  renderEditPoints, 
  renderMeasurements,
  clearAllVisuals
} from '@/utils/measurementVisuals';

import { renderPVModules, updatePVModuleSelection } from '@/utils/pvModuleRenderer';

import MeasurementSidebar from './MeasurementSidebar';
import MeasurementToolControls from './MeasurementToolControls';
import MeasurementControls from './MeasurementControls';
import EditingAlert from './EditingAlert';
import RoofElementControls from './RoofElementControls';
import { Measurement } from '@/types/measurements';

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
    togglePVModulesVisibility,
    toggleDetailedModules,
    toggleModuleSelection,
    selectAllModules,
    deselectAllModules
  } = useMeasurements();

  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef
  } = useThreeObjects(scene, enabled);

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

  const updateVisualState = useCallback((updatedMeasurements: Measurement[], labelVisible: boolean) => {
    if (labelsRef.current && segmentLabelsRef.current) {
      updateAllLabelsVisibility(labelVisible);
    }
    
    if (measurementsRef.current) {
      updateMeasurementMarkers();
      
      updatedMeasurements
        .filter(m => m.type === 'solar' && m.modulesVisible !== false && m.selectedModules !== undefined)
        .forEach(measurement => {
          if (measurement.selectedModules && measurement.selectedModules.length > 0) {
            updatePVModuleSelection(
              measurementsRef.current!,
              labelsRef.current,
              measurement.id,
              measurement.selectedModules
            );
          }
        });
    }
    
    if (measurementsRef.current && labelsRef.current && segmentLabelsRef.current) {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        updatedMeasurements, 
        true
      );
    }
  }, [updateAllLabelsVisibility, updateMeasurementMarkers]);

  useEffect(() => {
    setUpdateVisualState(updateVisualState);
  }, [setUpdateVisualState, updateVisualState]);

  const interactionHandlers = {
    addPoint,
    startPointEdit,
    updateMeasurementPoint
  };

  const { 
    movingPointInfo, 
    setMovingPointInfo, 
    clearPreviewGroup,
    clearAddPointIndicators 
  } = useMeasurementInteraction(
    enabled,
    scene,
    camera,
    true,
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

  useLabelScaling(camera, labelsRef, segmentLabelsRef);

  const { clearMeasurementVisuals } = useMeasurementCleanup();

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

  useEffect(() => {
    updateAllLabelsVisibility(allLabelsVisible);
  }, [allLabelsVisible, updateAllLabelsVisibility]);

  useEffect(() => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;
    
    const isEditing = editMeasurementId !== null || movingPointInfo !== null || editingSegmentId !== null;
    
    const processLabel = (label: THREE.Object3D, isSegmentLabel = false) => {
      if (!label.userData) return;
      
      if (label.userData.isPreview) {
        label.visible = true;
        return;
      }
      
      if (isEditing) {
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
      processLabel(label, true);
    });
  }, [editMeasurementId, movingPointInfo, editingSegmentId, measurements, allLabelsVisible]);

  useEffect(() => {
    if ((editMeasurementId === null && !movingPointInfo) || !enabled) {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true
      );
    }
  }, [editMeasurementId, movingPointInfo, measurements, enabled, measurementsRef, labelsRef, segmentLabelsRef]);

  useEffect(() => {
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
  }, [measurements]);

  useEffect(() => {
    renderCurrentPoints(
      pointsRef.current, 
      linesRef.current, 
      labelsRef.current, 
      currentPoints, 
      activeMode
    );
  }, [currentPoints, activeMode]);

  useEffect(() => {
    renderEditPoints(
      editPointsRef.current, 
      measurements, 
      editMeasurementId, 
      editingPointIndex, 
      true
    );
  }, [measurements, editMeasurementId, editingPointIndex]);

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

  const handleCancelEditingWithCleanup = () => {
    handleCancelEditing();
    setMovingPointInfo(null);
    
    if (clearPreviewGroup) {
      clearPreviewGroup();
    }
    
    if (clearAddPointIndicators) {
      clearAddPointIndicators();
    }
    
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
  };

  const isRoofElementMode = ![
    'length', 'height', 'area', 'none'
  ].includes(activeMode);

  const handleToggleAllLabelsVisibility = () => {
    toggleAllLabelsVisibility();
  };

  const handleUpdateMeasurement = (measurement: Measurement) => {
    if (updateMeasurement) {
      updateMeasurement(measurement);
    }
  };

  const handleToggleSegments = () => {
    if (toggleSegments) {
      toggleSegments();
      return true; // Return a boolean value
    }
    return false;
  };

  const handleEditSegment = () => {
    // This is a stub function to satisfy type requirements
    // The actual implementation will be provided by the parent component
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="w-full h-full">
        <div 
          className={`absolute top-0 right-0 h-full w-80 glass-panel border-l border-border/50 transition-transform duration-300 pointer-events-auto flex flex-col ${!enabled ? 'translate-x-full' : ''}`}
        >
          <div className="flex-shrink-0 border-b border-border/50">
            <MeasurementToolControls 
              activeMode={activeMode}
              toggleMeasurementTool={toggleMeasurementTool}
              editMeasurementId={editMeasurementId}
              measurements={measurements}
              showTable={showTable}
              setShowTable={setShowTable}
            />
            
            {activeMode !== 'none' && ['length', 'height', 'area'].includes(activeMode) && (
              <MeasurementControls
                activeMode={activeMode}
                currentPoints={currentPoints}
                handleFinalizeMeasurement={handleFinalizeMeasurement}
                handleUndoLastPoint={handleUndoLastPoint}
                clearCurrentPoints={clearCurrentPoints}
              />
            )}
            
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
          
          <MeasurementSidebar
            measurements={measurements}
            toggleMeasurementVisibility={handleToggleMeasurementVisibility}
            toggleLabelVisibility={handleToggleLabelVisibility}
            togglePVModulesVisibility={togglePVModulesVisibility}
            handleStartPointEdit={handleStartPointEdit}
            handleDeleteMeasurement={handleDeleteMeasurement}
            handleDeletePoint={handleDeletePoint}
            updateMeasurement={handleUpdateMeasurement}
            editMeasurementId={editMeasurementId}
            segmentsOpen={segmentsOpen}
            toggleSegments={handleToggleSegments}
            onEditSegment={setEditingSegmentId}
            movingPointInfo={movingPointInfo}
            showTable={showTable}
            handleClearMeasurements={handleClearMeasurements}
            toggleAllLabelsVisibility={handleToggleAllLabelsVisibility}
            allLabelsVisible={allLabelsVisible}
            activeMode={activeMode}
            handleMoveMeasurementUp={handleMoveMeasurementUp}
            handleMoveMeasurementDown={handleMoveMeasurementDown}
            toggleModuleSelection={toggleModuleSelection}
            selectAllModules={selectAllModules}
            deselectAllModules={deselectAllModules}
            toggleDetailedModules={toggleDetailedModules}
          />
        </div>
      </div>
    </div>
  );
};

export default MeasurementTools;
