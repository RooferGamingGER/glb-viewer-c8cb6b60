
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Measurement } from '@/hooks/useMeasurements'; 
import { Button } from '@/components/ui/button';
import { Separator } from "@/components/ui/separator";
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Sun, 
  Home, 
  Mountain, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  Check, 
  X 
} from 'lucide-react';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { MeasurementMode } from '@/types/measurements';

interface EnhancedMeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility?: (id: string) => void; 
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  activeMode: MeasurementMode;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  toggleAllLabelsVisibility?: () => void;
  allLabelsVisible?: boolean;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
}

const EnhancedMeasurementSidebar: React.FC<EnhancedMeasurementSidebarProps> = (props) => {
  const {
    measurements,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    handleStartPointEdit,
    handleDeleteMeasurement,
    handleDeletePoint,
    updateMeasurement,
    editMeasurementId,
    activeMode,
    segmentsOpen,
    toggleSegments,
    onEditSegment,
    movingPointInfo,
    showTable,
    handleClearMeasurements,
    toggleAllLabelsVisibility,
    allLabelsVisible,
    toggleMeasurementTool,
    handleMoveMeasurementUp,
    handleMoveMeasurementDown
  } = props;

  // Tool categories for better organization
  const measurementTools = [
    { mode: 'length', icon: <Ruler size={18} />, label: 'Länge' },
    { mode: 'height', icon: <ArrowUpDown size={18} />, label: 'Höhe' },
    { mode: 'area', icon: <Square size={18} />, label: 'Fläche' },
  ] as const;
  
  const roofElementTools = [
    { mode: 'skylight', icon: <Square size={18} />, label: 'Dachfenster' },
    { mode: 'chimney', icon: <Home size={18} />, label: 'Kamin' },
    { mode: 'solar', icon: <Sun size={18} />, label: 'Solaranlage' },
    { mode: 'pvmodule', icon: <Sun size={18} />, label: 'PV-Modul' },
  ] as const;
  
  const roofEdgeTools = [
    { mode: 'ridge', icon: <Mountain size={18} />, label: 'First' },
    { mode: 'eave', icon: <ArrowDown size={18} />, label: 'Traufe' },
    { mode: 'verge', icon: <ArrowUp size={18} />, label: 'Ortgang' },
    { mode: 'valley', icon: <ArrowDown size={18} />, label: 'Kehle' },
    { mode: 'hip', icon: <Mountain size={18} />, label: 'Grat' },
  ] as const;

  const penetrationTools = [
    { mode: 'vent', icon: <Square size={18} />, label: 'Lüfter' },
    { mode: 'hook', icon: <Square size={18} />, label: 'Dachhaken' },
    { mode: 'other', icon: <Square size={18} />, label: 'Sonstiges' },
  ] as const;
  
  return (
    <div className="glass-panel h-full flex flex-col">
      <div className="p-3 border-b border-white/10 flex justify-between items-center">
        <h2 className="font-semibold text-lg">Messungen</h2>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleAllLabelsVisibility}
            title={allLabelsVisible ? "Beschriftungen ausblenden" : "Beschriftungen einblenden"}
          >
            {allLabelsVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleClearMeasurements()}
            className="hover:bg-destructive/20"
            title="Alle Messungen löschen"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div>
          <div className="category-group">
            <h3 className="category-header">Messungen</h3>
            <div className="tool-grid mb-4">
              {measurementTools.map((tool) => (
                <button
                  key={tool.mode}
                  className={`glass-icon-button flex flex-col items-center justify-center p-2 text-xs ${activeMode === tool.mode ? 'active' : ''}`}
                  onClick={() => toggleMeasurementTool(tool.mode as MeasurementMode)}
                  title={tool.label}
                >
                  {tool.icon}
                  <span className="mt-1">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="category-group">
            <h3 className="category-header">Dachelemente</h3>
            <div className="tool-grid mb-4">
              {roofElementTools.map((tool) => (
                <button
                  key={tool.mode}
                  className={`glass-icon-button flex flex-col items-center justify-center p-2 text-xs ${activeMode === tool.mode ? 'active' : ''}`}
                  onClick={() => toggleMeasurementTool(tool.mode as MeasurementMode)}
                  title={tool.label}
                >
                  {tool.icon}
                  <span className="mt-1">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="category-group">
            <h3 className="category-header">Dachkanten</h3>
            <div className="tool-grid mb-4">
              {roofEdgeTools.map((tool) => (
                <button
                  key={tool.mode}
                  className={`glass-icon-button flex flex-col items-center justify-center p-2 text-xs ${activeMode === tool.mode ? 'active' : ''}`}
                  onClick={() => toggleMeasurementTool(tool.mode as MeasurementMode)}
                  title={tool.label}
                >
                  {tool.icon}
                  <span className="mt-1">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="category-group">
            <h3 className="category-header">Durchdringungen</h3>
            <div className="tool-grid mb-4">
              {penetrationTools.map((tool) => (
                <button
                  key={tool.mode}
                  className={`glass-icon-button flex flex-col items-center justify-center p-2 text-xs ${activeMode === tool.mode ? 'active' : ''}`}
                  onClick={() => toggleMeasurementTool(tool.mode as MeasurementMode)}
                  title={tool.label}
                >
                  {tool.icon}
                  <span className="mt-1">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator className="my-3 bg-white/10" />

          <div className="category-group">
            <div className="flex justify-between items-center mb-2">
              <h3 className="category-header">Messliste</h3>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => props.showTable ? {} : {}}
                  className={showTable ? 'bg-white/20' : ''}
                  title="Tabellenmodus"
                >
                  <Check size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => props.showTable ? {} : {}}
                  className={!showTable ? 'bg-white/20' : ''}
                  title="Listenmodus"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
            
            <div className="glass-card">
              {showTable ? (
                <MeasurementTable 
                  measurements={measurements}
                />
              ) : (
                <MeasurementList
                  measurements={measurements}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  toggleLabelVisibility={toggleLabelVisibility}
                  handleStartPointEdit={handleStartPointEdit}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  editMeasurementId={editMeasurementId}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  handleMoveMeasurementUp={handleMoveMeasurementUp}
                  handleMoveMeasurementDown={handleMoveMeasurementDown}
                />
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default EnhancedMeasurementSidebar;
