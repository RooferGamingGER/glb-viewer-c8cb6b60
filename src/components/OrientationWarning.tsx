
import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

const OrientationWarning = () => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('orientation_warning_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const { isPortrait, isTablet, isPhone } = useScreenOrientation();

  // Show a subtle, non-blocking banner for phones and tablets in portrait
  const shouldShow = isPortrait && (isPhone || isTablet) && !dismissed;

  const dismiss = (persist?: boolean) => {
    if (persist) {
      try {
        localStorage.setItem('orientation_warning_dismissed', '1');
      } catch {}
    }
    setDismissed(true);
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in px-4">
      <div className="glass-panel px-4 py-2 rounded-full flex items-center shadow-sm border border-primary/20">
        <RotateCcw className="h-4 w-4 text-primary mr-2" />
        <span className="text-sm">Querformat bietet eine bessere Ansicht</span>
        <button
          className="ml-3 text-xs underline"
          onClick={() => dismiss(false)}
        >
          Verstanden
        </button>
        <button
          className="ml-3 text-xs underline"
          onClick={() => dismiss(true)}
          title="Nicht mehr anzeigen"
        >
          Nicht mehr anzeigen
        </button>
      </div>
    </div>
  );
};

export default OrientationWarning;
