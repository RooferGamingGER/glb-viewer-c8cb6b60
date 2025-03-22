
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PVModuleInfo } from '@/types/measurements';

interface PVModuleEfficiencyLegendProps {
  pvInfo: PVModuleInfo;
}

const EFFICIENCY_COLORS = {
  high: '#1EAEDB',   // Kräftiges Blau für hohe Effizienz
  medium: '#33C3F0', // Helles Blau für mittlere Effizienz
  low: '#ea384c'     // Rot für niedrige Effizienz
};

const PVModuleEfficiencyLegend: React.FC<PVModuleEfficiencyLegendProps> = ({ pvInfo }) => {
  // Bestimme die Effizienzklasse basierend auf dem Ertragsfaktor
  const getEfficiencyClass = (yieldFactor?: number) => {
    if (!yieldFactor) return 'medium';
    if (yieldFactor >= 950) return 'high';
    if (yieldFactor >= 850) return 'medium';
    return 'low';
  };
  
  const efficiencyClass = getEfficiencyClass(pvInfo.yieldFactor);
  const efficiencyColor = EFFICIENCY_COLORS[efficiencyClass as keyof typeof EFFICIENCY_COLORS];
  
  // Berechne den jährlichen Ertrag in kWh
  const moduleCount = pvInfo.moduleCount || 0;
  const modulePower = pvInfo.pvModuleSpec?.power || 425;
  const totalPower = (moduleCount * modulePower) / 1000; // kWp
  const yieldFactor = pvInfo.yieldFactor || 950;
  const annualYield = totalPower * yieldFactor;
  
  // Daten für das Effizienz-Diagramm
  const chartData = [
    { name: 'Ausrichtung', value: 1, color: efficiencyColor }
  ];
  
  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">PV-Modul Effizienz</CardTitle>
        <CardDescription>
          Basierend auf Dachausrichtung und Neigung
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Ausrichtung</div>
            <div className="flex items-center gap-2">
              <span className="text-base">{pvInfo.roofDirection || 'Süd'}</span>
              <Badge 
                style={{ backgroundColor: efficiencyColor }} 
                variant="secondary"
              >
                {pvInfo.roofAzimuth?.toFixed(0)}°
              </Badge>
            </div>
            
            <div className="text-sm font-medium mb-1 mt-3">Dachneigung</div>
            <div className="flex items-center gap-2">
              <span className="text-base">{pvInfo.roofInclination?.toFixed(0) || 30}°</span>
            </div>
            
            <div className="text-sm font-medium mb-1 mt-3">Ertragsfaktor</div>
            <div className="flex items-center gap-2">
              <span className="text-base">{pvInfo.yieldFactor || 950} kWh/kWp</span>
            </div>
            
            <div className="text-sm font-medium mb-1 mt-3">Erwarteter Jahresertrag</div>
            <div className="flex items-center gap-2">
              <span className="text-base">{Math.round(annualYield).toLocaleString()} kWh/Jahr</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <div className="w-full h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    fill={efficiencyColor}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="text-center mt-2">
              {efficiencyClass === 'high' && (
                <Badge className="bg-[#1EAEDB]">Hohe Effizienz</Badge>
              )}
              {efficiencyClass === 'medium' && (
                <Badge className="bg-[#33C3F0]">Mittlere Effizienz</Badge>
              )}
              {efficiencyClass === 'low' && (
                <Badge className="bg-[#ea384c]">Niedrige Effizienz</Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Die Farbcodierung auf dem 3D-Modell zeigt die Effizienz der Module an.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PVModuleEfficiencyLegend;
