
import React, { useState } from 'react';
import { Measurement } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';

interface MeasurementEditFormProps {
  measurement: Measurement;
  onSave: (measurement: Partial<Measurement>) => void;
  onCancel: () => void;
}

export const MeasurementEditForm: React.FC<MeasurementEditFormProps> = ({
  measurement,
  onSave,
  onCancel
}) => {
  const [label, setLabel] = useState(measurement.label || '');
  const [description, setDescription] = useState(measurement.description || '');
  
  const handleSave = () => {
    onSave({
      label,
      description
    });
  };
  
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="label">Bezeichnung</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Bezeichnung eingeben"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beschreibung eingeben"
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          <X className="h-4 w-4 mr-2" />
          Abbrechen
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
        >
          <Check className="h-4 w-4 mr-2" />
          Speichern
        </Button>
      </div>
    </div>
  );
};
