
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface PVPlanningDisclaimerProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PVPlanningDisclaimer: React.FC<PVPlanningDisclaimerProps> = ({
  open,
  onConfirm,
  onCancel
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onCancel();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-2" />
          <DialogTitle className="text-center">Wichtiger Hinweis zur PV-Planung</DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="text-sm leading-6 space-y-3 py-2">
          <p>
            <strong>Vorläufige Planung – Bitte beachten Sie:</strong>
          </p>
          <p>
            Die hier dargestellte Planung ist eine erste, unverbindliche Vorplanung. Bei dieser ersten Einschätzung wurden die exakte Ausrichtung der potenziellen PV-Anlage sowie die genaue Dachneigung noch nicht berücksichtigt. Diese Vorplanung dient lediglich einer ersten Orientierung und ersetzt keine detaillierte Fachplanung.
          </p>
          <p>
            Die automatisch generierte Materialliste dient als Orientierung und kann Fehler enthalten. Mengen, Materialtypen und Kompatibilität müssen vor der Bestellung durch einen Fachbetrieb geprüft und bestätigt werden.
          </p>
          <p>
            Für eine präzise und verbindliche Planung, die alle relevanten Aspekte einbezieht, empfehlen wir Ihnen, ein professionelles Angebot von einem Fachbetrieb einzuholen.
          </p>
        </DialogDescription>
        
        <DialogFooter className="sm:justify-between flex-col sm:flex-row space-y-2 sm:space-y-0">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button onClick={onConfirm}>
            Ich verstehe, fortfahren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PVPlanningDisclaimer;
