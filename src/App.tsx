
import React from 'react';
import { MeasurementProvider } from './contexts/MeasurementContext';
import MainView from './components/MainView';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster position="top-right" closeButton richColors />
      <MeasurementProvider>
        <MainView />
      </MeasurementProvider>
    </>
  );
}

export default App;

