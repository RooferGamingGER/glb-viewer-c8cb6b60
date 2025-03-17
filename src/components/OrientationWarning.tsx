
import React from "react";
import { RotateCw } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";

const OrientationWarning = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <Card className="mx-4 w-full max-w-md glass-panel animate-pulse">
        <CardContent className="py-8 flex flex-col items-center text-center space-y-6">
          <RotateCw className="h-20 w-20 text-primary animate-spin-slow" />
          
          <Alert variant="warning" className="mb-4">
            <AlertTitle className="text-xl font-semibold mb-2">
              Bitte drehen Sie Ihr Gerät
            </AlertTitle>
            <AlertDescription className="text-base">
              Diese Anwendung funktioniert nur im Querformat.
              Drehen Sie Ihr Gerät, um fortzufahren.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrientationWarning;
