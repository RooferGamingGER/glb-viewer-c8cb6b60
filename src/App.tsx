
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import { PageSkeleton } from '@/components/ui/skeleton-loader';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';
import { MeasurementProvider } from '@/contexts/MeasurementContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';

// Lazy load heavy pages for better initial load time
const Viewer = lazy(() => import('@/pages/Viewer'));
const Test = lazy(() => import('@/pages/Test'));

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <MeasurementProvider>
        <PointSnappingProvider>
          <TutorialProvider>
            <Router>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/viewer" element={<Viewer />} />
                  <Route path="/test" element={<Test />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Toaster />
              <SonnerToaster richColors position="top-center" />
              <PWAInstallPrompt />
              <PWAUpdatePrompt />
            </Router>
          </TutorialProvider>
        </PointSnappingProvider>
      </MeasurementProvider>
    </ThemeProvider>
  );
}

export default App;
