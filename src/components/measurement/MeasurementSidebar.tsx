
import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Measurement } from '@/types/measurements'; 
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  useSidebar
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import PointEditList from './PointEditList';
import { AlertCircle, Layers, Ruler, X, Eye, EyeOff, Search, Plus, ChevronDown, ChevronUp, PanelLeft, PanelRight } from 'lucide-react';
import { toast } from 'sonner';

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility?: (id: string) => void; 
  handleStartPointEdit: (id: string, pointIndex?: number) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment?: (id: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  handleClearMeasurements?: () => void;
  toggleAllLabelsVisibility?: () => void;
  allLabelsVisible?: boolean;
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
  setShowTable,
  handleClearMeasurements,
  toggleAllLabelsVisibility,
  allLabelsVisible,
  activeMode,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { open, toggleSidebar } = useSidebar();

  // Filter measurements based on search term
  const filteredMeasurements = measurements.filter(measurement => 
    measurement.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    measurement.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group measurements by type
  const measurementsByType = {
    all: filteredMeasurements,
    length: filteredMeasurements.filter(m => m.type === 'length' || m.type === 'height'),
    area: filteredMeasurements.filter(m => m.type === 'area'),
    solar: filteredMeasurements.filter(m => m.type === 'solar' || m.type === 'pvmodule')
  };

  // Count measurements by type
  const counts = {
    all: filteredMeasurements.length,
    length: measurementsByType.length.length,
    area: measurementsByType.area.length,
    solar: measurementsByType.solar.length
  };

  return (
    <div className="h-full flex flex-col">
      <SidebarHeader className="px-3 py-2 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Messungen</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {open ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Messungen suchen..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </SidebarHeader>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mx-3 my-2">
          <TabsTrigger value="all">
            Alle ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="length">
            Längen ({counts.length})
          </TabsTrigger>
          <TabsTrigger value="area">
            Flächen ({counts.area})
          </TabsTrigger>
          <TabsTrigger value="solar">
            Solar ({counts.solar})
          </TabsTrigger>
        </TabsList>

        {Object.keys(measurementsByType).map((type) => (
          <TabsContent key={type} value={type} className="mt-0">
            <SidebarContent className="pb-2">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <SidebarGroup>
                  {measurementsByType[type as keyof typeof measurementsByType].length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      Keine Messungen gefunden
                    </div>
                  ) : (
                    <SidebarMenu>
                      {measurementsByType[type as keyof typeof measurementsByType].map((measurement) => (
                        <SidebarMenuItem key={measurement.id}>
                          <SidebarMenuButton 
                            className="w-full justify-between"
                            variant={measurement.id === editMeasurementId ? "outline" : "default"}
                          >
                            <div className="flex items-center space-x-2">
                              {measurement.type === 'length' && <Ruler className="h-4 w-4" />}
                              {measurement.type === 'area' && <Layers className="h-4 w-4" />}
                              {(measurement.type === 'solar' || measurement.type === 'pvmodule') && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
                                  <path d="m10 14-2-2 2-2" />
                                  <path d="m14 10 2 2-2 2" />
                                </svg>
                              )}
                              <span>{measurement.name || `Messung ${measurement.id.slice(0, 5)}`}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              {handleMoveMeasurementUp && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveMeasurementUp(measurement.id);
                                  }}
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              
                              {handleMoveMeasurementDown && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveMeasurementDown(measurement.id);
                                  }}
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMeasurementVisibility(measurement.id);
                                }}
                              >
                                {measurement.visible !== false ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartPointEdit(measurement.id);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMeasurement(measurement.id);
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </SidebarMenuButton>
                          
                          {/* Point Edit List component for the selected measurement */}
                          {measurement.id === editMeasurementId && handleDeletePoint && (
                            <div className="px-3 pt-1">
                              <PointEditList
                                measurement={measurement}
                                handleDeletePoint={handleDeletePoint}
                                movingPointInfo={movingPointInfo}
                              />
                            </div>
                          )}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}
                </SidebarGroup>
              </ScrollArea>
            </SidebarContent>
          </TabsContent>
        ))}
      </Tabs>

      <SidebarFooter className="border-t pt-2 px-3">
        <div className="flex justify-between">
          <Button 
            size="sm" 
            variant="outline"
            className="text-xs"
            onClick={handleClearMeasurements}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Alle löschen
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            className="text-xs"
            onClick={toggleAllLabelsVisibility}
          >
            {allLabelsVisible ? (
              <><EyeOff className="h-3.5 w-3.5 mr-1" /> Labels verstecken</>
            ) : (
              <><Eye className="h-3.5 w-3.5 mr-1" /> Labels anzeigen</>
            )}
          </Button>
        </div>
      </SidebarFooter>
    </div>
  );
};

export default MeasurementSidebar;
