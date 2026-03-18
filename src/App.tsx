
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';
import { MeasurementProvider } from '@/contexts/MeasurementContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { WebODMAuthProvider } from '@/lib/auth-context';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';

const Test = lazy(() => import('@/pages/Test'));
const Viewer = lazy(() => import('@/pages/Viewer'));
const ServerLogin = lazy(() => import('@/pages/ServerLogin'));
const ServerProjects = lazy(() => import('@/pages/ServerProjects'));

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <MeasurementProvider>
        <PointSnappingProvider>
          <TutorialProvider>
            <WebODMAuthProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/viewer" element={<Viewer />} />
                  <Route path="/test" element={<Test />} />
                  <Route path="/server-login" element={<ServerLogin />} />
                  <Route path="/server-projects" element={<ServerProjects />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
                <SonnerToaster richColors position="top-center" duration={2000} closeButton={false} />
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
              </Router>
            </WebODMAuthProvider>
          </TutorialProvider>
        </PointSnappingProvider>
      </MeasurementProvider>
    </ThemeProvider>
  );
}

export default App;

