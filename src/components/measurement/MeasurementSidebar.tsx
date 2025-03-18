
import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Ruler, Home, Layers } from 'lucide-react';
import { Measurement, Point } from '@/hooks/useMeasurements';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
}

type MeasurementCategory = 'standard' | 'roofelements' | 'penetrations';

/**
 * Component for displaying measurements in a sidebar
 */
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
  handleClearMeasurements
}) => {
  const [activeCategory, setActiveCategory] = useState<MeasurementCategory>('standard');

  // Count number of measurements in each category
  const standardCount = measurements.filter(m => ['length', 'height', 'area'].includes(m.type)).length;
  const roofElementsCount = measurements.filter(m => ['skylight', 'chimney', 'solar', 'gutter', 'dormer'].includes(m.type)).length;
  const penetrationsCount = measurements.filter(m => ['vent', 'hook', 'other'].includes(m.type)).length;
  
  return (
    <>
      {/* Fixed title bar for measurements */}
      <div className="flex-shrink-0 p-3 border-t border-b border-border/50 flex justify-between items-center">
        <div className="text-base font-medium">
          {showTable ? "Messungen (Tabelle)" : "Messungen"}
        </div>
        
        {measurements.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={handleClearMeasurements}
            disabled={!!editMeasurementId}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Alle löschen
          </Button>
        )}
      </div>
      
      {/* Scrollable content area */}
      <ScrollArea className="flex-1 overflow-auto">
        {showTable ? (
          <div className="p-3">
            <MeasurementTable measurements={measurements} />
          </div>
        ) : (
          <div className="p-3">
            <Tabs defaultValue="standard" value={activeCategory} onValueChange={(value) => setActiveCategory(value as MeasurementCategory)}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="standard" className="flex-1">
                  <Ruler className="h-4 w-4 mr-1" />
                  Standard
                  {standardCount > 0 && (
                    <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">{standardCount}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="roofelements" className="flex-1">
                  <Home className="h-4 w-4 mr-1" />
                  Dachelemente
                  {roofElementsCount > 0 && (
                    <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">{roofElementsCount}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="penetrations" className="flex-1">
                  <Layers className="h-4 w-4 mr-1" />
                  Einbauten
                  {penetrationsCount > 0 && (
                    <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">{penetrationsCount}</span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="standard" className="m-0">
                <MeasurementList
                  measurements={measurements}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  handleStartPointEdit={handleStartPointEdit}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  handleDeletePoint={handleDeletePoint}
                  updateMeasurement={updateMeasurement}
                  editMeasurementId={editMeasurementId}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  movingPointInfo={movingPointInfo}
                  activeCategory="standard"
                />
              </TabsContent>
              <TabsContent value="roofelements" className="m-0">
                <MeasurementList
                  measurements={measurements}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  handleStartPointEdit={handleStartPointEdit}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  handleDeletePoint={handleDeletePoint}
                  updateMeasurement={updateMeasurement}
                  editMeasurementId={editMeasurementId}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  movingPointInfo={movingPointInfo}
                  activeCategory="roofelements"
                />
              </TabsContent>
              <TabsContent value="penetrations" className="m-0">
                <MeasurementList
                  measurements={measurements}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  handleStartPointEdit={handleStartPointEdit}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  handleDeletePoint={handleDeletePoint}
                  updateMeasurement={updateMeasurement}
                  editMeasurementId={editMeasurementId}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  movingPointInfo={movingPointInfo}
                  activeCategory="penetrations"
                />
              </TabsContent>
            </Tabs>
            
            {measurements.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                Keine Messungen vorhanden
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </>
  );
};

export default MeasurementSidebar;
