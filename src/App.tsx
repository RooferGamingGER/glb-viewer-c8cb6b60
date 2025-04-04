
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import Test from '@/pages/Test';
import Viewer from '@/pages/Viewer';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';
import { MeasurementProvider } from '@/contexts/MeasurementContext';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <MeasurementProvider>
        <PointSnappingProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/viewer" element={<Viewer />} />
              <Route path="/test" element={<Test />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <SonnerToaster richColors position="top-center" />
          </Router>
        </PointSnappingProvider>
      </MeasurementProvider>
    </ThemeProvider>
  );
}

export default App;
