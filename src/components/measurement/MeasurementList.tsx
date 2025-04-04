import React from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import MeasurementItem from './MeasurementItem';
import { Separator } from '@/components/ui/separator';

interface MeasurementListProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
}

const MeasurementList: React.FC<MeasurementListProps> = ({
  measurements,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  if (!measurements || measurements.length === 0 && !editMeasurementId) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        Keine Messungen vorhanden.
      </div>
    );
  }
  
  // Group measurements by category
  const standardMeasurements = measurements.filter(m => 
    ['length', 'height', 'area'].includes(m.type)
  );
  
  const roofElementMeasurements = measurements.filter(m => 
    ['solar', 'chimney', 'skylight'].includes(m.type)
  );
  
  const penetrationMeasurements = measurements.filter(m => 
    ['vent', 'hook', 'other'].includes(m.type)
  );
  
  const otherMeasurements = measurements.filter(m => 
    !['length', 'height', 'area', 'solar', 'skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type)
  );
  
  const renderMeasurementGroup = (title: string, items: Measurement[], showEmpty: boolean = false) => {
    if (items.length === 0 && !showEmpty) return null;
    
    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2 flex justify-between">
          <span>{title}</span>
          <span className="text-muted-foreground">({items.length})</span>
        </h3>
        
        {items.length > 0 ? (
          items.map((measurement) => (
            <MeasurementItem
              key={measurement.id}
              measurement={measurement}
              toggleMeasurementVisibility={toggleMeasurementVisibility}
              toggleLabelVisibility={toggleLabelVisibility}
              handleStartPointEdit={handleStartPointEdit}
              handleDeleteMeasurement={handleDeleteMeasurement}
              handleDeletePoint={handleDeletePoint}
              updateMeasurement={updateMeasurement}
              editMeasurementId={editMeasurementId}
              isSegmentOpen={segmentsOpen[measurement.id] || false}
              toggleSegments={toggleSegments}
              onEditSegment={onEditSegment}
              movingPointInfo={movingPointInfo}
              handleMoveUp={handleMoveMeasurementUp}
              handleMoveDown={handleMoveMeasurementDown}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground py-2 text-center">
            Keine {title} vorhanden
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full px-2">
      {/* Standard measurements */}
      {renderMeasurementGroup("Standard Messungen", standardMeasurements, true)}
      
      {/* Only show separator if there are multiple categories of measurements */}
      {standardMeasurements.length > 0 && (roofElementMeasurements.length > 0 || penetrationMeasurements.length > 0) && (
        <Separator className="my-3" />
      )}
      
      {/* Roof elements */}
      {renderMeasurementGroup("Dachelemente", roofElementMeasurements)}
      
      {/* Only show separator if needed */}
      {roofElementMeasurements.length > 0 && penetrationMeasurements.length > 0 && (
        <Separator className="my-3" />
      )}
      
      {/* Penetrations */}
      {renderMeasurementGroup("Einbauten", penetrationMeasurements)}
      
      {/* Other measurements not categorized (if any) */}
      {otherMeasurements.length > 0 && (
        <>
          <Separator className="my-3" />
          {renderMeasurementGroup("Sonstige", otherMeasurements)}
        </>
      )}
    </div>
  );
};

export default MeasurementList;
