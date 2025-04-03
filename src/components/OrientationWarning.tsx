
import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

const OrientationWarning = () => {
  const [dismissed, setDismissed] = useState(false);
  const { isPortrait, isTablet, isPhone } = useScreenOrientation();
  const [showWarning, setShowWarning] = useState(false);
  
  // Nur bei Mobiltelefonen im Hochformat warnen, nicht bei Tablets
  useEffect(() => {
    if (isPhone && isPortrait && !dismissed) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [isPhone, isPortrait, dismissed]);

  // Bei Tablets nur einen unaufdringlichen Hinweis anzeigen, wenn im Hochformat
  const tabletHint = (isTablet && isPortrait && !dismissed);

  if (!showWarning && !tabletHint) return null;

  // Vollständige Warnung für Mobiltelefone
  if (showWarning) {
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
  }
  
  // Dezenter Hinweis für Tablets
  if (tabletHint) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in">
        <div className="glass-panel px-4 py-2 rounded-full flex items-center shadow-sm border border-primary/20">
          <RotateCcw className="h-4 w-4 text-primary mr-2" />
          <span className="text-sm">Querformat bietet eine bessere Ansicht</span>
          <button 
            className="ml-3 text-xs underline"
            onClick={() => setDismissed(true)}
          >
            Verstanden
          </button>
        </div>
      </div>
    );
  }
  
  return null;
};

export default OrientationWarning;
