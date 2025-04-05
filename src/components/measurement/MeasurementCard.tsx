
import React, { useState } from 'react';
import { Measurement } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { 
  Eye, EyeOff, Trash2, Edit3, ChevronDown, ChevronUp, Tag, TagOff, ArrowUp, ArrowDown, Grid, RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MeasurementCardProps {
  measurement: Measurement;
  expanded: boolean;
  onToggleExpanded: () => void;
  onVisibilityChange: (visible: boolean) => void;
  onLabelVisibilityChange: (visible: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onPointEdit?: () => void;
  onDeletePoint?: (pointIndex: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onUpdateData?: (data: Partial<Measurement>) => void;
}

const MeasurementCard: React.FC<MeasurementCardProps> = ({
  measurement,
  expanded,
  onToggleExpanded,
  onVisibilityChange,
  onLabelVisibilityChange,
  onEdit,
  onDelete,
  onPointEdit,
  onDeletePoint,
  onMoveUp,
  onMoveDown,
  onUpdateData
}) => {
  const [hovering, setHovering] = useState(false);
  
  // Helper to get the appropriate icon and color for measurement types
  const getIcon = (type: string) => {
    switch (type) {
      case 'length':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ruler"><path d="M21 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1Z"/><path d="M7 12h.01"/><path d="M11 12h.01"/><path d="M15 12h.01"/></svg>, color: 'bg-blue-100 text-blue-600' };
      case 'height':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down-up"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>, color: 'bg-green-100 text-green-600' };
      case 'area':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>, color: 'bg-amber-100 text-amber-600' };
      case 'chimney':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, color: 'bg-red-100 text-red-600' };
      case 'skylight':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.3 10a.7.7 0 0 0-.3.6V16h8v-5.4a.7.7 0 0 0-.3-.6l-3.7-2.2"/><path d="M4 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M20 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M16 16v6"/><path d="M8 16v6"/><path d="M12 10v12"/><path d="M4 22h16"/></svg>, color: 'bg-indigo-100 text-indigo-600' };
      case 'solar':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>, color: 'bg-orange-100 text-orange-600' };
      case 'pvmodule':
        return { icon: <Grid size={16} />, color: 'bg-sky-100 text-sky-600' };
      case 'pvplanning':
        return { icon: <Grid size={16} />, color: 'bg-blue-100 text-blue-600 outline outline-2 outline-blue-300' };
      case 'vent':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H6m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>, color: 'bg-violet-100 text-violet-600' };
      case 'hook':
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8a2 2 0 0 1 4 0v4"/><path d="M16 12a2 2 0 0 1 4 0v4"/><circle cx="5" cy="15" r="2"/><path d="M22 4v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2Z"/></svg>, color: 'bg-emerald-100 text-emerald-600' };
      case 'other':
      default:
        return { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/></svg>, color: 'bg-gray-100 text-gray-600' };
    }
  };
  
  const { icon, color } = getIcon(measurement.type);
  
  // Get the value display based on the measurement type
  const getMeasurementValue = () => {
    if (measurement.label) return measurement.label;
    
    const value = measurement.value;
    const unit = measurement.unit || 'm';
    
    if (typeof value !== 'number') return 'N/A';
    
    if (unit === 'm²') {
      return `${value.toFixed(2)} m²`;
    } else if (unit === 'm') {
      return `${value.toFixed(2)} m`;
    } else {
      return `${value.toFixed(2)} ${unit}`;
    }
  };
  
  // Get display type name
  const getTypeName = (type: string): string => {
    const typeNames: {[key: string]: string} = {
      'length': 'Länge',
      'height': 'Höhe',
      'area': 'Fläche',
      'chimney': 'Kamin',
      'skylight': 'Dachfenster',
      'solar': 'Solarfläche',
      'pvmodule': 'PV-Module',
      'pvplanning': 'PV-Planung',
      'vent': 'Lüfter',
      'hook': 'Dachhaken',
      'other': 'Sonstiges'
    };
    return typeNames[type] || type;
  };

  return (
    <Card 
      className={cn(
        "border shadow-sm transition-all duration-200",
        hovering ? "shadow-md" : "",
        measurement.editMode ? "ring-2 ring-primary" : "",
        measurement.visible === false ? "opacity-50" : ""
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <CardHeader className="p-3 flex flex-row items-center space-y-0">
        <div className={cn("p-1.5 rounded-md mr-3", color)}>
          {icon}
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm truncate">
              {getTypeName(measurement.type)}
              {measurement.type === 'pvplanning' && (
                <Badge variant="outline" className="ml-2 border-blue-300 text-blue-600">
                  Interaktiv
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onLabelVisibilityChange(measurement.labelVisible === false)}
              >
                {measurement.labelVisible === false ? 
                  <TagOff className="h-3.5 w-3.5" /> : 
                  <Tag className="h-3.5 w-3.5" />
                }
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onVisibilityChange(measurement.visible === false)}
              >
                {measurement.visible === false ? 
                  <EyeOff className="h-3.5 w-3.5" /> : 
                  <Eye className="h-3.5 w-3.5" />
                }
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleExpanded}
              >
                {expanded ? 
                  <ChevronUp className="h-3.5 w-3.5" /> : 
                  <ChevronDown className="h-3.5 w-3.5" />
                }
              </Button>
            </div>
          </div>
          
          <div className="text-sm font-medium mt-0.5">
            {getMeasurementValue()}
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="px-3 pt-0 pb-3">
          {/* Specific data for PV modules and planning */}
          {(measurement.type === 'pvmodule' || measurement.type === 'pvplanning') && measurement.pvModuleInfo && (
            <div className="space-y-2 text-sm text-muted-foreground mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <div className="text-xs">Module</div>
                  <div className="font-medium">{measurement.pvModuleInfo.moduleCount}</div>
                </div>
                
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <div className="text-xs">Leistung</div>
                  <div className="font-medium">
                    {((measurement.pvModuleInfo.moduleCount * (measurement.pvModuleSpec?.power || 0)) / 1000).toFixed(2)} kWp
                  </div>
                </div>
              </div>
              
              {measurement.type === 'pvplanning' && (
                <Button
                  className="w-full mt-2"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Find the index in the measurements array to trigger planning mode
                    if (onUpdateData) {
                      // Toggle flag to trigger the planning dialog
                      onUpdateData({ 
                        pvModuleInfo: {
                          ...measurement.pvModuleInfo,
                          showPlanningDialog: true
                        }
                      });
                    }
                  }}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Planungsmodus öffnen
                </Button>
              )}
            </div>
          )}
          
          {/* Point data for all measurement types */}
          <div className="mt-2 space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Messpunkte</div>
            {measurement.points.map((point, index) => (
              <div key={index} className="text-xs grid grid-cols-4 gap-1">
                <div>P{index + 1}</div>
                <div>X: {point.x.toFixed(2)}</div>
                <div>Y: {point.y.toFixed(2)}</div>
                <div>Z: {point.z.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
      
      <CardFooter className="px-3 py-2 flex justify-between border-t bg-muted/20">
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="flex gap-1">
          {onMoveUp && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7"
              onClick={onMoveUp}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {onMoveDown && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7"
              onClick={onMoveDown}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default MeasurementCard;
