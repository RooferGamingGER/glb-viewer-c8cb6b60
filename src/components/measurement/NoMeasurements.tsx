
import React from 'react';
import { MeasurementMode } from '@/hooks/useMeasurements';
import { 
  Ruler, 
  ArrowUp, 
  SquareAsterisk, 
  SolarIcon, 
  Square, 
  ScanFace 
} from 'lucide-react';

interface NoMeasurementsProps {
  activeMode: MeasurementMode;
}

export const NoMeasurements: React.FC<NoMeasurementsProps> = ({ activeMode }) => {
  // Determine icon and message based on active mode
  const getModeInfo = () => {
    switch (activeMode) {
      case 'length':
        return {
          icon: <Ruler className="h-5 w-5 mb-2 opacity-40" />,
          message: "Nutze das Längenwerkzeug, um Strecken zu messen."
        };
      case 'height':
        return {
          icon: <ArrowUp className="h-5 w-5 mb-2 opacity-40" />,
          message: "Nutze das Höhenwerkzeug, um vertikale Distanzen zu messen."
        };
      case 'area':
        return {
          icon: <Square className="h-5 w-5 mb-2 opacity-40" />,
          message: "Setze Punkte, um eine Fläche zu messen."
        };
      case 'solar':
        return {
          icon: <SolarIcon className="h-5 w-5 mb-2 opacity-40" />,
          message: "Markiere Flächen für die PV-Modulplatzierung."
        };
      case 'skylight':
      case 'chimney':
      case 'vent':
      case 'hook':
      case 'other':
        return {
          icon: <SquareAsterisk className="h-5 w-5 mb-2 opacity-40" />,
          message: "Markiere Dachobjekte auf dem Modell."
        };
      default:
        return {
          icon: <ScanFace className="h-5 w-5 mb-2 opacity-40" />,
          message: "Wähle ein Werkzeug, um mit der Messung zu beginnen."
        };
    }
  };
  
  const { icon, message } = getModeInfo();
  
  return (
    <div className="p-4 flex flex-col items-center justify-center text-center text-muted-foreground">
      {icon}
      <p className="text-xs">{message}</p>
    </div>
  );
};
