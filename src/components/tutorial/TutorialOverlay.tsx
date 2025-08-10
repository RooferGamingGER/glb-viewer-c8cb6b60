import React from 'react';
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Ruler,
  PenTool,
  Crop,
  PanelTop,
  LucideIcon,
  PlusSquare,
  Pencil,
  Camera,
  FileDown,
  Download,
  HelpCircle,
  BookOpen,
  LifeBuoy,
  SunMedium
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTutorial } from '@/contexts/TutorialContext';

interface TutorialStep {
  title: string;
  description: React.ReactNode;
  icon: LucideIcon;
}

interface TutorialOverlayProps {
  showButton?: boolean;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ showButton = true }) => {
  const { showTutorial, setShowTutorial, currentStep, setCurrentStep, totalSteps } = useTutorial();

  const tutorialSteps: TutorialStep[] = [
    {
      title: "Willkommen bei DrohnenGLB",
      description: (
        <div className="space-y-3">
          <p>
            Willkommen zum Tutorial für DrohnenGLB - Ihre moderne Lösung für
            präzise Dachmessungen und Solarplanung.
          </p>
          <p>
            In diesem Tutorial werden wir alle Funktionen Schritt für Schritt durchgehen,
            damit Sie das volle Potenzial der Anwendung nutzen können.
          </p>
          <p>
            Klicken Sie auf "Weiter", um zu beginnen.
          </p>
        </div>
      ),
      icon: BookOpen
    },
    {
      title: "Benutzeroberfläche verstehen",
      description: (
        <div className="space-y-3">
          <p>
            Die Benutzeroberfläche besteht aus folgenden Bereichen:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>3D-Ansicht:</strong> Das Hauptfenster zeigt Ihr 3D-Modell des Daches
            </li>
            <li>
              <strong>Werkzeugleiste:</strong> Am linken Bildschirmrand befinden sich die Messwerkzeuge
            </li>
            <li>
              <strong>Seitenleiste:</strong> Zeigt Details zu Ihren Messungen und Berechnungen an
            </li>
            <li>
              <strong>Steuerung:</strong> Navigieren Sie durch das Modell mit Maus oder Touchgesten
            </li>
          </ul>
        </div>
      ),
      icon: PanelTop
    },
    {
      title: "Grundlegende Messwerkzeuge",
      description: (
        <div className="space-y-3">
          <p>
            Die wichtigsten Messwerkzeuge sind:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Längenmessung:</strong> Misst horizontale Distanzen zwischen zwei Punkten
            </li>
            <li>
              <strong>Höhenmessung:</strong> Erfasst vertikale Höhenunterschiede auf dem Dach
            </li>
            <li>
              <strong>Flächenmessung:</strong> Zeichnet Polygone für Flächenberechnungen
            </li>
          </ul>
          <p>
            Klicken Sie auf das gewünschte Werkzeug und dann auf entsprechende Punkte im Modell,
            um die Messung durchzuführen.
          </p>
        </div>
      ),
      icon: Ruler
    },
    {
      title: "Flächenmessungen durchführen",
      description: (
        <div className="space-y-3">
          <p>
            Zur Messung einer Dachfläche:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Wählen Sie das Flächenmesswerkzeug aus</li>
            <li>Klicken Sie nacheinander auf die Eckpunkte der zu messenden Fläche</li>
            <li>Schließen Sie das Polygon mit dem "Abschließen"-Button</li>
          </ol>
          <p>
            Die berechnete Fläche wird automatisch angezeigt und in der Seitenleiste gespeichert.
            Achten Sie darauf, die Punkte im Uhrzeigersinn zu setzen für bessere Ergebnisse.
          </p>
        </div>
      ),
      icon: Crop
    },
    {
      title: "Messungen bearbeiten",
      description: (
        <div className="space-y-3">
          <p>
            Bestehende Messungen können jederzeit bearbeitet werden:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Klicken Sie auf eine Messung in der Seitenleiste</li>
            <li>Nutzen Sie den "Bearbeiten"-Button</li>
            <li>Im Bearbeitungsmodus können Sie:</li>
            <ul className="list-disc list-inside ml-5">
              <li>Punkte verschieben (gelb markiert)</li>
              <li>Punkte hinzufügen (über das + Symbol bei Flächenmessungen)</li>
              <li>Punkte löschen (in der Punktliste)</li>
            </ul>
          </ul>
          <p>
            Änderungen werden automatisch gespeichert und die Messungen aktualisiert.
          </p>
        </div>
      ),
      icon: Pencil
    },
    {
      title: "Solarplanung",
      description: (
        <div className="space-y-3">
          <p>
            Für die Planung von Solaranlagen:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Wählen Sie eine gemessene Dachfläche aus</li>
            <li>Klicken Sie auf "Solarplanung"</li>
            <li>Wählen Sie das gewünschte PV-Modul aus der Liste</li>
            <li>Passen Sie die Ausrichtung und den Abstand der Module an</li>
            <li>Die Software berechnet automatisch:</li>
            <ul className="list-disc list-inside ml-5">
              <li>Anzahl der möglichen Module</li>
              <li>Gesamtleistung in kWp</li>
              <li>Voraussichtliche Jahresproduktion</li>
            </ul>
          </ol>
          <p>
            Die optimale Belegung wird grafisch auf dem Dach angezeigt.
          </p>
        </div>
      ),
      icon: SunMedium
    },
    {
      title: "Präzise Touch-Platzierung",
      description: (
        <div className="space-y-3">
          <p>
            Auf Touch-Geräten können Sie Messpunkte besonders präzise setzen:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Finger ca. 0,25 Sekunden gedrückt halten, um den Präzisionsmodus zu aktivieren</li>
            <li>Ein kleines Fadenkreuz zeigt die exakte Position an</li>
            <li>Die Fangzone wird dabei vorübergehend vergrößert</li>
            <li>Loslassen, um den Punkt an der Position zu platzieren</li>
          </ul>
        </div>
      ),
      icon: PenTool
    },
    {
      title: "Dokumentation & Export",
      description: (
        <div className="space-y-3">
          <p>
            Ihre Messungen können auf verschiedene Arten exportiert werden:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Screenshots:</strong> Erfassen Sie die aktuelle Ansicht mit der Screenshot-Funktion
            </li>
            <li>
              <strong>PDF-Bericht:</strong> Erstellen Sie einen vollständigen Bericht mit allen Messungen
            </li>
            <li>
              <strong>Daten-Export:</strong> Exportieren Sie die Rohdaten zur Weiterverarbeitung
            </li>
          </ul>
          <p>
            Alle Exporte enthalten detaillierte Informationen zu den durchgeführten Messungen
            und können für Angebote, Planungen oder Dokumentationen verwendet werden.
          </p>
        </div>
      ),
      icon: Download
    },
    {
      title: "Tipps & Tricks",
      description: (
        <div className="space-y-3">
          <p>
            Für optimale Ergebnisse:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Verwenden Sie das Zoomen für präzisere Messungen an detailreichen Stellen</li>
            <li>Nutzen Sie den Punkt-Snapping Mechanismus für höchste Genauigkeit</li>
            <li>Geben Sie Ihren Messungen aussagekräftige Namen</li>
            <li>Gruppieren Sie zusammengehörige Messungen für bessere Übersicht</li>
          </ul>
          <p>
            Mit etwas Übung werden Sie in kürzester Zeit präzise Dachaufmaße erstellen können.
          </p>
        </div>
      ),
      icon: LifeBuoy
    },
    {
      title: "Tutorial beenden",
      description: (
        <div className="space-y-3">
          <p>
            Sie haben alle Schritte des Tutorials abgeschlossen!
          </p>
          <p>
            Sie können das Tutorial jederzeit erneut aufrufen, indem Sie auf das Hilfe-Symbol
            in der oberen Leiste klicken.
          </p>
          <p>
            Wir wünschen Ihnen viel Erfolg bei der Arbeit mit DrohnenGLB!
          </p>
        </div>
      ),
      icon: HelpCircle
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setShowTutorial(false);
  };

  const handleOpenTutorial = () => {
    setCurrentStep(0);
    setShowTutorial(true);
  };

  if (!showTutorial) {
    return showButton ? (
      <Button
        variant="outline"
        className="fixed right-4 bottom-4 z-50 glass-button"
        onClick={handleOpenTutorial}
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Tutorial öffnen
      </Button>
    ) : null;
  }

  const CurrentIcon = tutorialSteps[currentStep].icon;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl glass-panel border-primary/30 shadow-lg">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-full">
                <CurrentIcon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">{tutorialSteps[currentStep].title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="mt-[-8px]">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-1 mt-4" />
          <CardDescription className="pt-2">
            Schritt {currentStep + 1} von {tutorialSteps.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-4">
          {tutorialSteps[currentStep].description}
        </CardContent>
        <CardFooter className="px-6 py-4 bg-muted/40 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>

          <Button onClick={handleNext}>
            {currentStep < tutorialSteps.length - 1 ? (
              <>
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              'Tutorial beenden'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TutorialOverlay;
