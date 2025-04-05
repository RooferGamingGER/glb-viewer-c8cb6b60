
import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditingAlertProps {
  editMeasurementId: string | null;
  editingSegmentId: string | null;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  handleCancelEditing: () => void;
  editingAreaMeasurement?: boolean;
}

const EditingAlert: React.FC<EditingAlertProps> = ({
  editMeasurementId,
  editingSegmentId,
  movingPointInfo,
  handleCancelEditing,
  editingAreaMeasurement = false
}) => {
  let message = '';
  
  if (editMeasurementId) {
    if (editingAreaMeasurement) {
      message = 'Fläche wird bearbeitet. Klicken Sie zum Hinzufügen weiterer Punkte oder zum Bearbeiten vorhandener Punkte.';
    } else {
      message = 'Messung wird bearbeitet. Klicken Sie auf die Punkte, um sie zu bearbeiten.';
    }
  } else if (editingSegmentId) {
    message = 'Segment wird bearbeitet. Klicken Sie auf "Fertig", wenn Sie fertig sind.';
  } else if (movingPointInfo) {
    message = `Punkt ${movingPointInfo.pointIndex + 1} wird verschoben. Klicken Sie auf die neue Position.`;
  }
  
  if (!message) return null;
  
  return (
    <div className="glass-card flex flex-col gap-2 p-3 border-l-4 border-l-amber-500">
      <div className="flex items-start gap-2">
        <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <span className="text-sm">{message}</span>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleCancelEditing}
        className="accent-action self-end"
      >
        <X size={16} className="mr-1" /> Abbrechen
      </Button>
    </div>
  );
};

export default EditingAlert;
