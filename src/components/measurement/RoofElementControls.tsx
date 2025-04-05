
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Undo2, 
  X,
  Info,
} from 'lucide-react';
import { MeasurementMode, Point } from '@/types/measurements';

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
        return 4; // Exact 4 points for Solarplanung
      case 'skylight': 
        return 4; // Vier Punkte für exakte Rechteckdefinition
      case 'chimney': 
        return 4; // Vier Punkte für genaue Vermessung
      case 'pvmodule':
        return 4; // Vier Punkte für exakte Moduldefinition
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
      
      case 'pvmodule':
        if (currentPoints.length === 0) {
          return "Markieren Sie die erste Ecke der PV-Modulfläche.";
        } else if (currentPoints.length < 4) {
          return `Markieren Sie die weiteren Ecken der PV-Modulfläche. Noch ${remainingPoints} Punkt(e) benötigt.`;
        } else {
          return "PV-Modulfläche vollständig definiert. Berechnung wird nach Abschluss durchgeführt.";
        }
      
      case 'solar':
        if (currentPoints.length === 0) {
          return "Markieren Sie die erste Ecke der Solarfläche.";
        } else if (currentPoints.length < 4) {
          return `Markieren Sie die weiteren Ecken der Solarfläche. Noch ${remainingPoints} Punkt(e) benötigt.`;
        } else if (currentPoints.length === 4) {
          return "Solarfläche vollständig definiert. Schließen Sie die Messung ab. PV-Module werden automatisch berechnet.";
        } else {
          return "Exakt 4 Punkte für die Solarfläche werden benötigt.";
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
    const requiredPoints = getRequiredPoints(activeMode);
    if (activeMode === 'solar') {
      // For solar, we require exactly 4 points
      return currentPoints.length === 4;
    }
    return currentPoints.length >= requiredPoints;
  };

  const getElementTitle = (mode: MeasurementMode): string => {
    switch(mode) {
      case 'chimney': return "Kaminausschnitt";
      case 'skylight': return "Dachfenster";
      case 'solar': return "Geplante Solarfläche";
      case 'pvmodule': return "PV-Modul Fläche";
      case 'vent': return "Lüfter";
      case 'hook': return "Dachhaken";
      case 'other': return "Sonstige Einbauten";
      default: return "Element";
    }
  };

  // Flag um festzustellen, ob wir in einem Penetrationsmodus sind
  const isPenetrationMode = ['vent', 'hook', 'other'].includes(activeMode);
  
  return (
    <div className="p-3">
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
            title={isPenetrationMode ? "Abbrechen und Werkzeug deaktivieren" : "Abbrechen"}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Improved text container with better text wrapping and overflow handling */}
        <div className="flex items-start mt-2 text-xs text-muted-foreground overflow-visible">
          <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
          <span className="whitespace-normal break-words">{getInstructions(activeMode)}</span>
        </div>
      </div>
    </div>
  );
};

export default RoofElementControls;
