
import React, { memo, useCallback } from 'react';
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

/**
 * Alert component shown when in editing mode
 * Enhanced with memoization and performance optimizations
 */
const EditingAlert: React.FC<EditingAlertProps> = memo(({
  editMeasurementId,
  editingSegmentId,
  movingPointInfo,
  handleCancelEditing,
  editingAreaMeasurement = false
}) => {
  if (!editMeasurementId && !editingSegmentId && !movingPointInfo) return null;
  
  // Memoized cancel handler to avoid recreating function on each render
  const onCancelEditing = useCallback(() => {
    handleCancelEditing();
  }, [handleCancelEditing]);

  return (
    <Alert variant="default" className="mb-3 border-primary overflow-visible">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-primary font-medium">Bearbeitungsmodus</AlertTitle>
      <AlertDescription className="space-y-2 overflow-visible">
        {editMeasurementId && !movingPointInfo && (
          <div className="flex flex-col gap-1 overflow-visible">
            <div className="flex items-start gap-1 overflow-visible">
              <MousePointer className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span className="whitespace-normal break-words">Klicken Sie auf einen Punkt (gelb markiert), um ihn zu verschieben.</span>
            </div>
            
            {editingAreaMeasurement && (
              <div className="flex items-start gap-1 overflow-visible">
                <PlusCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="whitespace-normal break-words">Klicken Sie auf ein "+" Symbol, um einen neuen Punkt hinzuzufügen.</span>
              </div>
            )}
          </div>
        )}
        {editingSegmentId && (
          <div className="flex items-start gap-1 overflow-visible">
            <MousePointer className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="whitespace-normal break-words">Klicken Sie auf eine Position, um das Segment zu verschieben.</span>
          </div>
        )}
        {movingPointInfo && (
          <div className="flex items-start gap-1 font-medium text-primary overflow-visible">
            <Move className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="whitespace-normal break-words">Punkt wird verschoben. Klicken Sie, um die neue Position zu bestätigen.</span>
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={onCancelEditing}
        >
          Bearbeitung beenden
        </Button>
      </AlertDescription>
    </Alert>
  );
});

EditingAlert.displayName = 'EditingAlert';

export default EditingAlert;
