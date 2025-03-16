
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EditingAlertProps {
  editMeasurementId: string | null;
  editingSegmentId: string | null;
  handleCancelEditing: () => void;
}

const EditingAlert: React.FC<EditingAlertProps> = ({
  editMeasurementId,
  editingSegmentId,
  handleCancelEditing
}) => {
  if (!editMeasurementId && !editingSegmentId) return null;
  
  return (
    <Alert variant="default" className="mb-3">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Bearbeitungsmodus</AlertTitle>
      <AlertDescription>
        {editMeasurementId && "Klicken Sie einen Punkt an, um ihn zu bearbeiten."}
        {editingSegmentId && "Klicken Sie auf eine Position, um das Segment zu verschieben."}
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
