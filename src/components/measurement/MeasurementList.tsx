
import React from 'react';
import MeasurementItem from './MeasurementItem';
import { Measurement } from '@/types/measurements';
import PointEditList from './PointEditList';

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
  activeTab?: string;
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
  handleMoveMeasurementDown,
  activeTab = "standard"
}) => {
  // Filter measurements based on active tab
  const filteredMeasurements = measurements.filter(measurement => {
    if (activeTab === "standard") {
      return ['length', 'height', 'area'].includes(measurement.type);
    } else if (activeTab === "roofElements") {
      return ['solar', 'chimney', 'skylight', 'pvmodule', 'pvplanning'].includes(measurement.type);
    } else if (activeTab === "penetrations") {
      return ['vent', 'hook', 'other'].includes(measurement.type);
    }
    return true;
  });

  return (
    <div className="space-y-2 px-1">
      {filteredMeasurements.length === 0 ? (
        <p className="text-sm text-center text-muted-foreground p-4">
          Keine Messungen in dieser Kategorie vorhanden.
        </p>
      ) : (
        filteredMeasurements.map(measurement => (
          <div key={measurement.id} className="mb-3">
            <MeasurementItem 
              measurement={measurement}
              toggleMeasurementVisibility={toggleMeasurementVisibility}
              toggleLabelVisibility={toggleLabelVisibility}
              handleStartPointEdit={handleStartPointEdit}
              handleDeleteMeasurement={handleDeleteMeasurement}
              updateMeasurement={updateMeasurement}
              editMeasurementId={editMeasurementId}
              isOpen={segmentsOpen[measurement.id] || false}
              toggleOpen={() => toggleSegments(measurement.id)}
              onEditSegment={onEditSegment}
              handleMoveUp={handleMoveMeasurementUp}
              handleMoveDown={handleMoveMeasurementDown}
            />
            
            {handleDeletePoint && (
              <PointEditList 
                measurement={measurement}
                handleDeletePoint={handleDeletePoint}
                movingPointInfo={movingPointInfo || null}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default MeasurementList;
