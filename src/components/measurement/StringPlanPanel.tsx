/**
 * StringPlanPanel.tsx
 * UI für Stringplanung: Visualisierung, Validierung und Export
 * Zeigt Strings farbcodiert, Spannungsdiagramm und Planungsprotokoll
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cable,
  Download,
  Zap,
  LayoutGrid,
  FileText,
} from 'lucide-react';
import { StringPlan, PVString, MPPTTracker } from '@/types/pvPlanning';
import { generateStringPlanText, DEFAULT_MODULE_ELECTRICAL, ModuleElectricalSpec } from '@/utils/pvStringPlanning';
import { PVModuleInfo } from '@/types/measurements';
import { DEFAULT_MODULE_ELECTRICAL as DME } from '@/utils/pvStringPlanning';

interface StringPlanPanelProps {
  stringPlan: StringPlan | null;
  pvInfoMap: Map<string, PVModuleInfo>;
  isCalculating: boolean;
  onRecalculate: () => void;
  onRequestAIPlan: () => void;
  aiPlanText?: string;
  aiPlanLoading?: boolean;
}

const VoltageBar: React.FC<{
  value: number;
  min: number;
  max: number;
  label: string;
  color: string;
}> = ({ value, min, max, label, color }) => {
  const percent = Math.min(Math.max((value - min) / (max - min), 0), 1) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value.toFixed(0)} V</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min} V</span>
        <span>{max} V</span>
      </div>
    </div>
  );
};

const StringCard: React.FC<{ string: PVString; inverterMaxVdc: number }> = ({ string, inverterMaxVdc }) => {
  return (
    <div
      className="p-3 rounded-md border text-xs"
      style={{ borderLeftColor: string.color, borderLeftWidth: 4 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: string.color }}
          />
          <span className="font-semibold">String {string.id}</span>
          <Badge variant="outline" className="text-[10px] h-4">MPPT-T{string.mpptTracker}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {string.valid ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={string.valid ? 'text-green-600' : 'text-red-600'}>
            {string.valid ? 'OK' : 'Fehler'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div><span className="text-muted-foreground">Module:</span> {string.moduleCount}</div>
        <div><span className="text-muted-foreground">Leistung:</span> {(string.moduleCount * DME.impp * DME.vmpp / 1000).toFixed(2)} kWp</div>
        <div><span className="text-muted-foreground">Voc (-10°C):</span> <span className={string.uocTotal > inverterMaxVdc * 0.95 ? 'text-orange-500' : ''}>{string.uocTotal.toFixed(0)} V</span></div>
        <div><span className="text-muted-foreground">Vmpp (STC):</span> {string.umppTotal.toFixed(0)} V</div>
        <div><span className="text-muted-foreground">Impp:</span> {string.impp.toFixed(1)} A</div>
        <div><span className="text-muted-foreground">Isc:</span> {string.isc.toFixed(1)} A</div>
      </div>
      {string.warning && (
        <div className="mt-2 text-orange-600 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{string.warning}</span>
        </div>
      )}
    </div>
  );
};

const MPPTTrackerCard: React.FC<{ tracker: MPPTTracker; inverter: StringPlan['inverter'] }> = ({
  tracker, inverter
}) => {
  return (
    <Card className="border-muted">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Badge variant="secondary">MPPT-Tracker {tracker.trackerId}</Badge>
          <span className="text-muted-foreground font-normal text-xs">{tracker.strings.length} Strings · {tracker.totalModules} Module</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Spannungsdiagramm */}
        <div className="space-y-2">
          <VoltageBar
            value={tracker.uocMax}
            min={0}
            max={inverter.maxDCVoltage}
            label="Voc max. (−10°C)"
            color={tracker.uocMax > inverter.maxDCVoltage ? '#ef4444' : tracker.uocMax > inverter.maxDCVoltage * 0.9 ? '#f97316' : '#22c55e'}
          />
          <VoltageBar
            value={tracker.umppRange.min}
            min={inverter.mppVoltageMin}
            max={inverter.mppVoltageMax}
            label="Vmpp min. (70°C)"
            color={tracker.umppRange.min < inverter.mppVoltageMin ? '#ef4444' : '#3b82f6'}
          />
          <VoltageBar
            value={tracker.umppRange.max}
            min={inverter.mppVoltageMin}
            max={inverter.mppVoltageMax}
            label="Vmpp max. (STC)"
            color="#3b82f6"
          />
        </div>

        {tracker.strings.length > 1 && (
          <div className="text-xs flex items-center gap-1 text-muted-foreground">
            <span>Strombalance:</span>
            <span className={tracker.currentBalance < 80 ? 'text-orange-500' : 'text-green-600'}>
              {tracker.currentBalance.toFixed(0)}%
            </span>
            {tracker.currentBalance < 80 && (
              <span className="text-orange-500">(Strings ungleich belegt)</span>
            )}
          </div>
        )}

        {/* String-Karten */}
        <div className="space-y-2">
          {tracker.strings.map(s => (
            <StringCard key={s.id} string={s} inverterMaxVdc={inverter.maxDCVoltage} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const StringPlanPanel: React.FC<StringPlanPanelProps> = ({
  stringPlan,
  pvInfoMap,
  isCalculating,
  onRecalculate,
  onRequestAIPlan,
  aiPlanText,
  aiPlanLoading,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const planText = useMemo(() => {
    if (!stringPlan) return '';
    return generateStringPlanText(stringPlan);
  }, [stringPlan]);

  const downloadPlanText = () => {
    if (!planText) return;
    const blob = new Blob([planText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stringplanung.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!stringPlan) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Cable className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>Kein Stringplan vorhanden.</p>
        <p className="text-xs mt-1">Wähle zuerst einen Wechselrichter.</p>
        <Button onClick={onRecalculate} size="sm" variant="outline" className="mt-3" disabled={isCalculating}>
          {isCalculating ? 'Berechne...' : 'Stringplanung erstellen'}
        </Button>
      </div>
    );
  }

  const allOk = stringPlan.dcVoltageOk && stringPlan.mppRangeOk && stringPlan.currentOk;
  const hasWarnings = stringPlan.warnings.length > 0;
  const hasErrors = stringPlan.errors.length > 0;

  return (
    <div className="space-y-3">
      {/* Status-Banner */}
      <div className={`p-3 rounded-md flex items-center justify-between ${
        hasErrors ? 'bg-red-50 dark:bg-red-950/30 border border-red-200' :
        hasWarnings ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200' :
        'bg-green-50 dark:bg-green-950/30 border border-green-200'
      }`}>
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <XCircle className="w-4 h-4 text-red-600" />
          ) : hasWarnings ? (
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
          <span className="text-sm font-medium">
            {hasErrors ? 'Planungsfehler' : hasWarnings ? 'Warnungen vorhanden' : 'Stringplanung OK'}
          </span>
        </div>
        <Button onClick={onRecalculate} size="sm" variant="ghost" disabled={isCalculating}>
          {isCalculating ? 'Berechne...' : 'Neu berechnen'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 h-8">
          <TabsTrigger value="overview" className="text-xs">
            <LayoutGrid className="w-3 h-3 mr-1" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="strings" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Strings
          </TabsTrigger>
          <TabsTrigger value="plan" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Protokoll
          </TabsTrigger>
        </TabsList>

        {/* Übersicht */}
        <TabsContent value="overview" className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Gesamtleistung</div>
              <div className="text-xl font-bold mt-1">{stringPlan.totalPower.toFixed(1)} kWp</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Module gesamt</div>
              <div className="text-xl font-bold mt-1">{stringPlan.totalModules}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Strings</div>
              <div className="text-xl font-bold mt-1">{stringPlan.allStrings.length}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Wechselrichter</div>
              <div className="text-xl font-bold mt-1">{stringPlan.inverterCount}×</div>
              <div className="text-xs text-muted-foreground truncate">{stringPlan.inverter.model}</div>
            </Card>
          </div>

          {/* Prüfstatus */}
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="text-xs font-medium">Prüfstatus</div>
              {[
                { label: 'DC-Spannungsgrenze', ok: stringPlan.dcVoltageOk, detail: `Voc(−10°C) < ${stringPlan.inverter.maxDCVoltage}V` },
                { label: 'MPP-Spannungsbereich', ok: stringPlan.mppRangeOk, detail: `Vmpp im Bereich ${stringPlan.inverter.mppVoltageMin}–${stringPlan.inverter.mppVoltageMax}V` },
                { label: 'Strombegrenzung', ok: stringPlan.currentOk, detail: `Isc < ${stringPlan.inverter.maxCurrentPerMPPT}A je MPPT` },
              ].map(({ label, ok, detail }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  {ok ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  )}
                  <span className="flex-1">{label}</span>
                  <span className="text-muted-foreground">{detail}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Kabelmengen */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="text-xs font-medium mb-2">Kabelplanung (Schätzung)</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-muted-foreground">DC-Kabel gesamt:</span> {stringPlan.totalCableLength.toFixed(0)} m</div>
                <div><span className="text-muted-foreground">Ø je String:</span> {stringPlan.stringCableLengthPerString.toFixed(0)} m</div>
                <div><span className="text-muted-foreground">AC-Kabel:</span> {stringPlan.acCableLength.toFixed(0)} m</div>
                <div><span className="text-muted-foreground">DC-Trenner:</span> {stringPlan.dcDisconnectRequired ? 'Erforderlich' : '–'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Warnungen/Fehler */}
          {stringPlan.errors.map((e, i) => (
            <Alert key={i} variant="destructive" className="py-2">
              <XCircle className="h-3 w-3" />
              <AlertDescription className="text-xs ml-1">{e}</AlertDescription>
            </Alert>
          ))}
          {stringPlan.warnings.map((w, i) => (
            <Alert key={i} className="py-2 border-orange-200 bg-orange-50 dark:bg-orange-950/30">
              <AlertTriangle className="h-3 w-3 text-orange-600" />
              <AlertDescription className="text-xs ml-1 text-orange-700 dark:text-orange-300">{w}</AlertDescription>
            </Alert>
          ))}
        </TabsContent>

        {/* Strings-Detail */}
        <TabsContent value="strings" className="pt-2">
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3 pr-2">
              {stringPlan.mpptTrackers.map(tracker => (
                <MPPTTrackerCard
                  key={tracker.trackerId}
                  tracker={tracker}
                  inverter={stringPlan.inverter}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Protokoll */}
        <TabsContent value="plan" className="pt-2 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={downloadPlanText}
              className="text-xs h-7"
            >
              <Download className="w-3 h-3 mr-1" />
              Text-Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRequestAIPlan}
              disabled={aiPlanLoading}
              className="text-xs h-7"
            >
              <Zap className="w-3 h-3 mr-1" />
              {aiPlanLoading ? 'KI berechnet...' : 'KI-Stringplanung'}
            </Button>
          </div>

          {aiPlanText && (
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs">KI-generierter Stringplan</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {aiPlanText}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-xs">Planungsprotokoll</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                  {planText}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StringPlanPanel;
