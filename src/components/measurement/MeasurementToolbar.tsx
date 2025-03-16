
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Trash2, 
  Eye, 
  EyeOff,
  FileText
} from 'lucide-react';
import { MeasurementMode, Measurement } from '@/hooks/useMeasurements';
import { 
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu, 
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { toast } from 'sonner';
import PDFPreviewDialog from './PDFPreviewDialog';

interface MeasurementToolbarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  handleClearMeasurements: () => void;
  measurements: Measurement[];
}

const MeasurementToolbar: React.FC<MeasurementToolbarProps> = ({
  activeMode,
  toggleMeasurementTool,
  visible,
  setVisible,
  handleClearMeasurements,
  measurements
}) => {
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  
  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    
    if (activeMode === mode) {
      toast.info(`Messwerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      toast.info(`${mode === 'length' ? 'Längen' : mode === 'height' ? 'Höhen' : mode === 'area' ? 'Flächen' : 'Navigations'}messung ausgewählt`);
    }
  };

  const toggleVisibility = () => {
    setVisible(!visible);
    toast.info(visible ? 'Messungen in der Seitenleiste ausgeblendet' : 'Messungen in der Seitenleiste eingeblendet');
  };

  const handlePDFExport = () => {
    if (measurements.length === 0) {
      toast.error('Keine Messungen zum Exportieren vorhanden');
      return;
    }
    setPdfDialogOpen(true);
  };
  
  return (
    <SidebarGroup className="mt-4"> {/* Added margin-top to create space */}
      <div className="flex justify-between items-center">
        <SidebarGroupLabel>Werkzeuge</SidebarGroupLabel>
        {measurements.length > 0 && (
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={toggleVisibility}
              title={visible ? "Messungen in der Seitenleiste ausblenden" : "Messungen in der Seitenleiste einblenden"}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handlePDFExport}
              title="Messungen als PDF exportieren"
            >
              <FileText className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleClearMeasurements}
              title="Alle Messungen löschen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
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
      </SidebarGroupContent>
      
      {/* PDF Preview Dialog */}
      <PDFPreviewDialog 
        measurements={measurements}
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
      />
    </SidebarGroup>
  );
};

export default MeasurementToolbar;
