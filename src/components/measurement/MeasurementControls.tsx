
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Undo2, 
  X 
} from 'lucide-react';
import { MeasurementMode, Point } from '@/types/measurements';

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
  // Exit early if no measurement tool is active
  if (activeMode === 'none') return null;
  
  // For roof elements and penetrations, don't render anything here
  // This prevents duplicate UI for roof elements like 'solar'
  if (!['length', 'height', 'area'].includes(activeMode)) {
    return null;
  }
  
  // Standard measurement controls for length, height, area
  return (
    <div className="p-3 pb-0">
      <div className="p-2 border border-primary/30 rounded-md bg-primary/5">
        <div className="text-sm font-medium mb-2">
          {activeMode === 'length' && "Längenmessung aktiv"}
          {activeMode === 'height' && "Höhenmessung aktiv"}
          {activeMode === 'area' && "Flächenmessung aktiv"}
          <span className="text-xs text-muted-foreground ml-2">
            ({currentPoints.length} Punkte)
          </span>
        </div>
        
        <div className="flex space-x-1 mb-1">
          {(activeMode === 'area' || activeMode === 'length' || activeMode === 'height') && (
            <>
              <Button
                variant="default" 
                size="sm"
                className="flex-1"
                onClick={handleFinalizeMeasurement}
                disabled={
                  (activeMode === 'area' && currentPoints.length < 3) ||
                  ((activeMode === 'length' || activeMode === 'height') && currentPoints.length < 2)
                }
                title="Messung abschließen"
              >
                <Check className="h-3 w-3 mr-1" />
                Abschließen
              </Button>
              
              <Button
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={handleUndoLastPoint}
                disabled={currentPoints.length === 0}
                title="Letzten Punkt rückgängig machen"
              >
                <Undo2 className="h-3 w-3 mr-1" />
                Rückgängig
              </Button>
            </>
          )}
          
          <Button
            variant="outline" 
            size="sm"
            className={activeMode === 'area' ? "w-9" : "flex-1"}
            onClick={clearCurrentPoints}
            title="Abbrechen"
          >
            <X className="h-3 w-3" />
            {activeMode !== 'area' && <span className="ml-1">Abbrechen</span>}
          </Button>
        </div>
        
        {activeMode === 'area' && (
          <div className="flex items-start mt-2 text-xs text-muted-foreground">
            <span className="whitespace-normal break-words">
              Klicken Sie auf die Punkte, um eine Fläche zu definieren. 
              Mindestens 3 Punkte werden benötigt.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasurementControls;
