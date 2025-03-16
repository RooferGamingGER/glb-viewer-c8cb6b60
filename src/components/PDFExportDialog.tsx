
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, X, Camera, Building, Plus } from 'lucide-react';
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
import { StoredScreenshot, getLatestScreenshot, getAllScreenshots } from '@/utils/screenshot';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  
  // Company information
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  
  // Project details
  const [projectName, setProjectName] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [location, setLocation] = useState('');
  const [userName, setUserName] = useState('');

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset screenshot state when dialog closes
      setCurrentScreenshot(null);
    }
  };

  const handleExport = async () => {
    try {
      // Check if we need a screenshot but don't have one
      if (includeScreenshot && !currentScreenshot) {
        toast.error('Kein Screenshot ausgewählt. Bitte erstellen Sie einen Screenshot oder deaktivieren Sie die Option.');
        return;
      }
      
      setLoading(true);
      
      let screenshotUrl = '';
      
      // Only use a screenshot if it's to be included
      if (includeScreenshot && currentScreenshot) {
        screenshotUrl = currentScreenshot.url;
      }
      
      // Generate and download the PDF with enhanced options
      await exportMeasurementsToPDF({
        title,
        screenshotUrl,
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
      
      // We don't need to revoke URLs here as it's handled by the screenshot store
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Fehler beim PDF-Export');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurrentScreenshot = async () => {
    try {
      setLoading(true);
      
      // Take a new screenshot and store it
      const newScreenshot = await onTakeScreenshot();
      setCurrentScreenshot(newScreenshot);
      toast.success('Screenshot für PDF hinzugefügt');
    } catch (error) {
      console.error('Failed to add screenshot:', error);
      toast.error('Fehler beim Hinzufügen des Screenshots');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewScreenshot = async () => {
    try {
      setLoading(true);
      
      // Take a new screenshot and store it
      const newScreenshot = await onTakeScreenshot();
      setCurrentScreenshot(newScreenshot);
    } catch (error) {
      console.error('Failed to take screenshot preview:', error);
      toast.error('Fehler beim Erstellen der Vorschau');
    } finally {
      setLoading(false);
    }
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

  // Check if the button should be enabled - if there are either measurements or screenshots
  const hasMeasurements = measurements.length > 0;
  const hasScreenshots = getAllScreenshots().length > 0;
  const canExport = true; // Always allow export - can have empty reports or just screenshots

  // Prepare tooltip message
  const buttonTooltip = "Als PDF exportieren";

  const handleButtonClick = () => {
    setOpen(true);
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
        <DialogContent className="sm:max-w-[650px]">
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

          {!hasMeasurements && (
            <Alert variant="warning" className="mb-4">
              <AlertDescription>
                Keine Messungen vorhanden. Das PDF wird ohne Messdaten erstellt.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Allgemein</TabsTrigger>
              <TabsTrigger value="company">Unternehmen & Projekt</TabsTrigger>
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
                    // Reset screenshot if unchecked
                    if (checked === false) {
                      setCurrentScreenshot(null);
                    }
                  }}
                />
                <Label htmlFor="includeScreenshot" className="cursor-pointer">
                  Screenshot einbinden
                </Label>
              </div>

              {includeScreenshot && (
                <div className="mt-2">
                  <div className="flex justify-between mb-2">
                    <Label>Screenshot-Vorschau</Label>
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePreviewScreenshot}
                        disabled={loading}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Vorschau erstellen
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border border-border rounded-md overflow-hidden bg-muted/20">
                    {currentScreenshot ? (
                      <img 
                        src={currentScreenshot.url} 
                        alt="Vorschau" 
                        className="max-h-[200px] w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                        <Camera className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">
                          {loading ? 'Screenshot wird erstellt...' : 'Klicken Sie auf "Screenshot hinzufügen", um einen Screenshot zu generieren'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                
                <h3 className="text-sm font-semibold pt-2">Projektdetails</h3>
                
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
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button 
              onClick={handleExport}
              disabled={loading || !title || !fileName || (includeScreenshot && !currentScreenshot)}
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
