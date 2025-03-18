
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
  handleStartPointEdit: (id: string, pointIndex: number) => void;
  handleDeleteMeasurement: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  isSegmentOpen: boolean;
  toggleSegment: () => void;
  onEditSegment: (segmentId: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  handleDeletePoint: (measurementId: string, pointIndex: number) => void;
  onEditRectangle?: (id: string) => void;
  editingRectangleId?: string | null;
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  updateMeasurement,
  isSegmentOpen,
  toggleSegment,
  onEditSegment,
  movingPointInfo,
  handleDeletePoint,
  onEditRectangle,
  editingRectangleId
}) => {
  // Check if this is a rectangle-based measurement
  const isRectangleElement = measurement.isRectangleMode;
  const isRectangleEditing = editingRectangleId === measurement.id;
  
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
            onClick={toggleSegment}
            title={isSegmentOpen ? "Segmente ausblenden" : "Segmente einblenden"}
          >
            {isSegmentOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
      
      {isSegmentOpen && hasSegments && (
        <MeasurementSegments 
          measurement={measurement}
          onEditSegment={onEditSegment}
        />
      )}
      
      {measurement.editMode && measurement.type === 'area' && (
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
