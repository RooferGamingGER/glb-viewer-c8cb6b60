
import React from 'react';
import { 
  Sun, 
  Grid
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SolarToolbarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
}

const SolarToolbar: React.FC<SolarToolbarProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId
}) => {
  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    
    if (activeMode === mode) {
      toast.info(`Solarplanungswerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      // Show appropriate tool selection messages
      if (mode === 'solar') {
        toast.info('Solarfläche ausgewählt - Platzieren Sie mindestens 3 Punkte');
      } else if (mode === 'pvplanning') {
        toast.info('PV-Planungsfläche ausgewählt - Platzieren Sie 4 Punkte');
      }
    }
  };

  return (
    <SidebarGroup className="mt-4">
      <Accordion type="single" collapsible defaultValue="solar-planning">
        <AccordionItem value="solar-planning" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Solarplanung</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'solar'}
                    onClick={() => selectTool('solar')}
                    tooltip={activeMode === 'solar' ? "Solarfläche deaktivieren" : "Solarfläche platzieren"}
                    disabled={!!editMeasurementId}
                  >
                    <Sun />
                    <span>Solarfläche</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'pvplanning'}
                    onClick={() => selectTool('pvplanning')}
                    tooltip={activeMode === 'pvplanning' ? "PV-Planungsfläche deaktivieren" : "PV-Planungsfläche platzieren"}
                    disabled={!!editMeasurementId}
                  >
                    <Grid />
                    <span>PV-Planungsfläche</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* PV-Modul button has been removed as requested */}
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default SolarToolbar;
