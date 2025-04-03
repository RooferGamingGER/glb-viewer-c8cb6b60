
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import Viewer from '@/pages/Viewer';
import Test from '@/pages/Test';
import NotFound from '@/pages/NotFound';

const MainView: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/viewer" element={<Viewer />} />
        <Route path="/test" element={<Test />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default MainView;
