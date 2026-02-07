import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Measurement } from '@/hooks/useMeasurements';
import { ScrollArea } from '@/components/ui/scroll-area';
import MeasurementList from './MeasurementList';

interface MobileMassesOverlayProps {
  measurements: Measurement[];
  onClose: () => void;
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

const MobileMassesOverlay: React.FC<MobileMassesOverlayProps> = ({
  measurements,
  onClose,
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
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-background pointer-events-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-lg font-semibold">Massen</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          <MeasurementList
            measurements={measurements}
            toggleMeasurementVisibility={toggleMeasurementVisibility}
            toggleLabelVisibility={toggleLabelVisibility}
            handleStartPointEdit={handleStartPointEdit}
            handleDeleteMeasurement={handleDeleteMeasurement}
            handleDeletePoint={handleDeletePoint}
            updateMeasurement={updateMeasurement}
            editMeasurementId={editMeasurementId}
            segmentsOpen={segmentsOpen}
            toggleSegments={toggleSegments}
            onEditSegment={onEditSegment}
            movingPointInfo={movingPointInfo}
            handleMoveMeasurementUp={handleMoveMeasurementUp}
            handleMoveMeasurementDown={handleMoveMeasurementDown}
            showTable={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default MobileMassesOverlay;
