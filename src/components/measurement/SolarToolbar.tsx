
import React from 'react';
import { 
  Sun, 
  Grid
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
import { smartToast } from '@/utils/smartToast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Extend the MeasurementMode type to include 'solar' for this component
type ExtendedMeasurementMode = MeasurementMode | 'solar';

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
      smartToast.guidance(`Solarplanungswerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      // Show appropriate tool selection messages
      if (mode === 'solar') {
        smartToast.guidance('Solarfläche ausgewählt - Platzieren Sie mindestens 3 Punkte');
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
                    className="bg-white hover:bg-gray-100"
                  >
                    <Sun />
                    <span>Solarfläche</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Removed PV-Modul button as requested */}
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default SolarToolbar;
