
import React, { useState } from 'react';
import { Measurement } from '@/types/measurements';
import { Button } from "@/components/ui/button";
import { 
  Trash, 
  Table as TableIcon,
  Download
} from 'lucide-react';
import { exportMeasurementsToCSV } from '@/utils/exportUtils';
import MeasurementItem from './MeasurementItem';
import MeasurementTable from './MeasurementTable';
import { toast } from 'sonner';
import { SidebarContent } from "@/components/ui/sidebar";
import RectangleEditor from './RectangleEditor';

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string, pointIndex: number) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  startRectangleEdit?: (id: string) => void;
  finishRectangleEdit?: (id: string) => void;
  cancelRectangleEdit?: (id: string) => void;
  editingRectangleId?: string | null;
}

const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({
  measurements,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  showTable,
  handleClearMeasurements,
  startRectangleEdit,
  finishRectangleEdit,
  cancelRectangleEdit,
  editingRectangleId
}) => {
  // Export measurements function
  const handleExport = () => {
    if (measurements.length === 0) {
      toast.error('Keine Messungen zum Exportieren vorhanden');
      return;
    }
    
    exportMeasurementsToCSV(measurements);
    toast.success('Messungen wurden als CSV exportiert');
  };

  // If table view is active, show the table instead of the list
  if (showTable) {
    return (
      <SidebarContent className="px-3 pt-3 overflow-auto">
        <MeasurementTable measurements={measurements} />
      </SidebarContent>
    );
  }

  // If we have an active rectangle being edited, show the rectangle editor
  const rectangleEditingMeasurement = editingRectangleId ? 
    measurements.find(m => m.id === editingRectangleId) : null;

  return (
    <SidebarContent className="px-3 pt-3 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Messungen ({measurements.length})</h3>
        
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleExport}
            title="Als CSV exportieren"
            disabled={measurements.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleClearMeasurements}
            title="Alle Messungen löschen"
            disabled={measurements.length === 0}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {measurements.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Keine Messungen vorhanden
        </div>
      ) : (
        <div>
          {measurements.map((measurement) => (
            <MeasurementItem
              key={measurement.id}
              measurement={measurement}
              toggleMeasurementVisibility={toggleMeasurementVisibility}
              handleStartPointEdit={handleStartPointEdit}
              handleDeleteMeasurement={handleDeleteMeasurement}
              updateMeasurement={updateMeasurement}
              isSegmentOpen={segmentsOpen[measurement.id] || false}
              toggleSegment={() => toggleSegments(measurement.id)}
              onEditSegment={onEditSegment}
              movingPointInfo={movingPointInfo}
              handleDeletePoint={handleDeletePoint}
              onEditRectangle={startRectangleEdit}
              editingRectangleId={editingRectangleId}
            />
          ))}
        </div>
      )}
      
      {/* Rectangle Editor - render only if a rectangle is being edited */}
      {rectangleEditingMeasurement && finishRectangleEdit && cancelRectangleEdit && (
        <RectangleEditor 
          measurement={rectangleEditingMeasurement}
          onUpdate={(id, points) => {
            // This function is handled by the interaction system now
          }}
          onFinishEdit={finishRectangleEdit}
          onCancelEdit={cancelRectangleEdit}
        />
      )}
    </SidebarContent>
  );
};

export default MeasurementSidebar;
