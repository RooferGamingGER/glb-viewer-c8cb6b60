
import React from 'react';
import { Point, MeasurementMode } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Check, Undo, X } from 'lucide-react';

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
  // Map mode to required points and descriptive text
  const modeConfig: Record<string, {points: number, description: string, title: string}> = {
    'skylight': { points: 4, description: 'Markieren Sie die 4 Ecken des Dachfensters.', title: 'Dachfenster' },
    'chimney': { points: 4, description: 'Markieren Sie die 4 Ecken des Kamins.', title: 'Kamin' },
    'solar': { points: 4, description: 'Markieren Sie die 4 Ecken der Solaranlage.', title: 'Solaranlage' },
    'pvmodule': { points: 4, description: 'Markieren Sie 4 Punkte für die PV-Module.', title: 'PV-Module' },
    'vent': { points: 1, description: 'Klicken Sie auf einen Punkt für den Lüfter.', title: 'Lüfter' },
    'hook': { points: 1, description: 'Klicken Sie auf einen Punkt für den Dachhaken.', title: 'Dachhaken' },
    'other': { points: 1, description: 'Klicken Sie auf einen Punkt für sonstige Einbauten.', title: 'Sonstiges' },
    'ridge': { points: 2, description: 'Markieren Sie 2 Punkte für den First.', title: 'First' },
    'eave': { points: 2, description: 'Markieren Sie 2 Punkte für die Traufe.', title: 'Traufe' },
    'verge': { points: 2, description: 'Markieren Sie 2 Punkte für den Ortgang.', title: 'Ortgang' },
    'valley': { points: 2, description: 'Markieren Sie 2 Punkte für die Kehle.', title: 'Kehle' },
    'hip': { points: 2, description: 'Markieren Sie 2 Punkte für den Grat.', title: 'Grat' },
  };
  
  const config = modeConfig[activeMode] || { points: 0, description: '', title: 'Unbekannt' };
  const hasEnoughPoints = currentPoints.length >= config.points;
  const isSinglePointMode = config.points === 1;
  
  return (
    <div className="flex flex-col gap-3">
      <div className="glass-card p-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">{config.title}</h3>
          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
            {currentPoints.length} / {config.points} Punkte
          </span>
        </div>
        <p className="text-xs opacity-80 mb-3">{config.description}</p>
        
        <div className="flex gap-2 justify-end">
          {currentPoints.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndoLastPoint}
                className="text-xs"
              >
                <Undo size={14} className="mr-1" /> Zurück
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCurrentPoints}
                className="text-xs"
              >
                <X size={14} className="mr-1" /> Abbrechen
              </Button>
            </>
          )}
          {hasEnoughPoints && !isSinglePointMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFinalizeMeasurement}
              className="accent-action text-xs"
            >
              <Check size={14} className="mr-1" /> Fertigstellen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoofElementControls;
