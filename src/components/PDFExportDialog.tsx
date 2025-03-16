
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, X, Camera, Building, Plus, Trash, Image, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Measurement } from '@/hooks/useMeasurements';
import { exportMeasurementsToPDF } from '@/utils/pdfExport';
import { StoredScreenshot, getLatestScreenshot, getAllScreenshots, removeScreenshot } from '@/utils/screenshot';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import MeasurementTable from './measurement/MeasurementTable';

interface PDFExportDialogProps {
  onTakeScreenshot: () => Promise<StoredScreenshot>;
  measurements: Measurement[];
}

const PDFExportDialog: React.FC<PDFExportDialogProps> = ({ 
  onTakeScreenshot,
  measurements 
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('3D Modell Messungen');
  const [fileName, setFileName] = useState('messungen.pdf');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<StoredScreenshot | null>(null);
  const [selectedScreenshots, setSelectedScreenshots] = useState<StoredScreenshot[]>([]);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  
  // Company information
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  
  // Project details
  const [projectName, setProjectName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [location, setLocation] = useState('');
  const [userName, setUserName] = useState('');

  // Load all existing screenshots when dialog opens
  useEffect(() => {
    if (open) {
      const existingScreenshots = getAllScreenshots();
      if (existingScreenshots.length > 0 && selectedScreenshots.length === 0) {
        // Pre-select the latest screenshot if none are selected
        setSelectedScreenshots([existingScreenshots[0]]);
      }
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset current preview screenshot when dialog closes
      setCurrentScreenshot(null);
      setScreenshotError(null);
    }
  };

  const handleExport = async () => {
    try {
      // Check if we need a screenshot but don't have any selected
      if (includeScreenshot && selectedScreenshots.length === 0) {
        toast.error('Keine Screenshots ausgewählt. Bitte erstellen Sie mindestens einen Screenshot oder deaktivieren Sie die Option.');
        return;
      }
      
      setLoading(true);
      
      // Generate and download the PDF with enhanced options
      await exportMeasurementsToPDF({
        title,
        screenshots: selectedScreenshots,
        measurements,
        filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
        includeScreenshot,
        companyName: companyName || undefined,
        companyLogo: companyLogo || undefined,
        projectDetails: {
          projectName: projectName || undefined,
          projectNumber: projectNumber || undefined,
          location: location || undefined,
          date: new Date().toLocaleDateString('de-DE'),
          userName: userName || undefined
        }
      });
      
      toast.success('PDF erfolgreich exportiert');
      setOpen(false);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Fehler beim PDF-Export');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurrentScreenshot = async () => {
    setScreenshotError(null);
    
    try {
      setLoading(true);
      
      // Take a new screenshot and store it
      const newScreenshot = await onTakeScreenshot();
      
      // Add to selected screenshots
      setSelectedScreenshots(prev => [...prev, newScreenshot]);
      
      // Set as current preview
      setCurrentScreenshot(newScreenshot);
      
      toast.success('Screenshot für PDF hinzugefügt');
    } catch (error) {
      console.error('Failed to add screenshot:', error);
      setScreenshotError('Fehler beim Erstellen des Screenshots. Bitte stellen Sie sicher, dass die 3D-Ansicht korrekt geladen ist.');
      toast.error('Fehler beim Hinzufügen des Screenshots');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScreenshot = (screenshot: StoredScreenshot) => {
    // Toggle selection
    if (selectedScreenshots.some(s => s.id === screenshot.id)) {
      setSelectedScreenshots(selectedScreenshots.filter(s => s.id !== screenshot.id));
    } else {
      setSelectedScreenshots([...selectedScreenshots, screenshot]);
    }
    
    // Update preview
    setCurrentScreenshot(screenshot);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Prepare tooltip message
  const buttonTooltip = "Als PDF exportieren";

  const handleButtonClick = () => {
    setOpen(true);
  };

  const removeSelectedScreenshot = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedScreenshots(prev => prev.filter(s => s.id !== id));
    removeScreenshot(id);
    
    // If this was the currently previewed screenshot, clear the preview
    if (currentScreenshot?.id === id) {
      setCurrentScreenshot(null);
    }
    
    toast.success('Screenshot entfernt');
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="glass-button"
        onClick={handleButtonClick}
        title={buttonTooltip}
      >
        <FileText size={16} />
        <span className="sr-only">Als PDF exportieren</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>PDF-Export</DialogTitle>
            <DialogDescription>
              Exportieren Sie Ihre Messungen als PDF-Dokument.
            </DialogDescription>
            <DialogClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </DialogClose>
          </DialogHeader>

          {!measurements.length && (
            <Alert variant="warning" className="mb-4">
              <AlertDescription>
                Keine Messungen vorhanden. Das PDF wird ohne Messdaten erstellt.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Allgemein</TabsTrigger>
              <TabsTrigger value="company">Unternehmen</TabsTrigger>
              <TabsTrigger value="preview">Vorschau</TabsTrigger>
              <TabsTrigger value="screenshots">Screenshots ({selectedScreenshots.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titel des PDF-Dokuments"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="fileName">Dateiname</Label>
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="messungen.pdf"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="includeScreenshot" 
                  checked={includeScreenshot}
                  onCheckedChange={(checked) => {
                    setIncludeScreenshot(checked === true);
                  }}
                />
                <Label htmlFor="includeScreenshot" className="cursor-pointer">
                  Screenshots einbinden
                </Label>
              </div>
              
              {/* Project Details */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3">Projektdetails</h3>
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="projectName">Projektname</Label>
                      <Input
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Name des Projekts"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="projectNumber">Projektnummer</Label>
                      <Input
                        id="projectNumber"
                        value={projectNumber}
                        onChange={(e) => setProjectNumber(e.target.value)}
                        placeholder="Projektnummer"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="location">Standort</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Ort der Messung"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="userName">Erstellt von</Label>
                      <Input
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Ihr Name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="company" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <h3 className="text-sm font-semibold">Unternehmensdetails</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Unternehmensname</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Name des Unternehmens"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="companyLogo">Unternehmenslogo</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="companyLogo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="flex-1"
                    />
                    {companyLogo && (
                      <div className="h-10 w-20 flex items-center">
                        <img 
                          src={companyLogo} 
                          alt="Logo Vorschau" 
                          className="max-h-full max-w-full object-contain" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4 pt-4">
              <h3 className="text-sm font-semibold mb-3">Messungen Vorschau</h3>
              
              <div className="border rounded-md p-4 max-h-[400px] overflow-y-auto">
                {measurements.length > 0 ? (
                  <MeasurementTable measurements={measurements} showTableHeaders={true} />
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    Keine Messungen vorhanden
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="screenshots" className="space-y-4 pt-4">
              <div className="flex justify-between mb-2">
                <Label>Screenshot-Verwaltung</Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddCurrentScreenshot}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Screenshot hinzufügen
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Current preview */}
                <div className="border border-border rounded-md overflow-hidden bg-muted/20">
                  {currentScreenshot ? (
                    <div className="relative">
                      <img 
                        src={currentScreenshot.url} 
                        alt="Vorschau" 
                        className="max-h-[200px] w-full object-contain"
                      />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => removeSelectedScreenshot(currentScreenshot.id, e)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : screenshotError ? (
                    <div className="flex flex-col items-center justify-center h-[150px] text-destructive px-4">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p className="text-sm text-center">{screenshotError}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                      <Camera className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">
                        {loading ? 'Screenshot wird erstellt...' : 'Klicken Sie auf "Screenshot hinzufügen", um einen Screenshot zu generieren'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Screenshot gallery */}
                <div>
                  <Label className="mb-2 block">Ausgewählte Screenshots ({selectedScreenshots.length})</Label>
                  <ScrollArea className="h-[180px] border border-border rounded-md p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {getAllScreenshots().map(screenshot => (
                        <div 
                          key={screenshot.id}
                          className={`relative border rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${
                            selectedScreenshots.some(s => s.id === screenshot.id) 
                              ? 'border-primary' 
                              : 'border-border'
                          }`}
                          onClick={() => handleSelectScreenshot(screenshot)}
                        >
                          <img 
                            src={screenshot.url} 
                            alt="Screenshot" 
                            className="h-24 w-full object-cover"
                          />
                          
                          {selectedScreenshots.some(s => s.id === screenshot.id) && (
                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-6 w-6 p-0 absolute bottom-1 right-1"
                            onClick={(e) => removeSelectedScreenshot(screenshot.id, e)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      
                      {getAllScreenshots().length === 0 && (
                        <div className="col-span-3 flex flex-col items-center justify-center h-32 text-muted-foreground">
                          <Image className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-sm">
                            Keine Screenshots vorhanden
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button 
              onClick={handleExport}
              disabled={loading || !title || !fileName || (includeScreenshot && selectedScreenshots.length === 0)}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Exportiere...' : 'PDF exportieren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PDFExportDialog;
