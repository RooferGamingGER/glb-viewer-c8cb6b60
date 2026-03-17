/**
 * ExportPdfButtonPatch.tsx
 *
 * Patch für ExportPdfButton.tsx:
 * Erweitert den PDF-Export-Dialog um:
 * - Stringplan-Tab mit Statusanzeige
 * - Materialliste-Tab mit Optionen
 * - Übergabe von stringPlan und materialList an exportMeasurementsToPDF
 *
 * INTEGRATION in ExportPdfButton.tsx:
 * Den bestehenden Tabs-Block um die neuen TabsTrigger/TabsContent ergänzen.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, XCircle, Cable, Package } from 'lucide-react';
import { StringPlan, CompleteMaterialList, RoofType } from '@/types/pvPlanning';

interface ExportPdfStringPlanTabProps {
  stringPlan: StringPlan | null;
  includeStringPlan: boolean;
  onIncludeStringPlanChange: (v: boolean) => void;
}

/**
 * Tab-Inhalt: Stringplan im PDF-Export-Dialog
 */
export const ExportPdfStringPlanTab: React.FC<ExportPdfStringPlanTabProps> = ({
  stringPlan,
  includeStringPlan,
  onIncludeStringPlanChange,
}) => {
  if (!stringPlan) {
    return (
      <Alert className="my-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs ml-1">
          Kein Stringplan vorhanden. Bitte zuerst einen Wechselrichter auswählen und die Stringplanung berechnen.
        </AlertDescription>
      </Alert>
    );
  }

  const allOk = stringPlan.dcVoltageOk && stringPlan.mppRangeOk && stringPlan.currentOk;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Stringplan im PDF einschließen</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Technische Stringplanung, Spannungsdiagramme und Kabelplanung
          </p>
        </div>
        <Switch
          checked={includeStringPlan}
          onCheckedChange={onIncludeStringPlanChange}
        />
      </div>

      <Separator />

      <div className={`p-3 rounded-md border flex items-start gap-2 ${
        allOk ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
      }`}>
        {allOk ? (
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <div className={`text-sm font-medium ${allOk ? 'text-green-700' : 'text-orange-700'}`}>
            {allOk ? 'Stringplanung OK' : 'Warnungen vorhanden'}
          </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <div>{stringPlan.allStrings.length} Strings · {stringPlan.totalModules} Module · {stringPlan.totalPower.toFixed(1)} kWp</div>
            <div>WR: {stringPlan.inverterCount}× {stringPlan.inverter.manufacturer} {stringPlan.inverter.model}</div>
          </div>
          {stringPlan.warnings.slice(0, 2).map((w, i) => (
            <div key={i} className="text-xs text-orange-600 mt-1">⚠ {w}</div>
          ))}
        </div>
      </div>

      {includeStringPlan && (
        <div className="bg-muted/30 rounded-md p-3 space-y-1.5 text-xs">
          <div className="font-medium">Enthaltene Seiten im PDF:</div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cable className="w-3 h-3" />
            <span>PV-Modulbelegung mit String-Farbcodierung</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cable className="w-3 h-3" />
            <span>Stringbelegungstabelle (ID, MPPT, Module, Spannungen)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cable className="w-3 h-3" />
            <span>Spannungsdiagramme je MPPT-Tracker</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cable className="w-3 h-3" />
            <span>Kabelplanung (DC/AC-Längen, Querschnitte)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cable className="w-3 h-3" />
            <span>Normative Grundlagen (VDE 0100-712, IEC 62548)</span>
          </div>
        </div>
      )}
    </div>
  );
};

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
            Vollständige Materialliste mit Preisen nach Dachtyp
          </p>
        </div>
        <Switch
          checked={includeMaterialList}
          onCheckedChange={onIncludeMaterialListChange}
        />
      </div>

      <Separator />

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-md p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">
            {ROOF_TYPE_LABELS[materialList.roofType]} · {materialList.mountingSystem}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="text-muted-foreground">Positionen gesamt:</div>
          <div className="font-medium">{materialList.sections.reduce((s, sec) => s + sec.items.length, 0)}</div>
          <div className="text-muted-foreground">Gesamtpreis netto:</div>
          <div className="font-medium">{materialList.totalNetPrice.toFixed(2)} €</div>
          <div className="text-muted-foreground">Gesamtpreis brutto:</div>
          <div className="font-semibold">{materialList.totalGrossPrice.toFixed(2)} €</div>
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
          <div className="text-muted-foreground mt-1 italic">
            Inkl. Gesamtpreistabelle (netto/brutto), Hersteller-Angaben
          </div>
        </div>
      )}
    </div>
  );
};
