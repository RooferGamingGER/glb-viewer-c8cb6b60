
import React from 'react';
import { Measurement, Segment } from '@/types/measurements';
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';

interface MeasurementSegmentsProps {
  measurement: Measurement;
  onEditSegment: (segmentId: string | null) => void;
}

const MeasurementSegments: React.FC<MeasurementSegmentsProps> = ({ 
  measurement, 
  onEditSegment 
}) => {
  if (!measurement.segments || measurement.segments.length === 0) {
    return null;
  }
  
  return (
    <div className="px-2 pb-2">
      <div className="text-xs font-medium mb-1 text-muted-foreground">Segmente:</div>
      <div className="space-y-1">
        {measurement.segments.map((segment, index) => (
          <div key={segment.id} className="flex items-center justify-between bg-secondary/20 px-2 py-1 rounded-sm">
            <div className="text-xs">
              {index + 1}: {segment.label}
              {segment.inclination !== undefined && (
                <span className="ml-1 opacity-75">({Math.abs(segment.inclination).toFixed(1)}°)</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onEditSegment(segment.id)}
              title="Segment bearbeiten"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeasurementSegments;
