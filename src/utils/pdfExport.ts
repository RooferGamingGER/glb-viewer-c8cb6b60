
import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';

export interface PdfExportOptions {
  title?: string;
  includeDateTime?: boolean;
  showLogo?: boolean;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

const defaultOptions: PdfExportOptions = {
  title: 'Messungen',
  includeDateTime: true,
  showLogo: true,
  pageSize: 'a4',
  orientation: 'portrait'
};

export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  options: PdfExportOptions = defaultOptions
): Promise<boolean> => {
  try {
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create a container for the PDF content
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.padding = '20px';
    container.style.color = '#333';
    
    // Add header with title and date
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.style.borderBottom = '1px solid #ddd';
    header.style.paddingBottom = '10px';
    container.appendChild(header);
    
    // Add logo if requested
    if (mergedOptions.showLogo) {
      const logoContainer = document.createElement('div');
      logoContainer.style.float = 'left';
      logoContainer.style.marginRight = '20px';
      logoContainer.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4" fill="#4F46E5"/>
          <path d="M7 12H17M12 7V17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      header.appendChild(logoContainer);
    }
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = mergedOptions.title || 'Messungen';
    title.style.fontSize = '24px';
    title.style.fontWeight = 'bold';
    title.style.margin = '0 0 5px 0';
    header.appendChild(title);
    
    // Add date if requested
    if (mergedOptions.includeDateTime) {
      const date = document.createElement('div');
      date.textContent = new Date().toLocaleString('de-DE');
      date.style.fontSize = '12px';
      date.style.color = '#666';
      header.appendChild(date);
    }
    
    // Clear float
    const clearFloat = document.createElement('div');
    clearFloat.style.clear = 'both';
    header.appendChild(clearFloat);
    
    // Filter measurements by type
    const lengthMeasurements = measurements.filter(m => m.type === 'length');
    const heightMeasurements = measurements.filter(m => m.type === 'height');
    const areaMeasurements = measurements.filter(m => m.type === 'area');
    
    // Add measurement summary
    const summary = document.createElement('div');
    summary.style.marginBottom = '20px';
    summary.innerHTML = `
      <p><strong>Zusammenfassung:</strong></p>
      <p>Gesamtanzahl: ${measurements.length} Messungen</p>
      <p>Längenmessungen: ${lengthMeasurements.length}</p>
      <p>Höhenmessungen: ${heightMeasurements.length}</p>
      <p>Flächenmessungen: ${areaMeasurements.length}</p>
    `;
    container.appendChild(summary);
    
    // Function to create table for measurements
    const createMeasurementTable = (measurements: Measurement[], title: string, columns: string[]) => {
      if (measurements.length === 0) return null;
      
      const section = document.createElement('div');
      section.style.marginBottom = '20px';
      
      const sectionTitle = document.createElement('h2');
      sectionTitle.textContent = title;
      sectionTitle.style.fontSize = '18px';
      sectionTitle.style.marginBottom = '10px';
      section.appendChild(sectionTitle);
      
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginBottom = '20px';
      
      // Create table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        th.style.backgroundColor = '#f3f4f6';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.border = '1px solid #ddd';
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      
      measurements.forEach((measurement, index) => {
        const row = document.createElement('tr');
        
        // First column is always the number
        const numCell = document.createElement('td');
        numCell.textContent = (index + 1).toString();
        numCell.style.padding = '8px';
        numCell.style.border = '1px solid #ddd';
        row.appendChild(numCell);
        
        // Value column
        const valueCell = document.createElement('td');
        valueCell.textContent = measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`;
        valueCell.style.padding = '8px';
        valueCell.style.border = '1px solid #ddd';
        row.appendChild(valueCell);
        
        // Add inclination for length measurements
        if (measurement.type === 'length' && columns.includes('Neigung')) {
          const inclinationCell = document.createElement('td');
          inclinationCell.textContent = measurement.inclination !== undefined 
            ? `${Math.abs(measurement.inclination).toFixed(1)}°` 
            : '–';
          inclinationCell.style.padding = '8px';
          inclinationCell.style.border = '1px solid #ddd';
          row.appendChild(inclinationCell);
        }
        
        // Description column
        const descCell = document.createElement('td');
        descCell.textContent = measurement.description || '–';
        descCell.style.padding = '8px';
        descCell.style.border = '1px solid #ddd';
        row.appendChild(descCell);
        
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      section.appendChild(table);
      
      // Add segment tables for area measurements
      if (title === 'Flächenmessungen') {
        measurements.forEach((measurement, mIndex) => {
          if (measurement.segments && measurement.segments.length > 0) {
            const segmentTitle = document.createElement('h3');
            segmentTitle.textContent = `Segmente für Fläche ${mIndex + 1}`;
            segmentTitle.style.fontSize = '14px';
            segmentTitle.style.marginTop = '10px';
            segmentTitle.style.marginBottom = '5px';
            segmentTitle.style.marginLeft = '20px';
            section.appendChild(segmentTitle);
            
            const segmentTable = document.createElement('table');
            segmentTable.style.width = 'calc(100% - 40px)';
            segmentTable.style.marginLeft = '20px';
            segmentTable.style.borderCollapse = 'collapse';
            segmentTable.style.marginBottom = '20px';
            
            // Segment table header
            const segmentThead = document.createElement('thead');
            const segmentHeaderRow = document.createElement('tr');
            
            ['Segment', 'Länge'].forEach(column => {
              const th = document.createElement('th');
              th.textContent = column;
              th.style.backgroundColor = '#f3f4f6';
              th.style.padding = '8px';
              th.style.textAlign = 'left';
              th.style.border = '1px solid #ddd';
              segmentHeaderRow.appendChild(th);
            });
            
            segmentThead.appendChild(segmentHeaderRow);
            segmentTable.appendChild(segmentThead);
            
            // Segment table body
            const segmentTbody = document.createElement('tbody');
            
            measurement.segments.forEach((segment, sIndex) => {
              const segmentRow = document.createElement('tr');
              
              // Segment number
              const segmentNumCell = document.createElement('td');
              segmentNumCell.textContent = (sIndex + 1).toString();
              segmentNumCell.style.padding = '8px';
              segmentNumCell.style.border = '1px solid #ddd';
              segmentRow.appendChild(segmentNumCell);
              
              // Segment length
              const segmentLengthCell = document.createElement('td');
              segmentLengthCell.textContent = `${segment.length.toFixed(2)} m`;
              segmentLengthCell.style.padding = '8px';
              segmentLengthCell.style.border = '1px solid #ddd';
              segmentRow.appendChild(segmentLengthCell);
              
              segmentTbody.appendChild(segmentRow);
            });
            
            segmentTable.appendChild(segmentTbody);
            section.appendChild(segmentTable);
          }
        });
      }
      
      return section;
    };
    
    // Add length measurements table
    const lengthTable = createMeasurementTable(
      lengthMeasurements, 
      'Längenmessungen', 
      ['Nr.', 'Wert', 'Neigung', 'Beschreibung']
    );
    if (lengthTable) container.appendChild(lengthTable);
    
    // Add height measurements table
    const heightTable = createMeasurementTable(
      heightMeasurements, 
      'Höhenmessungen', 
      ['Nr.', 'Wert', 'Beschreibung']
    );
    if (heightTable) container.appendChild(heightTable);
    
    // Add area measurements table
    const areaTable = createMeasurementTable(
      areaMeasurements, 
      'Flächenmessungen', 
      ['Nr.', 'Wert', 'Beschreibung']
    );
    if (areaTable) container.appendChild(areaTable);
    
    // Add footer
    const footer = document.createElement('div');
    footer.style.marginTop = '30px';
    footer.style.borderTop = '1px solid #ddd';
    footer.style.paddingTop = '10px';
    footer.style.fontSize = '10px';
    footer.style.color = '#666';
    footer.style.textAlign = 'center';
    footer.textContent = `Erstellt am ${new Date().toLocaleDateString('de-DE')}`;
    container.appendChild(footer);
    
    // Configure html2pdf options
    const pdfOptions = {
      margin: 10,
      filename: `Messungen_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        unit: 'mm', 
        format: mergedOptions.pageSize, 
        orientation: mergedOptions.orientation
      }
    };
    
    // Generate the PDF
    document.body.appendChild(container);
    await html2pdf().from(container).set(pdfOptions).save();
    document.body.removeChild(container);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
