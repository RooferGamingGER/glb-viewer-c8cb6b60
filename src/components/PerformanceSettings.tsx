
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PerformanceSettingsProps {
  className?: string;
}

const PerformanceSettings: React.FC<PerformanceSettingsProps> = ({ className }) => {
  const [performanceMode, setPerformanceMode] = React.useState<string>(() => {
    return localStorage.getItem("performanceMode") || "auto";
  });

  const handlePerformanceModeChange = (value: string) => {
    setPerformanceMode(value);
    localStorage.setItem("performanceMode", value);
    
    // Reload der Seite um Änderungen anzuwenden
    // In einer produktiven App würden wir dies vermutlich weniger unterbrechend machen
    window.location.reload();
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor="performance-mode" className="text-sm font-medium">
          Leistungsmodus
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Passen Sie die Grafikqualität an Ihren Gerät an:</p>
              <ul className="list-disc pl-4 mt-1 text-xs">
                <li>Niedrig: Reduziert die Qualität für bessere Leistung auf schwächeren Geräten</li>
                <li>Mittel: Ausgewogenes Verhältnis zwischen Qualität und Leistung</li>
                <li>Hoch: Maximale Qualität, benötigt ein leistungsstarkes Gerät</li>
                <li>Automatisch: Optimale Einstellung wird basierend auf Ihrem Gerät gewählt</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Select value={performanceMode} onValueChange={handlePerformanceModeChange}>
        <SelectTrigger id="performance-mode" className="w-full">
          <SelectValue placeholder="Wählen Sie einen Leistungsmodus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Niedrig</SelectItem>
          <SelectItem value="medium">Mittel</SelectItem>
          <SelectItem value="high">Hoch</SelectItem>
          <SelectItem value="auto">Automatisch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default PerformanceSettings;
