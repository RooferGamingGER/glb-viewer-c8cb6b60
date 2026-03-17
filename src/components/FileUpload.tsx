
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { smartToast } from '@/utils/smartToast';
import { devError } from '@/utils/consoleCleanup';
import { Upload, File, AlertTriangle, Download } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { rotateGLBDirect } from '@/utils/glbDirectManipulation';
import { storeOriginalFile } from '@/hooks/useOriginalFileStorage';
import { useGLTF } from '@react-three/drei';

// Model size cache for progressive loader estimation
const modelSizeCache = new Map<string, number>();
export const getModelSize = (url: string) => modelSizeCache.get(url);
export const setModelSize = (url: string, size: number) => modelSizeCache.set(url, size);

const FileUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const rotateModel = true;
  const [preloadedUrl, setPreloadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Cleanup preloaded URL on unmount
  useEffect(() => {
    return () => {
      if (preloadedUrl) {
        URL.revokeObjectURL(preloadedUrl);
      }
    };
  }, [preloadedUrl]);

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

    // Basic extension and size checks
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

    // MIME type hint check (may be empty in some browsers)
    const allowedTypes = ['model/gltf-binary', 'application/octet-stream', 'application/glb'];
    if (file.type && !allowedTypes.includes(file.type)) {
      // continue to magic check below; don't fail yet
    }

    // Magic number check: GLB starts with ASCII 'glTF'
    try {
      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const isGlbMagic = header[0] === 0x67 && header[1] === 0x6C && header[2] === 0x54 && header[3] === 0x46; // 'g''l''T''F'
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
      
      // Intelligent preload strategy: create blob URL and start preloading
      const blobUrl = URL.createObjectURL(file);
      setPreloadedUrl(blobUrl);
      
      // Store file size for progressive loader estimation
      setModelSize(blobUrl, file.size);
      
      // Store original file for robust loading
      try { 
        storeOriginalFile(blobUrl, file); 
      } catch {}
      
      // Start background preload (non-blocking)
      try {
        useGLTF.preload(blobUrl);
        console.log(`Preloading started for ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
      } catch {
        // Preload failure is non-critical
      }
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

  const handleUploadClick = useCallback(() => {
    if (!selectedFile) {
      smartToast.error('Bitte wählen Sie zuerst eine Datei aus.');
      return;
    }
    setUploading(true);
    
    // Use preloaded URL if available, otherwise create new one
    const fileUrl = preloadedUrl || URL.createObjectURL(selectedFile);
    
    // Store original file blob mapped to this blob URL for robust loading
    try { storeOriginalFile(fileUrl, selectedFile); } catch {}
    
    // Navigate immediately since preload already started
    setTimeout(() => {
      setUploading(false);
      navigate(`/viewer?fileUrl=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(selectedFile.name)}&rotateModel=${rotateModel ? 'true' : 'false'}`);
    }, 300); // Reduced delay since model is preloading
  }, [selectedFile, navigate, rotateModel, preloadedUrl]);

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
      
      // Direkte GLB-Manipulation: behält Draco-Komprimierung und Texturen
      await rotateGLBDirect(
        selectedFile, 
        fileName,
        (progress) => {
          // Optional: Progress-Anzeige könnte hier erweitert werden
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
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleSwitchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return <div className="w-full animate-fade-in">
      <div className={`file-drop-area glass-panel relative border-2 border-dashed border-border/50 p-6 rounded-lg 
                   ${isDragging ? 'bg-primary/5 border-primary/30' : ''} 
                   transition-all duration-300 cursor-pointer`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={clickFileInput}>
        
        <input type="file" ref={inputRef} className="hidden" accept=".glb" onChange={handleInputChange} />

        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Upload className={`w-14 h-14 text-primary/70 ${isDragging ? 'scale-110' : ''} transition-transform`} />
          </div>

          <h3 className="text-lg font-medium mb-2">
            {selectedFile ? selectedFile.name : 'GLB-Datei hier ablegen'}
          </h3>

          <p className="text-muted-foreground text-sm mb-4">
            {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'oder klicken Sie, um eine Datei auszuwählen'}
          </p>

          {fileError && <Alert variant="warning" className="mt-4 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>}

          <div className="flex flex-col items-center gap-2 mt-4" onClick={handleSwitchClick}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Switch checked={rotateModel} onCheckedChange={setRotateModel} id="rotate-switch" />
              <span className="text-sm">
                {rotateModel ? "Modell von Drohnenvermessung by RooferGaming®" : "Fremdanbieter"}
              </span>
            </label>
            <span className="text-xs text-muted-foreground">
              {rotateModel 
                ? "Für RooferGaming-Modelle ist die Eturnity-Konvertierung verfügbar."
                : "Für Fremdanbieter-Modelle ist keine Eturnity-Konvertierung verfügbar."
              }
            </span>
          </div>

          {selectedFile && <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
            <Button onClick={e => {
              e.stopPropagation();
              handleUploadClick();
            }} className="button-hover px-6 py-2" disabled={uploading || converting}>
              {uploading ? <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span>Wird geladen...</span>
                </div> : <>
                  <File className="mr-2 h-4 w-4" />
                  3D-Modell anzeigen
                </>}
            </Button>

            {/* Eturnity Button nur für RooferGaming-Uploads anzeigen */}
            {rotateModel && (
              <Button 
                onClick={handleEturnityConvert}
                variant="outline" 
                className="button-hover px-6 py-2" 
                disabled={uploading || converting}
              >
                {converting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Konvertiert...</span>
                  </div>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Für Eturnity konvertieren
                  </>
                )}
              </Button>
            )}
          </div>}
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Unterstützte Dateien: .glb (bis zu 100MB)
        {rotateModel && selectedFile && (
          <div className="mt-1">
            Für Eturnity: Datei wird rotiert und als Download bereitgestellt
          </div>
        )}
      </div>
    </div>;
};

export default FileUpload;
