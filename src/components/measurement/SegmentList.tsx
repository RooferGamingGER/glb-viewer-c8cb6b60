
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Move, ChevronDown, ChevronRight, Edit, Check, X } from 'lucide-react';
import { Segment } from '@/types/measurements';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SegmentListProps {
  measurementId: string;
  segments: Segment[];
  isOpen: boolean;
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string) => void;
  updateSegment?: (measurementId: string, segmentId: string, data: Partial<Segment>) => void;
}

const SEGMENT_TYPES = [
  { value: 'first', label: 'First' },
  { value: 'grat', label: 'Grat' },
  { value: 'kehle', label: 'Kehle' },
  { value: 'traufe', label: 'Traufe' },
  { value: 'ortgang', label: 'Ortgang' },
  { value: 'custom', label: 'Benutzerdefiniert' }
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
    // Extract type from label if it exists
    const existingType = SEGMENT_TYPES.find(type => 
      segment.label?.startsWith(type.label)
    )?.value || 'custom';
    
    setSelectedType(existingType);
    
    if (existingType === 'custom') {
      setCustomLabel(segment.label || '');
    } else {
      // If it's not custom but has additional text after the type
      const labelParts = segment.label?.split(':');
      if (labelParts && labelParts.length > 1) {
        setCustomLabel(labelParts[1].trim());
      } else {
        setCustomLabel('');
      }
    }
    
    setEditingSegmentId(segment.id);
  };
  
  const handleSaveLabel = (segmentId: string) => {
    if (!updateSegment) return;
    
    let newLabel;
    
    if (selectedType === 'custom') {
      newLabel = customLabel;
    } else {
      const typeLabel = SEGMENT_TYPES.find(type => type.value === selectedType)?.label || '';
      newLabel = typeLabel + (customLabel ? ': ' + customLabel : '');
    }
    
    updateSegment(measurementId, segmentId, { label: newLabel });
    setEditingSegmentId(null);
    setSelectedType('');
    setCustomLabel('');
    
    toast.success('Teilmessung wurde aktualisiert');
  };
  
  const handleCancelEdit = () => {
    setEditingSegmentId(null);
    setSelectedType('');
    setCustomLabel('');
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
                      // Reset custom label if not custom type
                      if (value !== 'custom') {
                        setCustomLabel('');
                      }
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
                  
                  {(selectedType === 'custom' || customLabel) && (
                    <Input
                      className="text-xs h-7"
                      placeholder={selectedType === 'custom' ? "Beschreibung" : "Zusätzliche Beschreibung (optional)"}
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                    />
                  )}
                  
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
                  <div>
                    <span className="font-medium">Teilmessung {index + 1}:</span> {segment.label || `${segment.length.toFixed(2)}m`}
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
                        toast.info(`Teilmessung ${index + 1} wird bearbeitet. Klicken Sie an eine neue Position.`);
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
