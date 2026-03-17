
import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { smartToast } from '@/utils/smartToast';
import { devError } from '@/utils/consoleCleanup';
import { Upload, AlertTriangle, Download } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { rotateGLBDirect } from '@/utils/glbDirectManipulation';

const FileUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
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

  const validateFile = async (file: File): Promise<boolean> => {
    setFileError(null);

    if (!file.name.toLowerCase().endsWith('.glb')) {
      const errorMsg = 'Bitte laden Sie eine gültige GLB-Datei hoch.';
      setFileError(errorMsg);
      smartToast.error(errorMsg);
      return false;
    }
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = 'Die Datei ist zu groß. Maximale Größe ist 100MB.';
      setFileError(errorMsg);
      smartToast.error(errorMsg);
      return false;
    }

    try {
      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const isGlbMagic = header[0] === 0x67 && header[1] === 0x6C && header[2] === 0x54 && header[3] === 0x46;
      if (!isGlbMagic) {
        const errorMsg = 'Ungültiges Dateiformat. Erwartet wurde eine GLB-Datei.';
        setFileError(errorMsg);
        smartToast.error(errorMsg);
        return false;
      }
    } catch (_) {
      const errorMsg = 'Datei konnte nicht geprüft werden.';
      setFileError(errorMsg);
      smartToast.error(errorMsg);
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (await validateFile(file)) {
      setSelectedFile(file);
      smartToast.success('Datei ausgewählt: ' + file.name);
    }
  }, []);

  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileSelect(e.target.files[0]);
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

  const handleEturnityConvert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFile) {
      smartToast.error('Bitte wählen Sie zuerst eine Datei aus.');
      return;
    }

    try {
      setConverting(true);
      smartToast.technical('GLB-Datei wird für Eturnity konvertiert...');
      
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '_eturnity.glb');
      
      await rotateGLBDirect(
        selectedFile, 
        fileName,
        (progress) => {
          console.log(`Konvertierung: ${progress}%`);
        }
      );
      
      smartToast.success(`Datei erfolgreich für Eturnity konvertiert: ${fileName}`);
      setConverting(false);
    } catch (error) {
      devError('Error converting GLB for Eturnity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      smartToast.error(`Fehler beim Konvertieren: ${errorMessage}`);
      setConverting(false);
    }
  };

  const clickFileInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full animate-fade-in">
      <div
        className={`file-drop-area glass-panel relative border-2 border-dashed border-border/50 p-6 rounded-lg 
                     ${isDragging ? 'bg-primary/5 border-primary/30' : ''} 
                     transition-all duration-300 cursor-pointer`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={clickFileInput}
      >
        <input type="file" ref={inputRef} className="hidden" accept=".glb" onChange={handleInputChange} />

        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Upload className={`w-14 h-14 text-primary/70 ${isDragging ? 'scale-110' : ''} transition-transform`} />
          </div>

          <h3 className="text-lg font-medium mb-2">
            {selectedFile ? selectedFile.name : 'GLB-Datei für Eturnitykonvertieren'}
          </h3>

          <p className="text-muted-foreground text-sm mb-4">
            {selectedFile
              ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
              : 'GLB-Datei hier ablegen oder klicken'}
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
                onClick={handleEturnityConvert}
                className="button-hover px-6 py-2"
                disabled={converting}
              >
                {converting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Konvertiert...</span>
                  </div>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Für Eturnity konvertieren
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Unterstützte Dateien: .glb (bis zu 100MB)
        {selectedFile && (
          <div className="mt-1">
            Datei wird rotiert und als Download bereitgestellt
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
