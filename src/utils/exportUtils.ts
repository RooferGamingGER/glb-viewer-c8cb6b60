
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';
import { calculatePVPower, calculateAnnualYield } from '@/utils/pvCalculations';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Format measurement value based on type
export const formatMeasurementValue = (measurement: Measurement): string => {
  if (!measurement.value && measurement.value !== 0) return '-';
  
  if (measurement.type === 'length' || measurement.type === 'height' || 
      measurement.type === 'ridge' || measurement.type === 'eave' || 
      measurement.type === 'verge' || measurement.type === 'valley' || 
      measurement.type === 'hip') {
    return `${measurement.value.toFixed(2)} m`;
  } else if (measurement.type === 'area' || measurement.type === 'solar') {
    return `${measurement.value.toFixed(2)} m²`;
  }
  
  return `${measurement.value.toFixed(2)}`;
};

// Calculate total area for measurements
export const calculateTotalArea = (measurements: Measurement[]): number => {
  return measurements
    .filter(m => m.type === 'area' || m.type === 'solar')
    .reduce((total, m) => total + (m.value || 0), 0);
};

// Group segments by type
export const groupSegmentsByType = (
  measurements: Measurement[]
): Record<string, { totalLength: number; count: number }> => {
  const result: Record<string, { totalLength: number; count: number }> = {};
  
  measurements.forEach(measurement => {
    if (!measurement.segments) return;
    
    measurement.segments.forEach(segment => {
      const type = segment.type || 'custom';
      
      if (!result[type]) {
        result[type] = { totalLength: 0, count: 0 };
      }
      
      result[type].totalLength += segment.length;
      result[type].count += 1;
    });
  });
  
  return result;
};

// Get display name for measurement type
export const getMeasurementTypeDisplayName = (type: string): string => {
  const displayNames: Record<string, string> = {
    'length': 'Länge',
    'height': 'Höhe',
    'area': 'Fläche',
    'solar': 'PV-Fläche',
    'ridge': 'First',
    'eave': 'Traufe',
    'verge': 'Ortgang',
    'valley': 'Kehle',
    'hip': 'Grat',
    'chimney': 'Kamin',
    'skylight': 'Dachfenster',
    'vent': 'Lüfter',
    'hook': 'Dachhaken',
    'other': 'Sonstiges'
  };
  
  return displayNames[type] || type;
};

// Get display name for segment type
export const getSegmentTypeDisplayName = (type?: string): string => {
  if (!type) return 'Custom';
  
  const displayNames: Record<string, string> = {
    'first': 'First',
    'grat': 'Grat',
    'kehle': 'Kehle',
    'traufe': 'Traufe',
    'ortgang': 'Ortgang',
    'custom': 'Benutzerdefiniert'
  };
  
  return displayNames[type] || type;
};

// Consolidate penetrations for roof plan
export const consolidatePenetrations = (
  measurements: Measurement[]
): Record<string, Measurement[]> => {
  return {
    chimneys: measurements.filter(m => m.type === 'chimney'),
    skylights: measurements.filter(m => m.type === 'skylight'),
    vents: measurements.filter(m => m.type === 'vent'),
    hooks: measurements.filter(m => m.type === 'hook'),
    other: measurements.filter(m => m.type === 'other')
  };
};

// Calculate scale factor for roof plan rendering
export const calculateRoofPlanScaleFactor = (
  measurements: Measurement[],
  maxWidth: number = 190,
  maxHeight: number = 140
): number => {
  // Extract all points from measurements
  const allPoints: THREE.Vector3[] = [];
  measurements.forEach(m => {
    m.points.forEach(p => {
      allPoints.push(new THREE.Vector3(p.x, p.y, p.z));
    });
  });
  
  if (allPoints.length === 0) return 1;
  
  // Calculate bounding box
  const bbox = new THREE.Box3().setFromPoints(allPoints);
  const size = bbox.getSize(new THREE.Vector3());
  
  // Calculate scale to fit within max dimensions
  const scaleX = maxWidth / size.x;
  const scaleZ = maxHeight / size.z;
  
  // Use the smaller scale to ensure it fits
  return Math.min(scaleX, scaleZ) * 0.9; // Add 10% margin
};

// Get summary of roof elements
export const getRoofElementsSummary = (
  measurements: Measurement[]
): Record<string, { count: number; totalLength: number }> => {
  const result: Record<string, { count: number; totalLength: number }> = {
    'ridge': { count: 0, totalLength: 0 },
    'eave': { count: 0, totalLength: 0 },
    'verge': { count: 0, totalLength: 0 },
    'valley': { count: 0, totalLength: 0 },
    'hip': { count: 0, totalLength: 0 }
  };
  
  measurements.forEach(m => {
    const type = m.type as string;
    if (result[type]) {
      result[type].count += 1;
      result[type].totalLength += m.value || 0;
    }
  });
  
  return result;
};

// Export measurements to CSV
export const exportMeasurementsToCSV = (measurements: Measurement[]): string => {
  const headers = ['Type', 'Name', 'Value', 'Unit'];
  const rows = measurements.map(m => {
    const unit = (m.type === 'area' || m.type === 'solar') ? 'm²' : 'm';
    return [
      getMeasurementTypeDisplayName(m.type),
      m.name || '',
      m.value?.toFixed(2) || '',
      unit
    ];
  });
  
  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
};

// Export measurements to a PDF report
export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  measurementGroups: THREE.Group[],
  projectInfo: {
    projectName?: string;
    clientName?: string;
    address?: string;
    date?: string;
    notes?: string;
    logo?: string;
  } = {}
) => {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add metadata
  doc.setProperties({
    title: 'Measurement Report',
    subject: projectInfo.projectName || 'Roof Measurement Report',
    author: 'RoofVision',
    creator: 'RoofVision'
  });
  
  // Add header with company logo and project info
  addHeader(doc, projectInfo);
  
  // Add project information
  addProjectInfo(doc, projectInfo);
  
  // Add summary section for PV measurements if any exist
  const pvMeasurements = measurements.filter(m => m.type === 'solar');
  if (pvMeasurements.length > 0) {
    addPVSummary(doc, pvMeasurements);
  }
  
  // Add measurement tables
  addMeasurementTables(doc, measurements);
  
  // Create thumbnail images from measurement groups
  const thumbnails = []
  
  // Add footer with page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  // Save the PDF
  return doc.save('measurements-report.pdf');
};

// Add header to PDF with logo and company information
const addHeader = (doc: jsPDF, projectInfo: any) => {
  // Add logo if provided
  if (projectInfo.logo) {
    try {
      // Position logo in top left
      doc.addImage(projectInfo.logo, 'JPEG', 10, 10, 40, 20, undefined, 'FAST');
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }
  
  // Add title
  doc.setFontSize(20);
  doc.setTextColor(0, 100, 150);
  doc.text('Measurement Report', 105, 20, { align: 'center' });
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(projectInfo.date || new Date().toLocaleDateString(), 195, 20, { align: 'right' });
  
  // Add horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(10, 30, 200, 30);
};

// Add project information section
const addProjectInfo = (doc: jsPDF, projectInfo: any) => {
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  let yPos = 40;
  
  if (projectInfo.projectName) {
    doc.text(`Project: ${projectInfo.projectName}`, 10, yPos);
    yPos += 8;
  }
  
  if (projectInfo.clientName) {
    doc.text(`Client: ${projectInfo.clientName}`, 10, yPos);
    yPos += 8;
  }
  
  if (projectInfo.address) {
    doc.text(`Location: ${projectInfo.address}`, 10, yPos);
    yPos += 8;
  }
  
  if (projectInfo.notes) {
    doc.setFontSize(10);
    doc.text('Notes:', 10, yPos);
    yPos += 5;
    
    // Split notes into multiple lines if needed
    const splitNotes = doc.splitTextToSize(projectInfo.notes, 180);
    doc.text(splitNotes, 15, yPos);
    yPos += splitNotes.length * 5 + 5;
  }
  
  return yPos; // Return the current Y position
};

// Add PV summary section for PV measurements
const addPVSummary = (doc: jsPDF, pvMeasurements: Measurement[]) => {
  doc.addPage();
  
  // Add title
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 150);
  doc.text('PV System Overview', 105, 20, { align: 'center' });
  
  let yPos = 30;
  
  // Calculate total system size
  let totalModules = 0;
  let totalPower = 0;
  let totalArea = 0;
  
  pvMeasurements.forEach(measurement => {
    if (measurement.pvModuleInfo) {
      totalModules += measurement.pvModuleInfo.moduleCount;
      totalPower += calculatePVPower(
        measurement.pvModuleInfo.moduleCount,
        measurement.pvModuleInfo.pvModuleSpec?.power || 425
      );
      totalArea += measurement.value || 0;
    }
  });
  
  // Draw summary box
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(10, yPos, 190, 30, 3, 3, 'F');
  
  // Add summary data
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  // Left column
  doc.text(`Total Modules: ${totalModules}`, 20, yPos + 10);
  doc.text(`Total System Size: ${totalPower.toFixed(2)} kWp`, 20, yPos + 20);
  
  // Right column
  doc.text(`Total Area: ${totalArea.toFixed(2)} m²`, 120, yPos + 10);
  doc.text(`Estimated Annual Yield: ${(totalPower * 950).toFixed(0)} kWh/year`, 120, yPos + 20);
  
  yPos += 40;
  
  // Add PV System details table
  doc.setFontSize(14);
  doc.setTextColor(0, 100, 150);
  doc.text('PV Areas', 10, yPos);
  yPos += 10;
  
  // @ts-ignore - jspdf-autotable types
  doc.autoTable({
    startY: yPos,
    head: [['Area Name', 'Area (m²)', 'Module Count', 'System Size (kWp)', 'Est. Yield (kWh/y)']],
    body: pvMeasurements.map(measurement => [
      measurement.name || 'PV Area',
      measurement.value?.toFixed(2) || '-',
      measurement.pvModuleInfo?.moduleCount || '-',
      ((measurement.pvModuleInfo?.moduleCount || 0) * (measurement.pvModuleInfo?.pvModuleSpec?.power || 425) / 1000).toFixed(2),
      ((measurement.pvModuleInfo?.moduleCount || 0) * (measurement.pvModuleInfo?.pvModuleSpec?.power || 425) / 1000 * 950).toFixed(0)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [0, 100, 150],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10
    }
  });
  
  // Get the final Y position
  // @ts-ignore - jspdf-autotable types
  yPos = doc.previousAutoTable.finalY + 10;
  
  // Add PV materials section if available
  const measurementsWithMaterials = pvMeasurements.filter(m => m.pvModuleInfo?.pvMaterials);
  
  if (measurementsWithMaterials.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 100, 150);
    doc.text('Material Requirements', 10, yPos);
    yPos += 10;
    
    // Combine all materials
    let totalModuleCount = 0;
    let totalPowerOutput = 0;
    let totalRailLength = 0;
    let totalRoofHooks = 0;
    let totalMiddleClamps = 0;
    let totalEndClamps = 0;
    let totalRailConnectors = 0;
    let totalStringCable = 0;
    let totalMainCable = 0;
    let totalAcCable = 0;
    let totalConnectorPairs = 0;
    let totalInverters = 0;
    
    measurementsWithMaterials.forEach(measurement => {
      const materials = measurement.pvModuleInfo?.pvMaterials;
      if (!materials) return;
      
      totalModuleCount += materials.totalModuleCount;
      totalPowerOutput += materials.totalPower;
      totalRailLength += materials.mountingSystem.railLength;
      totalRoofHooks += materials.mountingSystem.roofHookCount;
      totalMiddleClamps += materials.mountingSystem.middleClampCount;
      totalEndClamps += materials.mountingSystem.endClampCount;
      totalRailConnectors += materials.mountingSystem.railConnectorCount;
      totalStringCable += materials.electricalSystem.stringCableLength;
      totalMainCable += materials.electricalSystem.mainCableLength;
      totalAcCable += materials.electricalSystem.acCableLength;
      totalConnectorPairs += materials.electricalSystem.connectorPairCount;
      totalInverters += materials.electricalSystem.inverterCount;
    });
    
    // @ts-ignore - jspdf-autotable types
    doc.autoTable({
      startY: yPos,
      head: [['Material', 'Quantity', 'Unit']],
      body: [
        ['PV Modules', totalModuleCount, 'pcs'],
        ['System Size', totalPowerOutput.toFixed(2), 'kWp'],
        ['Mounting Rails', totalRailLength, 'm'],
        ['Roof Hooks', totalRoofHooks, 'pcs'],
        ['Middle Clamps', totalMiddleClamps, 'pcs'],
        ['End Clamps', totalEndClamps, 'pcs'],
        ['Rail Connectors', totalRailConnectors, 'pcs'],
        ['String Cable', totalStringCable, 'm'],
        ['Main DC Cable', totalMainCable, 'm'],
        ['AC Cable', totalAcCable, 'm'],
        ['Connector Pairs', totalConnectorPairs, 'pcs'],
        ['Inverters', totalInverters, 'pcs']
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [0, 100, 150],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      }
    });
    
    // @ts-ignore - jspdf-autotable types
    yPos = doc.previousAutoTable.finalY + 10;
    
    // Add disclaimer
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Disclaimer: This is an automated estimation and should be verified by a professional before ordering materials.', 105, yPos, { align: 'center' });
  }
};

// Add measurement tables grouped by type
const addMeasurementTables = (doc: jsPDF, measurements: Measurement[]) => {
  doc.addPage();
  
  // Add title
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 150);
  doc.text('Detailed Measurements', 105, 20, { align: 'center' });
  
  let yPos = 30;
  
  // Group measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  const roofElements = measurements.filter(m => 
    m.type === 'ridge' || m.type === 'eave' || m.type === 'verge' || 
    m.type === 'valley' || m.type === 'hip'
  );
  
  // Add length measurements table
  if (lengthMeasurements.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0, 100, 150);
    doc.text('Length Measurements', 10, yPos);
    yPos += 10;
    
    // @ts-ignore - jspdf-autotable types
    doc.autoTable({
      startY: yPos,
      head: [['Name', 'Length (m)']],
      body: lengthMeasurements.map(m => [m.name || 'Length', m.value?.toFixed(2) || '-']),
      theme: 'grid',
      headStyles: {
        fillColor: [33, 150, 243],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      }
    });
    
    // @ts-ignore - jspdf-autotable types
    yPos = doc.previousAutoTable.finalY + 15;
  }
  
  // Add height measurements table
  if (heightMeasurements.length > 0) {
    // Check if we need to add a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 100, 150);
    doc.text('Height Measurements', 10, yPos);
    yPos += 10;
    
    // @ts-ignore - jspdf-autotable types
    doc.autoTable({
      startY: yPos,
      head: [['Name', 'Height (m)']],
      body: heightMeasurements.map(m => [m.name || 'Height', m.value?.toFixed(2) || '-']),
      theme: 'grid',
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      }
    });
    
    // @ts-ignore - jspdf-autotable types
    yPos = doc.previousAutoTable.finalY + 15;
  }
  
  // Add area measurements table
  if (areaMeasurements.length > 0) {
    // Check if we need to add a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 100, 150);
    doc.text('Area Measurements', 10, yPos);
    yPos += 10;
    
    // @ts-ignore - jspdf-autotable types
    doc.autoTable({
      startY: yPos,
      head: [['Name', 'Area (m²)']],
      body: areaMeasurements.map(m => [m.name || 'Area', m.value?.toFixed(2) || '-']),
      theme: 'grid',
      headStyles: {
        fillColor: [255, 152, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      }
    });
    
    // @ts-ignore - jspdf-autotable types
    yPos = doc.previousAutoTable.finalY + 15;
  }
  
  // Add roof elements table
  if (roofElements.length > 0) {
    // Check if we need to add a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 100, 150);
    doc.text('Roof Elements', 10, yPos);
    yPos += 10;
    
    // @ts-ignore - jspdf-autotable types
    doc.autoTable({
      startY: yPos,
      head: [['Name', 'Type', 'Length (m)']],
      body: roofElements.map(m => [
        m.name || 'Element', 
        m.type.charAt(0).toUpperCase() + m.type.slice(1), // Capitalize type
        m.value?.toFixed(2) || '-'
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [255, 87, 34],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      }
    });
  }
};

// Add footer with page numbers
const addFooter = (doc: jsPDF, currentPage: number, totalPages: number) => {
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${currentPage} of ${totalPages}`, 105, 290, { align: 'center' });
  doc.text('Generated by RoofVision', 190, 290, { align: 'right' });
};
