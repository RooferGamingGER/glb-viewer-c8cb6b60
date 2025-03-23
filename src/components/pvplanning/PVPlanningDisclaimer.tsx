
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
            Bitte beachten Sie, dass die hier dargestellte Planung lediglich eine Vorplanung darstellt.
          </p>
          <p>
            Bei dieser ersten Einschätzung wurden die genaue Ausrichtung der potenziellen PV-Anlage sowie die tatsächliche Dachneigung nicht berücksichtigt.
          </p>
          <p>
            Diese Vorplanung dient lediglich einer ersten Orientierung und ersetzt keine detaillierte Fachplanung durch einen qualifizierten Installateur oder Planer. Für eine präzise und verbindliche Planung, die alle relevanten Faktoren berücksichtigt, empfehlen wir Ihnen dringend, ein professionelles Angebot einzuholen.
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
