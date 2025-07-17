
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Move, ChevronDown, ChevronRight, Edit, Check, X, Link } from 'lucide-react';
import { Segment } from '@/types/measurements';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { smartToast } from '@/utils/smartToast';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SegmentListProps {
  measurementId: string;
  segments: Segment[];
  isOpen: boolean;
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string) => void;
  updateSegment?: (measurementId: string, segmentId: string, data: Partial<Segment>) => void;
}

const SEGMENT_TYPES = [
  { value: 'ridge', label: 'First' },
  { value: 'hip', label: 'Grat' },
  { value: 'valley', label: 'Kehle' },
  { value: 'eave', label: 'Traufe' },
  { value: 'verge', label: 'Ortgang' },
  { value: 'anschluss', label: 'Anschluss' },
  { value: 'verfallung', label: 'Verfallung' },
  { value: 'custom', label: 'Dachkante' }
];

const SegmentList: React.FC<SegmentListProps> = ({
  measurementId,
  segments,
  isOpen,
  toggleSegments,
  onEditSegment,
  updateSegment
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');

  if (!segments || segments.length === 0) return null;
  
  const handleEditStart = (segment: Segment) => {
    // Set the selected type from the segment's type field
    setSelectedType(segment.type || 'custom');
    
    // Set custom label if it exists
    setCustomLabel(segment.label || '');
    
    setEditingSegmentId(segment.id);
  };
  
  const handleSaveLabel = (segmentId: string) => {
    if (!updateSegment) return;
    
    // Update both type and label separately
    updateSegment(measurementId, segmentId, { 
      type: selectedType as Segment['type'],  // Cast to the correct type
      label: customLabel
    });
    
    setEditingSegmentId(null);
    setSelectedType('');
    setCustomLabel('');
    
    smartToast.success('Teilmessung wurde aktualisiert');
  };
  
  const handleCancelEdit = () => {
    setEditingSegmentId(null);
    setSelectedType('');
    setCustomLabel('');
  };
  
  // Hilfsfunktion, um den Anzeigenamen für Segment zu generieren
  const getSegmentDisplayName = (segment: Segment, index: number) => {
    if (segment.type && segment.type !== 'custom') {
      // Zeige Typ-Label aus SEGMENT_TYPES
      const typeLabel = SEGMENT_TYPES.find(t => t.value === segment.type)?.label;
      
      if (segment.label) {
        // Wenn zusätzliches Label vorhanden ist, kombiniere sie
        return `${typeLabel}: ${segment.label}`;
      }
      return typeLabel;
    } else if (segment.type === 'custom') {
      // Explizit "Dachkante" für custom zeigen
      if (segment.label) {
        return `Dachkante: ${segment.label}`;
      }
      return 'Dachkante';
    }
    
    // Fallback auf benutzerdefiniertes Label oder Länge
    return segment.label || `${segment.length.toFixed(2)}m`;
  };
  
  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={() => toggleSegments(measurementId)}
      className="mt-2"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full flex justify-between items-center px-2 h-7">
          <span>Teilmessungen ({segments.length})</span>
          {isOpen ? (
            <ChevronDown className="h-3 w-3 ml-1" />
          ) : (
            <ChevronRight className="h-3 w-3 ml-1" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 mt-2 pl-2">
          {segments.map((segment, index) => (
            <div key={segment.id} className="flex flex-col text-xs border border-border p-2 rounded-md">
              {editingSegmentId === segment.id ? (
                <div className="space-y-2">
                  <Select
                    value={selectedType}
                    onValueChange={(value) => {
                      setSelectedType(value);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value} className="text-xs">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Input
                    className="text-xs h-7"
                    placeholder="Zusätzliche Beschreibung (optional)"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 flex-1"
                      onClick={() => handleSaveLabel(segment.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {segment.shared && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link className="h-3 w-3 mr-1 text-blue-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Geteilte Kante mit anderer Dachfläche</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <span className="font-medium">Teilmessung {index + 1}:</span> {getSegmentDisplayName(segment, index)}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditStart(segment)}
                      title="Beschreibung bearbeiten"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        onEditSegment(segment.id);
                        smartToast.guidance(`Teilmessung ${index + 1} wird bearbeitet. Klicken Sie an eine neue Position.`);
                      }}
                      title="Teilmessung verschieben"
                    >
                      <Move className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SegmentList;
