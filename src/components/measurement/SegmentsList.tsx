
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Segment } from '@/types/measurements';

interface SegmentsListProps {
  segments: Segment[];
  onEditSegment?: (segmentId: string) => void;
}

export const SegmentsList: React.FC<SegmentsListProps> = ({
  segments,
  onEditSegment
}) => {
  return (
    <div className="space-y-2">
      {segments.map((segment, index) => (
        <div 
          key={segment.id} 
          className="flex items-center justify-between rounded-md border border-border p-2 text-xs"
        >
          <div>
            <div className="font-medium">{segment.label || `Segment ${index + 1}`}</div>
            <div className="text-muted-foreground">
              {segment.length.toFixed(2)} m
              {segment.inclination !== undefined && ` (${segment.inclination.toFixed(1)}°)`}
            </div>
          </div>
          
          {onEditSegment && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEditSegment(segment.id)}
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
