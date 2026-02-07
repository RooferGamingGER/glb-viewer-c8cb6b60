import React from 'react';
import * as THREE from 'three';

// Import custom hooks
import { useThreeObjects } from '@/hooks/useThreeObjects';
import { useLabelScaling } from '@/hooks/useLabelScaling';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useMeasurementState } from '@/hooks/useMeasurementState';
import { useMeasurementCleanup } from '@/hooks/useMeasurementCleanup';
import { useMeasurementVisibility } from '@/hooks/useMeasurementVisibility';
import { usePointSnapping } from '@/contexts/PointSnappingContext';
import { importMeasurementsFromGLB } from '@/utils/glbMeasurementImport';
import { smartToast } from '@/utils/smartToast';


// Import visualization utilities
import { 
  renderCurrentPoints, 
  renderEditPoints, 
  renderMeasurements,
  clearAllVisuals
} from '@/utils/measurementVisuals';

// Import components
import MeasurementToolControls from './measurement/MeasurementToolControls';
import MeasurementControls from './measurement/MeasurementControls';
import EditingAlert from './measurement/EditingAlert';
import RoofElementControls from './measurement/RoofElementControls';
import MobileBottomBar from './measurement/MobileBottomBar';
import MobileMeasureToolbar from './measurement/MobileMeasureToolbar';
import MobileMassesOverlay from './measurement/MobileMassesOverlay';
import MobileExportOverlay from './measurement/MobileExportOverlay';

import { useScreenOrientation } from '@/hooks/useScreenOrientation';

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
  // Register the scene with the point snapping context
  const { registerScene } = usePointSnapping();
  
  // Register scene when component mounts
  React.useEffect(() => {
    if (scene && enabled) {
      registerScene(scene);
    }
    
    return () => {
      // Clean up when component unmounts
      registerScene(null);
    };
  }, [scene, enabled, registerScene]);

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
    moveMeasurementDown,
    importMeasurements
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
    updateMeasurementPoint,
    toggleEditMode
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
  React.useEffect(() => {
    updateAllLabelsVisibility(allLabelsVisible);
  }, [allLabelsVisible, updateAllLabelsVisibility]);

  // Auto-import embedded measurements from GLB once per scene if none exist
  React.useEffect(() => {
    let cancelled = false;
    if (!enabled || !scene) return;
    if ((scene as any)?.userData?._measurementsImported) return;
    if (measurements.length > 0) return;

    (async () => {
      try {
        const imported = await importMeasurementsFromGLB(scene);
        if (!cancelled && imported && imported.length > 0) {
          importMeasurements(imported, false);
          (scene as any).userData._measurementsImported = true;
          smartToast.success(`${imported.length} Messungen aus GLB geladen`);
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [enabled, scene, measurements.length, importMeasurements]);

  // Handle label visibility based on edit mode
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
  }, [measurements]);

  // Re-render current points when they change
  React.useEffect(() => {
    renderCurrentPoints(
      pointsRef.current, 
      linesRef.current, 
      labelsRef.current, 
      currentPoints, 
      activeMode
    );
  }, [currentPoints, activeMode]);

  // Re-render edit points when edit state changes
  React.useEffect(() => {
    renderEditPoints(
      editPointsRef.current, 
      measurements, 
      editMeasurementId, 
      editingPointIndex, 
      true
    );
  }, [measurements, editMeasurementId, editingPointIndex]);

  // Clean up when enabled state changes
  React.useEffect(() => {
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

  // Check if current mode is a roof element mode - exclude deductionarea since it should be treated like area
  const isRoofElementMode = ![
    'length', 'height', 'area', 'deductionarea', 'none'
  ].includes(activeMode);

  // Handle label visibility toggling
  const handleToggleAllLabelsVisibility = () => {
    toggleAllLabelsVisibility();
    updateAllLabelsVisibility(!allLabelsVisible);
  };

  // Orientation-aware layout: bottom sheet in portrait on phones/tablets
  const { isPortrait, isTablet, isPhone } = useScreenOrientation();
  const useBottomSheet = isPortrait && (isPhone || isTablet);

  // Mobile panel states
  const [isMobileMeasurePanelOpen, setIsMobileMeasurePanelOpen] = React.useState(false);
  const [isMobileMassesOpen, setIsMobileMassesOpen] = React.useState(false);
  const [isMobileExportOpen, setIsMobileExportOpen] = React.useState(false);

  const showMobileBottomBar = useBottomSheet && enabled;
  const showMobileMeasureToolbar = useBottomSheet && enabled && activeMode !== 'none';
  

  // Shared panel content
  const panelContent = (
    <div className="flex-1 flex flex-col overflow-hidden">
      <MeasurementToolControls 
        activeMode={activeMode}
        toggleMeasurementTool={toggleMeasurementTool}
        editMeasurementId={editMeasurementId}
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
        movingPointInfo={movingPointInfo}
        handleMoveMeasurementUp={handleMoveMeasurementUp}
        handleMoveMeasurementDown={handleMoveMeasurementDown}
        handleClearMeasurements={handleClearMeasurements}
      />
      {activeMode !== 'none' && ['length', 'height', 'area', 'deductionarea'].includes(activeMode) && (
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
  );

  // Break up the component into logical sections
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {!useBottomSheet && (
        <div className="w-full h-full flex flex-col">
          <div 
            className={`absolute top-0 right-0 glass-panel border-l border-border/50 transition-transform duration-300 pointer-events-auto flex flex-col ${!enabled ? 'translate-x-full' : ''}`}
            style={{ 
              width: '20rem', 
              maxHeight: 'calc(100vh - 2.75rem)',
              bottom: '2.75rem'
            }}
          >
            {panelContent}
          </div>
        </div>
      )}

      {/* Mobile: Mess-Panel above bottom bar — hide when a tool is active */}
      {showMobileBottomBar && isMobileMeasurePanelOpen && activeMode === 'none' && (
        <div
          className="fixed left-0 right-0 z-30 bg-background border-t border-border/50 pointer-events-auto overflow-auto"
          style={{
            bottom: `calc(52px + max(env(safe-area-inset-bottom), 8px))`,
            maxHeight: '50vh',
          }}
        >
          {panelContent}
        </div>
      )}

      {/* Mobile: Mess-Toolbar (Undo/Finalize/Cancel) */}
      {showMobileMeasureToolbar && (
        <MobileMeasureToolbar
          activeMode={activeMode}
          onUndo={handleUndoLastPoint}
          onFinalize={handleFinalizeMeasurement}
          onCancel={() => toggleMeasurementTool(activeMode)}
          currentPointsCount={currentPoints.length}
        />
      )}

      {/* Mobile: Bottom-Bar */}
      {showMobileBottomBar && (
        <MobileBottomBar
          isMeasurePanelOpen={isMobileMeasurePanelOpen}
          onToggleMeasurePanel={() => setIsMobileMeasurePanelOpen(v => !v)}
          onOpenExport={() => setIsMobileExportOpen(true)}
          onOpenMasses={() => setIsMobileMassesOpen(true)}
        />
      )}

      {/* Mobile: Massen-Overlay */}
      {showMobileBottomBar && isMobileMassesOpen && (
        <MobileMassesOverlay
          measurements={measurements}
          onClose={() => setIsMobileMassesOpen(false)}
        />
      )}

      {/* Mobile: Export-Overlay */}
      {showMobileBottomBar && isMobileExportOpen && (
        <MobileExportOverlay
          measurements={measurements}
          onClose={() => setIsMobileExportOpen(false)}
        />
      )}
    </div>
  );
};

export default MeasurementTools;
