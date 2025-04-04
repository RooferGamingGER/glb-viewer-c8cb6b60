
import React, { useState } from 'react';
import { Measurement } from '@/types/measurements';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Trash2, Pencil, X, ArrowUp, ArrowDown, Check, CircleCheck, CircleDashed } from 'lucide-react';
import { getMeasurementTypeDisplayName } from '@/contexts/MeasurementContext';
import { Badge } from '@/components/ui/badge';
import SolarMeasurementContent from './SolarMeasurementContent';
import PointEditList from './PointEditList';

interface MeasurementItemProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  editMeasurementId: string | null;
  handleCancelEditing: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  handleMoveUp?: (id: string) => void;
  handleMoveDown?: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  selectedModuleIndex: number | null;
  selectedMeasurementId: string | null;
  handleSelectModule: (measurementId: string, moduleIndex: number) => void;
  handleDeleteModule: () => void;
  segmentsOpen?: boolean;
  toggleSegments?: (id: string) => void;
  onEditSegment?: (id: string | null) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleDeleteMeasurement,
  handleStartPointEdit,
  editMeasurementId,
  handleCancelEditing,
  isFirst = false,
  isLast = false,
  handleMoveUp,
  handleMoveDown,
  updateMeasurement,
  selectedModuleIndex,
  selectedMeasurementId,
  handleSelectModule,
  handleDeleteModule,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  handleDeletePoint,
  movingPointInfo
}) => {
  const isEditing = editMeasurementId === measurement.id;
  const isSolar = measurement.type === 'solar';
  
  return (
    <Card className={`relative shadow-sm border ${measurement.visible === false ? 'opacity-70' : ''}`}>
      <CardHeader className="p-3 pb-0 flex flex-row items-center space-y-0">
        <div className="flex-1 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => toggleMeasurementVisibility(measurement.id)}
            title={measurement.visible === false ? "Einblenden" : "Ausblenden"}
          >
            {measurement.visible === false ? (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          
          <CardTitle className="text-sm flex-1">
            {measurement.label || `${getMeasurementTypeDisplayName(measurement.type)} ${measurement.value?.toFixed(2) || ""}`}
          </CardTitle>
          
          <div className="flex items-center ml-auto space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={() => toggleLabelVisibility(measurement.id)}
              title={measurement.labelVisible === false ? "Beschriftung einblenden" : "Beschriftung ausblenden"}
            >
              {measurement.labelVisible === false ? (
                <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <CircleCheck className="h-3.5 w-3.5" />
              )}
            </Button>
            
            {!isFirst && handleMoveUp && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => handleMoveUp(measurement.id)}
                title="Nach oben verschieben"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {!isLast && handleMoveDown && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => handleMoveDown(measurement.id)}
                title="Nach unten verschieben"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {measurement.type === 'area' && !isEditing && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => handleStartPointEdit(measurement.id)}
                title="Punkte bearbeiten"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {isEditing && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={handleCancelEditing}
                title="Bearbeitung abbrechen"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-destructive"
              onClick={() => handleDeleteMeasurement(measurement.id)}
              title="Löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-2">
        <div className="text-sm">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-normal">
              {getMeasurementTypeDisplayName(measurement.type)}
            </Badge>
            
            {measurement.value && (
              <span className="text-sm font-medium">
                {measurement.value.toFixed(2)} m{measurement.type === 'area' ? '²' : ''}
              </span>
            )}
          </div>
          
          {isSolar && (
            <SolarMeasurementContent 
              measurement={measurement} 
              updateMeasurement={updateMeasurement}
              selectedModuleIndex={selectedModuleIndex}
              selectedMeasurementId={selectedMeasurementId}
              handleSelectModule={handleSelectModule}
              handleDeleteModule={handleDeleteModule}
            />
          )}
          
          {handleDeletePoint && (
            <PointEditList 
              measurement={measurement}
              handleDeletePoint={handleDeletePoint}
              movingPointInfo={movingPointInfo}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeasurementItem;
