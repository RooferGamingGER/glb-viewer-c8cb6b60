
import React from 'react';
import { Button } from "@/components/ui/button";
import { Move, ChevronDown, ChevronRight } from 'lucide-react';
import { Segment } from '@/types/measurements';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from 'sonner';

interface SegmentListProps {
  measurementId: string;
  segments: Segment[];
  isOpen: boolean;
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string) => void;
}

const SegmentList: React.FC<SegmentListProps> = ({
  measurementId,
  segments,
  isOpen,
  toggleSegments,
  onEditSegment
}) => {
  if (!segments || segments.length === 0) return null;
  
  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={() => toggleSegments(measurementId)}
      className="mt-2"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full flex justify-between items-center px-2 h-7">
          <span>Teilmessungen ({segments.length})</span>
          {isOpen ? (
            <ChevronDown className="h-3 w-3 ml-1" />
          ) : (
            <ChevronRight className="h-3 w-3 ml-1" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 mt-2 pl-2">
          {segments.map((segment, index) => (
            <div key={segment.id} className="flex items-center justify-between text-xs border border-border p-2 rounded-md">
              <div>
                <span className="font-medium">Teilmessung {index + 1}:</span> {segment.label}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  onEditSegment(segment.id);
                  toast.info(`Teilmessung ${index + 1} wird bearbeitet. Klicken Sie an eine neue Position.`);
                }}
                title="Teilmessung verschieben"
              >
                <Move className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SegmentList;
