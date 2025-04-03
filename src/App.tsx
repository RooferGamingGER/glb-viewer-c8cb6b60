
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import NotFound from '@/pages/NotFound';
import Test from '@/pages/Test';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <PointSnappingProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/test" element={<Test />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <SonnerToaster richColors position="top-center" />
        </Router>
      </PointSnappingProvider>
    </ThemeProvider>
  );
}

export default App;
