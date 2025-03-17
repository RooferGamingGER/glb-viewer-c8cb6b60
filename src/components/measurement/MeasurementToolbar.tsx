
import React from 'react';
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Trash2,
  FileDown
} from 'lucide-react';
import { MeasurementMode } from '@/hooks/useMeasurements';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MeasurementToolbarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  handleClearMeasurements: () => void;
  measurements: any[];
}

const MeasurementToolbar: React.FC<MeasurementToolbarProps> = ({
  activeMode,
  toggleMeasurementTool,
  visible,
  setVisible,
  handleClearMeasurements,
  measurements
}) => {
  
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
  
  return (
    <SidebarGroup className="mt-0">
      <Accordion type="single" collapsible defaultValue="measurement-tools">
        <AccordionItem value="measurement-tools" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Messwerkzeuge</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'length'}
                    onClick={() => selectTool('length')}
                    tooltip={activeMode === 'length' ? "Längenmessung deaktivieren" : "Länge messen"}
                  >
                    <Ruler />
                    <span>Länge</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'height'}
                    onClick={() => selectTool('height')}
                    tooltip={activeMode === 'height' ? "Höhenmessung deaktivieren" : "Höhe messen"}
                  >
                    <ArrowUpDown />
                    <span>Höhe</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'area'}
                    onClick={() => selectTool('area')}
                    tooltip={activeMode === 'area' ? "Flächenmessung deaktivieren" : "Fläche messen"}
                  >
                    <Square />
                    <span>Fläche</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              
              <div className="flex flex-col gap-2 mt-4">
                {/* Direkte Integration des PDF Export Buttons mit direktem Rendering */}
                <ExportPdfButton measurements={measurements} />
                
                {measurements.length > 0 && (
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
