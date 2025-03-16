
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, Move } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EditingAlertProps {
  editMeasurementId: string | null;
  editingSegmentId: string | null;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  handleCancelEditing: () => void;
}

const EditingAlert: React.FC<EditingAlertProps> = ({
  editMeasurementId,
  editingSegmentId,
  movingPointInfo,
  handleCancelEditing
}) => {
  if (!editMeasurementId && !editingSegmentId && !movingPointInfo) return null;
  
  return (
    <Alert variant="default" className="mb-3">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Bearbeitungsmodus</AlertTitle>
      <AlertDescription>
        {editMeasurementId && !movingPointInfo && "Klicken Sie einen Punkt an, um ihn zu bearbeiten."}
        {editingSegmentId && "Klicken Sie auf eine Position, um das Segment zu verschieben."}
        {movingPointInfo && (
          <div className="flex items-center gap-1">
            <Move className="h-3 w-3" />
            <span>Punkt wird verschoben. Klicken Sie, um die neue Position zu bestätigen.</span>
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={handleCancelEditing}
        >
          Bearbeitung beenden
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default EditingAlert;
