import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Upload, ExternalLink, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from '@/components/ui/progress';
import { exportModelOnlyForEturnity } from '@/utils/modelTransformer';

const EturnityExportSection: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    setFileError(null);
    if (!file.name.toLowerCase().endsWith('.glb')) {
      const errorMsg = 'Bitte laden Sie eine gültige GLB-Datei hoch.';
      setFileError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = 'Die Datei ist zu groß. Maximale Größe ist 100MB.';
      setFileError(errorMsg);
      toast.error(errorMsg);
      return false;
    }
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      toast.success('Datei für Eturnity-Export ausgewählt: ' + file.name);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleEturnityExport = async () => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie zuerst eine Datei aus.');
      return;
    }

    try {
      setExporting(true);
      setProgress(10);

      // Load the file and create a temporary scene for export
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Import three.js modules for loading
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { Scene } = await import('three');
      
      setProgress(30);
      
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.parse(arrayBuffer, '', resolve, reject);
      });
      
      setProgress(50);
      
      // Create a temporary scene with the loaded model
      const tempScene = new Scene();
      tempScene.add(gltf.scene);
      
      // Generate timestamped filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const exportFileName = selectedFile.name.replace('.glb', '') + '_eturnity_' + timestamp + '.glb';
      
      setProgress(70);
      
      // Export with optimization for Eturnity
      await exportModelOnlyForEturnity(
        tempScene,
        exportFileName,
        (exportProgress) => {
          setProgress(70 + Math.round(exportProgress * 0.3));
        }
      );
      
      setProgress(100);
      
      toast.success('Export für Eturnity erfolgreich', {
        description: `Die Datei '${exportFileName}' wurde optimiert und heruntergeladen.`
      });
    } catch (error) {
      console.error('Error exporting for Eturnity:', error);
      toast.error('Fehler beim Export für Eturnity', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 1000);
    }
  };

  const clickFileInput = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className={`file-drop-area glass-panel relative border-2 border-dashed border-border/50 p-6 rounded-lg 
                   ${isDragging ? 'bg-primary/5 border-primary/30' : ''} 
                   transition-all duration-300 cursor-pointer`} 
           onDragOver={handleDragOver} 
           onDragLeave={handleDragLeave} 
           onDrop={handleDrop} 
           onClick={clickFileInput}>
        
        <input type="file" ref={inputRef} className="hidden" accept=".glb" onChange={handleInputChange} />

        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Upload className={`w-12 h-12 text-primary/70 ${isDragging ? 'scale-110' : ''} transition-transform`} />
          </div>

          <h3 className="text-lg font-medium mb-2">
            {selectedFile ? selectedFile.name : 'GLB-Datei für Eturnity-Export'}
          </h3>

          <p className="text-muted-foreground text-sm mb-4">
            {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Datei hier ablegen oder klicken'}
          </p>

          {fileError && (
            <Alert variant="warning" className="mt-4 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}

          {selectedFile && (
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEturnityExport();
                }} 
                className="button-hover px-6 py-2" 
                disabled={exporting}
                variant="outline"
              >
                {exporting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Wird exportiert...</span>
                  </div>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Für Eturnity exportieren
                  </>
                )}
              </Button>
            </div>
          )}

          {exporting && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Export wird optimiert... {progress}%
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 text-center text-xs text-muted-foreground">
        Optimiert GLB-Dateien für die Verwendung in Eturnity
      </div>
    </div>
  );
};

export default EturnityExportSection;