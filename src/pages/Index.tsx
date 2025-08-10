
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import ModelViewer from '@/components/ModelViewer';
import { Smartphone, Box, Layers, MoveHorizontal, Zap, Shield, ArrowRight, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';


const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const handleDemoClick = () => {
    const url = `/viewer?fileUrl=${encodeURIComponent('/models/test-model.glb')}&fileName=${encodeURIComponent('Demo Modell')}&rotateModel=true`;
    navigate(url);
  };
  
  useEffect(() => {
    document.title = "GLB Viewer – Messungen speichern & exportieren";
    const desc = "GLB-Modelle messen, speichern, exportieren und wieder einlesen – jetzt auch im Hochformat. Drohnenvermessung by RooferGaming für präzise Dachaufmaße.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = desc;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = window.location.origin + '/';
  }, []);
  
  return <div className="min-h-svh flex flex-col bg-gradient-to-br from-background via-background to-secondary/40 px-4 py-4 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex-grow max-w-7xl mx-auto flex flex-col w-full gap-3">
        <div className="text-center mb-2">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium animate-fade-in">
            DrohnenGLB by RooferGaming® - ein kostenloser Service von <a href="https://drohnenvermessung-roofergaming.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" aria-label="Drohnenvermessung by RooferGaming in neuem Tab öffnen" title="Drohnenvermessung by RooferGaming">Drohnenvermessung by RooferGaming®</a>
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
          <div className="mt-2 text-xs text-muted-foreground animate-fade-in">
            Neu: Messungen speichern, exportieren & wieder einlesen – Hochformat vollständig unterstützt.
          </div>
        <div className="glass-panel p-4 md:p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-white/10">
          <div>
            <p className="text-sm md:text-base font-medium">Drohnenvermessung by RooferGaming®</p>
            <p className="text-xs md:text-sm text-muted-foreground">Präzise Dachaufmaße mit Drohne – schnell, zuverlässig und professionell.</p>
          </div>
          <Button asChild>
            <a
              href="https://drohnenvermessung-roofergaming.de"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Drohnenvermessung by RooferGaming in neuem Tab öffnen"
              title="Drohnenvermessung by RooferGaming"
            >
              Jetzt Drohnenvermessung ansehen
            </a>
          </Button>
        </div>

        </div>

        <div className="flex-grow flex flex-col md:hidden">
          <div className="glass-panel p-4 rounded-lg flex flex-col justify-center items-center backdrop-blur-sm shadow-lg border border-white/10 mb-3">
            <div className="w-full mx-auto">
              <h2 className="text-lg font-bold mb-3 text-center">Modell hochladen</h2>
              <FileUpload />
            </div>
          </div>
          
{isMobile && (
  <div className="glass-panel p-3 rounded-lg backdrop-blur-sm shadow-lg border border-white/10 mb-3">
    <h2 className="text-base font-semibold mb-2 text-center">Demo-Modell</h2>
    <div className="relative w-full h-80 rounded-md overflow-hidden">
      <SidebarProvider defaultOpen={false} open={false}>
        <ModelViewer key="/models/test-model.glb" fileUrl="/models/test-model.glb" fileName="test-model.glb" rotateModel={true} showTools={true} />
      </SidebarProvider>
    </div>
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      <Button onClick={handleDemoClick} aria-label="Demo-Modell ansehen">
        Demo-Modell ansehen
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      <Button asChild variant="secondary" aria-label="Vermessungsbericht (PDF) anzeigen">
        <a href="/reports/demo-vermessungsbericht.pdf" target="_blank" rel="noopener noreferrer">Vermessungsbericht (PDF)</a>
      </Button>
    </div>
    <p className="text-xs text-muted-foreground text-center mt-2">
      Nicht nur Darstellung: Dachdecker und Solarteure vermessen Ihre Dächer und exportieren Zeichnungen (z. B. PDF/Plan).
    </p>
  </div>
)}
          
          <div className="grid grid-cols-1 gap-2">
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
                Drehen, zoomen und bewegen Sie Ihre 3D-Modelle, um sie aus jedem Blickwinkel zu betrachten.
              </p>
            </div>
            
            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Präzise Messungen</h3>
              <p className="text-xs text-muted-foreground">
                Messen Sie Abstände, Flächen und Neigungen direkt im 3D-Raum.
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Save className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Messungen speichern & exportieren</h3>
              <p className="text-xs text-muted-foreground">
                Speichern Sie Messungen lokal und exportieren Sie sie mit dem GLB. Später jederzeit wieder einlesen.
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Hochformat-Unterstützung</h3>
              <p className="text-xs text-muted-foreground">
                Komplett optimiert für den Hochkantmodus auf Mobilgeräten.
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Box className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">GLB-Format</h3>
              <p className="text-xs text-muted-foreground">
                Unterstützung für das gängige GLB-Format, das direkt vom Server als Textured Modell (glTF) zur Verfügung gestellt wird.
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Responsives Design</h3>
              <p className="text-xs text-muted-foreground">
                Funktioniert auf allen Geräten - vom Desktop bis zum Smartphone, mit angepassten Steuerungen.
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Schnelle Verarbeitung</h3>
              <p className="text-xs text-muted-foreground">
                Optimierte Performance für schnelle Ladezeiten und flüssige Darstellung auch komplexer 3D-Modelle.
              </p>
            </div>

            <div className="glass-panel p-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Datensicherheit</h3>
              <p className="text-xs text-muted-foreground">
                Ihre 3D-Modelle werden lokal im Browser verarbeitet und nicht auf externe Server hochgeladen.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 flex-grow">
          {/* Swapped the order: Upload panel first (left side), features grid second (right side) */}
          <div className="glass-panel p-5 md:p-6 rounded-lg flex flex-col justify-center items-center backdrop-blur-sm shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300 order-1 lg:order-1">
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-xl font-bold mb-5 text-center">Modell hochladen</h2>
              <FileUpload />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 auto-rows-min pb-2 lg:col-span-2 lg:row-start-2">
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

            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Save className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Messungen speichern & exportieren</h3>
              <p className="text-sm text-muted-foreground">
                Speichern Sie Messungen lokal und exportieren Sie sie mit dem GLB – später jederzeit wieder einlesen.
              </p>
            </div>

            <div className="glass-panel p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Hochformat-Unterstützung</h3>
              <p className="text-sm text-muted-foreground">
                Vollständig optimierte Bedienung und Layout für den Hochkantmodus.
              </p>
            </div>
          </div>

{/* Demo model viewer (desktop) */}
{!isMobile && (
  <div className="glass-panel p-5 md:p-6 rounded-lg backdrop-blur-sm shadow-lg border border-white/10 hover:shadow-xl transition-all duration-300">
    <h2 className="text-xl font-bold mb-3 text-center">Demo-Modell</h2>
    <div className="relative w-full h-96 rounded-md overflow-hidden">
      <SidebarProvider defaultOpen={true} open={true}>
        <ModelViewer key="/models/test-model.glb" fileUrl="/models/test-model.glb" fileName="test-model.glb" rotateModel={true} showTools={true} />
      </SidebarProvider>
    </div>
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <Button onClick={handleDemoClick} aria-label="Demo-Modell ansehen">
        Demo-Modell ansehen
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      <Button asChild variant="secondary" aria-label="Vermessungsbericht (PDF) anzeigen">
        <a href="/reports/demo-vermessungsbericht.pdf" target="_blank" rel="noopener noreferrer">Vermessungsbericht (PDF)</a>
      </Button>
    </div>
    <p className="text-sm text-muted-foreground text-center mt-2">
      Nicht nur Darstellung: Dachdecker und Solarteure vermessen Ihre Dächer und exportieren Zeichnungen (z. B. PDF/Plan).
    </p>
  </div>
)}
        </div>
        
        <footer className="w-full text-center text-xs text-muted-foreground mt-2 mb-0">
          <p>© {new Date().getFullYear()} DrohnenGLB by RooferGaming® | Alle Rechte vorbehalten</p>
          <p className="mt-1">
            Service: <a href="https://drohnenvermessung-roofergaming.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" aria-label="Drohnenvermessung by RooferGaming in neuem Tab öffnen" title="Drohnenvermessung by RooferGaming">Drohnenvermessung by RooferGaming®</a>
          </p>
          <p className="text-xs mt-1 hidden md:block">Unterstützt GLB-Dateien bis zu 100MB</p>
        </footer>
      </div>
    </div>;
};

export default Index;
