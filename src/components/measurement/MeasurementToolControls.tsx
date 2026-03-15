import React from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import { ScrollArea } from '@/components/ui/scroll-area';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { MeasurementMode } from '@/types/measurements';
import SolarToolbar from './SolarToolbar';
import RoofElementsToolbar from './RoofElementsToolbar';
import CollapsibleSection from '@/components/ui/collapsible-section';
import { Ruler, ArrowUpDown, Square, MinusSquare, X, ChevronDown } from 'lucide-react';
import { formatMeasurementValue, getMeasurementTypeDisplayName } from '@/utils/exportUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MeasurementToolControlsProps {
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
  activeMode: MeasurementMode;
  toggleMeasurementTool?: (mode: MeasurementMode) => void;
  movingPointInfo?: {
    measurementId: string;
    pointIndex: number;
  } | null;
  handleClearMeasurements: () => void;
  toggleAllMeasurementsVisibility?: () => void;
  toggleAllLabelsVisibility?: () => void;
  allMeasurementsVisible?: boolean;
  allLabelsVisible?: boolean;
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  showMeasurementList?: boolean;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'length': return <Ruler className="h-3 w-3 shrink-0" />;
    case 'height': return <ArrowUpDown className="h-3 w-3 shrink-0" />;
    case 'area': return <Square className="h-3 w-3 shrink-0" />;
    case 'deductionarea': return <MinusSquare className="h-3 w-3 shrink-0" />;
    default: return <Square className="h-3 w-3 shrink-0" />;
  }
};

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
  measurements, toggleMeasurementVisibility, toggleLabelVisibility,
  handleStartPointEdit, handleDeleteMeasurement, handleDeletePoint,
  updateMeasurement, editMeasurementId, segmentsOpen, toggleSegments,
  onEditSegment, activeMode, toggleMeasurementTool, movingPointInfo,
  handleClearMeasurements, toggleAllMeasurementsVisibility,
  toggleAllLabelsVisibility, allMeasurementsVisible, allLabelsVisible,
  showTable, setShowTable, handleMoveMeasurementUp, handleMoveMeasurementDown,
  showMeasurementList = true
}) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group measurements by type for compact display
  const isAreaType = (type: string) => ['area', 'deductionarea', 'solar'].includes(type);

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-3 flex flex-col h-full gap-3">
        {/* Solar planning */}
        <SolarToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool || ((mode) => {})}
          editMeasurementId={editMeasurementId}
        />
        
        {/* Roof elements */}
        <RoofElementsToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool || ((mode) => {})}
          editMeasurementId={editMeasurementId}
        />

        {/* Compact measurement list - styled like overlay */}
        {measurements.length > 0 && (
          <CollapsibleSection title={`Messungen (${measurements.length})`} defaultOpen={true}>
            <div className="flex flex-col gap-0.5">
              {measurements.map((m) => {
                const hasSegments = isAreaType(m.type) && m.segments && m.segments.length > 0;
                const isExpanded = expandedIds.has(m.id);

                return (
                  <div key={m.id} className="border border-border/30 rounded">
                    {/* Compact header row */}
                    <div
                      className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-accent/30 text-xs group cursor-pointer"
                      onClick={() => hasSegments && toggleExpanded(m.id)}
                    >
                      {hasSegments && (
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                      )}
                      {getTypeIcon(m.type)}
                      <span className="truncate flex-1 min-w-0">
                        {m.label || getMeasurementTypeDisplayName(m.type)}
                      </span>
                      <span className="text-muted-foreground font-mono whitespace-nowrap text-[11px]">
                        {formatMeasurementValue(m)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDeleteMeasurement(m.id); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Expanded segments for area types */}
                    {hasSegments && isExpanded && (
                      <div className="border-t border-border/20 bg-muted/30 px-3 py-1.5">
                        {m.segments!.map((seg, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px] text-muted-foreground py-0.5">
                            <span className="truncate">
                              {seg.label || `Segment ${idx + 1}`}
                            </span>
                            <span className="font-mono whitespace-nowrap ml-2">
                              {seg.length?.toFixed(2)} m
                            </span>
                          </div>
                        ))}
                        {m.type === 'area' && m.points && m.points.length >= 3 && (
                          <div className="flex items-center justify-between text-[10px] font-medium pt-1 border-t border-border/20 mt-1">
                            <span>Fläche</span>
                            <span className="font-mono">{formatMeasurementValue(m)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </ScrollArea>
  );
};

export default MeasurementToolControls;
