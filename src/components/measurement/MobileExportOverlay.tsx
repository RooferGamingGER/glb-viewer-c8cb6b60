import React from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText } from 'lucide-react';
import { Measurement } from '@/hooks/useMeasurements';
import { CompleteMaterialList } from '@/types/pvPlanning';
import { generateDetailedCSV, exportMeasurementsToAbsJson } from '@/utils/exportUtils';
import ExportGLBWithMeasurementsButton from './ExportGLBWithMeasurementsButton';
import GenerateRoofPlanButton from './GenerateRoofPlanButton';
import ExportPdfButton from './ExportPdfButton';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';

interface MobileExportOverlayProps {
  measurements: Measurement[];
  onClose: () => void;
  materialList?: CompleteMaterialList | null;
}

const MobileExportOverlay: React.FC<MobileExportOverlayProps> = ({
  measurements,
  onClose,
  materialList,
}) => {
  const { toast } = useToast();

  const exportCSV = () => {
    if (!measurements || measurements.length === 0) {
      toast({ title: 'Fehler', description: 'Keine Messungen für den Export vorhanden', variant: 'destructive' });
      return;
    }
    const csvContent = generateDetailedCSV(measurements);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Messungen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV-Export erfolgreich', description: 'Die CSV-Datei wurde heruntergeladen' });
  };

  const exportAbsJson = () => {
    if (!measurements || measurements.length === 0) {
      toast({ title: 'Fehler', description: 'Keine Messungen für den ABS-Export vorhanden', variant: 'destructive' });
      return;
    }
    const absJson = exportMeasurementsToAbsJson(measurements, {
      address: '',
      projectId: 0,
      customerNames: '',
      customersReferencePhrase: '',
    });
    const blob = new Blob([JSON.stringify(absJson, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `abs-export-test_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'ABS-Export (Test) erstellt', description: 'Die ABS-JSON-Testdatei wurde heruntergeladen.' });
  };

  const noMeasurements = measurements.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-background pointer-events-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-lg font-semibold">Export</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {noMeasurements ? (
          <div className="p-6 text-center text-muted-foreground">
            Keine Messungen vorhanden.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="text-xs text-muted-foreground mb-1">Exportoptionen:</div>

            <ExportGLBWithMeasurementsButton measurements={measurements} />

            <GenerateRoofPlanButton measurements={measurements} />

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={exportCSV}
              disabled={noMeasurements}
            >
              <FileText className="h-4 w-4 mr-2" />
              CSV Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={exportAbsJson}
              disabled={noMeasurements}
            >
              <FileText className="h-4 w-4 mr-2" />
              ABS-Export (Test)
            </Button>

            <ExportPdfButton measurements={measurements} materialList={materialList} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MobileExportOverlay;
