
import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, Move, MousePointer, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EditingAlertProps {
  editMeasurementId: string | null;
  editingSegmentId: string | null;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  handleCancelEditing: () => void;
  editingAreaMeasurement?: boolean;
}

const EditingAlert: React.FC<EditingAlertProps> = memo(({
  editMeasurementId,
  editingSegmentId,
  movingPointInfo,
  handleCancelEditing,
  editingAreaMeasurement
}) => {
  // Determine which type of editing is happening
  const isEditingPoint = editMeasurementId !== null;
  const isMovingPoint = movingPointInfo !== null;
  const isEditingSegment = editingSegmentId !== null;

  // Choose the appropriate icon based on the editing mode
  let Icon = AlertCircle;
  if (isMovingPoint) Icon = Move;
  else if (isEditingPoint) Icon = PlusCircle;
  else if (isEditingSegment) Icon = MousePointer;

  // Set the appropriate alert message
  let alertTitle = "Bearbeitungsmodus";
  let alertDescription = "Sie befinden sich im Bearbeitungsmodus.";

  if (isMovingPoint) {
    alertTitle = "Punkt verschieben";
    alertDescription = "Klicken Sie auf eine Position, um den Punkt zu verschieben.";
  } else if (isEditingPoint && editingAreaMeasurement) {
    alertTitle = "Punkte bearbeiten";
    alertDescription = "Klicken Sie auf weitere Punkte, um sie hinzuzufügen oder klicken Sie auf bestehende Punkte, um sie zu löschen.";
  } else if (isEditingPoint) {
    alertTitle = "Punkte bearbeiten";
    alertDescription = "Bearbeiten Sie die Punkte der ausgewählten Messung.";
  } else if (isEditingSegment) {
    alertTitle = "Segment bearbeiten";
    alertDescription = "Bearbeiten Sie die Eigenschaften des ausgewählten Segments.";
  }

  return (
    <Alert variant="destructive" className="mb-3">
      <Icon className="h-4 w-4" />
      <AlertTitle>{alertTitle}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{alertDescription}</p>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={handleCancelEditing}
        >
          Bearbeitung abbrechen
        </Button>
      </AlertDescription>
    </Alert>
  );
});

EditingAlert.displayName = 'EditingAlert';

export default EditingAlert;
