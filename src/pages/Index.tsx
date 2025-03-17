
import React from 'react';
import FileUpload from '@/components/FileUpload';
import { Smartphone, Box, Layers, MoveHorizontal, Zap, Shield } from 'lucide-react';

const Index = () => {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-secondary/40 px-4 py-6">
      <div className="flex-grow max-w-7xl mx-auto flex flex-col justify-between">
        <div className="text-center mb-4">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium animate-fade-in">
            DrohnenGLB by RooferGaming®
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-3 mb-3 animate-slide-up">
            3D-Modelle einfach visualisieren
          </h1>
          
          <p className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Laden Sie Ihre GLB-Dateien vom Server und fügen diese hier ein, zum und visualisieren in einer interaktiven 3D-Umgebung, 
            wo Sie Messungen und Messbericht erstellen können.
          </p>
          
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
            Hinweis: Es handelt sich aktuell um eine Testversion, so dass Bugs oder Fehler an 
            info@drohnenvermessung-roofergaming.de gesendet werden sollen.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 flex-grow overflow-hidden">
          {/* Left side - Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 auto-rows-min overflow-auto pb-2">
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
              <p className="text-sm text-muted-foreground">
                Unterstützung für das gängige GLB-Format, das von den meisten 3D-Programmen exportiert werden kann.
              </p>
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
              <p className="text-sm text-muted-foreground">
                Messen Sie Abstände, Flächen und Winkel mit professionellen Werkzeugen direkt im 3D-Raum.
              </p>
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

          {/* Right side - File Upload */}
          <div className="glass-panel p-5 md:p-6 rounded-lg flex flex-col justify-center items-center backdrop-blur-sm shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300">
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-xl font-bold mb-5 text-center">Modell hochladen</h2>
              <FileUpload />
            </div>
          </div>
        </div>
        
        <footer className="w-full text-center text-sm text-muted-foreground mt-4 mb-0">
          <p>© {new Date().getFullYear()} DrohnenGLB by RooferGaming® | Alle Rechte vorbehalten</p>
          <p className="text-xs mt-1">Unterstützt GLB-Dateien bis zu 100MB</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
