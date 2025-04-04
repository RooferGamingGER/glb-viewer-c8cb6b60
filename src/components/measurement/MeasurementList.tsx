
import React from 'react';
import { Measurement } from '@/types/measurements';
import MeasurementItem from './MeasurementItem';
import { getMeasurementTypeDisplayName } from '@/utils/exportUtils';

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
  activeCategory?: string;
  selectedModuleIndex?: number | null;
  onSelectModule?: (moduleIndex: number | null) => void;
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
  activeCategory,
  selectedModuleIndex = null,
  onSelectModule = () => {}
}) => {
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'dach':
        return 'Dachmessungen';
      case 'solar':
        return 'Solarmessungen';
      case 'dachelemente':
        return 'Dachelemente';
      case 'einbauten':
        return 'Einbauten';
      default:
        return 'Messungen';
    }
  };

  const filteredMeasurements = React.useMemo(() => {
    if (!activeCategory) {
      return measurements;
    }

    switch (activeCategory) {
      case 'dach':
        return measurements.filter(m => ['length', 'height', 'area'].includes(m.type));
      case 'solar':
        return measurements.filter(m => ['solar'].includes(m.type));
      case 'dachelemente':
        return measurements.filter(m => ['skylight', 'chimney'].includes(m.type));
      case 'einbauten':
        return measurements.filter(m => ['vent', 'hook', 'other'].includes(m.type));
      default:
        return measurements;
    }
  }, [measurements, activeCategory]);

  return (
    <>
      {filteredMeasurements.length > 0 ? (
        <div className="space-y-2">
          {filteredMeasurements.map((measurement, index) => (
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
              segmentOpen={segmentsOpen[measurement.id] || false}
              toggleSegments={toggleSegments}
              onEditSegment={onEditSegment}
              movingPointInfo={movingPointInfo}
              isFirst={index === 0}
              isLast={index === filteredMeasurements.length - 1}
              handleMoveUp={handleMoveMeasurementUp}
              handleMoveDown={handleMoveMeasurementDown}
              selectedModuleIndex={selectedModuleIndex}
              onSelectModule={onSelectModule}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-6">
          {activeCategory
            ? `Keine ${getCategoryLabel(activeCategory)} gefunden`
            : 'Keine Messungen vorhanden'}
        </div>
      )}
    </>
  );
};

export default MeasurementList;
