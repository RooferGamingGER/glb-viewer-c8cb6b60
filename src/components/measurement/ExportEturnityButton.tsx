
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Measurement } from '@/types/measurements';
import { exportModelWithMeasurements } from '@/utils/modelTransformer';
import { useThreeContext } from '@/hooks/useThreeContext';
import { Progress } from '@/components/ui/progress';

interface ExportEturnityButtonProps {
  measurements?: Measurement[];
  fileName?: string;
}

const ExportEturnityButton: React.FC<ExportEturnityButtonProps> = ({ 
  measurements = [],
  fileName = 'eturnity-export.glb' 
}) => {
  const { scene } = useThreeContext();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!scene) {
      toast.error('Keine 3D-Szene verfügbar');
      return;
    }

    try {
      setExporting(true);
      setProgress(10);

      // Filter out invisible measurements (if any exist)
      const visibleMeasurements = measurements.filter(m => m.visible);
      
      // Generate timestamped filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const exportFileName = fileName.replace('.glb', '') + '_' + timestamp + '.glb';
      
      setProgress(30);
      
      // Export the model with measurements (empty array if no measurements)
      await exportModelWithMeasurements(
        scene,
        visibleMeasurements,
        exportFileName,
        (exportProgress) => {
          // Map export progress to 30-90% of our total progress
          setProgress(30 + Math.round(exportProgress * 0.6));
        }
      );
      
      setProgress(100);
      
      toast.success('Export für Eturnity erfolgreich', {
        description: `Die Datei '${exportFileName}' wurde heruntergeladen.`
      });
    } catch (error) {
      console.error('Error exporting for Eturnity:', error);
      toast.error('Fehler beim Export', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    } finally {
      // Reset after a delay to show completion
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={handleExport}
        disabled={exporting}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Export für Eturnity
      </Button>
      
      {exporting && (
        <div className="mt-1">
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </>
  );
};

export default ExportEturnityButton;
