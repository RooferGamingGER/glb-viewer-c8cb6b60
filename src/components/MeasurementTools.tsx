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
import { calculatePVModulePlacement, extractExclusionZones } from '@/utils/pvCalculations';
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
import MeasurementOverlay from './measurement/MeasurementOverlay';

import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  // Sidebar collapsed state - default closed
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Register the scene with the point snapping context
  const { registerScene } = usePointSnapping();
  
  React.useEffect(() => {
    if (scene && enabled) {
      registerScene(scene);
    }
    return () => { registerScene(null); };
  }, [scene, enabled, registerScene]);

  // Measurement state from main hook
  const { 
    measurements, currentPoints, addPoint, activeMode, toggleMeasurementTool,
    clearMeasurements, clearCurrentPoints, finalizeMeasurement,
    toggleMeasurementVisibility, toggleLabelVisibility,
    toggleAllMeasurementsVisibility, toggleAllLabelsVisibility,
    toggleEditMode, updateMeasurement, deleteMeasurement, deletePoint,
    undoLastPoint, editMeasurementId, editingPointIndex, startPointEdit,
    cancelEditing, updateMeasurementPoint, allLabelsVisible,
    moveMeasurementUp, moveMeasurementDown, importMeasurements
  } = useMeasurements();

  // Three.js object references
  const {
    pointsRef, linesRef, measurementsRef, editPointsRef, labelsRef, segmentLabelsRef
  } = useThreeObjects(scene, enabled);

  // Handlers for measurement interaction
  const interactionHandlers = {
    addPoint, startPointEdit, updateMeasurementPoint, toggleEditMode
  };

  const { 
    movingPointInfo, setMovingPointInfo, clearPreviewGroup, clearAddPointIndicators 
  } = useMeasurementInteraction(
    enabled, scene, camera, true,
    { pointsRef, linesRef, measurementsRef, editPointsRef, labelsRef, segmentLabelsRef },
    measurements, currentPoints, activeMode, interactionHandlers,
    editMeasurementId, editingPointIndex
  );

  useLabelScaling(camera, labelsRef, segmentLabelsRef);
  const { clearMeasurementVisuals } = useMeasurementCleanup();
  
  const { 
    handleToggleMeasurementVisibility, handleToggleLabelVisibility,
    updateAllLabelsVisibility, updateMeasurementMarkers
  } = useMeasurementVisibility(
    measurements, toggleMeasurementVisibility, toggleLabelVisibility,
    { pointsRef, linesRef, measurementsRef, labelsRef, segmentLabelsRef }
  );

  const { 
    showTable, setShowTable, segmentsOpen, editingSegmentId, setEditingSegmentId,
    toggleSegments, handleClearMeasurements, handleFinalizeMeasurement,
    handleUndoLastPoint, handleCancelEditing, handleStartPointEdit,
    handleDeleteMeasurement, handleDeletePoint, handleMoveMeasurementUp,
    handleMoveMeasurementDown
  } = useMeasurementState(
    measurements, currentPoints, activeMode, editMeasurementId,
    {
      toggleMeasurementVisibility, toggleEditMode, deleteMeasurement, deletePoint,
      updateMeasurement, finalizeMeasurement, undoLastPoint, clearCurrentPoints,
      clearMeasurements, cancelEditing, toggleMeasurementTool,
      moveMeasurementUp, moveMeasurementDown
    }
  );

  React.useEffect(() => {
    if (activeMode !== 'none') return;
    updateAllLabelsVisibility(allLabelsVisible);
  }, [allLabelsVisible, updateAllLabelsVisibility, activeMode]);

  // Auto-import embedded measurements from GLB
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

  // Handle label visibility based on edit/draw mode
  React.useEffect(() => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;
    const isEditing = editMeasurementId !== null || movingPointInfo !== null || editingSegmentId !== null;
    const isDrawingMode = activeMode !== 'none';

    const processLabel = (label: THREE.Object3D) => {
      if (!label.userData) return;
      if (label.userData.isPreview) { label.visible = true; return; }
      if (isEditing || isDrawingMode) { label.visible = false; return; }

      const measurementId = label.userData.measurementId;
      if (measurementId) {
        const measurement = measurements.find(m => m.id === measurementId);
        label.visible = measurement?.visible !== false && measurement?.labelVisible !== false;
      } else {
        label.visible = true;
      }
    };

    labelsRef.current.children.forEach(label => processLabel(label));
    segmentLabelsRef.current.children.forEach(label => processLabel(label));
  }, [editMeasurementId, movingPointInfo, editingSegmentId, measurements, allLabelsVisible, activeMode]);

  const isDrawing = activeMode !== 'none';

  React.useEffect(() => {
    if ((editMeasurementId === null && !movingPointInfo) || !enabled) {
      renderMeasurements(measurementsRef.current, labelsRef.current, segmentLabelsRef.current, measurements, true, isDrawing);
    }
  }, [editMeasurementId, movingPointInfo, measurements, enabled, isDrawing]);

  React.useEffect(() => {
    renderMeasurements(measurementsRef.current, labelsRef.current, segmentLabelsRef.current, measurements, true, isDrawing);
  }, [measurements, isDrawing]);

  React.useEffect(() => {
    renderCurrentPoints(pointsRef.current, linesRef.current, labelsRef.current, currentPoints, activeMode);
  }, [currentPoints, activeMode]);

  React.useEffect(() => {
    renderEditPoints(editPointsRef.current, measurements, editMeasurementId, editingPointIndex, true);
  }, [measurements, editMeasurementId, editingPointIndex]);

  React.useEffect(() => {
    if (!enabled) {
      clearAllVisuals(pointsRef.current, linesRef.current, measurementsRef.current, editPointsRef.current, labelsRef.current, segmentLabelsRef.current);
      if (clearPreviewGroup) clearPreviewGroup();
      if (clearAddPointIndicators) clearAddPointIndicators();
    } else {
      renderMeasurements(measurementsRef.current, labelsRef.current, segmentLabelsRef.current, measurements, true, isDrawing);
      renderEditPoints(editPointsRef.current, measurements, editMeasurementId, editingPointIndex, true);
    }
  }, [enabled, measurements, editMeasurementId, editingPointIndex, clearPreviewGroup, clearAddPointIndicators, isDrawing]);

  const handleCancelEditingWithCleanup = () => {
    handleCancelEditing();
    setMovingPointInfo(null);
    if (clearPreviewGroup) clearPreviewGroup();
    if (clearAddPointIndicators) clearAddPointIndicators();
    renderMeasurements(measurementsRef.current, labelsRef.current, segmentLabelsRef.current, measurements, true, false);
  };

  const isRoofElementMode = !['length', 'height', 'area', 'deductionarea', 'none'].includes(activeMode);

  const handleToggleAllLabelsVisibility = () => {
    toggleAllLabelsVisibility();
    if (activeMode === 'none') {
      updateAllLabelsVisibility(!allLabelsVisible);
    }
  };

  // Auto-open sidebar when measurements exist
  React.useEffect(() => {
    if (measurements.length > 0 && !sidebarOpen) {
      // Don't auto-open, user controls this
    }
  }, [measurements.length]);

  // Convert area to solar handler for overlay
  const handleConvertAreaToSolar = React.useCallback((areaId: string) => {
    const { calculatePVModulePlacement, extractExclusionZones } = require('@/utils/pvCalculations');
    const areaMeasurement = measurements.find(m => m.id === areaId);
    if (!areaMeasurement || !areaMeasurement.points || areaMeasurement.points.length < 3) return;
    const exclusionZones = extractExclusionZones(measurements);
    const pvModuleInfo = calculatePVModulePlacement(areaMeasurement.points, undefined, undefined, undefined, undefined, undefined, undefined, true, 'auto', exclusionZones);
    updateMeasurement(areaId, { type: 'solar' as any, pvModuleInfo });
    smartToast.success(`Fläche in Solarfläche umgewandelt — ${pvModuleInfo.moduleCount} Module`);
  }, [measurements, updateMeasurement]);

  const { isPortrait, isTablet, isPhone } = useScreenOrientation();
  const useBottomSheet = isPortrait && (isPhone || isTablet);

  const [isMobileMeasurePanelOpen, setIsMobileMeasurePanelOpen] = React.useState(false);
  const [isMobileMassesOpen, setIsMobileMassesOpen] = React.useState(false);
  const [isMobileExportOpen, setIsMobileExportOpen] = React.useState(false);

  const showMobileBottomBar = useBottomSheet && enabled;
  const showMobileMeasureToolbar = useBottomSheet && enabled && activeMode !== 'none';

  // Sidebar content - only Solar, Roof elements, and Massen detail
  const sidebarContent = (
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

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Measurement Overlay - top-left floating toolbar */}
      {!useBottomSheet && (
        <MeasurementOverlay
          enabled={enabled}
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool}
          measurements={measurements}
          currentPoints={currentPoints}
          editMeasurementId={editMeasurementId}
          movingPointInfo={movingPointInfo}
          handleFinalizeMeasurement={handleFinalizeMeasurement}
          handleUndoLastPoint={handleUndoLastPoint}
          clearCurrentPoints={clearCurrentPoints}
          handleClearMeasurements={handleClearMeasurements}
          handleDeleteMeasurement={handleDeleteMeasurement}
          toggleAllLabelsVisibility={handleToggleAllLabelsVisibility}
          allLabelsVisible={allLabelsVisible}
          handleCancelEditing={handleCancelEditingWithCleanup}
          updateMeasurement={updateMeasurement}
          onConvertAreaToSolar={handleConvertAreaToSolar}
        />
      )}

      {/* Sidebar - collapsed by default, only Solar/Roof/Massen */}
      {!useBottomSheet && enabled && (
        <>
          {/* Toggle button when sidebar is closed */}
          {!sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              className="absolute top-3 right-3 pointer-events-auto bg-background/95 backdrop-blur-sm shadow-lg z-20"
              onClick={() => setSidebarOpen(true)}
              title="Sidebar öffnen (Solar, Dachelemente, Massen)"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          )}

          {/* Sidebar panel */}
          <div 
            className={`absolute top-0 right-0 glass-panel border-l border-border/50 transition-transform duration-300 pointer-events-auto flex flex-col ${!sidebarOpen ? 'translate-x-full' : ''}`}
            style={{ width: '20rem', maxHeight: 'calc(100vh - 2.75rem)', bottom: '2.75rem' }}
          >
            {/* Close button */}
            <div className="flex items-center justify-between p-2 border-b border-border/30">
              <span className="text-xs font-medium text-muted-foreground">Details</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSidebarOpen(false)}>
                <PanelRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {sidebarContent}
          </div>
        </>
      )}

      {/* Mobile: Mess-Panel above bottom bar */}
      {showMobileBottomBar && isMobileMeasurePanelOpen && activeMode === 'none' && (
        <div
          className="fixed left-0 right-0 z-30 bg-background border-t border-border/50 pointer-events-auto overflow-auto"
          style={{ bottom: `calc(52px + max(env(safe-area-inset-bottom), 8px))`, maxHeight: '50vh' }}
        >
          {sidebarContent}
        </div>
      )}

      {/* Mobile: Mess-Toolbar */}
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
          handleMoveMeasurementUp={handleMoveMeasurementUp}
          handleMoveMeasurementDown={handleMoveMeasurementDown}
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
