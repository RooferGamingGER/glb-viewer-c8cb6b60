
import React from 'react';
import { 
  House, 
  Cylinder, 
  SplitSquareVertical,
  Sun, 
  Droplet,
  Minus,
  ArrowDown,
  Wind
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
  editMeasurementId: string | null;
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
        'dormer': 'Gauben-Messung ausgewählt - Definieren Sie die Fläche und Höhe',
        'chimney': 'Kamin-Messung ausgewählt - Messen Sie Durchmesser und Höhe',
        'skylight': 'Dachfenster-Messung ausgewählt - Messen Sie die diagonalen Punkte',
        'solar': 'Solaranlagen-Messung ausgewählt - Definieren Sie die Fläche',
        'gutter': 'Dachrinnen-Messung ausgewählt - Markieren Sie den Verlauf',
        'verge': 'Ortgang/Traufe-Messung ausgewählt - Messen Sie die Länge',
        'valley': 'Kehlen-Messung ausgewählt - Messen Sie die Kante',
        'ridge': 'Grat-Messung ausgewählt - Messen Sie die Kante',
        'vent': 'Lüfter-Markierung ausgewählt - Platzieren Sie einen Punkt'
      };
      
      toast.info(toolMessages[mode] || 'Navigationsmodus aktiviert');
    }
  };
  
  return (
    <SidebarGroup className="mt-0">
      <Accordion type="multiple" defaultValue={["roof-elements", "roof-penetrations"]}>
        <AccordionItem value="roof-elements" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Dachelemente</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent>
              <div className="text-xs text-muted-foreground mb-2">
                Wählen Sie ein Werkzeug für Dachkanten und Strukturen.
              </div>
              
              <SidebarMenu>
                <div className="grid grid-cols-2 gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'dormer'}
                      onClick={() => selectTool('dormer')}
                      tooltip="Gaube messen"
                      disabled={!!editMeasurementId}
                    >
                      <House className="h-4 w-4" />
                      <span className="text-xs">Gaube</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'solar'}
                      onClick={() => selectTool('solar')}
                      tooltip="Solaranlage messen"
                      disabled={!!editMeasurementId}
                    >
                      <Sun className="h-4 w-4" />
                      <span className="text-xs">Solar</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'gutter'}
                      onClick={() => selectTool('gutter')}
                      tooltip="Dachrinne messen"
                      disabled={!!editMeasurementId}
                    >
                      <Droplet className="h-4 w-4" />
                      <span className="text-xs">Rinne</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'verge'}
                      onClick={() => selectTool('verge')}
                      tooltip="Ortgang/Traufe messen"
                      disabled={!!editMeasurementId}
                    >
                      <Minus className="h-4 w-4" />
                      <span className="text-xs">Ortgang</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'valley'}
                      onClick={() => selectTool('valley')}
                      tooltip="Kehle messen"
                      disabled={!!editMeasurementId}
                    >
                      <ArrowDown className="h-4 w-4 rotate-45" />
                      <span className="text-xs">Kehle</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'ridge'}
                      onClick={() => selectTool('ridge')}
                      tooltip="Grat messen"
                      disabled={!!editMeasurementId}
                    >
                      <ArrowDown className="h-4 w-4 rotate-135" />
                      <span className="text-xs">Grat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
        
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
                <div className="grid grid-cols-2 gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'skylight'}
                      onClick={() => selectTool('skylight')}
                      tooltip="Dachfenster messen"
                      disabled={!!editMeasurementId}
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
                    >
                      <Cylinder className="h-4 w-4" />
                      <span className="text-xs">Kamin</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'vent'}
                      onClick={() => selectTool('vent')}
                      tooltip="Lüfter markieren"
                      disabled={!!editMeasurementId}
                    >
                      <Wind className="h-4 w-4" />
                      <span className="text-xs">Lüfter</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              </SidebarMenu>
              
              <div className="text-xs text-muted-foreground mt-3">
                <strong>Tipp:</strong> Verwenden Sie das Lüfter-Tool, um einfach alle Durchdringungen zu markieren und zu zählen.
              </div>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default RoofElementsToolbar;
