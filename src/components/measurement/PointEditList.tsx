import React from 'react';
import { Button } from "@/components/ui/button";
import { CircleMinus } from 'lucide-react';
import { Point, Measurement } from '@/types/measurements';

interface PointEditListProps {
  measurement: Measurement;
  handleDeletePoint: (measurementId: string, pointIndex: number) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
}

const PointEditList: React.FC<PointEditListProps> = ({
  measurement,
  handleDeletePoint,
  movingPointInfo
}) => {
  // Only show for area measurements in edit mode
  if (measurement.type !== 'area' || !measurement.editMode) {
    return null;
  }

  // We need at least 3 points for a valid polygon
  const minRequiredPoints = 3;
  const canDeletePoints = measurement.points.length > minRequiredPoints;

  return (
    <div className="mt-2 border border-border/50 rounded-md p-2 bg-secondary/10">
      <div className="text-sm font-medium mb-1">Punkte bearbeiten</div>
      <div className="text-xs text-muted-foreground mb-2">
        Mindestens 3 Punkte müssen erhalten bleiben
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {measurement.points.map((point: Point, index: number) => (
          <div 
            key={index}
            className={`flex items-center justify-between p-1 rounded-md ${
              movingPointInfo?.measurementId === measurement.id && 
              movingPointInfo?.pointIndex === index 
                ? 'bg-primary/20 border border-primary/50' 
                : 'border border-border/50'
            }`}
          >
            <div className="text-xs font-medium">Punkt {index + 1}</div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleDeletePoint(measurement.id, index)}
              title={`Punkt ${index + 1} löschen`}
              disabled={!canDeletePoints}
            >
              <CircleMinus className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PointEditList;
