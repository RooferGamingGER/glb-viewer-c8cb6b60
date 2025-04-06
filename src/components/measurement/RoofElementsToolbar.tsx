import React from 'react';
import { Square, Home, Asterisk, CircleDot, CircleX } from 'lucide-react';
import { MeasurementMode } from '@/hooks/useMeasurements';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
interface RoofElementToolbarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
}
const RoofElementsToolbar: React.FC<RoofElementToolbarProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId
}) => {
  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    if (activeMode === mode) {
      toast.info(`Dachelemente-Werkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      // Show appropriate tool selection messages
      if (mode === 'skylight') {
        toast.info('Dachfenster ausgewählt - Platzieren Sie 4 Punkte');
      } else if (mode === 'chimney') {
        toast.info('Kamin ausgewählt - Platzieren Sie 4 Punkte');
      } else if (mode === 'vent') {
        toast.info('Lüfter ausgewählt - Platzieren Sie den Punkt');
      } else if (mode === 'hook') {
        toast.info('Dachhaken ausgewählt - Platzieren Sie den Punkt');
      } else if (mode === 'other') {
        toast.info('Sonstige Einbauten ausgewählt - Platzieren Sie den Punkt');
      }
    }
  };
  return <SidebarGroup className="mt-4">
      <Accordion type="single" collapsible defaultValue="roof-elements">
        <AccordionItem value="roof-elements" className="border-0">
          <AccordionTrigger className="py-2 px-1">
            <SidebarGroupLabel className="!m-0">Dachelemente</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent className="bg-white">
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Removed solar and pvmodule items */}
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeMode === 'skylight'} onClick={() => selectTool('skylight')} tooltip={activeMode === 'skylight' ? "Dachfenster deaktivieren" : "Dachfenster platzieren"} disabled={!!editMeasurementId} className="bg-white">
                    <Square />
                    <span>Dachfenster</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeMode === 'chimney'} onClick={() => selectTool('chimney')} tooltip={activeMode === 'chimney' ? "Kaminausschnitt deaktivieren" : "Kamin platzieren"} disabled={!!editMeasurementId} className="bg-white">
                    <Home />
                    <span>Kamin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeMode === 'vent'} onClick={() => selectTool('vent')} tooltip={activeMode === 'vent' ? "Lüfter deaktivieren" : "Lüfter platzieren"} disabled={!!editMeasurementId}>
                    <Asterisk />
                    <span>Lüfter</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeMode === 'hook'} onClick={() => selectTool('hook')} tooltip={activeMode === 'hook' ? "Dachhaken deaktivieren" : "Dachhaken platzieren"} disabled={!!editMeasurementId}>
                    <CircleDot />
                    <span>Dachhaken</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeMode === 'other'} onClick={() => selectTool('other')} tooltip={activeMode === 'other' ? "Sonstige Einbauten deaktivieren" : "Sonstige Einbauten platzieren"} disabled={!!editMeasurementId}>
                    <CircleX />
                    <span>Sonstiges</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>;
};
export default RoofElementsToolbar;