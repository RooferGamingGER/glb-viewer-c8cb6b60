
import React from 'react';
import { Point } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Check, Undo, X } from 'lucide-react';

interface MeasurementControlsProps {
  activeMode: string;
  currentPoints: Point[];
  handleFinalizeMeasurement: () => void;
  handleUndoLastPoint: () => void;
  clearCurrentPoints: () => void;
}

const MeasurementControls: React.FC<MeasurementControlsProps> = ({ 
  activeMode, 
  currentPoints, 
  handleFinalizeMeasurement, 
  handleUndoLastPoint,
  clearCurrentPoints 
}) => {
  const getControlDescription = () => {
    switch (activeMode) {
      case 'length':
        return 'Klicken Sie auf zwei Punkte, um eine Länge zu messen.';
      case 'height':
        return 'Klicken Sie auf zwei Punkte, um eine Höhe zu messen.';
      case 'area':
        return 'Klicken Sie auf mindestens drei Punkte, um eine Fläche zu messen.';
      default:
        return 'Wählen Sie ein Messwerkzeug aus.';
    }
  };
  
  const pointsNeeded = activeMode === 'area' ? 3 : 2;
  const hasEnoughPoints = currentPoints.length >= pointsNeeded;
  
  return (
    <div className="flex flex-col gap-3">
      <div className="glass-card p-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">
            {activeMode === 'length' ? 'Längenmessung' : 
             activeMode === 'height' ? 'Höhenmessung' : 
             activeMode === 'area' ? 'Flächenmessung' : 'Messung'}
          </h3>
          <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
            {currentPoints.length} / {pointsNeeded}+ Punkte
          </span>
        </div>
        <p className="text-xs opacity-80 mb-3">{getControlDescription()}</p>
        
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
          {hasEnoughPoints && (
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

export default MeasurementControls;
