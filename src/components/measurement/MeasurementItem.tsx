
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  Move,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Measurement, Segment } from '@/types/measurements';
import { formatMeasurement, getMeasurementTypeDisplayName } from '@/constants/measurements';
import SegmentList from './SegmentList';
import SolarMeasurementContent from './SolarMeasurementContent';

interface MeasurementItemProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentOpen: boolean;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  isFirst?: boolean;
  isLast?: boolean;
  handleMoveUp?: (id: string) => void;
  handleMoveDown?: (id: string) => void;
  selectedModuleIndex?: number | null;
  onSelectModule?: (moduleIndex: number | null) => void;
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  isFirst = false,
  isLast = false,
  handleMoveUp,
  handleMoveDown,
  selectedModuleIndex = null,
  onSelectModule = () => {}
}) => {
  const [expanded, setExpanded] = useState(false);
  const isEditing = editMeasurementId === measurement.id;
  
  const handleVisibilityToggle = () => {
    toggleMeasurementVisibility(measurement.id);
  };
  
  const handleLabelVisibilityToggle = () => {
    toggleLabelVisibility(measurement.id);
  };
  
  const handleEditClick = () => {
    handleStartPointEdit(measurement.id);
  };
  
  const handleDeleteClick = () => {
    handleDeleteMeasurement(measurement.id);
  };
  
  const handleMoveMeasurementUp = () => {
    if (handleMoveUp) {
      handleMoveUp(measurement.id);
    }
  };
  
  const handleMoveMeasurementDown = () => {
    if (handleMoveDown) {
      handleMoveDown(measurement.id);
    }
  };
  
  const getSegmentTypeDisplayName = (type: string): string => {
    const displayNames: Record<string, string> = {
      'first': 'First',
      'grat': 'Grat',
      'kehle': 'Kehle',
      'traufe': 'Traufe',
      'ortgang': 'Ortgang'
    };
    
    return displayNames[type] || type;
  };
  
  // Helper function to update a specific segment within a measurement
  const handleUpdateSegment = (measurementId: string, segmentId: string, data: Partial<Segment>) => {
    if (!measurement.segments) return;
    
    const updatedSegments = measurement.segments.map(seg => 
      seg.id === segmentId ? { ...seg, ...data } : seg
    );
    
    updateMeasurement(measurementId, { segments: updatedSegments });
  };
  
  // Render content specific to measurement type
  const renderMeasurementContent = () => {
    switch (measurement.type) {
      case 'solar':
        return (
          <SolarMeasurementContent 
            measurement={measurement} 
            updateMeasurement={updateMeasurement}
            selectedModuleIndex={selectedModuleIndex}
            onSelectModule={onSelectModule}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={`border rounded-md overflow-hidden group ${isEditing ? 'border-primary ring-1 ring-primary' : ''}`}>
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleVisibilityToggle}
                >
                  {measurement.visible !== false ? (
                    <Eye className="h-4 w-4 mr-2" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-2" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {measurement.visible !== false ? 'Messung ausblenden' : 'Messung einblenden'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLabelVisibilityToggle}
                >
                  {measurement.labelVisible !== false ? (
                    <Eye className="h-4 w-4 mr-2" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-2" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {measurement.labelVisible !== false ? 'Beschriftung ausblenden' : 'Beschriftung einblenden'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-sm font-medium">
            {measurement.description || getMeasurementTypeDisplayName(measurement.type)}
            {measurement.label && ` (${measurement.label})`}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {handleMoveUp && handleMoveDown && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMoveMeasurementUp}
                      disabled={isFirst}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Messung nach oben verschieben
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMoveMeasurementDown}
                      disabled={isLast}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Messung nach unten verschieben
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleEditClick}
                  disabled={movingPointInfo !== null}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Punkte bearbeiten
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Messung löschen
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Details anzeigen/ausblenden
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {expanded && renderMeasurementContent()}
      
      {expanded && segmentOpen && measurement.segments && measurement.segments.length > 0 && (
        <div className="p-2">
          <SegmentList 
            segments={measurement.segments}
            measurementId={measurement.id}
            isOpen={segmentOpen}
            toggleSegments={toggleSegments}
            onEditSegment={onEditSegment}
            updateSegment={handleUpdateSegment}
          />
        </div>
      )}
    </div>
  );
};

export default MeasurementItem;
