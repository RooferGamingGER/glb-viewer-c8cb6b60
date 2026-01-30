
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, MoveHorizontal, Edit } from 'lucide-react';

export interface EditingAlertProps {
  editMeasurementId?: string | null;
  editingSegmentId?: string | null;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleCancelEditing: () => void;
  editingAreaMeasurement?: boolean;
}

const EditingAlert: React.FC<EditingAlertProps> = ({
  editMeasurementId,
  editingSegmentId,
  movingPointInfo,
  handleCancelEditing,
  editingAreaMeasurement
}) => {
  // Determine what type of editing is happening
  const isMovingPoint = movingPointInfo !== null && movingPointInfo !== undefined;
  const isEditingMeasurement = editMeasurementId !== null && editMeasurementId !== undefined;
  const isEditingSegment = editingSegmentId !== null && editingSegmentId !== undefined;
  
  let title = 'Messung wird bearbeitet';
  let description = 'Sie bearbeiten gerade eine Messung. Klicken Sie auf Bearbeitung beenden, um den Bearbeitungsmodus zu verlassen.';
  let icon = <Edit className="h-4 w-4" />;
  
  if (isMovingPoint) {
    title = 'Punkt wird verschoben';
    description = `Sie verschieben Punkt ${movingPointInfo?.pointIndex + 1}. Klicken Sie an eine neue Position oder auf Bearbeitung beenden.`;
    icon = <MoveHorizontal className="h-4 w-4" />;
  } else if (isEditingSegment) {
    title = 'Segment wird bearbeitet';
    description = 'Sie bearbeiten ein Segment einer Messung. Klicken Sie auf Bearbeitung beenden, um den Bearbeitungsmodus zu verlassen.';
  } else if (isEditingMeasurement && editingAreaMeasurement) {
    title = 'Fläche wird bearbeitet';
    description = 'Sie bearbeiten eine Flächenmessung. Klicken Sie auf Bearbeitung beenden, um den Bearbeitungsmodus zu verlassen.';
  }

  return (
    <Alert variant="warning" className="animate-fade-in">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-black text-sm">{title}</AlertTitle>
          <AlertDescription className="text-black text-xs mt-1">
            {description}
          </AlertDescription>
        </div>
      </div>
      <Button 
        variant="default" 
        size="sm" 
        className="w-full mt-3" 
        onClick={handleCancelEditing}
      >
        <X className="h-4 w-4 mr-1" />
        Bearbeitung beenden
      </Button>
    </Alert>
  );
};

export default EditingAlert;
