import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Measurement, PVModuleInfo } from '@/types/measurements';
import PVModuleVisualizer from './PVModuleVisualizer';
import PVPlanningControls from './PVPlanningControls';
import { usePVPlanningMode } from '@/hooks/usePVPlanningMode';
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PVModuleManagerProps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  measurements: Measurement[];
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
}

const PVModuleManager: React.FC<PVModuleManagerProps> = ({
  scene,
  camera,
  measurements,
  updateMeasurement
}) => {
  const [showPlanningControls, setShowPlanningControls] = useState(false);
  const [detailLevel, setDetailLevel] = useState<'simple' | 'detailed'>('detailed');
  
  // Initialize the PV planning hook
  const {
    activePlanningId,
    moduleOrientation,
    edgeDistance,
    moduleSpacing,
    initPlanningMode,
    exitPlanningMode,
    updateModuleLayout,
    toggleOrientation,
    setModuleEdgeDistance,
    setModuleGapSpacing,
    generateOptimalLayout
  } = usePVPlanningMode(scene, camera, measurements, updateMeasurement);
  
  // Track the active planning measurement
  const activePlanningMeasurement = measurements.find(m => m.id === activePlanningId);
  
  // Initialize planning mode when a pvplanning measurement is selected
  useEffect(() => {
    const planningMeasurements = measurements.filter(m => m.type === 'pvplanning');
    
    if (planningMeasurements.length > 0 && !activePlanningId) {
      // Auto-select the first planning measurement on component mount
      initPlanningMode(planningMeasurements[0].id);
      setShowPlanningControls(true);
    }
  }, [measurements, activePlanningId, initPlanningMode]);
  
  // Handle finishing the planning process
  const handleFinishPlanning = () => {
    setShowPlanningControls(false);
    // We don't exit planning mode here to keep the visualizations active
  };
  
  // Handle canceling the planning process
  const handleCancelPlanning = () => {
    setShowPlanningControls(false);
    exitPlanningMode();
  };
  
  return (
    <>
      {/* Render module visualizers for each measurement */}
      {measurements.map(measurement => {
        if (
          (measurement.type === 'pvmodule' || measurement.type === 'pvplanning') && 
          measurement.pvModuleInfo && 
          measurement.visible !== false
        ) {
          return (
            <PVModuleVisualizer
              key={measurement.id}
              scene={scene}
              moduleInfo={measurement.pvModuleInfo}
              moduleSpec={measurement.pvModuleSpec}
              detailLevel={detailLevel}
              measurementId={measurement.id}
              // Make modules interactive only for the active planning measurement
              isInteractive={measurement.id === activePlanningId}
            />
          );
        }
        return null;
      })}
      
      {/* Planning controls dialog */}
      <Dialog open={showPlanningControls} onOpenChange={setShowPlanningControls}>
        <DialogContent className="sm:max-w-md">
          <PVPlanningControls
            activeMeasurement={activePlanningMeasurement || null}
            orientation={moduleOrientation}
            edgeDistance={edgeDistance}
            moduleSpacing={moduleSpacing}
            selectedModuleSpec={activePlanningMeasurement?.pvModuleSpec}
            onToggleOrientation={toggleOrientation}
            onEdgeDistanceChange={setModuleEdgeDistance}
            onModuleSpacingChange={setModuleGapSpacing}
            onGenerateOptimalLayout={generateOptimalLayout}
            onFinishPlanning={handleFinishPlanning}
            onCancelPlanning={handleCancelPlanning}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PVModuleManager;
