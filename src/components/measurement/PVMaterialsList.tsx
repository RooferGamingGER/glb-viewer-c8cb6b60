
import React from 'react';
import { PVMaterials } from '@/types/measurements';
import { formatPVMaterials } from '@/utils/pvCalculations';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, LayersIcon, ZapIcon, WrenchIcon, Cable, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PVMaterialsListProps {
  materials: PVMaterials;
  onCalculate?: () => void;
}

const PVMaterialsList: React.FC<PVMaterialsListProps> = ({ 
  materials,
  onCalculate
}) => {
  if (!materials || !materials.mountingSystem || !materials.electricalSystem) {
    return (
      <div className="p-4 border border-dashed border-gray-300 rounded-md">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-muted-foreground">Keine Materialliste verfügbar</p>
          {onCalculate && (
            <Button size="sm" variant="outline" onClick={onCalculate}>
              Materialliste berechnen
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="px-2 py-1 bg-blue-50">
            {materials.totalModuleCount} Module
          </Badge>
          <Badge variant="outline" className="px-2 py-1 bg-green-50">
            {materials.totalPower.toFixed(1)} kWp
          </Badge>
        </div>
        <Button size="sm" variant="outline" className="h-7">
          <DownloadIcon className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
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
              <div>{materials.moduleSpec.name}</div>
              
              <div className="text-muted-foreground">Anzahl:</div>
              <div>{materials.totalModuleCount} Stück</div>
              
              <div className="text-muted-foreground">Leistung je Modul:</div>
              <div>{materials.moduleSpec.power} Wp</div>
              
              <div className="text-muted-foreground">Gesamtleistung:</div>
              <div>{materials.totalPower.toFixed(1)} kWp</div>
              
              <div className="text-muted-foreground">Abmessungen:</div>
              <div>{materials.moduleSpec.width.toFixed(2)} × {materials.moduleSpec.height.toFixed(2)} m</div>
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
              <div className="text-muted-foreground">Stringkabel:</div>
              <div>{materials.electricalSystem.stringCableLength} m</div>
              
              <div className="text-muted-foreground">DC-Hauptkabel:</div>
              <div>{materials.electricalSystem.mainCableLength} m</div>
              
              <div className="text-muted-foreground">AC-Kabel:</div>
              <div>{materials.electricalSystem.acCableLength} m</div>
              
              <div className="text-muted-foreground">Steckverbinder:</div>
              <div>{materials.electricalSystem.connectorPairCount} Paare</div>
              
              <div className="text-muted-foreground">Wechselrichter:</div>
              <div>{materials.electricalSystem.inverterCount} Stück</div>
              
              <div className="text-muted-foreground">WR-Leistung:</div>
              <div>{materials.electricalSystem.inverterPower.toFixed(1)} kW</div>
              
              <div className="text-muted-foreground">Strings:</div>
              <div>{materials.electricalSystem.stringCount} ({materials.electricalSystem.modulesPerString} Module/String)</div>
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
              <div className="text-muted-foreground">Überspannungsschutz:</div>
              <div>{materials.includesSurgeProtection ? 'Ja' : 'Nein'}</div>
              
              <div className="text-muted-foreground">Monitoring-System:</div>
              <div>{materials.includesMonitoringSystem ? 'Ja' : 'Nein'}</div>
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
              {materials.notes.map((note, index) => (
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
