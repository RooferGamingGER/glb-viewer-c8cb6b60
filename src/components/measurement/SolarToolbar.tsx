
import React from 'react';
import { Sun } from 'lucide-react';
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
      toast.info(`Solar-Werkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      // Show appropriate tool selection messages
      if (mode === 'solar') {
        toast.info('Solaranlage ausgewählt - Platzieren Sie 4 Punkte für die Fläche');
      }
    }
  };

  return (
    <SidebarGroup className="mt-4">
      <Accordion type="single" collapsible defaultValue="solar-tools">
        <AccordionItem value="solar-tools" className="border-0">
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
                    tooltip={activeMode === 'solar' ? "Solaranlage deaktivieren" : "Solaranlage planen"}
                    disabled={!!editMeasurementId}
                  >
                    <Sun />
                    <span>Solaranlage</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default SolarToolbar;
