
import React from 'react';
import { 
  Sun, 
  Square,
  ChevronDown
} from 'lucide-react';
import { MeasurementMode, Measurement } from '@/types/measurements';
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { calculatePolygonArea } from '@/utils/measurementCalculations';

interface SolarToolbarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  measurements?: Measurement[];
  onConvertAreaToSolar?: (areaId: string) => void;
}

const SolarToolbar: React.FC<SolarToolbarProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId,
  measurements = [],
  onConvertAreaToSolar
}) => {
  const areaMeasurements = measurements.filter(m => m.type === 'area' && m.points && m.points.length >= 3);

  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    
    if (activeMode === mode) {
      smartToast.guidance(`Solarplanungswerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      if (mode === 'solar') {
        smartToast.guidance('Solarfläche ausgewählt - Platzieren Sie mindestens 3 Punkte');
      }
    }
  };

  return (
    <SidebarGroup className="mt-2">
      <Accordion type="single" collapsible defaultValue="solar-planning">
        <AccordionItem value="solar-planning" className="border-0">
          <AccordionTrigger className="py-1.5 px-1">
            <SidebarGroupLabel className="!m-0">Solarplanung</SidebarGroupLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'solar'}
                    onClick={() => selectTool('solar')}
                    tooltip={activeMode === 'solar' ? "Solarfläche deaktivieren" : "Neue Solarfläche zeichnen"}
                    disabled={!!editMeasurementId}
                    className="bg-background hover:bg-accent/50"
                  >
                    <Sun className="h-4 w-4" />
                    <span>Solarfläche zeichnen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {areaMeasurements.length > 0 && onConvertAreaToSolar && (
                  <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between text-xs h-7"
                          disabled={!!editMeasurementId}
                        >
                          <span className="flex items-center gap-1.5">
                            <Sun className="h-3.5 w-3.5" />
                            PV für bestehende Fläche
                          </span>
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Fläche für PV-Planung wählen
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {areaMeasurements.map(m => {
                          const areaValue = calculatePolygonArea(m.points);
                          return (
                            <DropdownMenuItem
                              key={m.id}
                              onClick={() => onConvertAreaToSolar(m.id)}
                              className="text-xs"
                            >
                              <Square className="h-3 w-3 mr-2 shrink-0" />
                              <span className="truncate flex-1">{m.label || 'Fläche'}</span>
                              <span className="text-muted-foreground font-mono ml-2">
                                {areaValue.toFixed(1)} m²
                              </span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default SolarToolbar;
