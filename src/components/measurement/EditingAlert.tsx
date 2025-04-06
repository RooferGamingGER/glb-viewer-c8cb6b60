
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { EditIcon, MousePointerSquareDashed, Pencil } from 'lucide-react';

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
  if (!editMeasurementId && !movingPointInfo && !editingSegmentId) {
    return null;
  }

  return (
    <Alert className="text-white">
      {movingPointInfo ? (
        <>
          <MousePointerSquareDashed className="h-4 w-4 mr-2" />
          <AlertTitle className="text-white">Punkt wird verschoben</AlertTitle>
          <AlertDescription className="text-white">
            Klicken Sie auf die neue Position für den Punkt.
          </AlertDescription>
        </>
      ) : editingSegmentId ? (
        <>
          <Pencil className="h-4 w-4 mr-2" />
          <AlertTitle className="text-white">Segment wird bearbeitet</AlertTitle>
          <AlertDescription className="text-white">
            Sie bearbeiten ein Segment. Klicken Sie auf die Punkte, um sie zu verschieben.
          </AlertDescription>
        </>
      ) : editingAreaMeasurement ? (
        <>
          <EditIcon className="h-4 w-4 mr-2" />
          <AlertTitle className="text-white">Fläche wird bearbeitet</AlertTitle>
          <AlertDescription className="text-white">
            Sie bearbeiten eine Flächenmessung. Klicken Sie auf Bearbeitung beenden, um den Bearbeitungsmodus zu verlassen.
          </AlertDescription>
        </>
      ) : (
        <>
          <EditIcon className="h-4 w-4 mr-2" />
          <AlertTitle className="text-white">Messung wird bearbeitet</AlertTitle>
          <AlertDescription className="text-white">
            Klicken Sie auf die Messpunkte, um sie zu verschieben.
          </AlertDescription>
        </>
      )}

      <div className="mt-3">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleCancelEditing}
          className="w-full"
        >
          Bearbeitung beenden
        </Button>
      </div>
    </Alert>
  );
};

export default EditingAlert;
