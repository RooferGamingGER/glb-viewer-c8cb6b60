/**
 * ExportPdfButtonPatch.tsx
 *
 * Material-Tab für den PDF-Export-Dialog
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Package } from 'lucide-react';
import { CompleteMaterialList, RoofType } from '@/types/pvPlanning';

interface ExportPdfMaterialTabProps {
  materialList: CompleteMaterialList | null;
  includeMaterialList: boolean;
  onIncludeMaterialListChange: (v: boolean) => void;
}

const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  pitched: 'Steildach',
  flat: 'Flachdach',
  green: 'Gründach',
};

/**
 * Tab-Inhalt: Materialliste im PDF-Export-Dialog
 */
export const ExportPdfMaterialTab: React.FC<ExportPdfMaterialTabProps> = ({
  materialList,
  includeMaterialList,
  onIncludeMaterialListChange,
}) => {
  if (!materialList) {
    return (
      <Alert className="my-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs ml-1">
          Keine Materialliste vorhanden. Bitte im Tab "Materialliste" berechnen.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Materialliste im PDF einschließen</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vollständige Materialliste nach Dachtyp
          </p>
        </div>
        <Switch
          checked={includeMaterialList}
          onCheckedChange={onIncludeMaterialListChange}
        />
      </div>

      <Separator />

      <div className="bg-accent/30 border border-border rounded-md p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            {ROOF_TYPE_LABELS[materialList.roofType]} · {materialList.mountingSystem}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="text-muted-foreground">Positionen gesamt:</div>
          <div className="font-medium">{materialList.sections.reduce((s, sec) => s + sec.items.length, 0)}</div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {materialList.sections.map(sec => (
            <Badge key={sec.title} variant="secondary" className="text-[10px] h-4">
              {sec.title}: {sec.items.length} Pos.
            </Badge>
          ))}
        </div>
      </div>

      {includeMaterialList && (
        <div className="bg-muted/30 rounded-md p-3 space-y-1.5 text-xs">
          <div className="font-medium">Enthaltene Seiten im PDF:</div>
          {materialList.sections.map(sec => (
            <div key={sec.title} className="flex items-center gap-2 text-muted-foreground">
              <Package className="w-3 h-3" />
              <span>{sec.title} ({sec.items.length} Positionen)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
