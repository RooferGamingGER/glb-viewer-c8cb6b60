import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportOptimizedModelForEturnity, generateEturnityFileName } from '@/utils/eturnityExport';
import { useThreeContext } from '@/hooks/useThreeContext';
import { Progress } from '@/components/ui/progress';

interface EturnityExportButtonProps {
  fileName?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

const EturnityExportButton: React.FC<EturnityExportButtonProps> = ({ 
  fileName,
  className = "",
  size = "sm",
  variant = "outline"
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
      setProgress(0);

      // Generate filename if not provided
      const exportFileName = fileName || generateEturnityFileName();
      
      // Export optimized model for Eturnity
      await exportOptimizedModelForEturnity(
        scene,
        exportFileName,
        (exportProgress) => {
          setProgress(exportProgress);
        }
      );
      
      toast.success('Export für Eturnity erfolgreich', {
        description: `Die optimierte Datei '${exportFileName}' wurde heruntergeladen.`
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
    <div className="relative">
      <Button 
        variant={variant}
        size={size}
        className={`eturnity-button ${className}`}
        onClick={handleExport}
        disabled={exporting || !scene}
        style={{
          background: exporting 
            ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)))'
            : 'linear-gradient(135deg, #6B46C1, #8B5CF6)',
          borderColor: '#6B46C1',
          color: 'white',
          fontWeight: '600',
          transition: 'all 0.3s ease',
        }}
      >
        <Download className="h-4 w-4 mr-2" />
        {exporting ? `Export läuft... ${progress}%` : 'Export für Eturnity'}
      </Button>
      
      {exporting && (
        <div className="absolute -bottom-6 left-0 right-0">
          <Progress 
            value={progress} 
            className="h-1 bg-background/20" 
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EturnityExportButton;