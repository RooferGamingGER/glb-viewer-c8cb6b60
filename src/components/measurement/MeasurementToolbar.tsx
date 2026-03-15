
import React, { useState } from 'react';
import { 
  Ruler, 
  ArrowUpDown, 
  Square,
  MinusSquare,
  Trash2,
  Magnet,
  Eye,
  EyeOff,
  Mountain
} from 'lucide-react';
import { getInclinationPreference, setInclinationPreference } from '@/utils/textSprite';
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
import { Button } from "@/components/ui/button";
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
      smartToast.guidance(`Messwerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      // Show appropriate tool selection messages
      if (mode === 'length') {
        smartToast.guidance('Längenmessung ausgewählt - Platzieren Sie 2 Punkte');
      } else if (mode === 'height') {
        smartToast.guidance('Höhenmessung ausgewählt - Platzieren Sie 2 Punkte');
      } else if (mode === 'area') {
        smartToast.guidance('Flächenmessung ausgewählt - Platzieren Sie mindestens 3 Punkte');
      } else if (mode === 'deductionarea') {
        smartToast.guidance('Abzugsfläche ausgewählt - Platzieren Sie mindestens 3 Punkte');
      } else {
        smartToast.guidance('Navigationsmodus aktiviert');
      }
    }
  };
  
  const handleToggleSnap = () => {
    const newValue = !snapEnabled;
    setSnapEnabled(newValue);
    smartToast.guidance(newValue 
      ? "Punktfang aktiviert: Punkte rasten automatisch ein" 
      : "Punktfang deaktiviert: Punkte werden exakt platziert"
    );
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
              
              {/* Control buttons at the top - Added Eye/EyeOff toggle button */}
              {measurements && measurements.length > 0 && toggleAllLabelsVisibility && (
                <div className="flex items-center justify-between mb-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleAllLabelsVisibility}
                    title={allLabelsVisible ? "Beschriftungen ausblenden" : "Beschriftungen einblenden"}
                    className="h-8 w-8"
                  >
                    {allLabelsVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {handleClearMeasurements && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClearMeasurements}
                      title="Alle Messungen löschen"
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              
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
                  
                  {/* Add new Deduction Area tool */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeMode === 'deductionarea'}
                      onClick={() => selectTool('deductionarea')}
                      tooltip={activeMode === 'deductionarea' ? "Abzugsfläche deaktivieren" : "Abzugsfläche messen"}
                      disabled={!!editMeasurementId}
                      className="bg-white shadow-sm border border-border/60 hover:bg-gray-50"
                    >
                      <MinusSquare className="h-4 w-4" />
                      <span className="text-xs">Abzugsfläche</span>
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

export default MeasurementToolbar;
