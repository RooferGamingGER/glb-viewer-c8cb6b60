import React, { useState } from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MeasurementMode } from '@/types/measurements';
import SolarToolbar from './SolarToolbar';
import RoofElementsToolbar from './RoofElementsToolbar';
import SolarMeasurementContent from './SolarMeasurementContent';
import CollapsibleSection from '@/components/ui/collapsible-section';
import { Ruler, ArrowUpDown, Square, MinusSquare, X, ChevronDown, Pencil, Check, Sun } from 'lucide-react';
import { formatMeasurementValue, getMeasurementTypeDisplayName } from '@/utils/exportUtils';

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
    case 'solar': return <Sun className="h-3 w-3 shrink-0" />;
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelValue, setLabelValue] = useState('');

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startLabelEdit = (m: { id: string; label?: string; type: string }) => {
    setEditingLabelId(m.id);
    setLabelValue(m.label || getMeasurementTypeDisplayName(m.type));
  };

  const saveLabelEdit = (id: string) => {
    updateMeasurement(id, { label: labelValue.trim() || undefined });
    setEditingLabelId(null);
  };

  const isExpandableType = (type: string) => ['area', 'deductionarea', 'solar'].includes(type);

  // Separate solar measurements from others
  const solarMeasurements = measurements.filter(m => m.type === 'solar');
  const otherMeasurements = measurements.filter(m => m.type !== 'solar');

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-2 flex flex-col h-full">
        {/* Solar planning */}
        <SolarToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool || (() => {})}
          editMeasurementId={editMeasurementId}
        />

        {/* Solar measurements with full PV content */}
        {solarMeasurements.length > 0 && (
          <div className="mt-1">
            {solarMeasurements.map(m => (
              <CollapsibleSection 
                key={m.id} 
                title={`☀️ ${m.label || 'Solarfläche'} — ${formatMeasurementValue(m)}`}
                defaultOpen={true}
              >
                <SolarMeasurementContent
                  measurement={m}
                  updateMeasurement={updateMeasurement}
                />
              </CollapsibleSection>
            ))}
          </div>
        )}
        
        {/* Roof elements */}
        <RoofElementsToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool || (() => {})}
          editMeasurementId={editMeasurementId}
        />

        {/* Compact measurement list */}
        {otherMeasurements.length > 0 && (
          <CollapsibleSection title={`Messungen (${otherMeasurements.length})`} defaultOpen={true}>
            <div className="flex flex-col gap-px">
              {otherMeasurements.map((m) => {
                const hasSegments = isExpandableType(m.type) && m.segments && m.segments.length > 0;
                const isExpanded = expandedIds.has(m.id);
                const isEditingLabel = editingLabelId === m.id;

                return (
                  <div key={m.id} className="border border-border/30 rounded">
                    {/* Header row */}
                    <div
                      className="flex items-center gap-1 px-1.5 py-1 hover:bg-accent/30 text-xs group cursor-pointer"
                      onClick={() => {
                        if (!isEditingLabel && hasSegments) toggleExpanded(m.id);
                      }}
                    >
                      {hasSegments && (
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                      )}
                      {getTypeIcon(m.type)}

                      {/* Label: editable or display */}
                      {isEditingLabel ? (
                        <div className="flex items-center gap-0.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                          <Input
                            value={labelValue}
                            onChange={e => setLabelValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveLabelEdit(m.id); if (e.key === 'Escape') setEditingLabelId(null); }}
                            className="h-5 text-xs px-1 py-0 min-w-0 flex-1"
                            autoFocus
                          />
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => saveLabelEdit(m.id)}>
                            <Check className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="truncate flex-1 min-w-0 hover:underline"
                          onDoubleClick={(e) => { e.stopPropagation(); startLabelEdit(m); }}
                          title="Doppelklick zum Umbenennen"
                        >
                          {m.label || getMeasurementTypeDisplayName(m.type)}
                        </span>
                      )}

                      <span className="text-muted-foreground font-mono whitespace-nowrap text-[11px]">
                        {formatMeasurementValue(m)}
                      </span>

                      {/* Rename button */}
                      {!isEditingLabel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => { e.stopPropagation(); startLabelEdit(m); }}
                          title="Umbenennen"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </Button>
                      )}

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDeleteMeasurement(m.id); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Expanded segments */}
                    {hasSegments && isExpanded && (
                      <div className="border-t border-border/20 bg-muted/30 px-2 py-1">
                        {m.segments!.map((seg, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px] text-muted-foreground py-px">
                            <span className="truncate">{seg.label || `Segment ${idx + 1}`}</span>
                            <span className="font-mono whitespace-nowrap ml-2">{seg.length?.toFixed(2)} m</span>
                          </div>
                        ))}
                        {m.type === 'area' && m.points && m.points.length >= 3 && (
                          <div className="flex items-center justify-between text-[10px] font-medium pt-0.5 border-t border-border/20 mt-0.5">
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
