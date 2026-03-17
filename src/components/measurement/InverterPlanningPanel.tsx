/**
 * InverterPlanningPanel.tsx
 * UI-Komponente für Wechselrichterplanung
 * Ermöglicht Auswahl und Konfiguration des Wechselrichters für die PV-Anlage
 */

import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  INVERTER_DATABASE,
  InverterSpec,
  InverterPhase,
  InverterTopology,
  selectInverter,
  InverterSelectionResult,
} from '@/types/pvPlanning';

interface InverterPlanningPanelProps {
  totalPowerKWp: number;
  selectedInverter: InverterSpec | null;
  onInverterChange: (inverter: InverterSpec | null) => void;
  inverterDistance: number;
  onInverterDistanceChange: (distance: number) => void;
}

const MANUFACTURERS = [...new Set(INVERTER_DATABASE.map(inv => inv.manufacturer))].sort();
const TOPOLOGY_LABELS: Record<InverterTopology, string> = {
  string: 'String-WR',
  micro: 'Mikro-WR',
  hybrid: 'Hybrid (Speicher)',
  central: 'Zentral-WR',
};
const PHASE_LABELS: Record<number, string> = {
  1: 'Einphasig',
  3: 'Dreiphasig',
};

export const InverterPlanningPanel: React.FC<InverterPlanningPanelProps> = ({
  totalPowerKWp,
  selectedInverter,
  onInverterChange,
  inverterDistance,
  onInverterDistanceChange,
}) => {
  const [manufacturer, setManufacturer] = useState<string>('alle');
  const [phases, setPhases] = useState<'alle' | '1' | '3'>('alle');
  const [topology, setTopology] = useState<'alle' | InverterTopology>('alle');
  const [hasBattery, setHasBattery] = useState(false);
  const [showAllInverters, setShowAllInverters] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Automatische Empfehlung
  const recommendation = useMemo((): InverterSelectionResult => {
    const ph = phases === 'alle' ? (totalPowerKWp > 6 ? 3 : 1) : (parseInt(phases) as InverterPhase);
    return selectInverter(
      totalPowerKWp,
      ph,
      hasBattery,
      manufacturer !== 'alle' ? manufacturer : undefined
    );
  }, [totalPowerKWp, phases, hasBattery, manufacturer]);

  // Gefilterte Liste
  const filteredInverters = useMemo(() => {
    return INVERTER_DATABASE.filter(inv => {
      if (manufacturer !== 'alle' && inv.manufacturer !== manufacturer) return false;
      if (phases !== 'alle' && inv.phases !== parseInt(phases)) return false;
      if (topology !== 'alle' && inv.topology !== topology) return false;
      if (hasBattery && !inv.hasBatteryInput) return false;
      return true;
    }).sort((a, b) => a.nominalPowerAC - b.nominalPowerAC);
  }, [manufacturer, phases, topology, hasBattery]);

  const displayedInverters = showAllInverters ? filteredInverters : filteredInverters.slice(0, 10);

  const getCompatibilityColor = (inv: InverterSpec): 'default' | 'secondary' | 'destructive' => {
    const ratio = totalPowerKWp / inv.nominalPowerAC;
    if (ratio >= 0.8 && ratio <= 1.2) return 'default';
    if (ratio >= 0.6 && ratio <= 1.5) return 'secondary';
    return 'destructive';
  };

  const getCompatibilityLabel = (inv: InverterSpec): string => {
    const ratio = totalPowerKWp / inv.nominalPowerAC;
    if (ratio < 0.5) return 'Überdimensioniert';
    if (ratio < 0.8) return 'Leicht überdim.';
    if (ratio <= 1.1) return 'Optimal';
    if (ratio <= 1.2) return 'Leichte Überlast';
    if (ratio <= 1.5) return 'Überlast prüfen';
    return 'Unterdimensioniert';
  };

  return (
    <div className="space-y-4">
      {/* Systeminfo */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Zap className="w-4 h-4" />
            <span>
              Geplante DC-Leistung: <strong>{totalPowerKWp.toFixed(2)} kWp</strong>
              {totalPowerKWp > 0 && (
                <span className="ml-2 text-blue-500">
                  → Empfohlen: {(totalPowerKWp * 0.9).toFixed(1)}–{(totalPowerKWp * 1.1).toFixed(1)} kW AC
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Empfehlungen */}
      {!manualMode && recommendation.recommended.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Empfohlene Wechselrichter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendation.recommended.map(inv => (
              <div
                key={inv.id}
                onClick={() => onInverterChange(inv)}
                className={`p-3 rounded-md border cursor-pointer transition-all hover:border-blue-400 ${
                  selectedInverter?.id === inv.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{inv.manufacturer} {inv.model}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {inv.nominalPowerAC} kW AC · {PHASE_LABELS[inv.phases]} · {inv.mpptCount} MPPT · η={inv.efficiency}%
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="default" className="bg-green-600 text-xs">
                      {getCompatibilityLabel(inv)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {TOPOLOGY_LABELS[inv.topology]}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                  <div>Max. DC: {inv.maxDCVoltage}V</div>
                  <div>MPP: {inv.mppVoltageMin}–{inv.mppVoltageMax}V</div>
                  <div>Imax: {inv.maxCurrentPerMPPT}A/MPPT</div>
                </div>
                {inv.hasBatteryInput && (
                  <Badge variant="secondary" className="mt-1 text-xs">Speicherkopplung möglich</Badge>
                )}
              </div>
            ))}
            {recommendation.warnings.map((w, i) => (
              <Alert key={i} className="py-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs ml-1">{w}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Aktuell ausgewählter WR */}
      {selectedInverter && (
        <Card className="border-blue-500">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              Ausgewählter Wechselrichter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{selectedInverter.manufacturer} {selectedInverter.model}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
              <div><span className="text-muted-foreground">AC-Leistung:</span> {selectedInverter.nominalPowerAC} kW</div>
              <div><span className="text-muted-foreground">Phase:</span> {PHASE_LABELS[selectedInverter.phases]}</div>
              <div><span className="text-muted-foreground">Max. DC:</span> {selectedInverter.maxDCVoltage} V</div>
              <div><span className="text-muted-foreground">MPPT-Tracker:</span> {selectedInverter.mpptCount}</div>
              <div><span className="text-muted-foreground">MPP-Bereich:</span> {selectedInverter.mppVoltageMin}–{selectedInverter.mppVoltageMax} V</div>
              <div><span className="text-muted-foreground">Imax/MPPT:</span> {selectedInverter.maxCurrentPerMPPT} A</div>
              <div><span className="text-muted-foreground">Wirkungsgrad:</span> {selectedInverter.efficiency}%</div>
              <div><span className="text-muted-foreground">Euro-η:</span> {selectedInverter.euroEfficiency}%</div>
            </div>
            {selectedInverter.hasBatteryInput && (
              <div className="mt-2 text-xs text-muted-foreground">
                Batterie: {selectedInverter.batteryVoltageMin}–{selectedInverter.batteryVoltageMax} V, max. {selectedInverter.maxBatteryPower} kW
              </div>
            )}
            <Badge
              variant={getCompatibilityColor(selectedInverter)}
              className="mt-2 text-xs"
            >
              {getCompatibilityLabel(selectedInverter)} ({(totalPowerKWp / selectedInverter.nominalPowerAC * 100).toFixed(0)}% Auslegung)
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Filterbereich */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full">
          <ChevronRight className="w-4 h-4" />
          <span>Alle Wechselrichter durchsuchen</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Hersteller</Label>
              <Select value={manufacturer} onValueChange={setManufacturer}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Hersteller</SelectItem>
                  {MANUFACTURERS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Phasen</Label>
              <Select value={phases} onValueChange={v => setPhases(v as typeof phases)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle</SelectItem>
                  <SelectItem value="1">Einphasig</SelectItem>
                  <SelectItem value="3">Dreiphasig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Typ</Label>
              <Select value={topology} onValueChange={v => setTopology(v as typeof topology)}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Typen</SelectItem>
                  <SelectItem value="string">String-WR</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Speicher)</SelectItem>
                  <SelectItem value="micro">Mikro-WR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                checked={hasBattery}
                onCheckedChange={setHasBattery}
                className="h-4 w-8"
              />
              <Label className="text-xs">Mit Speicher</Label>
            </div>
          </div>

          {/* WR-Liste */}
          <div className="text-xs text-muted-foreground">{filteredInverters.length} Wechselrichter gefunden</div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {displayedInverters.map(inv => (
              <div
                key={inv.id}
                onClick={() => onInverterChange(inv)}
                className={`p-2 rounded border cursor-pointer text-xs transition-colors hover:border-blue-400 ${
                  selectedInverter?.id === inv.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{inv.manufacturer} {inv.model}</span>
                  <Badge variant={getCompatibilityColor(inv)} className="text-[10px] h-4">
                    {getCompatibilityLabel(inv)}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-0.5">
                  {inv.nominalPowerAC} kW · {PHASE_LABELS[inv.phases]} · {inv.mpptCount} MPPT · {TOPOLOGY_LABELS[inv.topology]}
                </div>
              </div>
            ))}
            {!showAllInverters && filteredInverters.length > 10 && (
              <button
                onClick={() => setShowAllInverters(true)}
                className="text-xs text-blue-600 hover:underline w-full text-center py-1"
              >
                Weitere {filteredInverters.length - 10} anzeigen...
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* WR-Abstand */}
      <div>
        <Label className="text-xs">Abstand WR → Dach (DC-Kabellänge)</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="number"
            value={inverterDistance}
            onChange={e => onInverterDistanceChange(parseFloat(e.target.value) || 10)}
            className="h-8 text-xs w-24"
            min={1}
            max={100}
            step={1}
          />
          <span className="text-xs text-muted-foreground">m (beeinflusst Kabellänge)</span>
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>Kabelquerschnitt: 6 mm² DC-Kabel (max. Spannungsfall &lt; 1%)</span>
        </div>
      </div>
    </div>
  );
};

export default InverterPlanningPanel;
