
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Measurement } from '@/types/measurements';
import { toast } from 'sonner';
import { calculateBoundingBox } from '@/utils/measurementCalculations';

interface ExportPdfButtonProps {
  measurements: Measurement[];
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ measurements }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generatePdf = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: 'Messungen Export',
        subject: 'Exportierte Messdaten',
        author: '3D-Dachplaner',
        keywords: 'messungen, dach, plan'
      });
      
      // Add title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Messungen Export', 20, 20);
      
      // Add date
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Erstellt am: ${new Date().toLocaleDateString()}`, 20, 30);
      
      // Create roof plan and add it to PDF
      if (measurements.length > 0) {
        // Find a measurement to use as reference for the bounding box
        const referenceMeasurement = measurements.find(m => m.points && m.points.length > 0);
        
        if (referenceMeasurement && referenceMeasurement.points) {
          const boundingBox = calculateBoundingBox(referenceMeasurement.points);
          const width = boundingBox.maxX - boundingBox.minX;
          const height = boundingBox.maxZ - boundingBox.minZ;
          
          // Create a simple roof plan
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 150;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = '14px Arial';
            ctx.fillStyle = '#333333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Dachplan (Übersicht)', canvas.width / 2, canvas.height / 2);
            
            const roofPlanDataUrl = canvas.toDataURL('image/png');
            
            doc.addImage(roofPlanDataUrl, 'PNG', 20, 40, 50, 37.5); // Reduced size
          }
        }
      }
      
      let yPos = 40;
      
      // Add a section for each measurement type
      const measurementTypes = ['area', 'solar', 'length', 'height', 'skylight', 'chimney', 'vent', 'hook', 'other'];
      
      for (const type of measurementTypes) {
        const typeMeasurements = measurements.filter(m => m.type === type);
        if (typeMeasurements.length === 0) continue;
        
        // Add section header
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Messungen`, 20, 20);
        
        yPos = 30;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        for (const measurement of typeMeasurements) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`Messung ID: ${measurement.id}`, 20, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 8;
          
          doc.text(`Typ: ${measurement.type}`, 25, yPos);
          yPos += 8;
          
          doc.text(`Wert: ${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`, 25, yPos);
          yPos += 8;
          
          if (measurement.description) {
            doc.text(`Beschreibung: ${measurement.description}`, 25, yPos);
            yPos += 8;
          }
          
          if (measurement.points && measurement.points.length > 0) {
            doc.text('Punkte:', 25, yPos);
            yPos += 8;
            
            measurement.points.forEach((point, index) => {
              doc.text(`  ${index + 1}: X=${point.x.toFixed(2)}, Y=${point.y.toFixed(2)}, Z=${point.z.toFixed(2)}`, 25, yPos);
              yPos += 6;
            });
          }
          
          // Special handling for solar measurements - include PV module info
          if (type === 'solar') {
            for (const measurement of typeMeasurements) {
              // Add PV module information if available
              if (measurement.pvModuleInfo) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('PV-Anlagendetails:', 20, yPos + 10);
                doc.setFont('helvetica', 'normal');
                
                const pvInfo = measurement.pvModuleInfo;
                yPos += 20;
                
                // Module specifications
                doc.text(`Modulgröße: ${pvInfo.moduleWidth.toFixed(2)} × ${pvInfo.moduleHeight.toFixed(2)} m`, 25, yPos);
                yPos += 8;
                
                doc.text(`Modulanzahl: ${pvInfo.moduleCount}`, 25, yPos);
                yPos += 8;
                
                if (pvInfo.columns && pvInfo.rows) {
                  doc.text(`Modulraster: ${pvInfo.columns} × ${pvInfo.rows}`, 25, yPos);
                  yPos += 8;
                }
                
                doc.text(`Flächennutzung: ${pvInfo.coveragePercent.toFixed(1)}%`, 25, yPos);
                yPos += 8;
                
                // Power information
                const modulePower = pvInfo.pvModuleSpec?.power || 425;
                const totalPower = (pvInfo.moduleCount * modulePower / 1000).toFixed(1);
                
                doc.text(`Leistung: ${totalPower} kWp (${pvInfo.moduleCount} Module × ${modulePower} Wp)`, 25, yPos);
                yPos += 8;
                
                // Orientation and inclination
                if (pvInfo.roofDirection) {
                  const roofAzimuth = pvInfo.roofAzimuth || 180;
                  doc.text(`Ausrichtung: ${pvInfo.roofDirection} (${Math.round(roofAzimuth)}°)`, 25, yPos);
                  yPos += 8;
                }
                
                if (pvInfo.roofInclination) {
                  const inclination = Number(pvInfo.roofInclination);
                  doc.text(`Dachneigung: ${Math.round(inclination)}°`, 25, yPos);
                  yPos += 8;
                }
                
                // Annual yield
                const yieldFactor = pvInfo.yieldFactor ? Number(pvInfo.yieldFactor) : 950;
                const totalPowerNum = parseFloat(totalPower);
                const annualYield = Math.round(totalPowerNum * yieldFactor);
                
                doc.text(`Jahresertrag: ca. ${annualYield} kWh/Jahr`, 25, yPos);
                yPos += 15;
                
                // Materials if available
                if (pvInfo.pvMaterials) {
                  doc.setFontSize(11);
                  doc.setFont('helvetica', 'bold');
                  doc.text('Materialliste:', 20, yPos);
                  doc.setFont('helvetica', 'normal');
                  yPos += 10;
                  
                  const materials = pvInfo.pvMaterials;
                  
                  // Mounting system
                  doc.text('Befestigungssystem:', 25, yPos);
                  yPos += 8;
                  
                  const mounting = materials.mountingSystem;
                  doc.text(`${mounting.railLength} m Montageschienen`, 30, yPos); yPos += 6;
                  doc.text(`${mounting.roofHookCount} Dachhaken`, 30, yPos); yPos += 6;
                  doc.text(`${mounting.middleClampCount} Mittelklemmen`, 30, yPos); yPos += 6;
                  doc.text(`${mounting.endClampCount} Endklemmen`, 30, yPos); yPos += 6;
                  doc.text(`${mounting.railConnectorCount} Schienenverbinder`, 30, yPos); yPos += 10;
                  
                  // Electrical system
                  doc.text('Elektrik:', 25, yPos);
                  yPos += 8;
                  
                  const electrical = materials.electricalSystem;
                  doc.text(`${electrical.stringCount} Stränge mit je ${electrical.modulesPerString} Modulen`, 30, yPos); yPos += 6;
                  doc.text(`${electrical.stringCableLength} m DC-Kabel`, 30, yPos); yPos += 6;
                  doc.text(`${electrical.mainCableLength} m Hauptkabel`, 30, yPos); yPos += 6;
                  doc.text(`${electrical.inverterCount} Wechselrichter (${electrical.inverterPower} kW)`, 30, yPos); yPos += 6;
                  
                  // Add page if needed
                  if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                  }
                  
                  // Notes
                  if (materials.notes && materials.notes.length > 0) {
                    yPos += 4;
                    doc.text('Hinweise:', 25, yPos);
                    yPos += 8;
                    
                    materials.notes.forEach(note => {
                      doc.text(`• ${note}`, 30, yPos);
                      yPos += 6;
                    });
                  }
                }
              }
              
              yPos += 15;
              
              // Check if we need a new page
              if (yPos > 250) {
                doc.addPage();
                yPos = 20;
              }
            }
          }
        }
      }
      
      // Finalize PDF
      const filename = `Messungen_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('PDF erfolgreich erstellt und heruntergeladen');
    } catch (error) {
      console.error('Fehler beim Erstellen des PDFs:', error);
      toast.error('Ein Fehler ist beim Erstellen des PDFs aufgetreten');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={generatePdf}
      disabled={measurements.length === 0 || isGenerating}
    >
      <Download className="h-4 w-4 mr-2" />
      {isGenerating ? 'Wird generiert...' : 'Als PDF exportieren'}
    </Button>
  );
};

export default ExportPdfButton;
