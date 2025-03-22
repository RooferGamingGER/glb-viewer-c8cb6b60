
import React, { useState } from 'react';
import { Eye, EyeOff, Edit, Trash, ChevronDown, ChevronRight, Trash2, X, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Measurement } from '@/hooks/useMeasurements';
import MeasurementTable from './MeasurementTable';
import MeasurementDetail from './MeasurementDetail';

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  togglePVModulesVisibility?: (id: string) => void; // New prop for PV toggle
  handleStartPointEdit: (id: string, index?: number) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (measurement: Measurement) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => Record<string, boolean>;
  onEditSegment: (segmentId: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  toggleAllLabelsVisibility: () => void;
  allLabelsVisible: boolean;
  activeMode: string;
  handleMoveMeasurementUp: (id: string) => void;
  handleMoveMeasurementDown: (id: string) => void;
}

const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({
  measurements,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  togglePVModulesVisibility,
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
  toggleAllLabelsVisibility,
  allLabelsVisible,
  activeMode,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  const [hoveredMeasurement, setHoveredMeasurement] = useState<string | null>(null);
  
  // Count by type for displaying type labels
  const measurementCounts = {
    length: measurements.filter(m => m.type === 'length').length,
    height: measurements.filter(m => m.type === 'height').length,
    area: measurements.filter(m => m.type === 'area').length,
    solar: measurements.filter(m => m.type === 'solar').length,
    skylight: measurements.filter(m => m.type === 'skylight').length,
    chimney: measurements.filter(m => m.type === 'chimney').length,
    vent: measurements.filter(m => m.type === 'vent').length,
    hook: measurements.filter(m => m.type === 'hook').length,
    other: measurements.filter(m => m.type === 'other').length,
    pvmodule: measurements.filter(m => m.type === 'pvmodule').length,
  };
  
  const isEditing = editMeasurementId !== null || movingPointInfo !== null;
  
  // Measurement type grouping
  const standardMeasurements = measurements.filter(m => ['length', 'height', 'area'].includes(m.type));
  const solarMeasurements = measurements.filter(m => m.type === 'solar');
  const roofElements = measurements.filter(m => 
    ['skylight', 'chimney', 'vent', 'hook', 'other', 'pvmodule'].includes(m.type)
  );
  
  // Helper functions for rendering common elements
  const renderMeasurementHeader = (measurement: Measurement) => (
    <div className="flex justify-between items-center w-full">
      <div className="flex-1 truncate font-medium">
        {measurement.label || `${measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)} ${measurement.id.slice(0, 4)}`}
      </div>
      <div className="flex space-x-1 shrink-0">
        {measurement.type === 'solar' && togglePVModulesVisibility && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              togglePVModulesVisibility(measurement.id);
            }}
            title={measurement.pvModulesVisible === false ? "Show PV Modules" : "Hide PV Modules"}
          >
            <Layers className={`h-4 w-4 ${measurement.pvModulesVisible === false ? 'text-muted-foreground' : 'text-blue-500'}`} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            toggleLabelVisibility(measurement.id);
          }}
          title={measurement.labelVisible === false ? "Show Label" : "Hide Label"}
        >
          {measurement.labelVisible === false ? 
            <EyeOff className="h-4 w-4 text-muted-foreground" /> : 
            <Eye className="h-4 w-4" />
          }
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            toggleMeasurementVisibility(measurement.id);
          }}
          title={measurement.visible === false ? "Show" : "Hide"}
        >
          {measurement.visible === false ? 
            <EyeOff className="h-4 w-4 text-muted-foreground" /> : 
            <Eye className="h-4 w-4" />
          }
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            handleStartPointEdit(measurement.id);
          }}
          disabled={isEditing}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteMeasurement(measurement.id);
          }}
          title="Delete"
        >
          <Trash className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            handleMoveMeasurementUp(measurement.id);
          }}
          title="Move Up"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            handleMoveMeasurementDown(measurement.id);
          }}
          title="Move Down"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  const renderMeasurementGroup = (title: string, groupMeasurements: Measurement[], count: number) => {
    if (count === 0) return null;
    
    return (
      <div className="mb-4">
        <h3 className="px-3 text-sm font-medium text-muted-foreground mb-2">{title} ({count})</h3>
        <div className="space-y-1">
          {groupMeasurements.map(measurement => (
            <MeasurementDetail
              key={measurement.id}
              measurement={measurement}
              isHovered={hoveredMeasurement === measurement.id}
              isEditing={editMeasurementId === measurement.id}
              handleMouseEnter={() => setHoveredMeasurement(measurement.id)}
              handleMouseLeave={() => setHoveredMeasurement(null)}
              segmentsOpen={segmentsOpen}
              toggleSegments={toggleSegments}
              onEditSegment={onEditSegment}
              renderHeader={() => renderMeasurementHeader(measurement)}
              updateMeasurement={updateMeasurement}
            />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <>
      {showTable ? (
        <MeasurementTable measurements={measurements} />
      ) : (
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold">
              Measurements ({measurements.length})
            </h2>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={toggleAllLabelsVisibility}
              >
                {allLabelsVisible ? "Hide All Labels" : "Show All Labels"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={handleClearMeasurements}
                disabled={measurements.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
          
          {renderMeasurementGroup("Standard Measurements", standardMeasurements, 
            measurementCounts.length + measurementCounts.height + measurementCounts.area)}
          
          {renderMeasurementGroup("Solar Panels", solarMeasurements, measurementCounts.solar)}
          
          {renderMeasurementGroup("Roof Elements", roofElements, 
            measurementCounts.skylight + measurementCounts.chimney + 
            measurementCounts.vent + measurementCounts.hook + 
            measurementCounts.other + measurementCounts.pvmodule)}
          
          {measurements.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No measurements yet. Use the tools above to start measuring.
            </div>
          )}
        </ScrollArea>
      )}
    </>
  );
};

export default MeasurementSidebar;
