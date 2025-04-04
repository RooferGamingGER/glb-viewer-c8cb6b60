
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRightSquare, RotateCcw, Save, LayoutPanelTop } from "lucide-react";
import { MeasurementMode, Point } from '@/types/measurements';
import PVAlignmentSelector from './PVAlignmentSelector';
import { useMeasurementContext } from '@/contexts/MeasurementContext';
import { toast } from '@/components/ui/use-toast';

interface RoofElementControlsProps {
  activeMode: MeasurementMode;
  currentPoints: Point[];
  handleFinalizeMeasurement: () => void;
  handleUndoLastPoint: () => void;
  clearCurrentPoints: () => void;
}

const RoofElementControls: React.FC<RoofElementControlsProps> = ({
  activeMode,
  currentPoints,
  handleFinalizeMeasurement,
  handleUndoLastPoint,
  clearCurrentPoints
}) => {
  const { measurements } = useMeasurementContext();
  const [showAlignmentSelector, setShowAlignmentSelector] = useState(false);
  const [alignmentEdge, setAlignmentEdge] = useState<{ from: Point; to: Point } | null>(null);
  
  // Determine if we need minimum 3 points (area-based) or just 1 point (point-based)
  const isAreaMode = activeMode === 'solar' || activeMode === 'skylight' || activeMode === 'chimney';
  const isPointMode = activeMode === 'vent' || activeMode === 'hook';
  
  const requiredPoints = isAreaMode ? 3 : isPointMode ? 1 : 2;
  
  const handleFinalize = () => {
    if (activeMode === 'solar' && !alignmentEdge) {
      // For solar measurements, first show alignment selector
      setShowAlignmentSelector(true);
    } else {
      // Proceed with measurement finalization directly
      handleFinalizeMeasurement();
      // Reset alignment state
      setShowAlignmentSelector(false);
      setAlignmentEdge(null);
    }
  };
  
  const handleAlignmentSet = (edge: { from: Point; to: Point }) => {
    setAlignmentEdge(edge);
    setShowAlignmentSelector(false);
    
    // Store the alignment info in sessionStorage for use during measurement finalization
    sessionStorage.setItem('pvAlignmentEdge', JSON.stringify(edge));
    
    // Show toast and finalize measurement
    toast({
      title: "Ausrichtung festgelegt",
      description: "Die PV-Module werden an der ausgewählten Kante ausgerichtet.",
      duration: 3000
    });
    
    // Now finalize the measurement with the alignment edge
    handleFinalizeMeasurement();
  };
  
  const handleCancelAlignment = () => {
    setShowAlignmentSelector(false);
    // Let the user continue defining the solar area
  };
  
  const getTitle = () => {
    switch (activeMode) {
      case 'solar': return 'PV-Module/Solarbereich platzieren';
      case 'skylight': return 'Dachfenster platzieren';
      case 'chimney': return 'Schornstein platzieren';
      case 'vent': return 'Entlüftung platzieren';
      case 'hook': return 'Dachhaken platzieren';
      default: return 'Dachelement platzieren';
    }
  };
  
  const getCompletionText = () => {
    if (activeMode === 'solar') {
      return 'PV-Fläche fertigstellen';
    } else if (isAreaMode) {
      return 'Fläche fertigstellen';
    } else {
      return 'Punkt setzen';
    }
  };
  
  return (
    <div className="p-3 border-b border-border/50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">{getTitle()}</h3>
        <div className="text-xs text-muted-foreground">
          {currentPoints.length}/{requiredPoints}+ Punkte
        </div>
      </div>
      
      {showAlignmentSelector ? (
        <PVAlignmentSelector 
          measurement={{ id: 'temp', type: 'solar', points: currentPoints, value: 0 }}
          measurements={measurements}
          onAlignmentSet={handleAlignmentSet}
          onCancel={handleCancelAlignment}
        />
      ) : (
        <>
          <div className="mb-2 text-xs text-muted-foreground">
            {isAreaMode ? (
              "Klicken Sie auf das Dach, um die Eckpunkte des Elements zu definieren."
            ) : (
              "Klicken Sie auf das Dach, um die Position des Elements zu definieren."
            )}
          </div>
          
          <div className="flex justify-between space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndoLastPoint}
              disabled={currentPoints.length === 0}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Zurück</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearCurrentPoints}
              disabled={currentPoints.length === 0}
            >
              <ArrowRightSquare className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Abbrechen</span>
            </Button>
            
            {activeMode === 'solar' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleFinalize}
                disabled={currentPoints.length < requiredPoints}
              >
                <LayoutPanelTop className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">{getCompletionText()}</span>
              </Button>
            )}
            
            {activeMode !== 'solar' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleFinalizeMeasurement}
                disabled={currentPoints.length < requiredPoints}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">{getCompletionText()}</span>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RoofElementControls;
