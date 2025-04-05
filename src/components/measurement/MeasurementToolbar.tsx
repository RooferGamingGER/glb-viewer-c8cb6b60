
import React from 'react';
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Trash2,
  Magnet,
  FileCsv,
  Eye,
  EyeOff
} from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import { 
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu, 
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import ExportPdfButton from './ExportPdfButton';
import GenerateRoofPlanButton from './GenerateRoofPlanButton';
import { Toggle } from "@/components/ui/toggle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePointSnapping } from '@/contexts/PointSnappingContext';

interface MeasurementToolbarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  visible?: boolean;
  setVisible?: (visible: boolean) => void;
  handleClearMeasurements?: () => void;
  measurements?: any[];
  editMeasurementId?: string | null;
  onCategoryClick?: (category: MeasurementMode) => void;
  toggleAllLabelsVisibility?: () => void;
  allLabelsVisible?: boolean;
}

const MeasurementToolbar: React.FC<MeasurementToolbarProps> = ({
  activeMode,
  toggleMeasurementTool,
  visible,
  setVisible,
  handleClearMeasurements,
  measurements,
  editMeasurementId,
  onCategoryClick,
  toggleAllLabelsVisibility,
  allLabelsVisible
}) => {
  // Use the centralized point snapping context
  const { snapEnabled, setSnapEnabled } = usePointSnapping();
  
  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    
    if (activeMode === mode) {
      toast.info(`Messwerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      // Show appropriate tool selection messages
      if (mode === 'length') {
        toast.info('Längenmessung ausgewählt - Platzieren Sie 2 Punkte');
      } else if (mode === 'height') {
        toast.info('Höhenmessung ausgewählt - Platzieren Sie 2 Punkte');
      } else if (mode === 'area') {
        toast.info('Flächenmessung ausgewählt - Platzieren Sie mindestens 3 Punkte');
      } else {
        toast.info('Navigationsmodus aktiviert');
      }
    }
  };
  
  const handleToggleSnap = () => {
    const newValue = !snapEnabled;
    setSnapEnabled(newValue);
    toast.info(newValue 
      ? "Punktfang aktiviert: Punkte rasten automatisch ein" 
      : "Punktfang deaktiviert: Punkte werden exakt platziert"
    );
  };
  
  // Function to export measurements as CSV
  const exportMeasurementsAsCSV = () => {
    if (!measurements || measurements.length === 0) {
      toast.error('Keine Messungen für den Export vorhanden');
      return;
    }
    
    // CSV headers
    let csvContent = 'ID,Typ,Wert,Punkte\n';
    
    // Add each measurement
    measurements.forEach(m => {
      const type = m.type;
      const value = m.value || 0;
      const pointsStr = m.points ? m.points.map((p: any) => 
        `(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)})`
      ).join(' ') : '';
      
      csvContent += `${m.id},"${type}",${value.toFixed(2)},"${pointsStr}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.setAttribute('download', `Messungen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV-Datei wurde heruntergeladen');
  };
  
  return (
    <SidebarGroup className="mt-0">
      <Accordion type="multiple" defaultValue={["measurement-tools"]}>
        <AccordionItem value="measurement-tools" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Messwerkzeuge</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent>
              <div className="text-xs text-muted-foreground mb-2">
                Wählen Sie ein Werkzeug zur Messung.
              </div>
              
              {/* Point Snapping Toggle - Moved to top as requested */}
              <Toggle
                pressed={snapEnabled}
                onPressedChange={handleToggleSnap}
                size="sm"
                variant={snapEnabled ? "customActive" : "outline"}
                aria-label="Punktfang ein/aus"
                title={snapEnabled ? "Punktfang deaktivieren" : "Punktfang aktivieren"}
                className={`w-full justify-start mb-4 ${snapEnabled ? 'bg-green-500/20 text-green-600 border-green-500' : ''}`}
              >
                <Magnet className={`h-4 w-4 mr-2 ${!snapEnabled ? 'text-muted-foreground' : ''}`} />
                Punktfang {snapEnabled ? 'Ein' : 'Aus'}
              </Toggle>
              
              <SidebarMenu>
                <div className="flex flex-col gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'length'}
                      onClick={() => selectTool('length')}
                      tooltip={activeMode === 'length' ? "Längenmessung deaktivieren" : "Länge messen"}
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50"
                    >
                      <Ruler className="h-4 w-4" />
                      <span className="text-xs">Länge</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'height'}
                      onClick={() => selectTool('height')}
                      tooltip={activeMode === 'height' ? "Höhenmessung deaktivieren" : "Höhe messen"}
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="text-xs">Höhe</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'area'}
                      onClick={() => selectTool('area')}
                      tooltip={activeMode === 'area' ? "Flächenmessung deaktivieren" : "Fläche messen"}
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50"
                    >
                      <Square className="h-4 w-4" />
                      <span className="text-xs">Fläche</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              </SidebarMenu>
              
              <div className="flex flex-col gap-2 mt-4">
                {/* Toggle all labels visibility button */}
                {toggleAllLabelsVisibility && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleAllLabelsVisibility}
                    title={allLabelsVisible ? "Alle Beschriftungen ausblenden" : "Alle Beschriftungen einblenden"}
                    className="w-full justify-start"
                  >
                    {allLabelsVisible ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Beschriftungen ausblenden</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Beschriftungen einblenden</span>
                      </>
                    )}
                  </Button>
                )}
                
                {/* Roof plan generation button */}
                {measurements && measurements.length > 0 && (
                  <GenerateRoofPlanButton measurements={measurements} />
                )}
                
                {/* CSV Export button */}
                {measurements && measurements.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={exportMeasurementsAsCSV}
                  >
                    <FileCsv className="h-4 w-4 mr-2" />
                    CSV Export
                  </Button>
                )}
                
                {/* PDF Export button */}
                {measurements && <ExportPdfButton measurements={measurements} />}
                
                {/* Delete all measurements button */}
                {handleClearMeasurements && measurements && measurements.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleClearMeasurements}
                    title="Alle Messungen löschen"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Alle löschen
                  </Button>
                )}
              </div>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default MeasurementToolbar;
