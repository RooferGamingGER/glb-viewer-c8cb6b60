import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUpload from "@/components/FileUpload";
import ModelViewer from "@/components/ModelViewer";
import {
  Smartphone,
  Box,
  Layers,
  MoveHorizontal,
  Zap,
  Shield,
  Eye,
  AlertTriangle,
  Loader2,
  Save,
  LucideIcon,
  ExternalLink,
  Newspaper,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

// --- Constants & Data ---
const DEMO_MODEL_URL = "/models/test-model.glb";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: MoveHorizontal,
    title: "Interaktive Darstellung",
    desc: "Drehen, zoomen und bewegen Sie Ihre 3D-Modelle aus jedem Blickwinkel.",
  },
  { icon: Layers, title: "Präzise Messungen", desc: "Abstände, Flächen und Neigungen direkt im 3D-Raum messen." },
  { icon: Save, title: "Speichern & Exportieren", desc: "Messungen lokal speichern und mit dem GLB exportieren." },
  { icon: Smartphone, title: "Mobile First", desc: "Komplett optimiert für Hochkant auf Mobilgeräten." },
  { icon: Box, title: "GLB-Format", desc: "Unterstützung für glTF/GLB direkt vom Server." },
  { icon: Smartphone, title: "Responsiv", desc: "Desktop, Tablet und Smartphone." },
  { icon: Zap, title: "Schnelle Performance", desc: "Optimiert für flüssige Darstellung komplexer Modelle." },
  { icon: Shield, title: "Datensicherheit", desc: "Lokale Verarbeitung im Browser, kein Fremdserver." },
];

interface ChangelogEntry {
  date: string;
  text: string;
  link?: { url: string; label: string };
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: "16.03.2026",
    text: "PV-Planung verbessert: Modulbelegung wird jetzt als Overlay auf der Dachfläche gespeichert – Fläche bleibt in Messliste und allen Exporten erhalten",
  },
  {
    date: "16.03.2026",
    text: "Schnelleres Laden vom Server: Messungen werden jetzt in einem Schritt geladen statt zwei – spürbar schnellerer Projektstart",
  },
  {
    date: "16.03.2026",
    text: "PV-Daten vollständig gespeichert: Alle PV-Einstellungen wie Neigung, Wartungswege und Reihenabstand werden beim Speichern komplett übernommen",
  },
  {
    date: "15.03.2026",
    text: "Kunden von Drohnenvermessung by RooferGaming® können nun Projekte & Tasks verwalten, Drohnenbilder einsehen und neue Verarbeitungsaufträge starten – alles ohne die App zu verlassen",
    link: { url: "https://drohnenvermessung-roofergaming.de/shop/Abonnement-c179036259/", label: "Jetzt Kunde werden" },
  },
  {
    date: "15.03.2026",
    text: "GLB-Modelle können jetzt direkt vom Server geladen und sofort vermessen werden – kein manueller Download mehr nötig",
  },
  {
    date: "15.03.2026",
    text: "PDF-Export optimiert: Dachplan bereinigt und korrigierte Leistungsberechnung für PV-Anlagen",
  },
  {
    date: "07.02.2026",
    text: "Export für Flachdächer nach ABS-Plan",
    link: { url: "https://apps.absturzsicherung.de", label: "ABS-Plan öffnen" },
  },
];

// --- Custom Hooks ---
const useSeoMetadata = () => {
  useEffect(() => {
    document.title = "GLB Viewer – Messungen speichern & exportieren";
    const descContent =
      "GLB-Modelle messen, speichern, exportieren und wieder einlesen – jetzt auch im Hochformat. Drohnenvermessung by RooferGaming für präzise Dachaufmaße.";

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = descContent;

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/";
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
  <div className="glass-panel p-3 md:p-4 rounded-lg hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-background/90 border border-border/10">
    <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2 md:mb-3">
      <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
    </div>
    <h3 className="text-sm md:text-base font-medium mb-1">{item.title}</h3>
    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
  </div>
);

const ChangelogSection = () => (
  <div className="glass-panel p-4 rounded-lg border border-border/10 animate-fade-in">
    <div className="flex items-center gap-2 mb-3">
      <Newspaper className="w-4 h-4 text-primary" />
      <h3 className="text-sm font-semibold">Neu</h3>
    </div>
    <ul className="space-y-2 max-h-32 overflow-y-auto pr-1">
      {CHANGELOG.map((entry, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70 whitespace-nowrap shrink-0">{entry.date}:</span>
          <span className="leading-relaxed">
            {entry.text}
            {entry.link && (
              <a
                href={entry.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 ml-1.5 text-primary hover:underline font-medium"
              >
                {entry.link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const HeaderSection = () => (
  <div className="text-center mb-2 md:mb-4">
    <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium animate-fade-in mb-2">
      DrohnenGLB by RooferGaming®
    </div>

    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-2 animate-slide-up">
      3D-Modelle einfach visualisieren
    </h1>

    <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto animate-fade-in">
      GLB-Modelle hochladen, präzise messen und professionelle Berichte generieren.
    </p>
  </div>
);

// --- Main Component ---

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [demoAvailable, setDemoAvailable] = useState<boolean | null>(null);

  useSeoMetadata();

  useEffect(() => {
    fetch(DEMO_MODEL_URL, { method: "HEAD" })
      .then((res) => setDemoAvailable(res.ok))
      .catch(() => setDemoAvailable(false));
  }, []);

  // Viewer is only accessible via server login

  const DemoSection = () => (
    <div className="glass-panel p-4 md:p-5 rounded-lg shadow-lg border border-border/10">
      <h3 className="text-sm md:text-base font-medium mb-3 text-center">Demo-Modell Vorschau</h3>
      <div className="relative w-full h-48 md:h-64 lg:h-72 rounded-md overflow-hidden bg-secondary/20">
        {demoAvailable === true ? (
          <ModelViewer fileUrl={DEMO_MODEL_URL} fileName="Demo Modell" rotateModel={true} showTools={false} />
        ) : (
          <DemoFallback loading={demoAvailable === null} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        <Button onClick={() => navigate("/test")} variant="outline" size={isMobile ? "sm" : "default"}>
          <Eye className="mr-2 h-4 w-4" />
          Demo ansehen
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-br from-background via-background to-secondary/40 px-4 py-4 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex-grow max-w-7xl mx-auto flex flex-col w-full gap-4">
        <HeaderSection />

        {/* Row 1: Drohnenvermessung banner + Changelog */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div className="glass-panel p-4 rounded-lg border border-border/10 flex items-center justify-between gap-3 relative overflow-visible">
            <div className="text-left relative">
              <p className="text-sm font-medium inline">Drohnenvermessung by RooferGaming®</p>
              <a
                href="https://drohnenvermessung-roofergaming.de/shop/"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute -top-4 -right-20 -rotate-6 hover:rotate-0 transition-transform duration-300 cursor-pointer group z-10"
              >
                <div className="bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg ring-2 ring-destructive/30 group-hover:scale-110 transition-transform duration-300 whitespace-nowrap">
                  ab 90€/Mo
                </div>
              </a>
              <p className="text-xs text-muted-foreground mt-0.5">
                Präzise Dachaufmaße mit Drohne – schnell, zuverlässig.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm" className="shrink-0">
              <a href="https://drohnenvermessung-roofergaming.de" target="_blank" rel="noopener noreferrer">
                Zur Website
              </a>
            </Button>
          </div>
          <ChangelogSection />
        </div>

        {/* Row 2: Demo + Upload side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <DemoSection />
          <div className="glass-panel p-4 md:p-5 rounded-lg shadow-lg border border-border/10 flex flex-col justify-center">
            <h2 className="text-base md:text-lg font-semibold mb-4 text-center">Eturnity-Konvertierung</h2>
            <FileUpload />
            <div className="flex flex-col gap-2 mt-4">
              <Button
                onClick={() => navigate("/server-login?server=0")}
                className="w-full"
                size={isMobile ? "sm" : "default"}
              >
                <Server className="mr-2 h-4 w-4" />
                Vom Server laden
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/server-login?server=1")}
                className="w-full"
                size={isMobile ? "sm" : "default"}
              >
                <Server className="mr-2 h-4 w-4" />
                Von Digitab laden
              </Button>
            </div>
          </div>
        </div>

        {/* Row 3: Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {FEATURES.map((item, i) => (
            <FeatureCard key={i} item={item} />
          ))}
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
