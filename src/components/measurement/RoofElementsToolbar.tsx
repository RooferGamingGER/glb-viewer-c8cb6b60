import React from 'react';
import { 
  Cylinder, 
  SplitSquareVertical,
  Sun, 
  Wind,
  Anchor,
  X
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface RoofElementsToolbarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId?: string | null;
}

const RoofElementsToolbar: React.FC<RoofElementsToolbarProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId
}) => {
  
  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    
    if (activeMode === mode) {
      toast.info(`Dachelementwerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      const toolMessages: Record<string, string> = {
        'chimney': 'Kamin-Messung ausgewählt - Messen Sie mit 4 Punkten die Ecken',
        'skylight': 'Dachfenster-Messung ausgewählt - Messen Sie mit 4 Punkten die Ecken',
        'solar': 'Solarflächen-Messung ausgewählt - Definieren Sie die Fläche',
        'vent': 'Lüfter-Markierung ausgewählt - Platzieren Sie einen Punkt',
        'hook': 'Dachhaken-Markierung ausgewählt - Platzieren Sie einen Punkt',
        'other': 'Sonstige Einbauten-Markierung ausgewählt - Platzieren Sie einen Punkt'
      };
      
      toast.info(toolMessages[mode] || 'Navigationsmodus aktiviert');
    }
  };
  
  return (
    <SidebarGroup className="mt-0">
      <Accordion type="multiple" defaultValue={["solar-planning", "roof-elements", "roof-penetrations"]}>
        {/* Solar Planning Section */}
        <AccordionItem value="solar-planning" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Solar</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent>
              <div className="text-xs text-muted-foreground mb-2">
                Solarplanung und Photovoltaik
              </div>
              
              <SidebarMenu>
                <div className="flex flex-col gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'solar'}
                      onClick={() => selectTool('solar')}
                      tooltip="Solarfläche messen"
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50 w-full"
                    >
                      <Sun className="h-4 w-4" />
                      <span className="text-xs">Geplante Solarfläche</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
        
        {/* Roof Elements Section */}
        <AccordionItem value="roof-elements" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Dachelemente</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent>
              <div className="text-xs text-muted-foreground mb-2">
                Wählen Sie ein Werkzeug für Dachelemente.
              </div>
              
              <SidebarMenu>
                <div className="flex flex-col gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'skylight'}
                      onClick={() => selectTool('skylight')}
                      tooltip="Dachfenster messen"
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50 w-full"
                    >
                      <SplitSquareVertical className="h-4 w-4" />
                      <span className="text-xs">Dachfenster</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'chimney'}
                      onClick={() => selectTool('chimney')}
                      tooltip="Kamin messen"
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50 w-full"
                    >
                      <Cylinder className="h-4 w-4" />
                      <span className="text-xs">Kamin</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
        
        {/* Roof Penetrations Section */}
        <AccordionItem value="roof-penetrations" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Dacheinbauten</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent>
              <div className="text-xs text-muted-foreground mb-2">
                Markieren Sie Einbauten und Durchdringungen auf dem Dach.
              </div>
              
              <SidebarMenu>
                <div className="flex flex-col gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'vent'}
                      onClick={() => selectTool('vent')}
                      tooltip="Lüfter markieren"
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50 w-full"
                    >
                      <Wind className="h-4 w-4" />
                      <span className="text-xs">Lüfter</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'hook'}
                      onClick={() => selectTool('hook')}
                      tooltip="Dachhaken markieren"
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50 w-full"
                    >
                      <Anchor className="h-4 w-4" />
                      <span className="text-xs">Haken</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'other'}
                      onClick={() => selectTool('other')}
                      tooltip="Sonstige Einbauten markieren"
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50 w-full"
                    >
                      <X className="h-4 w-4" />
                      <span className="text-xs">Sonstiges</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default RoofElementsToolbar;
