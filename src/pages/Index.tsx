import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import ModelViewer from '@/components/ModelViewer';
import { 
  Smartphone, Box, Layers, MoveHorizontal, Zap, Shield, 
  Upload, Eye, AlertTriangle, Loader2, Save, LucideIcon 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';

// --- Constants & Data ---
const DEMO_MODEL_URL = '/models/test-model.glb';

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: FeatureItem[] = [
  { icon: MoveHorizontal, title: "Interaktive Darstellung", desc: "Drehen, zoomen und bewegen Sie Ihre 3D-Modelle, um sie aus jedem Blickwinkel zu betrachten." },
  { icon: Layers, title: "Präzise Messungen", desc: "Messen Sie Abstände, Flächen und Neigungen direkt im 3D-Raum." },
  { icon: Save, title: "Messungen speichern & exportieren", desc: "Speichern Sie Messungen lokal und exportieren Sie sie mit dem GLB. Später jederzeit wieder einlesen." },
  { icon: Smartphone, title: "Hochformat-Unterstützung", desc: "Komplett optimiert für den Hochkantmodus auf Mobilgeräten." },
  { icon: Box, title: "GLB-Format", desc: "Unterstützung für das gängige GLB-Format (glTF) direkt vom Server." },
  { icon: Smartphone, title: "Responsives Design", desc: "Funktioniert auf allen Geräten - vom Desktop bis zum Smartphone." },
  { icon: Zap, title: "Schnelle Verarbeitung", desc: "Optimierte Performance für flüssige Darstellung auch komplexer Modelle." },
  { icon: Shield, title: "Datensicherheit", desc: "Ihre 3D-Modelle werden lokal im Browser verarbeitet, kein Upload auf Fremdserver." },
];

// --- Custom Hooks ---
const useSeoMetadata = () => {
  useEffect(() => {
    document.title = "GLB Viewer – Messungen speichern & exportieren";
    const descContent = "GLB-Modelle messen, speichern, exportieren und wieder einlesen – jetzt auch im Hochformat. Drohnenvermessung by RooferGaming für präzise Dachaufmaße.";
    
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = descContent;

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = window.location.origin + '/';
  }, []);
};

// --- Sub-Components ---

const DemoFallback = ({ loading }: { loading?: boolean }) => (
  <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg min-h-[12rem]">
    {loading ? (
      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
    ) : (
      <>
        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">Demo nicht verfügbar</p>
      </>
    )}
  </div>
);

const FeatureCard = ({ item }: { item: FeatureItem }) => (
  <div className="glass-panel p-3 md:p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90 border border-white/5">
    <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2 md:mb-3">
      <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
    </div>
    <h3 className="text-sm md:text-base font-medium mb-1">{item.title}</h3>
    <p className="text-xs md:text-sm text-muted-foreground">{item.desc}</p>
  </div>
);

const HeaderSection = () => (
  <div className="text-center mb-4 md:mb-6">
    <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium animate-fade-in mb-2">
      DrohnenGLB by RooferGaming®
    </div>
    
    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-3 animate-slide-up">
      3D-Modelle einfach visualisieren
    </h1>
    
    <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto animate-fade-in mb-4">
      Laden Sie Ihre 3D-Modelle im GLB-Format hoch, erstellen Sie präzise Messungen und generieren Sie professionelle Berichte.
    </p>

    <div className="hidden md:flex glass-panel p-4 rounded-lg items-center justify-between gap-3 border border-white/10 max-w-3xl mx-auto">
      <div className="text-left">
        <p className="text-sm font-medium">Drohnenvermessung by RooferGaming®</p>
        <p className="text-xs text-muted-foreground">Präzise Dachaufmaße mit Drohne – schnell, zuverlässig.</p>
      </div>
      <Button asChild variant="secondary" size="sm">
        <a href="https://drohnenvermessung-roofergaming.de" target="_blank" rel="noopener noreferrer">
          Zur Website
        </a>
      </Button>
    </div>
    
    <div className="mt-4 text-xs text-muted-foreground animate-fade-in space-y-1">
       <p>Neu 07.02.2026: Export für Flachdächer nach ABS-Plan & Mobile Optimierung.</p>
    </div>
  </div>
);

// --- Main Component ---

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [demoAvailable, setDemoAvailable] = useState<boolean | null>(null);

  useSeoMetadata();

  useEffect(() => {
    fetch(DEMO_MODEL_URL, { method: 'HEAD' })
      .then(res => setDemoAvailable(res.ok))
      .catch(() => setDemoAvailable(false));
  }, []);

  const handleStartClick = () => navigate('/viewer');

  const DemoSection = () => (
    <div className="glass-panel p-4 md:p-6 rounded-lg backdrop-blur-sm shadow-lg border border-white/10 mb-4 h-full">
      <h3 className="text-sm md:text-lg font-medium mb-3 text-center">Demo-Modell Vorschau</h3>
      <div className="relative w-full h-48 md:h-80 rounded-md overflow-hidden bg-secondary/20">
        {demoAvailable === true ? (
          <ModelViewer fileUrl={DEMO_MODEL_URL} fileName="Demo Modell" rotateModel={true} showTools={false} />
        ) : (
          <DemoFallback loading={demoAvailable === null} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button onClick={() => navigate('/test')} variant="outline" size={isMobile ? "sm" : "default"}>
          <Eye className="mr-2 h-4 w-4" />
          Demo ansehen
        </Button>
        {isMobile && (
          <Button onClick={handleStartClick} size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Eigenes Modell
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-br from-background via-background to-secondary/40 px-4 py-4 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex-grow max-w-7xl mx-auto flex flex-col w-full gap-4">
        
        {/* Header */}
        <HeaderSection />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Desktop) / Top (Mobile): Upload & Demo */}
          <div className="lg:col-span-4 flex flex-col gap-4 order-1">
            <div className="glass-panel p-4 md:p-6 rounded-lg backdrop-blur-sm shadow-lg border border-white/10">
              <h2 className="text-base md:text-lg font-medium mb-3 text-center">Modell hochladen</h2>
              <FileUpload />
              <Button onClick={handleStartClick} className="w-full mt-4" size={isMobile ? "sm" : "default"}>
                <Upload className="mr-2 h-4 w-4" />
                Viewer öffnen
              </Button>
            </div>
            <DemoSection />
          </div>

          {/* Right Column (Desktop) / Bottom (Mobile): Features */}
          <div className="lg:col-span-8 order-2">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {FEATURES.map((item, i) => (
                <FeatureCard key={i} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-muted-foreground mt-4">
        <p>© {new Date().getFullYear()} DrohnenGLB by RooferGaming®</p>
      </footer>
    </div>
  );
};

export default Index;