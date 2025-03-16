
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Upload, File } from 'lucide-react';

const FileUpload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
    // Check if the file is a GLB file
    if (!file.name.toLowerCase().endsWith('.glb')) {
      toast.error('Bitte laden Sie eine gültige GLB-Datei hoch.');
      return false;
    }
    
    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      toast.error('Die Datei ist zu groß. Maximale Größe ist 50MB.');
      return false;
    }
    
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      toast.success('Datei ausgewählt: ' + file.name);
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

  const handleUploadClick = useCallback(() => {
    if (!selectedFile) {
      toast.error('Bitte wählen Sie zuerst eine Datei aus.');
      return;
    }

    setUploading(true);

    // Create a URL for the local file
    const fileUrl = URL.createObjectURL(selectedFile);
    
    // In a real app, you might want to upload the file to a server here
    // and then get a URL back. For now, we'll just use the local URL.
    
    // Simulate upload delay
    setTimeout(() => {
      setUploading(false);
      // Redirect to the viewer page with the file URL as a parameter
      navigate(`/viewer?fileUrl=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(selectedFile.name)}`);
    }, 1000);
  }, [selectedFile, navigate]);

  const clickFileInput = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in">
      <div
        className={`file-drop-area glass-panel ${isDragging ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={clickFileInput}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept=".glb"
          onChange={handleInputChange}
        />
        
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Upload className="w-16 h-16 text-muted-foreground animate-float" />
          </div>
          
          <h3 className="text-lg font-medium mb-2">
            {selectedFile ? selectedFile.name : 'GLB-Datei hier ablegen'}
          </h3>
          
          <p className="text-muted-foreground text-sm mb-4">
            {selectedFile 
              ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` 
              : 'oder klicken Sie, um eine Datei auszuwählen'}
          </p>
          
          {selectedFile && (
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadClick();
                }}
                className="button-hover"
                disabled={uploading}
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Wird geladen...</span>
                  </div>
                ) : (
                  <>
                    <File className="mr-2 h-4 w-4" />
                    3D-Modell anzeigen
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Unterstützte Dateien: .glb (bis zu 50MB)
      </div>
    </div>
  );
};

export default FileUpload;
