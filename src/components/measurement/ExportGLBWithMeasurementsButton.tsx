import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { Measurement } from '@/types/measurements';
import { useThreeContext } from '@/hooks/useThreeContext';
import { exportOriginalGLBWithMeasurements } from '@/utils/glbMeasurementEmbed';
import * as THREE from 'three';
import { toast } from 'sonner';

interface ExportGLBWithMeasurementsButtonProps {
  measurements: Measurement[];
}

const ExportGLBWithMeasurementsButton: React.FC<ExportGLBWithMeasurementsButtonProps> = ({ measurements }) => {
  const { scene } = useThreeContext();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const isRooferGaming = !!(scene as any)?.userData?.isRooferGamingModel;
  const hasOriginalFile = !!(scene as any)?.userData?.originalFile;

  // Only render if this is a RooferGaming model and we have the original GLB
  if (!isRooferGaming || !hasOriginalFile) {
    return null;
  }

  const suggestedName = useMemo(() => {
    if (!scene) return 'model_with_measurements.glb';
    let name: string | undefined;
    // Try scene first
    const s: any = scene as any;
    if (s.userData?.originalFile?.name) {
      name = s.userData.originalFile.name as string;
    }
    // Traverse for a child with original file name
    if (!name) {
      let found: string | undefined;
      scene.traverse((obj: THREE.Object3D) => {
        const f: any = (obj as any).userData?.originalFile;
        if (!found && f && typeof f.name === 'string') {
          found = f.name as string;
        }
      });
      name = found;
    }
    if (!name) return 'model_with_measurements.glb';
    return name.replace(/\.glb$/i, '') + '_with_measurements.glb';
  }, [scene]);

  const handleExport = async () => {
    if (!scene) {
      toast.error('Szene nicht bereit. Bitte Modell erneut laden.');
      return;
    }
    if (!measurements || measurements.length === 0) {
      toast.error('Keine Messungen vorhanden.');
      return;
    }

    setExporting(true);
    setProgress(5);
    try {
      await exportOriginalGLBWithMeasurements(
        scene,
        measurements,
        suggestedName,
        (p) => setProgress(p)
      );
      toast.success('GLB mit Messungen exportiert');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Export fehlgeschlagen');
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 400);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full"
      onClick={handleExport}
      disabled={exporting}
      title="Original-GLB mit Messungen (nur Metadaten) exportieren"
    >
      <FileDown className="h-4 w-4 mr-2" />
      {exporting ? `Exportiere… ${progress}%` : 'GLB mit Messungen'}
    </Button>
  );
};

export default ExportGLBWithMeasurementsButton;
