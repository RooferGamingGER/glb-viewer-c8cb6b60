
import React from 'react';
import FileUpload from '@/components/FileUpload';
import { Smartphone, Box, Layers, MoveHorizontal } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 px-4 py-12">
      <div className="max-w-4xl w-full mx-auto text-center mb-12 animate-slide-up">
        <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-4">
          3D-Viewer
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          3D-Modelle einfach visualisieren
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Laden Sie Ihre GLB-Dateien hoch und visualisieren Sie sie in einer interaktiven 3D-Umgebung. 
          Perfekt für Designer, Architekten und 3D-Künstler.
        </p>

        <div className="mb-12">
          <FileUpload />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
          <div className="glass-panel p-6 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MoveHorizontal className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Interaktive Darstellung</h3>
            <p className="text-sm text-muted-foreground">
              Drehen, zoomen und bewegen Sie Ihre 3D-Modelle, um sie aus jedem Blickwinkel zu betrachten.
            </p>
          </div>
          
          <div className="glass-panel p-6 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Box className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">GLB-Format</h3>
            <p className="text-sm text-muted-foreground">
              Unterstützung für das gängige GLB-Format, das von den meisten 3D-Programmen exportiert werden kann.
            </p>
          </div>
          
          <div className="glass-panel p-6 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Responsives Design</h3>
            <p className="text-sm text-muted-foreground">
              Funktioniert auf allen Geräten - vom Desktop bis zum Smartphone, mit angepassten Steuerungen.
            </p>
          </div>
        </div>
      </div>
      
      <footer className="w-full text-center text-sm text-muted-foreground mt-auto pt-8">
        <p>© {new Date().getFullYear()} 3D-Viewer | Alle Rechte vorbehalten</p>
        <p className="text-xs mt-1">Unterstützt GLB-Dateien bis zu 100MB</p>
      </footer>
    </div>
  );
};

export default Index;
