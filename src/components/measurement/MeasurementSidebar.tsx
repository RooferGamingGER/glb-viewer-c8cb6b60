import React, { useState } from 'react';
import { 
  Button
} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  ScrollArea
} from "@/components/ui/scroll-area";
import { Measurement } from '@/types/measurements';
import MeasurementItem from './MeasurementItem';
import MeasurementTable from './MeasurementTable';
import { 
  Trash2, 
  List, 
  Table2, 
  Tag, 
  Square, 
  CircleSlashed, 
  Eye,
  EyeOff
} from 'lucide-react';
import ExportPdfButton from './ExportPdfButton';

interface MeasurementSidebarProps {
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
  onEditSegment: (segmentId: string) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  toggleAllLabelsVisibility: () => void;
  allLabelsVisible: boolean;
  activeMode?: string;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
}

const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({
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
  showTable,
  handleClearMeasurements,
  toggleAllLabelsVisibility,
  allLabelsVisible,
  activeMode,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  const [filter, setFilter] = useState<string | null>(null);
  
  // Filter measurements based on the selected filter
  const filteredMeasurements = measurements.filter(m => {
    if (!filter) return true;
    
    switch (filter) {
      case 'areas':
        return m.type === 'area';
      case 'lengths':
        return m.type === 'length';
      case 'heights':
        return m.type === 'height';
      case 'elements':
        return ['chimney', 'skylight', 'solar', 'dormer'].includes(m.type);
      case 'roof':
        return ['ridge', 'eave', 'verge', 'valley', 'hip'].includes(m.type);
      default:
        return true;
    }
  });
  
  const hasAreaMeasurements = measurements.some(m => m.type === 'area');
  const hasRoofElements = measurements.some(m => 
    ['chimney', 'skylight', 'solar', 'dormer'].includes(m.type)
  );
  const hasLengths = measurements.some(m => m.type === 'length');
  const hasHeights = measurements.some(m => m.type === 'height');
  const hasRoofStructure = measurements.some(m => 
    ['ridge', 'eave', 'verge', 'valley', 'hip'].includes(m.type)
  );
  
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-2 border-b border-border/50 flex flex-wrap gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={!filter ? "secondary" : "outline"} 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setFilter(null)}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Alle Messungen
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {hasAreaMeasurements && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={filter === 'areas' ? "secondary" : "outline"} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setFilter('areas')}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Flächen
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {hasLengths && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={filter === 'lengths' ? "secondary" : "outline"} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setFilter('lengths')}
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Längen
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {hasHeights && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={filter === 'heights' ? "secondary" : "outline"} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setFilter('heights')}
                >
                  <Tag className="h-4 w-4 rotate-90" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Höhen
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {hasRoofElements && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={filter === 'elements' ? "secondary" : "outline"} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setFilter('elements')}
                >
                  <CircleSlashed className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Dacheinbauten
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {hasRoofStructure && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={filter === 'roof' ? "secondary" : "outline"} 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setFilter('roof')}
                >
                  <Tag className="h-4 w-4 -rotate-45" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Dachstruktur
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <div className="ml-auto flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={toggleAllLabelsVisibility}
                >
                  {allLabelsVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {allLabelsVisible ? "Alle Labels ausblenden" : "Alle Labels einblenden"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={handleClearMeasurements}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Alle Messungen löschen
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        {showTable ? (
          <MeasurementTable 
            measurements={filteredMeasurements} 
            handleDeleteMeasurement={handleDeleteMeasurement}
            toggleMeasurementVisibility={toggleMeasurementVisibility}
            toggleLabelVisibility={toggleLabelVisibility}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3">
              {filteredMeasurements.length === 0 ? (
                <div className="text-center text-muted-foreground p-4">
                  {measurements.length === 0 ? (
                    <>Keine Messungen vorhanden</>
                  ) : (
                    <>Keine Messungen mit diesem Filter</>
                  )}
                </div>
              ) : (
                filteredMeasurements.map(measurement => (
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
                    segmentsOpen={segmentsOpen}
                    toggleSegments={toggleSegments}
                    onEditSegment={onEditSegment}
                    movingPointInfo={movingPointInfo}
                    handleMoveMeasurementUp={handleMoveMeasurementUp}
                    handleMoveMeasurementDown={handleMoveMeasurementDown}
                    allMeasurements={measurements} // Pass all measurements for ridge/eave detection
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>
      
      {measurements.length > 0 && (
        <div className="p-3 border-t border-border/50">
          <ExportPdfButton measurements={measurements} />
        </div>
      )}
    </div>
  );
};

export default MeasurementSidebar;
