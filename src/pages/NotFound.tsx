
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { devError } from "@/utils/consoleCleanup";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Only log in development mode
    devError(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-6xl font-bold text-gray-800 mb-6">404</h1>
        <p className="text-xl text-gray-600 mb-8">Oops! Diese Seite wurde nicht gefunden</p>
        <a 
          href="/" 
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Zurück zur Startseite
        </a>
      </div>
    </div>
  );
};

export default NotFound;
