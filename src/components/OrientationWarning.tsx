
import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

const OrientationWarning = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/90 backdrop-blur-md animate-fade-in p-6">
      <div className="glass-panel max-w-md p-6 rounded-xl flex flex-col items-center shadow-lg border border-primary/20">
        <RotateCcw className="h-16 w-16 text-primary animate-pulse mb-4" />
        <h2 className="text-xl font-bold mb-2 text-center">Bitte drehen Sie Ihr Gerät</h2>
        <p className="text-center text-muted-foreground mb-4">
          Für die optimale Nutzung des 3D-Viewers wird die Querformat-Ausrichtung empfohlen.
        </p>
        <div className="flex space-x-3 w-full">
          <button 
            className="w-full py-2 px-4 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
            onClick={() => setDismissed(true)}
          >
            Ignorieren
          </button>
          <button 
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => setDismissed(true)}
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrientationWarning;
