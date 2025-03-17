
import React from 'react';
import FileUpload from '@/components/FileUpload';
import { Smartphone, Box, Layers, MoveHorizontal, Zap, Shield } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 px-4 py-8 md:py-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            3D-Viewer
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-4 mb-4">
            3D-Modelle einfach visualisieren
          </h1>
          
          <p className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Laden Sie Ihre GLB-Dateien hoch und visualisieren Sie sie in einer interaktiven 3D-Umgebung. 
            Perfekt für Designer, Architekten und 3D-Künstler.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Left side - Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="glass-panel p-5 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <MoveHorizontal className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Interaktive Darstellung</h3>
              <p className="text-sm text-muted-foreground">
                Drehen, zoomen und bewegen Sie Ihre 3D-Modelle, um sie aus jedem Blickwinkel zu betrachten.
              </p>
            </div>
            
            <div className="glass-panel p-5 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Box className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">GLB-Format</h3>
              <p className="text-sm text-muted-foreground">
                Unterstützung für das gängige GLB-Format, das von den meisten 3D-Programmen exportiert werden kann.
              </p>
            </div>
            
            <div className="glass-panel p-5 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Responsives Design</h3>
              <p className="text-sm text-muted-foreground">
                Funktioniert auf allen Geräten - vom Desktop bis zum Smartphone, mit angepassten Steuerungen.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Präzise Messungen</h3>
              <p className="text-sm text-muted-foreground">
                Messen Sie Abstände, Flächen und Winkel mit professionellen Werkzeugen direkt im 3D-Raum.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Schnelle Verarbeitung</h3>
              <p className="text-sm text-muted-foreground">
                Optimierte Performance für schnelle Ladezeiten und flüssige Darstellung auch komplexer 3D-Modelle.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Datensicherheit</h3>
              <p className="text-sm text-muted-foreground">
                Ihre 3D-Modelle werden lokal im Browser verarbeitet und nicht auf externe Server hochgeladen.
              </p>
            </div>
          </div>

          {/* Right side - File Upload */}
          <div className="glass-panel p-6 md:p-8 rounded-lg flex flex-col justify-center items-center">
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-center">Modell hochladen</h2>
              <FileUpload />
            </div>
          </div>
        </div>
      </div>
      
      <footer className="w-full text-center text-sm text-muted-foreground mt-12">
        <p>© {new Date().getFullYear()} 3D-Viewer | Alle Rechte vorbehalten</p>
        <p className="text-xs mt-1">Unterstützt GLB-Dateien bis zu 100MB</p>
      </footer>
    </div>
  );
};

export default Index;
