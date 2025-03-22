import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MeasurementDetail } from './MeasurementDetail';
import { MeasurementListItem } from './MeasurementListItem';
import { NoMeasurements } from './NoMeasurements';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { 
  Eye, 
  EyeOff, 
  Tag, 
  Trash2, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Sun
} from 'lucide-react';
import { Measurement, MeasurementMode } from '@/hooks/useMeasurements';

export interface MovingPointInfo {
  measurementId: string;
  pointIndex: number;
}

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  togglePVModulesVisibility?: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (id: string, pointIndex: number) => void;
  updateMeasurement: (measurement: Measurement) => void;
  editMeasurementId: string | null;
  segmentsOpen: boolean;
  toggleSegments: () => void;
  onEditSegment: (segmentId: string) => void;
  movingPointInfo: MovingPointInfo | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  toggleAllLabelsVisibility: () => void;
  allLabelsVisible: boolean;
  activeMode: string;
  handleMoveMeasurementUp: (id: string) => void;
  handleMoveMeasurementDown: (id: string) => void;
  toggleModuleSelection?: (measurementId: string, moduleIndex: number) => void;
  selectAllModules?: (measurementId: string) => void;
  deselectAllModules?: (measurementId: string) => void;
  toggleDetailedModules?: (measurementId: string) => void;
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
  handleMoveMeasurementDown,
  toggleModuleSelection,
  selectAllModules,
  deselectAllModules,
  toggleDetailedModules
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  const handleClearConfirm = () => {
    if (confirmClear) {
      handleClearMeasurements();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };
  
  const toggleItemExpanded = (id: string) => {
    setExpandedItems(current => 
      current.includes(id)
        ? current.filter(itemId => itemId !== id)
        : [...current, id]
    );
  };
  
  const isItemExpanded = (id: string) => expandedItems.includes(id);
  
  const visibleMeasurements = measurements.filter(m => m.visible !== false);
  
  const measurementsByType = measurements.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const isEditingMeasurement = editMeasurementId !== null || movingPointInfo !== null;
  
  const finalizedMeasurements = measurements.filter(m => !m.editMode);
  
  const handleModuleSelection = toggleModuleSelection || (() => {});
  const handleSelectAllModules = selectAllModules || (() => {});
  const handleDeselectAllModules = deselectAllModules || (() => {});
  const handleToggleDetailedModules = toggleDetailedModules || (() => {});
  
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          <div className="flex justify-between items-center w-full">
            <div>Messungen ({finalizedMeasurements.length})</div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleAllLabelsVisibility}
                title={allLabelsVisible ? "Alle Labels ausblenden" : "Alle Labels anzeigen"}
              >
                <Tag className={`h-4 w-4 ${!allLabelsVisible ? 'opacity-50' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Alle Messungen löschen"
                onClick={handleClearConfirm}
                disabled={isEditingMeasurement || measurements.length === 0}
              >
                {confirmClear ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </SidebarGroupLabel>
        
        <SidebarGroupContent>
          {finalizedMeasurements.length === 0 ? (
            <NoMeasurements activeMode={activeMode as MeasurementMode} />
          ) : (
            <ScrollArea className="h-[calc(100vh-12rem)] pr-2" type="auto">
              <div className="pb-2">
                {showTable ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-1 py-1 text-left font-medium text-xs">Typ</th>
                          <th className="px-1 py-1 text-left font-medium text-xs">Wert</th>
                          <th className="px-1 py-1 text-right font-medium text-xs">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalizedMeasurements.map((measurement) => (
                          <MeasurementListItem
                            key={measurement.id}
                            measurement={measurement}
                            toggleMeasurementVisibility={toggleMeasurementVisibility}
                            toggleLabelVisibility={toggleLabelVisibility}
                            handleStartPointEdit={handleStartPointEdit}
                            handleDeleteMeasurement={handleDeleteMeasurement}
                            handleMoveMeasurementUp={handleMoveMeasurementUp}
                            handleMoveMeasurementDown={handleMoveMeasurementDown}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {finalizedMeasurements.map((measurement) => (
                      <div key={measurement.id} className="relative">
                        <div className="absolute -left-3 flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-30 hover:opacity-100 transition-opacity"
                            onClick={() => handleMoveMeasurementUp(measurement.id)}
                            title="Nach oben"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-30 hover:opacity-100 transition-opacity"
                            onClick={() => handleMoveMeasurementDown(measurement.id)}
                            title="Nach unten"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {isItemExpanded(measurement.id) ? (
                          <MeasurementDetail
                            measurement={measurement}
                            toggleMeasurementVisibility={toggleMeasurementVisibility}
                            toggleLabelVisibility={toggleLabelVisibility}
                            togglePVModulesVisibility={togglePVModulesVisibility}
                            onStartEdit={handleStartPointEdit}
                            onDelete={handleDeleteMeasurement}
                            onDeletePoint={handleDeletePoint}
                            updateMeasurement={updateMeasurement}
                            segmentsOpen={segmentsOpen}
                            onToggleSegments={toggleSegments}
                            onEditSegment={onEditSegment}
                            toggleModuleSelection={toggleModuleSelection}
                            selectAllModules={selectAllModules}
                            deselectAllModules={deselectAllModules}
                            toggleDetailedModules={toggleDetailedModules}
                          />
                        ) : (
                          <div 
                            className="p-2 rounded-md border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => toggleItemExpanded(measurement.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="text-xs font-medium">
                                  {measurement.label || `#${measurement.id.substring(0, 4)}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {measurement.type === 'length' && `${measurement.value.toFixed(2)} m`}
                                  {measurement.type === 'height' && `${measurement.value.toFixed(2)} m`}
                                  {(measurement.type === 'area' || measurement.type === 'solar' || 
                                    measurement.type === 'skylight' || measurement.type === 'chimney') && 
                                    `${measurement.value.toFixed(2)} m²`}
                                </div>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMeasurementVisibility(measurement.id);
                                  }}
                                >
                                  {measurement.visible === false ? 
                                    <Eye className="h-3 w-3" /> : 
                                    <EyeOff className="h-3 w-3" />
                                  }
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLabelVisibility(measurement.id);
                                  }}
                                >
                                  <Tag className={`h-3 w-3 ${measurement.labelVisible === false ? 'opacity-50' : ''}`} />
                                </Button>
                                
                                {measurement.type === 'solar' && measurement.pvModuleInfo && 
                                 measurement.pvModuleInfo.moduleCount > 0 && togglePVModulesVisibility && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePVModulesVisibility(measurement.id);
                                    }}
                                  >
                                    <Sun className={`h-3 w-3 ${measurement.modulesVisible === false ? 'opacity-50' : ''}`} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
};

export default MeasurementSidebar;
