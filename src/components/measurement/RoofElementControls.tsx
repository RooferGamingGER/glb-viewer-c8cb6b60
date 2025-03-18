
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Undo2, 
  X,
  Info 
} from 'lucide-react';
import { MeasurementMode, Point } from '@/types/measurements';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  if (!activeMode || activeMode === 'none' || ['length', 'height', 'area'].includes(activeMode)) {
    return null;
  }
  
  const getRequiredPoints = (mode: MeasurementMode): number => {
    switch(mode) {
      case 'solar': 
        return 3; // Flächenmessung
      case 'skylight': 
        return 4; // Vier Punkte für exakte Rechteckdefinition
      case 'chimney': 
        return 4; // Vier Punkte für genaue Vermessung
      case 'gutter':
        return 2; // Lineare Messungen
      case 'vent': 
      case 'hook': 
      case 'other': 
        return 1; // Positionsmarkierung
      default: 
        return 2;
    }
  };

  const getInstructions = (mode: MeasurementMode): string => {
    const requiredPoints = getRequiredPoints(mode);
    const remainingPoints = Math.max(0, requiredPoints - currentPoints.length);
    
    switch(mode) {
      case 'chimney':
        if (currentPoints.length === 0) {
          return "Markieren Sie die erste Ecke des Kaminausschnitts im Dach.";
        } else if (currentPoints.length < 4) {
          return `Markieren Sie die weiteren Ecken des Kaminausschnitts. Noch ${remainingPoints} Punkt(e) benötigt.`;
        } else {
          return "Kaminausschnitt vollständig definiert. Schließen Sie die Messung ab.";
        }
      
      case 'skylight':
        if (currentPoints.length === 0) {
          return "Markieren Sie die erste Ecke des Dachfensters.";
        } else if (currentPoints.length < 4) {
          return `Markieren Sie die weiteren Ecken des Dachfensters. Noch ${remainingPoints} Punkt(e) benötigt.`;
        } else {
          return "Dachfenster vollständig definiert. Schließen Sie die Messung ab.";
        }
      
      case 'solar':
        return `Markieren Sie die Eckpunkte der Solaranlage. Noch ${remainingPoints} Punkt(e) benötigt.`;
      
      case 'gutter':
        if (currentPoints.length === 0) {
          return "Markieren Sie den Startpunkt der Dachrinne.";
        } else {
          return "Markieren Sie das Ende der Dachrinne oder weitere Punkte für einen Linienzug.";
        }
      
      case 'vent':
        return "Markieren Sie die Position des Lüfters.";
        
      case 'hook':
        return "Markieren Sie die Position des Dachhakens.";
        
      case 'other':
        return "Markieren Sie die Position der sonstigen Einbauten.";
      
      default:
        return "Platzieren Sie die erforderlichen Messpunkte.";
    }
  };

  const canFinalize = (): boolean => {
    return currentPoints.length >= getRequiredPoints(activeMode);
  };

  const getElementTitle = (mode: MeasurementMode): string => {
    switch(mode) {
      case 'chimney': return "Kaminausschnitt";
      case 'skylight': return "Dachfenster";
      case 'solar': return "Solaranlage";
      case 'gutter': return "Dachrinne";
      case 'vent': return "Lüfter";
      case 'hook': return "Dachhaken";
      case 'other': return "Sonstige Einbauten";
      default: return "Element";
    }
  };

  return (
    <div className="p-3 pb-0">
      <div className="p-2 border border-primary/30 rounded-md bg-primary/5">
        <div className="text-sm font-medium mb-2 flex items-center justify-between">
          <span>{getElementTitle(activeMode)}-Messung aktiv</span>
          <span className="text-xs text-muted-foreground">
            ({currentPoints.length} / {getRequiredPoints(activeMode)} Punkte)
          </span>
        </div>
        
        <div className="flex space-x-1 mb-1">
          <Button
            variant="default" 
            size="sm"
            className="flex-1"
            onClick={handleFinalizeMeasurement}
            disabled={!canFinalize()}
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
          
          <Button
            variant="outline" 
            size="sm"
            className="w-9"
            onClick={clearCurrentPoints}
            title="Abbrechen"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-center mt-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>{getInstructions(activeMode)}</span>
        </div>
      </div>
    </div>
  );
};

export default RoofElementControls;
