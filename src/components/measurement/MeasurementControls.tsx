
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Undo2, 
  X 
} from 'lucide-react';
import { MeasurementMode, Point } from '@/types/measurements';
import { useIsMobile } from '@/hooks/use-mobile';

interface MeasurementControlsProps {
  activeMode: MeasurementMode;
  currentPoints: Point[];
  handleFinalizeMeasurement: () => void;
  handleUndoLastPoint: () => void;
  clearCurrentPoints: () => void;
}

/**
 * Controls for active measurements
 */
const MeasurementControls: React.FC<MeasurementControlsProps> = ({
  activeMode,
  currentPoints,
  handleFinalizeMeasurement,
  handleUndoLastPoint,
  clearCurrentPoints
}) => {
  const isMobile = useIsMobile();
  
  // Exit early if no measurement tool is active
  if (activeMode === 'none') return null;
  
  // Only render for standard measurements and deduction areas
  // This component handles 'length', 'height', 'area', and 'deductionarea'
  if (!['length', 'height', 'area', 'deductionarea'].includes(activeMode)) {
    return null;
  }
  
  // Check if the current mode is an area type (area or deductionarea)
  const isAreaType = activeMode === 'area' || activeMode === 'deductionarea';
  
  // Minimum points required based on measurement type
  const minPointsRequired = isAreaType ? 3 : 2;
  
  // Standard measurement controls for length, height, area, deductionarea
  return (
    <div className="p-3">
      <div className={`p-2 border border-primary/30 rounded-md bg-primary/5 ${isMobile ? 'mb-2' : 'mb-4'}`}>
        <div className="text-sm font-medium mb-2">
          {activeMode === 'length' && "Längenmessung aktiv"}
          {activeMode === 'height' && "Höhenmessung aktiv"}
          {activeMode === 'area' && "Flächenmessung aktiv"}
          {activeMode === 'deductionarea' && "Abzugsfläche aktiv"}
          <span className="text-xs text-muted-foreground ml-2">
            ({currentPoints.length} {isAreaType && `/ ${minPointsRequired}+`} Punkte)
          </span>
        </div>
        
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-1'} mb-1`}>
          <Button
            variant="default" 
            size={isMobile ? "sm" : "sm"}
            className={isMobile ? "w-full" : "flex-1"}
            onClick={handleFinalizeMeasurement}
            disabled={currentPoints.length < minPointsRequired}
            title="Messung abschließen"
          >
            <Check className="h-3 w-3 mr-1" />
            Abschließen
          </Button>
          
          <Button
            variant="outline" 
            size={isMobile ? "sm" : "sm"}
            className={isMobile ? "w-full" : "flex-1"}
            onClick={handleUndoLastPoint}
            disabled={currentPoints.length === 0}
            title="Letzten Punkt rückgängig machen"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Rückgängig
          </Button>
          
          <Button
            variant="outline" 
            size={isMobile ? "sm" : "sm"}
            className={isMobile ? "w-full" : isAreaType ? "w-9" : "flex-1"}
            onClick={clearCurrentPoints}
            title="Abbrechen"
          >
            <X className="h-3 w-3" />
            {(!isAreaType || isMobile) && <span className="ml-1">Abbrechen</span>}
          </Button>
        </div>
        
        {isAreaType && (
          <div className="flex items-start mt-2 text-xs text-muted-foreground overflow-visible">
            <span className="whitespace-normal break-words">
              {activeMode === 'deductionarea' 
                ? "Klicken Sie auf die Punkte, um eine Abzugsfläche zu definieren. Mindestens 3 Punkte werden benötigt."
                : "Klicken Sie auf die Punkte, um eine Fläche zu definieren. Mindestens 3 Punkte werden benötigt."
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasurementControls;
