import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

const APP_VERSION = '1.0.0'; // Version should match package.json

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Only show update prompts in production
    if (import.meta.env.MODE !== 'production') {
      return;
    }

    // Check if user has dismissed this version's update
    const dismissedVersion = localStorage.getItem('pwa-update-dismissed-version');
    if (dismissedVersion === APP_VERSION) {
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // Check if there's a new version available
        const checkForUpdate = () => {
          const currentVersion = localStorage.getItem('pwa-current-version') || '0.0.0';
          if (currentVersion !== APP_VERSION && reg.waiting) {
            setShowUpdatePrompt(true);
          }
        };

        // Listen for waiting service worker
        if (reg.waiting) {
          checkForUpdate();
        }

        // Listen for service worker updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                checkForUpdate();
              }
            });
          }
        });
      });

      // Listen for controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        localStorage.setItem('pwa-current-version', APP_VERSION);
        window.location.reload();
      });
    }

    // Set current version on first load
    const currentVersion = localStorage.getItem('pwa-current-version');
    if (!currentVersion) {
      localStorage.setItem('pwa-current-version', APP_VERSION);
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdatePrompt(false);
      toast.success('Update wird installiert...');
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    // Remember that user dismissed this version's update
    localStorage.setItem('pwa-update-dismissed-version', APP_VERSION);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-top-4">
      <div className="bg-card border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Update verfügbar
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Eine neue Version von DrohnenGLB ist verfügbar
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpdate}>
                Aktualisieren
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Später
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-8 w-8 p-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Schließen</span>
          </Button>
        </div>
      </div>
    </div>
  );
}