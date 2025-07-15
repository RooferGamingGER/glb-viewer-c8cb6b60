
import React from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import EturnityExportSection from '@/components/EturnityExportSection';
import { Smartphone, Box, Layers, MoveHorizontal, Zap, Shield, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  
  const handleDemoClick = () => {
    // Navigate directly to the test page without opening file dialog
    navigate('/test');
  };
  
  return <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-secondary/40 px-4 py-4 overflow-hidden">
      <div className="flex-grow max-w-7xl mx-auto flex flex-col justify-between w-full">
        <div className="text-center mb-2">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium animate-fade-in">
            DrohnenGLB by RooferGaming® - ein kostenloser Service von Drohnenvermessung by RooferGaming®
          </div>
          
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mt-2 mb-2 animate-slide-up">
            3D-Modelle einfach visualisieren
          </h1>
          
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto animate-fade-in hidden md:block">
            Laden Sie Ihre 3D-Modelle im GLB-Format hoch und erleben Sie diese in einer interaktiven 3D-Umgebung. 
            Erstellen Sie präzise Messungen für Längen, Höhen und Flächen, und generieren Sie professionelle Messberichte mit einem Klick.
          </p>
          
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl mx-auto hidden md:block">
            Hinweis: Bei Fragen oder Verbesserungsvorschlägen kontaktieren Sie uns gerne unter:
            <br /> 
            <a href="mailto:info@drohnenvermessung-roofergaming.de" className="text-primary hover:underline">
              info@drohnenvermessung-roofergaming.de
            </a>
         </p>
          
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDemoClick} 
              className="animate-fade-in"
            >
              Demo-Modell ansehen
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-grow flex flex-col md:hidden overflow-hidden">
          <div className="glass-panel p-4 rounded-lg flex flex-col justify-center items-center backdrop-blur-sm shadow-lg border border-white/10 mb-3">
            <div className="w-full mx-auto">
              <h2 className="text-lg font-bold mb-3 text-center">Modell hochladen</h2>
              <FileUpload />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2 overflow-hidden">
            <p className="text-xs text-muted-foreground mt-1 mb-1 text-center">
              Hinweis: Bei Fragen kontaktieren Sie uns unter{" "}
              <a href="mailto:info@drohnenvermessung-roofergaming.de" className="text-primary hover:underline">
                info@drohnenvermessung-roofergaming.de
              </a>
            </p>
            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <MoveHorizontal className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Interaktive Darstellung</h3>
              <p className="text-xs text-muted-foreground">
                Drehen, zoomen und bewegen Sie Ihre 3D-Modelle.
              </p>
            </div>
            
            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Präzise Messungen</h3>
              <p className="text-xs text-muted-foreground">
                Messen Sie Abstände, Flächen und Winkel direkt im 3D-Raum.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 flex-grow overflow-hidden">
          {/* Swapped the order: Upload panel first (left side), features grid second (right side) */}
          <div className="glass-panel p-5 md:p-6 rounded-lg flex flex-col justify-center items-center backdrop-blur-sm shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300 order-1 lg:order-1">
            <div className="w-full max-w-md mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-5 text-center">Modell hochladen</h2>
                <FileUpload />
              </div>
              
              <div>
                <h2 className="text-xl font-bold mb-5 text-center">Export für Eturnity</h2>
                <EturnityExportSection />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 auto-rows-min overflow-auto pb-2 order-2 lg:order-2">
            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <MoveHorizontal className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Interaktive Darstellung</h3>
              <p className="text-sm text-muted-foreground">
                Drehen, zoomen und bewegen Sie Ihre 3D-Modelle, um sie aus jedem Blickwinkel zu betrachten.
              </p>
            </div>
            
            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Box className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">GLB-Format</h3>
              <p className="text-sm text-muted-foreground">Unterstützung für das gängige GLB-Format, das direkt vom Server als Textured Modell (glTF) zur Verfügung gestellt wird.</p>
            </div>
            
            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Responsives Design</h3>
              <p className="text-sm text-muted-foreground">
                Funktioniert auf allen Geräten - vom Desktop bis zum Smartphone, mit angepassten Steuerungen.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Präzise Messungen</h3>
              <p className="text-sm text-muted-foreground">Messen Sie Abstände, Flächen und Neigungen mit professionellen Werkzeugen direkt im 3D-Raum.</p>
            </div>

            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Schnelle Verarbeitung</h3>
              <p className="text-sm text-muted-foreground">
                Optimierte Performance für schnelle Ladezeiten und flüssige Darstellung auch komplexer 3D-Modelle.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Datensicherheit</h3>
              <p className="text-sm text-muted-foreground">
                Ihre 3D-Modelle werden lokal im Browser verarbeitet und nicht auf externe Server hochgeladen.
              </p>
            </div>
          </div>
        </div>
        
        <footer className="w-full text-center text-xs text-muted-foreground mt-2 mb-0">
          <p>© {new Date().getFullYear()} DrohnenGLB by RooferGaming® | Alle Rechte vorbehalten</p>
          <p className="text-xs mt-1 hidden md:block">Unterstützt GLB-Dateien bis zu 100MB</p>
        </footer>
      </div>
    </div>;
};

export default Index;
