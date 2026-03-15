
import React from 'react';
import { PVMaterials } from '@/types/measurements';
import { formatPVMaterials } from '@/utils/pvCalculations';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, LayersIcon, ZapIcon, WrenchIcon, Cable, AlertTriangle, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PVMaterialsListProps {
  materials: PVMaterials;
  onCalculate?: () => void;
}

const PVMaterialsList: React.FC<PVMaterialsListProps> = ({ 
  materials,
  onCalculate
}) => {
  const isValidMaterials = materials && 
    materials.mountingSystem && 
    materials.electricalSystem && 
    materials.totalModuleCount > 0;

  if (!isValidMaterials) {
    return (
      <div className="p-4 border border-dashed border-border rounded-md">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Keine vollständige Materialliste verfügbar
          </p>
          {onCalculate && (
            <Button size="sm" variant="outline" onClick={onCalculate}>
              Materialliste neu berechnen
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Extract yield from notes
  const yieldNote = materials.notes?.find(n => n.includes('Jahresertrag'));
  const stringNote = materials.notes?.find(n => n.includes('Stringaufteilung'));
  const inverterNote = materials.notes?.find(n => n.includes('Wechselrichter'));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2 flex-wrap">
          <Badge variant="outline" className="px-2 py-1 bg-blue-50 dark:bg-blue-950">
            {materials.totalModuleCount} Module
          </Badge>
          <Badge variant="outline" className="px-2 py-1 bg-green-50 dark:bg-green-950">
            {materials.totalPower.toFixed(1)} kWp
          </Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7">
          <DownloadIcon className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>

      {/* Yield & System Summary */}
      {(yieldNote || stringNote || inverterNote) && (
        <Card className="border-primary/20">
          <CardContent className="py-3 px-4 space-y-1.5">
            {yieldNote && (
              <div className="flex items-center gap-2 text-sm">
                <Sun className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                <span>{yieldNote}</span>
              </div>
            )}
            {stringNote && (
              <div className="flex items-center gap-2 text-sm">
                <Cable className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>{stringNote}</span>
              </div>
            )}
            {inverterNote && (
              <div className="flex items-center gap-2 text-sm">
                <ZapIcon className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                <span>{inverterNote}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Accordion type="single" collapsible className="w-full" defaultValue="modules">
        <AccordionItem value="modules">
          <AccordionTrigger className="py-2">
            <div className="flex items-center">
              <LayersIcon className="mr-2 h-4 w-4 text-blue-600" />
              <span>Module</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Modultyp:</div>
              <div>{materials.moduleSpec?.name || "Standard"}</div>
              
              <div className="text-muted-foreground">Anzahl:</div>
              <div>{materials.totalModuleCount} Stück</div>
              
              <div className="text-muted-foreground">Leistung je Modul:</div>
              <div>{materials.moduleSpec?.power || 420} Wp</div>
              
              <div className="text-muted-foreground">Gesamtleistung:</div>
              <div>{materials.totalPower.toFixed(2)} kWp</div>
              
              <div className="text-muted-foreground">Abmessungen:</div>
              <div>{materials.moduleSpec?.width?.toFixed(2) || "1.13"} × {materials.moduleSpec?.height?.toFixed(2) || "1.72"} m</div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="mounting">
          <AccordionTrigger className="py-2">
            <div className="flex items-center">
              <WrenchIcon className="mr-2 h-4 w-4 text-amber-600" />
              <span>Montagesystem</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Montageschienen:</div>
              <div>{materials.mountingSystem.railLength.toFixed(1)} m</div>
              
              <div className="text-muted-foreground">Dachhaken:</div>
              <div>{materials.mountingSystem.roofHookCount} Stück</div>
              
              <div className="text-muted-foreground">Mittelklemmen:</div>
              <div>{materials.mountingSystem.middleClampCount} Stück</div>
              
              <div className="text-muted-foreground">Endklemmen:</div>
              <div>{materials.mountingSystem.endClampCount} Stück</div>
              
              <div className="text-muted-foreground">Schienenverbinder:</div>
              <div>{materials.mountingSystem.railConnectorCount} Stück</div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="electrical">
          <AccordionTrigger className="py-2">
            <div className="flex items-center">
              <ZapIcon className="mr-2 h-4 w-4 text-yellow-600" />
              <span>Elektrik</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Strings:</div>
              <div>{materials.electricalSystem.stringCount}× à {materials.electricalSystem.modulesPerString} Module</div>

              <div className="text-muted-foreground">Max. Stringspannung:</div>
              <div>{(materials.electricalSystem.modulesPerString * 41.5).toFixed(0)} V DC</div>
              
              <div className="text-muted-foreground">Wechselrichter:</div>
              <div>{materials.electricalSystem.inverterCount}× {materials.electricalSystem.inverterPower} kW</div>
              
              <div className="text-muted-foreground">Stringkabel:</div>
              <div>{materials.electricalSystem.stringCableLength} m</div>
              
              <div className="text-muted-foreground">DC-Hauptkabel:</div>
              <div>{materials.electricalSystem.mainCableLength} m</div>
              
              <div className="text-muted-foreground">AC-Kabel:</div>
              <div>{materials.electricalSystem.acCableLength} m</div>
              
              <div className="text-muted-foreground">Steckverbinder:</div>
              <div>{materials.electricalSystem.connectorPairCount} Paare</div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="additional">
          <AccordionTrigger className="py-2">
            <div className="flex items-center">
              <Cable className="mr-2 h-4 w-4 text-indigo-600" />
              <span>Zusatzkomponenten</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">DC-Trennschalter:</div>
              <div>1 Stück</div>
              
              <div className="text-muted-foreground">Überspannungsschutz DC:</div>
              <div>{materials.includesSurgeProtection ? '1 Stück' : 'Nein'}</div>
              
              <div className="text-muted-foreground">Überspannungsschutz AC:</div>
              <div>{materials.includesSurgeProtection ? '1 Stück' : 'Nein'}</div>

              <div className="text-muted-foreground">Monitoring-System:</div>
              <div>{materials.includesMonitoringSystem ? 'Ja' : 'Nein'}</div>
              
              <div className="text-muted-foreground">Erdung/PA:</div>
              <div>1 Set</div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {materials.notes && materials.notes.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm font-medium">Hinweise</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <ul className="text-sm list-disc pl-4 space-y-1">
              {materials.notes
                .filter(n => !n.includes('Jahresertrag') && !n.includes('Stringaufteilung') && !n.includes('Wechselrichter'))
                .map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PVMaterialsList;
