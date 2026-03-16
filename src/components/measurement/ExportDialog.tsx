
import React, { useState } from 'react';
import { Download, FileText, FileDown, Maximize, File, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog';
import { Measurement } from '@/types/measurements';
import { generateDetailedCSV, exportMeasurementsToAbsJson } from '@/utils/exportUtils';
import { useToast } from '@/components/ui/use-toast';
import ExportPdfButton from './ExportPdfButton';
import ExportGLBWithMeasurementsButton from './ExportGLBWithMeasurementsButton';
import GenerateRoofPlanButton from './GenerateRoofPlanButton';
import SaveMeasurementsButton from './SaveMeasurementsButton';

interface ExportDialogProps {
  measurements: Measurement[];
}

const ExportDialog: React.FC<ExportDialogProps> = ({ measurements }) => {
  const { toast } = useToast();

  const exportCSV = () => {
    if (!measurements.length) return;
    const csv = generateDetailedCSV(measurements);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Messungen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV exportiert', description: 'Datei wurde heruntergeladen' });
  };

  const exportABS = () => {
    if (!measurements.length) return;
    const absJson = exportMeasurementsToAbsJson(measurements, {
      address: '', projectId: 0, customerNames: '', customersReferencePhrase: ''
    });
    const blob = new Blob([JSON.stringify(absJson, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `abs-export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'ABS-Export erstellt', description: 'JSON-Datei heruntergeladen' });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" title="Exportieren">
          <Download className="h-3 w-3" /> Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Exportieren</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {/* PDF */}
          <ExportPdfButton measurements={measurements} />
          
          {/* CSV */}
          <Button variant="outline" size="sm" className="w-full justify-start text-left" onClick={exportCSV} disabled={!measurements.length}>
            <FileText className="h-4 w-4 mr-2 shrink-0" /> CSV Export
          </Button>

          {/* GLB with measurements */}
          <ExportGLBWithMeasurementsButton measurements={measurements} />

          {/* ABS Export */}
          <Button variant="outline" size="sm" className="w-full justify-start text-left" onClick={exportABS} disabled={!measurements.length}>
            <File className="h-4 w-4 mr-2 shrink-0" /> ABS-Export
          </Button>

          {/* Roof plan */}
          <GenerateRoofPlanButton measurements={measurements} />

          {/* Save to DrohnenGLB server */}
          <SaveMeasurementsButton 
            measurements={measurements} 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-left" 
          />
        </div>
        <DialogClose asChild>
          <Button variant="outline" className="w-full mt-2">Schließen</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
