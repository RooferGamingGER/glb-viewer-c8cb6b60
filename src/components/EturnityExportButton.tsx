import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { exportModelWithMeasurements } from '@/utils/modelTransformer';
import * as THREE from 'three';

interface EturnityExportButtonProps {
  fileName?: string;
  isMobile?: boolean;
  scene?: THREE.Scene | null;
}

const EturnityExportButton: React.FC<EturnityExportButtonProps> = ({ 
  fileName = 'eturnity-export.glb',
  isMobile = false,
  scene = null
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!scene) {
      toast.error('3D-Szene wird noch geladen...');
      return;
    }

    try {
      setExporting(true);
      
      // Generate timestamped filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const exportFileName = fileName.replace('.glb', '') + '_' + timestamp + '.glb';
      
      // Export the model without measurements (empty array)
      await exportModelWithMeasurements(
        scene,
        [], // Empty measurements array since we want to export model only
        exportFileName
      );
      
      toast.success('Export für Eturnity erfolgreich', {
        description: `Die Datei '${exportFileName}' wurde heruntergeladen.`
      });
    } catch (error) {
      console.error('Error exporting for Eturnity:', error);
      toast.error('Fehler beim Export', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    } finally {
      setTimeout(() => {
        setExporting(false);
      }, 1000);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="glass-button"
      onClick={handleExport}
      disabled={exporting}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      <span className={isMobile ? "sr-only" : ""}>
        {exporting ? 'Exportiere...' : 'Export für Eturnity'}
      </span>
    </Button>
  );
};

export default EturnityExportButton;