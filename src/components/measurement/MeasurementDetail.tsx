
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Measurement } from '@/types/measurements';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MeasurementDetailProps {
  measurement: Measurement;
  isHovered: boolean;
  isEditing: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => Record<string, boolean>;
  onEditSegment: (segmentId: string | null) => void;
  renderHeader: () => React.ReactNode;
  updateMeasurement: (measurement: Measurement) => void;
}

const MeasurementDetail: React.FC<MeasurementDetailProps> = ({
  measurement,
  isHovered,
  isEditing,
  handleMouseEnter,
  handleMouseLeave,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  renderHeader,
  updateMeasurement
}) => {
  const [name, setName] = useState(measurement.label || '');
  const hasSegments = measurement.segments && measurement.segments.length > 0;
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
  };
  
  const handleNameBlur = () => {
    // Only update if name has changed
    if (name !== measurement.label) {
      const updatedMeasurement = {
        ...measurement,
        label: name || undefined
      };
      updateMeasurement(updatedMeasurement);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };
  
  const displayValue = (): string => {
    if (measurement.type === 'area' || measurement.type === 'solar') {
      return `${measurement.value.toFixed(2)} m²`;
    } else {
      return `${measurement.value.toFixed(2)} m`;
    }
  };
  
  return (
    <div
      className={`relative rounded-md ${
        isEditing ? 'bg-muted' : isHovered ? 'bg-accent/20' : 'bg-card'
      } transition-colors`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="p-2 rounded-md">
        <div className="flex items-center mb-1">
          {renderHeader()}
        </div>
        
        <div className="flex justify-between items-center text-sm px-1">
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleKeyDown}
            placeholder={`${measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)} ${measurement.id.slice(0, 4)}`}
            className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-ring px-1 py-0.5 rounded w-full max-w-[180px]"
            disabled={isEditing}
          />
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {displayValue()}
          </span>
        </div>
        
        {hasSegments && (
          <Collapsible
            open={segmentsOpen[measurement.id]}
            onOpenChange={() => toggleSegments(measurement.id)}
          >
            <CollapsibleTrigger className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-start px-1 py-0.5">
              {segmentsOpen[measurement.id] ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              Segments ({measurement.segments?.length})
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="pl-4 pt-1 pb-1 space-y-1">
                {measurement.segments?.map((segment, index) => (
                  <div key={segment.id} className="flex justify-between items-center text-xs">
                    <span>Segment {index + 1}</span>
                    <span>{segment.length.toFixed(2)} m</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
};

export default MeasurementDetail;
