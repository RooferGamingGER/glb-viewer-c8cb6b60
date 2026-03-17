import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebODMAuth } from '@/lib/auth-context';
import ModelViewer, { ThreeContext } from '@/components/ModelViewer';
import { useURLParam } from '@/hooks/useURLState';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, HelpCircle, AlertTriangle } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { useTutorial } from '@/contexts/TutorialContext';
import { checkWebGLCompatibility } from '@/hooks/useThreeContext';
import ShareDialog from '@/components/measurement/ShareDialog';
import { getShareInfo, getModelProxyUrl, type CreateShareParams } from '@/utils/shareView';
import { useMeasurementContext } from '@/contexts/MeasurementContext';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { validateModelFile } from '@/utils/modelTransformer';

// Mapping of segment types to ensure consistency between English and German
export const normalizeSegmentType = (type: string): string => {
  // Convert to lowercase for case-insensitive comparison
  const lowerType = type.toLowerCase();
  
  // Define mappings for German to English segment types
  const typeMapping: Record<string, string> = {
    // English internal types
    'ridge': 'ridge',
    'valley': 'valley',
    'hip': 'hip',
    'eave': 'eave',
    'verge': 'verge',
    'edge': 'edge',
    'flashing': 'flashing',
    'connection': 'connection',
    
    // German UI types
    'first': 'ridge',
    'kehle': 'valley',
    'grat': 'hip',
    'traufe': 'eave',
    'ortgang': 'verge',
    'kante': 'edge',
    'verfallung': 'flashing',
    'anschluss': 'connection'
  };
  
  return typeMapping[lowerType] || lowerType; // Return mapped type or original if not found
};

const Viewer = () => {
  const navigate = useNavigate();
  
  const [isFullscreen, setIsFullscreen] = useState(true);
  const { showTutorial, setShowTutorial } = useTutorial();
  const [showWebGLWarning, setShowWebGLWarning] = useState(false);
  const [webGLInfo, setWebGLInfo] = useState<ReturnType<typeof checkWebGLCompatibility> | null>(null);
  
  // Share mode state
  const shareToken = useURLParam('share');
  const isShareMode = !!shareToken;
  const [shareFileUrl, setShareFileUrl] = useState<string | null>(null);
  const [shareFileName, setShareFileName] = useState<string | null>(null);
  const [shareMeasurements, setShareMeasurements] = useState<unknown[] | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  
  // Get the file URL and name from the URL parameters (only when not in share mode)
  const fileUrlParam = useURLParam('fileUrl');
  const fileNameParam = useURLParam('fileName');
  // Check rotateModel parameter
  const rotateModelParam = useURLParam('rotateModel');
  const rotateModel = rotateModelParam !== 'false'; // true, unless explicitly "false"
  
  // Determine effective file URL and name
  const fileUrl = isShareMode ? (shareFileUrl || '') : (fileUrlParam || '');
  const fileName = isShareMode ? (shareFileName || 'Geteiltes Modell') : (fileNameParam || 'Unbekannte Datei');
  
  // Check WebGL compatibility on component mount (no automatic prompts)
  useEffect(() => {
    const compatibility = checkWebGLCompatibility();
    setWebGLInfo(compatibility);
  }, []);

  // Load share data when in share mode
  useEffect(() => {
    if (!isShareMode || !shareToken) return;
    
    setShareLoading(true);
    setShareError(null);
    
    getShareInfo(shareToken)
      .then((info) => {
        setShareFileName(info.file_name);
        setShareMeasurements(info.measurements as unknown[]);
        setShareFileUrl(getModelProxyUrl(shareToken));
      })
      .catch((err) => {
        setShareError(err.message);
        toast.error(`Share-Link ungültig: ${err.message}`);
      })
      .finally(() => setShareLoading(false));
  }, [isShareMode, shareToken]);

  // Import shared measurements into context when loaded
  const { measurements, importMeasurements } = useMeasurementContext();
  
  useEffect(() => {
    if (isShareMode && shareMeasurements && shareMeasurements.length > 0 && fileUrl) {
      // Small delay to ensure ModelViewer is mounted
      const timer = setTimeout(() => {
        importMeasurements(shareMeasurements as any[], false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isShareMode, shareMeasurements, fileUrl, importMeasurements]);

  // Expose current measurements on window for ShareDialog
  useEffect(() => {
    (window as any).__currentMeasurements = measurements;
    return () => { delete (window as any).__currentMeasurements; };
  }, [measurements]);

  useEffect(() => {
    // In share mode, skip URL validation
    if (isShareMode) return;
    
    // Redirect if no file URL in normal mode
    if (!fileUrlParam) {
      toast.error('Keine Datei ausgewählt');
      navigate('/');
      return;
    }
    
    // Validate URL: allow blob:, https:, and relative paths. Allow http: only on http origin (dev).
    const isString = typeof fileUrl === 'string';
    let isValid = false;
    if (isString) {
      const startsWith = (p: string) => fileUrl.startsWith(p);
      const isBlob = startsWith('blob:');
      const isHttps = startsWith('https://');
      const isHttp = startsWith('http://');
      const isRelative = startsWith('/') || startsWith('./') || startsWith('../');
      const onHttpOrigin = window.location.protocol === 'http:';
      isValid = isBlob || isHttps || isRelative || (isHttp && onHttpOrigin);
    }

    if (!isValid) {
      toast.error('Ungültige Datei-URL');
      navigate('/');
      return;
    }
    
    // Enable fullscreen on component mount
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error("Error attempting to enable fullscreen:", err);
        });
      }
    };
    
    // Enter fullscreen on component mount
    enterFullscreen();
    
    // Listen for fullscreen change events
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    
    return () => {
      // Clean up event listener on unmount
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
      
      // Exit fullscreen if needed
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error("Error attempting to exit fullscreen:", err);
        });
      }
    };
  }, [fileUrl, navigate]);

  // Add font preloading for the Inter font we use in text sprites
  useEffect(() => {
    // Preload the Inter font for text sprites
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
    
    return () => {
      // Clean up the font link when component unmounts
      document.head.removeChild(fontLink);
    };
  }, []);
  
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  };

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };
  
  const closeWebGLWarning = () => {
    setShowWebGLWarning(false);
  };

  // Build share params callback for ShareDialog
  const getShareParams = useCallback((): CreateShareParams | null => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('projectId');
    const taskId = params.get('taskId');
    const token = sessionStorage.getItem('webodm_token');
    const server = sessionStorage.getItem('webodm_active_server');
    
    if (!projectId || !taskId || !token || !server) return null;
    
    // Access measurements from context isn't ideal here, so we pass a ref
    return {
      webodm_server_url: server,
      webodm_token: token,
      project_id: parseInt(projectId, 10),
      task_id: taskId,
      file_name: fileName,
      measurements: (window as any).__currentMeasurements || [],
      created_by: sessionStorage.getItem('webodm_username') || 'unknown',
    };
  }, [fileName]);

  // Determine if share button should be visible
  const params = new URLSearchParams(window.location.search);
  const canShare = !isShareMode && !!params.get('projectId') && !!params.get('taskId');

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-background to-background overflow-hidden">
      
      
      <header className="glass-panel w-full py-3 px-4 border-b border-border/50 z-10 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            className="glass-button"
            onClick={() => {
              if (fileUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fileUrl);
              }
              if (isShareMode) {
                navigate('/');
              } else {
                const p = new URLSearchParams(window.location.search);
                const pid = p.get('projectId');
                const tid = p.get('taskId');
                if (pid && tid) {
                  navigate('/server-projects', { state: { returnToTask: { projectId: pid, taskId: tid } } });
                } else {
                  navigate('/');
                }
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          
          <h1 className="text-lg font-medium ml-4">
            {isShareMode ? `${fileName} (geteilte Ansicht)` : '3D-Viewer'}
          </h1>
        </div>
        
        <div className="flex gap-2">
          {canShare && (
            <ShareDialog getShareParams={getShareParams} />
          )}
          
          {!isShareMode && (
            <>
              <Button 
                variant="outline"
                size="sm"
                className="glass-button"
                onClick={handleOpenTutorial}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Tutorial
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="glass-button"
                onClick={() => setShowWebGLWarning(true)}
                title="Information zur 3D-Darstellung"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                3D-Info
              </Button>
            </>
          )}

          {isFullscreen && (
            <Button
              variant="outline"
              size="sm"
              className="glass-button"
              onClick={exitFullscreen}
              title="Vollbildmodus beenden"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>
      
      <div className="flex-1 relative flex overflow-hidden">
        <SidebarProvider defaultOpen={true} open={true}>
          <main className="flex-1 relative w-full h-full">
            {shareLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                <div className="text-center space-y-3">
                  <Progress value={30} className="w-48" />
                  <p className="text-sm text-muted-foreground">Geteiltes Modell wird geladen…</p>
                </div>
              </div>
            )}
            {shareError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-20">
                <div className="text-center space-y-3">
                  <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                  <p className="text-lg font-medium">Share-Link ungültig</p>
                  <p className="text-sm text-muted-foreground">{shareError}</p>
                  <Button onClick={() => navigate('/')}>Zur Startseite</Button>
                </div>
              </div>
            )}
            {fileUrl && !shareError && (
              <ModelViewer 
                fileUrl={fileUrl} 
                fileName={fileName} 
                rotateModel={rotateModel}
              />
            )}
          </main>
        </SidebarProvider>
      </div>
      
      {/* WebGL Warning Dialog */}
      <AlertDialog open={showWebGLWarning} onOpenChange={setShowWebGLWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Hinweis zur 3D-Darstellung
            </AlertDialogTitle>
            <AlertDialogDescription>
              {webGLInfo?.compatible ? (
                <div className="space-y-3">
                  <p>
                    Unsere 3D-Ansicht stellt hohe Anforderungen an die Grafikkarte, um alle Details flüssig darzustellen. Für die bestmögliche Leistung auf Ihrem System haben wir folgende Empfehlungen:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {webGLInfo.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-4 text-gray-500">
                    Ihre Grafik-Hardware: {webGLInfo.renderer || 'Nicht erkannt'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>
                    Für die interaktive 3D-Ansicht wird die moderne Browser-Technologie "WebGL" benötigt. Diese scheint in Ihrem Browser nicht vollständig aktiviert zu sein.
                  </p>
                  <p>
                    Dadurch kann es sein, dass die 3D-Darstellung nicht oder nur eingeschränkt funktioniert.
                  </p>
                  <p className="font-medium">Was Sie tun können:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Aktualisieren Sie Ihren Browser auf die neueste Version.</li>
                    <li>Stellen Sie sicher, dass die Hardwarebeschleunigung in den Browser-Einstellungen aktiviert ist.</li>
                    <li>Aktualisieren Sie den Treiber Ihrer Grafikkarte.</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {webGLInfo?.compatible ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    try { localStorage.setItem('webgl_warning_dismissed', '1'); } catch {}
                    closeWebGLWarning();
                  }}
                >
                  Nicht mehr anzeigen
                </Button>
                <AlertDialogAction onClick={closeWebGLWarning}>Schließen</AlertDialogAction>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    try { localStorage.setItem('webgl_incompat_dismissed', '1'); } catch {}
                    closeWebGLWarning();
                  }}
                >
                  Nicht mehr anzeigen
                </Button>
                <AlertDialogAction onClick={closeWebGLWarning}>Verstanden</AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Tutorial Overlay with showButton set to false */}
      <TutorialOverlay showButton={false} />
    </div>
  );
};

export default Viewer;
