
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MeasurementProvider } from './contexts/MeasurementContext';
import MainView from '@/components/MainView';
import { Toaster } from 'sonner';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" closeButton richColors />
      <MeasurementProvider>
        <MainView />
      </MeasurementProvider>
    </BrowserRouter>
  );
}

export default App;
