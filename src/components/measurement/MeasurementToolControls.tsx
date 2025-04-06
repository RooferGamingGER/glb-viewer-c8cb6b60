
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ruler, SquareDashedBottom, ArrowUpDown, Layers, Eye, EyeOff, TableProperties } from 'lucide-react';
import { Measurement, MeasurementMode } from '@/types/measurements';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  measurements: Measurement[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  showMeasurementList?: boolean;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId,
  measurements,
  showTable,
  setShowTable,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  showMeasurementList = false
}) => {
  const [showAllTools, setShowAllTools] = useState(true);

  // Filter measurements by type for organization
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area' || m.type === 'solar');
  // Combined utility functions to handle operations consistently
  const handleMeasurementEdit = (id: string) => {
    handleStartPointEdit(id);
  };

  // Toggle between list and table view
  const toggleTableView = () => {
    setShowTable(!showTable);
  };

  return (
    <div className="measurement-tools-container">
      {!showMeasurementList && (
        <>
          <div className="measurement-tool-buttons grid grid-cols-3 gap-1 mb-3">
            <Button
              variant={activeMode === 'length' ? "default" : "outline"}
              size="sm"
              className="flex flex-col items-center justify-center h-16 py-1 text-xs"
              onClick={() => toggleMeasurementTool('length')}
            >
              <Ruler className="h-5 w-5 mb-1" />
              <span>Länge</span>
            </Button>
            <Button
              variant={activeMode === 'height' ? "default" : "outline"}
              size="sm"
              className="flex flex-col items-center justify-center h-16 py-1 text-xs"
              onClick={() => toggleMeasurementTool('height')}
            >
              <ArrowUpDown className="h-5 w-5 mb-1" />
              <span>Höhe</span>
            </Button>
            <Button
              variant={activeMode === 'area' ? "default" : "outline"}
              size="sm"
              className="flex flex-col items-center justify-center h-16 py-1 text-xs"
              onClick={() => toggleMeasurementTool('area')}
            >
              <SquareDashedBottom className="h-5 w-5 mb-1" />
              <span>Fläche</span>
            </Button>
          </div>

          <div className="view-controls flex justify-between mb-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 mr-1"
              onClick={toggleTableView}
            >
              <TableProperties className="h-4 w-4 mr-1" />
              {showTable ? "Liste" : "Tabelle"}
            </Button>
          </div>
        </>
      )}

      {/* Measurement Data Display Section */}
      <div className="measurement-data">
        {showTable ? (
          <MeasurementTable
            measurements={measurements}
            toggleMeasurementVisibility={toggleMeasurementVisibility}
            toggleLabelVisibility={toggleLabelVisibility}
            onEdit={handleMeasurementEdit}
            onDelete={handleDeleteMeasurement}
            setShowTable={setShowTable}
          />
        ) : (
          <MeasurementList
            measurements={measurements}
            toggleMeasurementVisibility={toggleMeasurementVisibility}
            toggleLabelVisibility={toggleLabelVisibility}
            onEdit={handleMeasurementEdit}
            onDelete={handleDeleteMeasurement}
            segmentsOpen={segmentsOpen}
            toggleSegments={toggleSegments}
            onEditSegment={onEditSegment}
            updateMeasurement={updateMeasurement}
            handleDeletePoint={handleDeletePoint}
            movingPointInfo={movingPointInfo}
            handleMoveMeasurementUp={handleMoveMeasurementUp}
            handleMoveMeasurementDown={handleMoveMeasurementDown}
            setShowTable={setShowTable}
          />
        )}
      </div>
    </div>
  );
};

export default MeasurementToolControls;
