
import React from 'react';
import { 
  Square, 
  Home, 
  Asterisk, 
  CircleDot, 
  CircleX
} from 'lucide-react';
import { MeasurementMode } from '@/hooks/useMeasurements';
import { 
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { smartToast } from '@/utils/smartToast';

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
      smartToast.guidance(`Dachelemente-Werkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      // Show appropriate tool selection messages
      if (mode === 'skylight') {
        smartToast.guidance('Dachfenster ausgewählt - Platzieren Sie 4 Punkte');
      } else if (mode === 'chimney') {
        smartToast.guidance('Kamin ausgewählt - Platzieren Sie 4 Punkte');
      } else if (mode === 'vent') {
        smartToast.guidance('Lüfter ausgewählt - Platzieren Sie den Punkt');
      } else if (mode === 'hook') {
        smartToast.guidance('Dachhaken ausgewählt - Platzieren Sie den Punkt');
      } else if (mode === 'other') {
        smartToast.guidance('Sonstige Einbauten ausgewählt - Platzieren Sie den Punkt');
      }
    }
  };

  const tools: { mode: MeasurementMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'skylight', icon: <Square className="h-4 w-4" />, label: 'Dachfenster' },
    { mode: 'chimney', icon: <Home className="h-4 w-4" />, label: 'Kamin' },
    { mode: 'vent', icon: <Asterisk className="h-4 w-4" />, label: 'Lüfter' },
    { mode: 'hook', icon: <CircleDot className="h-4 w-4" />, label: 'Dachhaken' },
    { mode: 'other', icon: <CircleX className="h-4 w-4" />, label: 'Sonstiges' },
  ];

  return (
    <SidebarGroup className="mt-2">
      <SidebarGroupLabel className="text-xs text-muted-foreground mb-1">Dachelemente</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="grid grid-cols-5 gap-1 px-1">
          {tools.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => selectTool(mode)}
              disabled={!!editMeasurementId}
              title={activeMode === mode ? `${label} deaktivieren` : label}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md p-1.5 text-[10px] leading-tight transition-colors
                ${activeMode === mode
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-accent border border-border/40'}
                ${editMeasurementId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {icon}
              <span className="truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default RoofElementsToolbar;
