
import React, { useCallback, useEffect, useState } from 'react';
import { Measurement, Point } from '@/types/measurements';
import { calculateQuadrilateralDimensions } from '@/utils/measurementCalculations';
import { Button } from "@/components/ui/button";
import { Check, X, Expand, Move } from 'lucide-react';
import { toast } from 'sonner';

interface RectangleEditorProps {
  measurement: Measurement;
  onUpdate: (measurementId: string, points: Point[]) => void;
  onFinishEdit: (measurementId: string) => void;
  onCancelEdit: (measurementId: string) => void;
}

const RectangleEditor: React.FC<RectangleEditorProps> = ({
  measurement,
  onUpdate,
  onFinishEdit,
  onCancelEdit
}) => {
  const [dimensions, setDimensions] = useState({
    width: measurement.dimensions?.width || 0,
    length: measurement.dimensions?.length || 0,
    area: measurement.dimensions?.area || 0
  });

  // Show instructions when in edit mode
  useEffect(() => {
    if (measurement.isEditing) {
      toast.info(
        `Ziehen Sie an den Ecken, um die Größe des ${
          measurement.type === 'chimney' ? 'Kaminausschnitts' : 'Dachfensters'
        } anzupassen.`
      );
    }
  }, [measurement.isEditing, measurement.type]);

  // Update dimensions display when measurement changes
  useEffect(() => {
    if (measurement.dimensions) {
      setDimensions({
        width: measurement.dimensions.width || 0,
        length: measurement.dimensions.length || 0,
        area: measurement.dimensions.area || 0
      });
    }
  }, [measurement]);

  const handleFinish = useCallback(() => {
    onFinishEdit(measurement.id);
    toast.success(`${measurement.type === 'chimney' ? 'Kaminausschnitt' : 'Dachfenster'} wurde angepasst.`);
  }, [measurement.id, measurement.type, onFinishEdit]);

  const handleCancel = useCallback(() => {
    onCancelEdit(measurement.id);
    toast.info(`Bearbeitung abgebrochen.`);
  }, [measurement.id, onCancelEdit]);

  // If not a rectangle measurement or not in edit mode, return null
  if (!measurement.isRectangleMode || !measurement.isEditing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 max-w-md w-11/12 glass-panel border border-border/50 rounded-lg p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">
          {measurement.type === 'chimney' ? 'Kaminausschnitt bearbeiten' : 'Dachfenster bearbeiten'}
        </div>
        <div className="text-xs text-muted-foreground">
          Ziehen Sie an den Ecken zur Anpassung
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1">
          <div className="text-xs">
            <span className="text-muted-foreground">Breite:</span> {dimensions.width.toFixed(2)} m
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Länge:</span> {dimensions.length.toFixed(2)} m
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Fläche:</span> {dimensions.area.toFixed(2)} m²
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleFinish}
            title="Änderungen übernehmen"
          >
            <Check className="h-4 w-4 mr-1" />
            Fertig
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            title="Abbrechen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md flex items-start">
        <Expand className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
        <span>
          Die Maße werden automatisch berechnet, während Sie die Form anpassen. 
          Ziehen Sie an den Eckpunkten, um die Größe und Form zu ändern.
        </span>
      </div>
    </div>
  );
};

export default RectangleEditor;
