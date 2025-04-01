import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Measurement } from '@/types/measurements';
import { formatMeasurementValue, getMeasurementTypeDisplayName, getRoofElementsSummary, sortMeasurementsForExport } from './exportUtils';
import { calculatePVPower } from './pvCalculations';
import { addFonts } from './pdfFonts';

// Define the cover page data structure
export interface CoverPageData {
  title: string;
  companyName: string;
  projectNumber: string;
  projectAddress: string;
  clientName: string;
  contactPerson: string;
  creationDate: string;
  notes: string;
}

/**
 * Export measurements to PDF
 */
export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  coverData: CoverPageData
): Promise<boolean> => {
  try {
    // Initialize PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add custom fonts
    addFonts(doc);
    
    // Sort measurements for consistent display
    const sortedMeasurements = sortMeasurementsForExport(measurements);
    
    // Generate the PDF content
    await generateCoverPage(doc, coverData);
    
    // Add roof plan on page 2 directly under the header
    if ((measurements as any).roofPlan) {
      doc.addPage();
      addHeader(doc, coverData);
      
      // Add roof plan title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Dachplan - Übersicht', 15, 40);
      
      // Add the roof plan image below the header
      const roofPlanImg = (measurements as any).roofPlan;
      if (roofPlanImg) {
        // Calculate optimal scale to fit under header
        const imgProps = doc.getImageProperties(roofPlanImg);
        const availableWidth = doc.internal.pageSize.width - 30; // 15mm margins on each side
        const availableHeight = doc.internal.pageSize.height - 50; // Account for header and title
        
        // Calculate scale to fit within available space
        const scale = Math.min(
          availableWidth / imgProps.width,
          availableHeight / imgProps.height
        ) * 0.95; // 5% safety margin
        
        const imgWidth = imgProps.width * scale;
        const imgHeight = imgProps.height * scale;
        
        // Center the image horizontally
        const xPos = (doc.internal.pageSize.width - imgWidth) / 2;
        
        // Add the image
        doc.addImage(roofPlanImg, 'PNG', xPos, 45, imgWidth, imgHeight);
      }
    }
    
    // Generate measurement tables
    generateMeasurementTables(doc, sortedMeasurements);
    
    // Add area measurement details with screenshots
    generateAreaDetails(doc, sortedMeasurements, coverData);
    
    // Add custom screenshots if available
    generateCustomScreenshots(doc, sortedMeasurements, coverData);
    
    // Save the PDF
    doc.save(`Vermessungsbericht_${new Date().toISOString().split('T')[0]}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

/**
 * Generate the cover page of the PDF
 */
const generateCoverPage = async (
  doc: jsPDF,
  coverData: CoverPageData
): Promise<void> => {
  // Set font for title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  
  // Add title
  const title = coverData.title || 'Vermessungsbericht';
  const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
  const titleX = (doc.internal.pageSize.width - titleWidth) / 2;
  doc.text(title, titleX, 40);
  
  // Add company name
  doc.setFontSize(16);
  const companyName = coverData.companyName || '';
  const companyWidth = doc.getStringUnitWidth(companyName) * doc.getFontSize() / doc.internal.scaleFactor;
  const companyX = (doc.internal.pageSize.width - companyWidth) / 2;
  doc.text(companyName, companyX, 50);
  
  // Add horizontal line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(20, 60, doc.internal.pageSize.width - 20, 60);
  
  // Project details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  
  let yPos = 80;
  
  // Project number
  if (coverData.projectNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('Projektnummer:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(coverData.projectNumber, 70, yPos);
    yPos += 10;
  }
  
  // Project address
  if (coverData.projectAddress) {
    doc.setFont('helvetica', 'bold');
    doc.text('Objektadresse:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(coverData.projectAddress, 70, yPos);
    yPos += 10;
  }
  
  // Client name
  if (coverData.clientName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Auftraggeber:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(coverData.clientName, 70, yPos);
    yPos += 10;
  }
  
  // Contact person
  if (coverData.contactPerson) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ansprechpartner:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(coverData.contactPerson, 70, yPos);
    yPos += 10;
  }
  
  // Creation date
  if (coverData.creationDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Erstellungsdatum:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(coverData.creationDate, 70, yPos);
    yPos += 10;
  }
  
  // Notes
  if (coverData.notes) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Bemerkungen:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    
    // Split notes into multiple lines if needed
    const splitNotes = doc.splitTextToSize(
      coverData.notes,
      doc.internal.pageSize.width - 40
    );
    
    yPos += 10;
    doc.text(splitNotes, 20, yPos);
  }
  
  // Add footer with page number
  addFooter(doc);
};

/**
 * Add header to each page
 */
const addHeader = (doc: jsPDF, coverData: CoverPageData): void => {
  // Save current state
  const currentFontSize = doc.getFontSize();
  const currentFont = doc.getFont();
  
  // Set header font
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  // Add company name on left
  doc.text(coverData.companyName || '', 15, 15);
  
  // Add project info on right
  const projectInfo = `Projekt: ${coverData.projectNumber || ''}`;
  const projectInfoWidth = doc.getStringUnitWidth(projectInfo) * doc.getFontSize() / doc.internal.scaleFactor;
  doc.text(projectInfo, doc.internal.pageSize.width - 15 - projectInfoWidth, 15);
  
  // Add horizontal line
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(15, 20, doc.internal.pageSize.width - 15, 20);
  
  // Restore previous state
  doc.setFontSize(currentFontSize);
  doc.setFont(currentFont.fontName, currentFont.fontStyle);
};

/**
 * Add footer with page number to each page
 */
const addFooter = (doc: jsPDF): void => {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Save current state
    const currentFontSize = doc.getFontSize();
    const currentFont = doc.getFont();
    
    // Set footer font
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Add page number
    const text = `Seite ${i} von ${pageCount}`;
    const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
    const x = (doc.internal.pageSize.width - textWidth) / 2;
    const y = doc.internal.pageSize.height - 10;
    
    doc.text(text, x, y);
    
    // Restore previous state
    doc.setFontSize(currentFontSize);
    doc.setFont(currentFont.fontName, currentFont.fontStyle);
  }
};

/**
 * Generate measurement tables
 */
const generateMeasurementTables = (
  doc: jsPDF,
  measurements: Measurement[]
): void => {
  // Start a new page for measurement tables
  doc.addPage();
  
  // Add header
  addHeader(doc, {
    title: '',
    companyName: doc.getTextDimensions('').w > 0 ? doc.getTextDimensions('').text : '',
    projectNumber: '',
    projectAddress: '',
    clientName: '',
    contactPerson: '',
    creationDate: '',
    notes: ''
  });
  
  // Set title for measurement tables
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Messungen - Übersicht', 15, 40);
  
  // Get summary data
  const summary = getRoofElementsSummary(measurements);
  
  // Create summary table
  doc.setFontSize(10);
  doc.text('Zusammenfassung der Dacheinbauten:', 15, 50);
  
  // Create summary table with autotable
  (doc as any).autoTable({
    startY: 55,
    head: [['Element', 'Anzahl']],
    body: [
      ['Kamine', summary.chimneys.toString()],
      ['Dachfenster', summary.skylights.toString()],
      ['Lüfter', summary.vents.toString()],
      ['Dachhaken', summary.hooks.toString()],
      ['Sonstige Einbauten', summary.otherPenetrations.toString()],
      ['PV-Module', summary.pvModules > 0 ? `${summary.pvModules} (${summary.pvPower.toFixed(2)} kWp)` : '0']
    ],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 2
    },
    columnStyles: {
      0: { fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });
  
  // Get the Y position after the summary table
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  // Filter measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  const otherMeasurements = measurements.filter(m => 
    !['length', 'height', 'area'].includes(m.type)
  );
  
  let currentY = finalY + 15;
  
  // Length measurements table
  if (lengthMeasurements.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Längenmessungen:', 15, currentY);
    
    const lengthTableRows = lengthMeasurements.map((m, index) => {
      const value = m.label || `${m.value.toFixed(2)} m`;
      const inclination = m.inclination !== undefined ? `${Math.abs(m.inclination).toFixed(1)}°` : '';
      const description = m.description || '';
      
      return [
        (index + 1).toString(),
        description,
        value,
        inclination
      ];
    });
    
    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Nr.', 'Beschreibung', 'Länge (m)', 'Neigung']],
      body: lengthTableRows,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      margin: { left: 15, right: 15 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Height measurements table
  if (heightMeasurements.length > 0) {
    // Check if we need a new page
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      addHeader(doc, {
        title: '',
        companyName: doc.getTextDimensions('').w > 0 ? doc.getTextDimensions('').text : '',
        projectNumber: '',
        projectAddress: '',
        clientName: '',
        contactPerson: '',
        creationDate: '',
        notes: ''
      });
      currentY = 40;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Höhenmessungen:', 15, currentY);
    
    const heightTableRows = heightMeasurements.map((m, index) => {
      const value = m.label || `${m.value.toFixed(2)} m`;
      const description = m.description || '';
      
      return [
        (index + 1).toString(),
        description,
        value
      ];
    });
    
    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Nr.', 'Beschreibung', 'Höhe (m)']],
      body: heightTableRows,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      margin: { left: 15, right: 15 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Area measurements table
  if (areaMeasurements.length > 0) {
    // Check if we need a new page
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      addHeader(doc, {
        title: '',
        companyName: doc.getTextDimensions('').w > 0 ? doc.getTextDimensions('').text : '',
        projectNumber: '',
        projectAddress: '',
        clientName: '',
        contactPerson: '',
        creationDate: '',
        notes: ''
      });
      currentY = 40;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Flächenmessungen:', 15, currentY);
    
    const areaTableRows = areaMeasurements.map((m, index) => {
      const value = m.label || `${m.value.toFixed(2)} m²`;
      const description = m.description || '';
      
      // Add PV info if available
      let pvInfo = '';
      if (m.pvModuleInfo && m.pvModuleInfo.moduleCount > 0) {
        const power = calculatePVPower(m.pvModuleInfo.moduleCount);
        pvInfo = `${m.pvModuleInfo.moduleCount} Module (${power.toFixed(1)} kWp)`;
      }
      
      return [
        (index + 1).toString(),
        description,
        value,
        pvInfo
      ];
    });
    
    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Nr.', 'Beschreibung', 'Fläche (m²)', 'PV-Planung']],
      body: areaTableRows,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      margin: { left: 15, right: 15 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Other measurements table (penetrations, skylights, etc.)
  if (otherMeasurements.length > 0) {
    // Check if we need a new page
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      addHeader(doc, {
        title: '',
        companyName: doc.getTextDimensions('').w > 0 ? doc.getTextDimensions('').text : '',
        projectNumber: '',
        projectAddress: '',
        clientName: '',
        contactPerson: '',
        creationDate: '',
        notes: ''
      });
      currentY = 40;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Dacheinbauten und sonstige Messungen:', 15, currentY);
    
    const otherTableRows = otherMeasurements.map((m, index) => {
      const typeName = getMeasurementTypeDisplayName(m.type);
      const count = m.count || 1;
      const description = m.description || '';
      const value = formatMeasurementValue(m);
      
      return [
        (index + 1).toString(),
        typeName,
        count.toString(),
        description,
        value
      ];
    });
    
    (doc as any).autoTable({
      startY: currentY + 5,
      head: [['Nr.', 'Element', 'Anzahl', 'Beschreibung', 'Wert']],
      body: otherTableRows,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      margin: { left: 15, right: 15 }
    });
  }
  
  // Add footer with page numbers
  addFooter(doc);
};

/**
 * Generate area measurement details with screenshots
 */
const generateAreaDetails = (
  doc: jsPDF,
  measurements: Measurement[],
  coverData: CoverPageData
): void => {
  // Filter for area measurements
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  // Skip if no area measurements
  if (areaMeasurements.length === 0) {
    return;
  }
  
  // Start a new page for area details
  doc.addPage();
  addHeader(doc, coverData);
  
  // Set title for area details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Flächenmessungen - Details', 15, 40);
  
  let yPos = 50;
  
  // Process each area measurement
  for (let i = 0; i < areaMeasurements.length; i++) {
    const measurement = areaMeasurements[i];
    
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 100) {
      doc.addPage();
      addHeader(doc, coverData);
      yPos = 40;
    }
    
    // Area title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const areaTitle = measurement.description 
      ? `Fläche ${i + 1}: ${measurement.description}`
      : `Fläche ${i + 1}`;
    doc.text(areaTitle, 15, yPos);
    
    yPos += 8;
    
    // Area details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const areaValue = `Fläche: ${measurement.value.toFixed(2)} m²`;
    doc.text(areaValue, 15, yPos);
    
    // Add PV info if available
    if (measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0) {
      yPos += 6;
      const pvInfo = measurement.pvModuleInfo;
      const power = calculatePVPower(pvInfo.moduleCount);
      
      doc.text(`PV-Module: ${pvInfo.moduleCount} (${power.toFixed(1)} kWp)`, 15, yPos);
      yPos += 6;
      doc.text(`Modulgröße: ${pvInfo.moduleWidth.toFixed(3)}m × ${pvInfo.moduleHeight.toFixed(3)}m`, 15, yPos);
      yPos += 6;
      doc.text(`Ausrichtung: ${pvInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}`, 15, yPos);
      yPos += 6;
      doc.text(`Dachflächenabdeckung: ${pvInfo.coveragePercent.toFixed(1)}%`, 15, yPos);
    }
    
    yPos += 10;
    
    // Add screenshot if available
    if (measurement.screenshot || measurement.polygon2D) {
      const imgData = measurement.polygon2D || measurement.screenshot;
      
      if (imgData) {
        try {
          // Get image dimensions
          const imgProps = doc.getImageProperties(imgData);
          
          // Calculate dimensions to fit within page width
          const maxWidth = 180; // Max width in mm
          const maxHeight = 120; // Max height in mm
          
          let imgWidth = imgProps.width;
          let imgHeight = imgProps.height;
          
          // Scale down if needed
          if (imgWidth > maxWidth) {
            const scale = maxWidth / imgWidth;
            imgWidth = maxWidth;
            imgHeight = imgHeight * scale;
          }
          
          if (imgHeight > maxHeight) {
            const scale = maxHeight / imgHeight;
            imgHeight = maxHeight;
            imgWidth = imgWidth * scale;
          }
          
          // Check if we need a new page for the image
          if (yPos + imgHeight > doc.internal.pageSize.height - 20) {
            doc.addPage();
            addHeader(doc, coverData);
            yPos = 40;
          }
          
          // Center the image
          const xPos = (doc.internal.pageSize.width - imgWidth) / 2;
          
          // Add the image
          doc.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
          
          // Update yPos for next content
          yPos += imgHeight + 15;
        } catch (error) {
          console.error('Error adding image:', error);
          yPos += 10; // Add some space even if image fails
        }
      }
    }
    
    // Add some space between measurements
    yPos += 10;
  }
  
  // Add footer with page numbers
  addFooter(doc);
};

/**
 * Generate pages with custom screenshots
 */
const generateCustomScreenshots = (
  doc: jsPDF,
  measurements: Measurement[],
  coverData: CoverPageData
): void => {
  // Find measurements with custom screenshots
  const measurementsWithScreenshots = measurements.filter(
    m => m.customScreenshots && m.customScreenshots.length > 0
  );
  
  // Skip if no custom screenshots
  if (measurementsWithScreenshots.length === 0) {
    return;
  }
  
  // Start a new page for screenshots
  doc.addPage();
  addHeader(doc, coverData);
  
  // Set title for screenshots
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Zusätzliche Visualisierungen', 15, 40);
  
  let yPos = 50;
  
  // Process each measurement with screenshots
  for (let i = 0; i < measurementsWithScreenshots.length; i++) {
    const measurement = measurementsWithScreenshots[i];
    
    if (!measurement.customScreenshots || measurement.customScreenshots.length === 0) {
      continue;
    }
    
    // Process each screenshot
    for (let j = 0; j < measurement.customScreenshots.length; j++) {
      const screenshot = measurement.customScreenshots[j];
      
      // Check if we need a new page
      if (yPos > doc.internal.pageSize.height - 100) {
        doc.addPage();
        addHeader(doc, coverData);
        yPos = 40;
      }
      
      // Screenshot title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const title = measurement.description 
        ? `${getMeasurementTypeDisplayName(measurement.type)}: ${measurement.description}`
        : `${getMeasurementTypeDisplayName(measurement.type)} ${i + 1}`;
      doc.text(title, 15, yPos);
      
      yPos += 10;
      
      try {
        // Get image dimensions
        const imgProps = doc.getImageProperties(screenshot);
        
        // Calculate dimensions to fit within page width
        const maxWidth = 180; // Max width in mm
        const maxHeight = 120; // Max height in mm
        
        let imgWidth = imgProps.width;
        let imgHeight = imgProps.height;
        
        // Scale down if needed
        if (imgWidth > maxWidth) {
          const scale = maxWidth / imgWidth;
          imgWidth = maxWidth;
          imgHeight = imgHeight * scale;
        }
        
        if (imgHeight > maxHeight) {
          const scale = maxHeight / imgHeight;
          imgHeight = maxHeight;
          imgWidth = imgWidth * scale;
        }
        
        // Check if we need a new page for the image
        if (yPos + imgHeight > doc.internal.pageSize.height - 20) {
          doc.addPage();
          addHeader(doc, coverData);
          yPos = 40;
        }
        
        // Center the image
        const xPos = (doc.internal.pageSize.width - imgWidth) / 2;
        
        // Add the image
        doc.addImage(screenshot, 'PNG', xPos, yPos, imgWidth, imgHeight);
        
        // Update yPos for next content
        yPos += imgHeight + 20;
      } catch (error) {
        console.error('Error adding custom screenshot:', error);
        yPos += 10; // Add some space even if image fails
      }
    }
  }
  
  // Add footer with page numbers
  addFooter(doc);
};
