
import React from 'react';
import { Measurement } from '@/types/measurements';
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  Edit, 
  Trash, 
  ChevronDown, 
  ChevronUp,
  Square 
} from 'lucide-react';
import MeasurementDetails from './MeasurementDetails';
import MeasurementSegments from './MeasurementSegments';
import PointEditList from './PointEditList';

interface MeasurementItemProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegment: (id: string) => void;
  onEditSegment: (segmentId: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  onEditRectangle?: (id: string) => void;
  editingRectangleId?: string | null;
  isSegmentOpen?: boolean; // Add this to handle both naming styles
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegment,
  onEditSegment,
  movingPointInfo,
  onEditRectangle,
  editingRectangleId,
  isSegmentOpen
}) => {
  // Check if this is a rectangle-based measurement
  const isRectangleElement = measurement.isRectangleMode;
  const isRectangleEditing = editingRectangleId === measurement.id;
  
  // Use isSegmentOpen if provided, otherwise check segmentsOpen object
  const segmentIsOpen = isSegmentOpen !== undefined 
    ? isSegmentOpen 
    : segmentsOpen?.[measurement.id];
  
  const hasSegments = measurement.segments && measurement.segments.length > 0;
  
  return (
    <div className={`border border-border/50 rounded-md mb-2 overflow-hidden ${
      measurement.editMode ? 'bg-secondary/10 border-primary/30' : ''
    }`}>
      <div className="flex justify-between p-2 items-center">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs py-0.5 px-1.5 rounded-sm bg-primary/10 text-primary">
              {measurement.type}
              {measurement.subType ? `: ${measurement.subType}` : ''}
            </span>
            
            {measurement.visible !== false ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleMeasurementVisibility(measurement.id)}
                title="Ausblenden"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleMeasurementVisibility(measurement.id)}
                title="Einblenden"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {measurement.editMode ? (
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 border-primary"
                onClick={() => updateMeasurement(measurement.id, { editMode: false })}
                title="Bearbeitung beenden"
              >
                <Edit className="h-3.5 w-3.5 text-primary" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => updateMeasurement(measurement.id, { editMode: true })}
                title="Bearbeiten"
                disabled={!!editingRectangleId}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {isRectangleElement && onEditRectangle && (
              <Button
                variant={isRectangleEditing ? "outline" : "ghost"}
                size="icon"
                className={`h-6 w-6 ${isRectangleEditing ? 'border-primary' : ''}`}
                onClick={() => onEditRectangle(measurement.id)}
                title="Größe anpassen"
                disabled={!!editingRectangleId && !isRectangleEditing}
              >
                <Square className={`h-3.5 w-3.5 ${isRectangleEditing ? 'text-primary' : ''}`} />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleDeleteMeasurement(measurement.id)}
              title="Löschen"
              disabled={!!editingRectangleId}
            >
              <Trash className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
          
          <MeasurementDetails measurement={measurement} />
        </div>
        
        {hasSegments && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggleSegment(measurement.id)}
            title={segmentIsOpen ? "Segmente ausblenden" : "Segmente einblenden"}
          >
            {segmentIsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
      
      {segmentIsOpen && hasSegments && (
        <MeasurementSegments 
          measurement={measurement}
          onEditSegment={onEditSegment}
        />
      )}
      
      {measurement.editMode && measurement.type === 'area' && handleDeletePoint && (
        <PointEditList 
          measurement={measurement}
          handleDeletePoint={handleDeletePoint}
          movingPointInfo={movingPointInfo}
        />
      )}
    </div>
  );
};

export default MeasurementItem;
