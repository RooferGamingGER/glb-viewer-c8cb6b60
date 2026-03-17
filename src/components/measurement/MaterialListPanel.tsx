/**
 * MaterialListPanel.tsx
 * UI-Komponente für die Materialliste nach Dachtyp (ohne Preise)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Package, ChevronDown, ChevronRight, Info } from 'lucide-react';
import {
  RoofType,
  PitchedRoofSystem,
  FlatRoofSystem,
  GreenRoofSystem,
  MaterialItem,
  CompleteMaterialList,
} from '@/types/pvPlanning';
import { formatMaterialListAsText } from '@/utils/pvMaterialCalculator';

interface MaterialListPanelProps {
  materialList: CompleteMaterialList | null;
  roofType: RoofType;
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem;
  greenRoofAreaM2: number;
  onRoofTypeChange: (type: RoofType) => void;
  onMountingSystemChange: (system: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem) => void;
  onGreenRoofAreaChange: (area: number) => void;
  onRecalculate: () => void;
  isCalculating: boolean;
}

const PITCHED_SYSTEMS: { value: PitchedRoofSystem; label: string; manufacturer: string }[] = [
  { value: 'braas_rapid2plus', label: 'Rapid² Plus', manufacturer: 'Braas' },
  { value: 'braas_clickfit_evo', label: 'ClickFit Evo', manufacturer: 'Braas' },
  { value: 'bmi_ecobase', label: 'Ecobase', manufacturer: 'BMI' },
  { value: 'bmi_klober_twist', label: 'Klöber Twist', manufacturer: 'BMI' },
  { value: 'k2_systems_base', label: 'BASE System', manufacturer: 'K2 Systems' },
  { value: 'k2_systems_cross', label: 'Cross-Roof', manufacturer: 'K2 Systems' },
  { value: 'mounting_systems_msr', label: 'MSR', manufacturer: 'Mounting Systems' },
  { value: 'schletter_fm_ez', label: 'FM EZ', manufacturer: 'Schletter' },
  { value: 'generic_hook_rail', label: 'Generisch (Haken+Schiene)', manufacturer: 'Generisch' },
];

const FLAT_SYSTEMS: { value: FlatRoofSystem; label: string; manufacturer: string }[] = [
  { value: 'k2_flat_evo_one', label: 'FlatFix EVO One', manufacturer: 'K2 Systems' },
  { value: 'k2_flat_ground', label: 'FlatFix Ground', manufacturer: 'K2 Systems' },
  { value: 'esdec_flatfix_wave', label: 'FlatFix Wave', manufacturer: 'Esdec' },
  { value: 'renusol_cs60', label: 'CS60', manufacturer: 'Renusol' },
  { value: 'schletter_freeform', label: 'FreeForm', manufacturer: 'Schletter' },
  { value: 'mounting_systems_mpk', label: 'MPK', manufacturer: 'Mounting Systems' },
  { value: 'conergy_ts', label: 'Top System', manufacturer: 'Conergy' },
  { value: 'generic_ballast', label: 'Generisch (Ballast)', manufacturer: 'Generisch' },
];

const GREEN_SYSTEMS: { value: GreenRoofSystem; label: string; manufacturer: string }[] = [
  { value: 'bauder_thermofin', label: 'Thermofin TE', manufacturer: 'Bauder' },
  { value: 'soprema_soprasolar', label: 'Soprasolar Ballast', manufacturer: 'Soprema' },
  { value: 'vedag_vedagreen', label: 'VedaGreen Solar', manufacturer: 'Vedag' },
  { value: 'icopal_solarbase', label: 'SolarBase Ballast', manufacturer: 'Icopal' },
  { value: 'optigruen_type_f', label: 'Typ F + PV', manufacturer: 'Optigrün' },
  { value: 'laumanns_greenroof', label: 'Gründach-Solar', manufacturer: 'Laumanns' },
  { value: 'soprema_pavatex', label: 'Pavatex integriert', manufacturer: 'Soprema' },
  { value: 'generic_green_ballast', label: 'Generisch (Gründach)', manufacturer: 'Generisch' },
];

const MaterialItemRow: React.FC<{ item: MaterialItem; index: number }> = ({ item, index }) => (
  <div className="grid grid-cols-10 gap-1 py-1.5 text-xs border-b last:border-b-0 items-start">
    <div className="col-span-1 text-muted-foreground text-right">{index + 1}.</div>
    <div className="col-span-6">
      <div className="font-medium">{item.description}</div>
      {item.manufacturer && (
        <div className="text-muted-foreground text-[10px]">{item.manufacturer}{item.articleNumber ? ` · ${item.articleNumber}` : ''}</div>
      )}
      {item.notes && (
        <div className="text-muted-foreground text-[10px] flex items-start gap-0.5 mt-0.5">
          <Info className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
          <span>{item.notes}</span>
        </div>
      )}
    </div>
    <div className="col-span-1 text-center text-muted-foreground">{item.unit}</div>
    <div className="col-span-2 text-right font-mono font-medium">{item.quantity}</div>
  </div>
);

const SectionCollapsible: React.FC<{
  title: string;
  items: MaterialItem[];
  defaultOpen?: boolean;
}> = ({ title, items, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="secondary" className="text-[10px] h-4">{items.length} Pos.</Badge>
        </div>
      </button>
      {open && (
        <div className="px-3 py-1">
          {/* Header */}
          <div className="grid grid-cols-10 gap-1 py-1 text-[10px] text-muted-foreground border-b">
            <div className="col-span-1 text-right">Pos.</div>
            <div className="col-span-6">Bezeichnung</div>
            <div className="col-span-1 text-center">Einh.</div>
            <div className="col-span-2 text-right">Menge</div>
          </div>
          {items.map((item, i) => (
            <MaterialItemRow key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export const MaterialListPanel: React.FC<MaterialListPanelProps> = ({
  materialList,
  roofType,
  mountingSystem,
  greenRoofAreaM2,
  onRoofTypeChange,
  onMountingSystemChange,
  onGreenRoofAreaChange,
  onRecalculate,
  isCalculating,
}) => {
  const currentSystems = roofType === 'pitched' ? PITCHED_SYSTEMS : roofType === 'flat' ? FLAT_SYSTEMS : GREEN_SYSTEMS;

  const downloadList = () => {
    if (!materialList) return;
    const text = formatMaterialListAsText(materialList);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materialliste_pv.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!materialList) return;
    const lines = ['Pos;Kategorie;Bezeichnung;Hersteller;Artikelnummer;Einheit;Menge;Hinweise'];
    let pos = 1;
    materialList.sections.forEach(section => {
      section.items.forEach(item => {
        lines.push([
          pos++,
          section.title,
          `"${item.description}"`,
          item.manufacturer || '',
          item.articleNumber || '',
          item.unit,
          item.quantity,
          `"${item.notes || ''}"`,
        ].join(';'));
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'materialliste_pv.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Konfiguration */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Montagesystem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Dachtyp</Label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['pitched', 'flat', 'green'] as RoofType[]).map(rt => (
                <button
                  key={rt}
                  onClick={() => {
                    onRoofTypeChange(rt);
                    const firstSystem = rt === 'pitched' ? PITCHED_SYSTEMS[0].value :
                                        rt === 'flat' ? FLAT_SYSTEMS[0].value : GREEN_SYSTEMS[0].value;
                    onMountingSystemChange(firstSystem);
                  }}
                  className={`py-1.5 px-2 rounded text-xs border transition-colors ${
                    roofType === rt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {rt === 'pitched' ? 'Steildach' : rt === 'flat' ? 'Flachdach' : 'Gründach'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Montagesystem</Label>
            <Select
              value={mountingSystem}
              onValueChange={v => onMountingSystemChange(v as typeof mountingSystem)}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentSystems.map(sys => (
                  <SelectItem key={sys.value} value={sys.value} className="text-xs">
                    <span className="font-medium">{sys.manufacturer}</span> · {sys.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {roofType === 'green' && (
            <div>
              <Label className="text-xs">Begrünte Fläche (m²)</Label>
              <Input
                type="number"
                value={greenRoofAreaM2}
                onChange={e => onGreenRoofAreaChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs mt-1 w-24"
                min={0}
                step={1}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Fläche des extensiven Gründachs rund um die PV-Module
              </p>
            </div>
          )}

          <Button
            onClick={onRecalculate}
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            disabled={isCalculating}
          >
            {isCalculating ? 'Berechne...' : 'Materialliste neu berechnen'}
          </Button>
        </CardContent>
      </Card>

      {/* Materialliste */}
      {materialList ? (
        <div className="space-y-2">
          {/* Export-Buttons */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={downloadCSV}>
              <Download className="w-3 h-3 mr-1" />
              CSV-Export
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={downloadList}>
              <Download className="w-3 h-3 mr-1" />
              Text-Export
            </Button>
          </div>

          {/* Sektionen */}
          <ScrollArea className="max-h-[55vh] pr-1">
            <div className="space-y-2">
              {materialList.sections.map(section => (
                <SectionCollapsible
                  key={section.title}
                  title={section.title}
                  items={section.items}
                  defaultOpen={section.title === 'PV-Module' || section.title === 'Montagesystem'}
                />
              ))}
            </div>
          </ScrollArea>

          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Hinweis: Materialliste dient als Orientierung. Mengen und Kompatibilität durch Fachbetrieb prüfen lassen.
          </p>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Keine Materialliste vorhanden.</p>
          <p className="text-xs mt-1">Wähle Dachtyp und Montagesystem, dann berechnen.</p>
        </div>
      )}
    </div>
  );
};

export default MaterialListPanel;
