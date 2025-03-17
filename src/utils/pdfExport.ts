import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';

export interface CoverPageData {
  title: string;
  companyName: string;
  projectAddress: string;
  contactPerson: string;
  droneDate: string;
  notes: string;
}

// Base64-encoded logo image for reliable embedding in PDF
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD8klEQVR4nO1XW2xMQRT9JBJPa0NEUEoVD4KI/BCPxI94WIhI2N1qqe2KiIiERDy70YhHgl/BRkR8LIk/QYgQm1pNqZZ4x0NVVVcpvVp3WmPunVnzuHdm785Upb3JyWZzZ+75zjn3zMwdSfqPLKMbtP4JGO4TaOsRrB/BJLrr+Aa3mwCXnUD5SWD5MWDhYSDL2uu4qcf+M8D4RmDkfUB6ApjytLezFiZidBOQvQd4t0P00/iBz0i8ZOODyNiJXyQX9gKrzzgL6KLdYGCPTM4Kpzd7gOwWIK0FSG0GXNcSL0BmBr19QNk5Z+GHGoCRbLyWw1+jtRDI2QOsPOEsvpTSs/w6m+MHlXQ6+UmcWfGcxLHHyiVcQFN39IG1jwE5LYGKNwyAq8FZ/MQnwNQnWtGO62TjScCt2L8DSIGY8Jze/DYguw3IogbJBDNZfQxYb+FMVNe0fPO9gDfHGK45YpxA/TXA3a417jv8/TDj3UDdDft5rr0KPOoFEd22AKWfQ4uvugCMtWgmmFHxpwXPqcbf/2yTwgLw6IvWcMvdwqSvMMr6aCpWLvcAm18E5n35VWDKs9CcO14BSw4DYxoASrJoBkj8iGYFxPq9FTmcSDYfuQckH7GfY0MvMOoekMQnwE0tfBWm7lQgXoDvPkCzgPk7lSy58Oim3YD4SGB6GxmfwbQT2PjQXjw3sFyI5+K9a54ZZyDdAgqPmhvP8f0Bs/7vP7XvWO5dRdwAujK7zQ1/zg7QCZQ0iiaCwuGqMxFHbwdIthb/0AektrMB+URWnzduXm5WOum0lsAJpLYIRXzI+AQUxOQWWq6KeHIrMLXHeG7eQaUZK5oH5DQJRbyjfLYnrwVpvAIJD5xEk9GC50BNK7DwRXDM+/f2TZdPQOw9gB4gvYXMbxPiea+Ck5nYzHXyOhCLZqJdDaCTSDwc+PuoPRHnHzYWTycgt43EtwniW4R7jfEK4LGJeC6WtHr77VyvENOcbCKcyUqLJoJikYGsrlKJr+OGEWKKr5rFV2vxpefNoZBOXdvMgIl4e/Ec3ZeB8feMxXNhc46LGHxSWJmJWKMQQmOdKyGI52ZLbhLFc3rzFXHnmBDC4m0s3kA8n8ScvaExRPGLLcJKlJ61qeZkKC9EwRdIvL1wI/FVJ41jnK0VcXwLbWQMhyL03hIvQhDfEHrhRvvZeK1wLvrxXfHv3NL9sVLM0JLzgXe7UOPphY+LWcPZeO5vUx7aij87ZL1lhiv4uV/71a1uUyNmIa0H2HYh9mSGK7Y/ANZeoOc3Q2XSf0QCPwFMnCZVVryuPwAAAABJRU5ErkJggg==";

export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  coverData: CoverPageData
): Promise<boolean> => {
  try {
    // Create a container for the PDF content
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.padding = '20px';
    container.style.color = '#000000';
    container.style.position = 'relative';
    
    // Create and add styles for page layouts
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .pdf-page {
        position: relative;
        page-break-after: always;
        padding-bottom: 10mm;
      }
      .pdf-last-page {
        page-break-after: avoid;
      }
      .logo-centered {
        position: absolute;
        top: 20%; /* Platzierung etwas weiter oben, da es das Logo ist */
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        text-align: center; /* Sicherstellen, dass der Text innerhalb des Containers zentriert ist */
      }
      .logo-container {
        text-align: center;
        margin-bottom: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .logo-image {
        display: flex;
        align-items: center;
        white-space: nowrap;
      }
      .logo-icon {
        height: 32px;
        width: auto;
        margin-right: 10px;
      }
      .logo-text {
        font-size: 32px;
        font-weight: bold;
        color: #333;
        white-space: nowrap;
      }
      .company-info {
        text-align: center;
        margin-bottom: 40px;
        color: #333;
        line-height: 1.6;
      }
      .company-slogan {
        font-style: italic;
        margin-top: 15px;
        color: #555;
        font-size: 14px;
      }
      .cover-upper {
        margin-bottom: 70px;
      }
      .cover-lower {
        margin-top: 70px;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Add container to document before building content
    document.body.appendChild(container);
    
    // Create cover page without footer
    const coverPage = document.createElement('div');
    coverPage.className = 'pdf-page';
    coverPage.appendChild(createCoverPage(coverData));
    container.appendChild(coverPage);
    
    // Create measurement data section without footer
    const dataPage = document.createElement('div');
    dataPage.className = 'pdf-page';
    dataPage.appendChild(createMeasurementDataSection(measurements));
    container.appendChild(dataPage);
    
    // Add area measurement details without footer if needed
    if (measurements.filter(m => m.type === 'area').length > 0) {
      const areaPage = document.createElement('div');
      areaPage.className = 'pdf-page pdf-last-page'; // Last page doesn't need page break
      areaPage.appendChild(createAreaDetailsSection(measurements));
      container.appendChild(areaPage);
    }
    
    // Configure html2pdf options
    const pdfOptions = {
      margin: [15, 15, 15, 15], // [top, right, bottom, left]
      filename: `DrohnenGLB_Messung_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2.5,
        useCORS: true,
        logging: true,
        letterRendering: true,
        windowWidth: 1200 
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    
    // Add a longer delay to ensure DOM rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate the PDF
    await html2pdf().from(container).set(pdfOptions).save();
    
    // Clean up
    document.body.removeChild(container);
    document.head.removeChild(styleElement);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Clean up in case of error
    const container = document.querySelector('.pdf-container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    const styleElement = document.querySelector('style');
    if (styleElement && styleElement.textContent.includes('pdf-page')) {
      document.head.removeChild(styleElement);
    }
    return false;
  }
};

const createCoverPage = (coverData: CoverPageData): HTMLElement => {
  const coverPage = document.createElement('div');
  coverPage.style.height = '100%';
  coverPage.style.display = 'flex';
  coverPage.style.flexDirection = 'column';
  coverPage.style.padding = '20px';

  // Upper half of cover page - Company logo and info
  const upperHalf = document.createElement('div');
  upperHalf.className = 'cover-upper';
  upperHalf.style.marginBottom = '70px';
  
  // Logo container with flex layout
  const logoContainer = document.createElement('div');
  logoContainer.className = 'logo-container';
  
  // Create a wrapper for logo and text with flex layout
  const logoImage = document.createElement('div');
  logoImage.className = 'logo-image';
  
  // Create and add the logo icon using Base64 data
  const logoIcon = document.createElement('img');
  logoIcon.className = 'logo-icon';
  logoIcon.src = LOGO_BASE64; // Use Base64 data instead of URL path
  logoIcon.alt = 'DrohnenGLB Logo';
  logoIcon.style.height = '32px'; // Match text height
  logoIcon.style.width = 'auto';
  logoIcon.style.marginRight = '10px';
  logoImage.appendChild(logoIcon);
  
  // Create and add the logo text
  const logoText = document.createElement('span');
  logoText.className = 'logo-text';
  logoText.textContent = 'DrohnenGLB by RooferGaming®';
  logoImage.appendChild(logoText);
  
  logoContainer.appendChild(logoImage);
  upperHalf.appendChild(logoContainer);
  
  // Company information section with vertical alignment
  const companyInfo = document.createElement('div');
  companyInfo.className = 'company-info';
  
  const websiteInfo1 = document.createElement('div');
  websiteInfo1.style.marginBottom = '8px';
  websiteInfo1.style.fontSize = '14px';
  websiteInfo1.textContent = 'GLB Viewer: drohnenglb.de';
  companyInfo.appendChild(websiteInfo1);
  
  const websiteInfo2 = document.createElement('div');
  websiteInfo2.style.marginBottom = '8px';
  websiteInfo2.style.fontSize = '14px';
  websiteInfo2.textContent = 'Drohnenaufmaß: drohnenvermessung-roofergaming.de';
  companyInfo.appendChild(websiteInfo2);
  
  const emailInfo = document.createElement('div');
  emailInfo.style.marginBottom = '15px';
  emailInfo.style.fontSize = '14px';
  emailInfo.textContent = 'Email: info@drohnenvermessung-roofergaming.de';
  companyInfo.appendChild(emailInfo);
  
  const companySlogan = document.createElement('div');
  companySlogan.className = 'company-slogan';
  companySlogan.style.fontSize = '14px';
  companySlogan.textContent = 'Fliegen - Digitalisieren - tolle Ergebnisse';
  companyInfo.appendChild(companySlogan);
  
  upperHalf.appendChild(companyInfo);
  coverPage.appendChild(upperHalf);
  
  // Cover title - centered
  const coverHeader = document.createElement('div');
  coverHeader.style.textAlign = 'center';
  coverHeader.style.marginBottom = '50px';

  const coverTitle = document.createElement('h1');
  coverTitle.textContent = coverData.title || 'Vermessungsbericht';
  coverTitle.style.fontSize = '28px';
  coverTitle.style.fontWeight = 'bold';
  coverTitle.style.marginBottom = '15px';
  coverTitle.style.color = '#000000';
  coverHeader.appendChild(coverTitle);

  const exportDate = document.createElement('div');
  exportDate.textContent = `Erstellt am: ${new Date().toLocaleDateString('de-DE')}`;
  exportDate.style.fontSize = '14px';
  exportDate.style.color = '#555';
  coverHeader.appendChild(exportDate);

  coverPage.appendChild(coverHeader);
  
  // Lower half - User information
  const lowerHalf = document.createElement('div');
  lowerHalf.className = 'cover-lower';
  lowerHalf.style.flex = '1';
  
  const infoWrapper = document.createElement('div');
  infoWrapper.style.maxWidth = '100%';
  infoWrapper.style.width = '100%';
  infoWrapper.style.margin = '0 auto';
  infoWrapper.style.padding = '10px 0';
  infoWrapper.style.borderTop = '1px solid #eee';
  infoWrapper.style.paddingTop = '30px';
  
  // Create table for layout with full width
  const infoTable = document.createElement('table');
  infoTable.style.width = '100%';
  infoTable.style.borderCollapse = 'collapse';
  
  // Create table rows for each piece of information
  const createInfoRow = (label: string, value: string) => {
    if (!value) return null;
    
    const row = document.createElement('tr');
    row.style.marginBottom = '25px';
    row.style.verticalAlign = 'top';
    
    const labelCell = document.createElement('td');
    labelCell.style.width = '40%';
    labelCell.style.paddingBottom = '25px';
    labelCell.style.paddingRight = '20px';
    labelCell.style.fontWeight = 'normal';
    labelCell.style.color = '#666';
    labelCell.style.fontSize = '16px';
    labelCell.textContent = label;
    row.appendChild(labelCell);
    
    const valueCell = document.createElement('td');
    valueCell.style.width = '60%';
    valueCell.style.paddingBottom = '25px';
    valueCell.style.fontWeight = 'bold';
    valueCell.style.fontSize = '20px';
    valueCell.style.color = '#000000';
    valueCell.textContent = value || '';
    row.appendChild(valueCell);
    
    return row;
  };
  
  // Add rows for each field
  const companyRow = createInfoRow('Name des Betriebes', coverData.companyName);
  if (companyRow) infoTable.appendChild(companyRow);
  
  const addressRow = createInfoRow('Anschrift des Objekts', coverData.projectAddress);
  if (addressRow) infoTable.appendChild(addressRow);
  
  const contactRow = createInfoRow('Ansprechpartner', coverData.contactPerson);
  if (contactRow) infoTable.appendChild(contactRow);
  
  const droneDateRow = createInfoRow('Datum der Drohnenaufnahmen', coverData.droneDate ? new Date(coverData.droneDate).toLocaleDateString('de-DE') : '');
  if (droneDateRow) infoTable.appendChild(droneDateRow);
  
  // Only add notes field if notes are not empty
  if (coverData.notes && coverData.notes.trim() !== '') {
    const notesRow = document.createElement('tr');
    notesRow.style.verticalAlign = 'top';
    
    const notesLabelCell = document.createElement('td');
    notesLabelCell.style.width = '40%';
    notesLabelCell.style.paddingRight = '20px';
    notesLabelCell.style.fontWeight = 'normal';
    notesLabelCell.style.color = '#666';
    notesLabelCell.style.fontSize = '16px';
    notesLabelCell.textContent = 'Bemerkungen';
    notesRow.appendChild(notesLabelCell);
    
    const notesValueCell = document.createElement('td');
    notesValueCell.style.width = '60%';
    notesValueCell.style.fontWeight = 'normal';
    notesValueCell.style.fontSize = '16px';
    notesValueCell.style.color = '#000000';
    notesValueCell.textContent = coverData.notes;
    notesRow.appendChild(notesValueCell);
    
    infoTable.appendChild(notesRow);
  }
  
  infoWrapper.appendChild(infoTable);
  lowerHalf.appendChild(infoWrapper);
  coverPage.appendChild(lowerHalf);
  
  return coverPage;
};

const createMeasurementDataSection = (measurements: Measurement[]): HTMLElement => {
  const dataSection = document.createElement('div');
  dataSection.style.marginBottom = '30px';
  
  // Filter measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  // Add measurement summary
  const summary = document.createElement('div');
  summary.style.marginBottom = '30px';
  
  const summaryTitle = document.createElement('h2');
  summaryTitle.textContent = 'Übersicht';
  summaryTitle.style.fontSize = '18px';
  summaryTitle.style.marginBottom = '10px';
  summaryTitle.style.color = '#000000';
  summary.appendChild(summaryTitle);
  
  // Modified: Single row layout for summary stats
  const summaryContent = document.createElement('div');
  summaryContent.style.display = 'flex';
  summaryContent.style.flexDirection = 'row';
  summaryContent.style.justifyContent = 'space-between';
  summaryContent.style.flexWrap = 'nowrap';
  summaryContent.style.gap = '10px';
  summaryContent.style.width = '100%';
  
  const createSummaryStat = (label: string, value: number, icon: string) => {
    const stat = document.createElement('div');
    stat.style.backgroundColor = '#f8f9fa';
    stat.style.borderRadius = '8px';
    stat.style.padding = '10px';
    stat.style.width = '24%';
    stat.style.minWidth = '80px';
    stat.style.boxSizing = 'border-box';
    stat.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    stat.style.textAlign = 'center';
    stat.style.flexShrink = '1';
    
    const statValue = document.createElement('div');
    statValue.style.fontSize = '22px';
    statValue.style.fontWeight = 'bold';
    statValue.style.marginBottom = '5px';
    statValue.style.color = '#000000';
    statValue.textContent = value.toString();
    stat.appendChild(statValue);
    
    const statLabel = document.createElement('div');
    statLabel.style.fontSize = '12px';
    statLabel.style.color = '#666';
    statLabel.style.display = 'flex';
    statLabel.style.justifyContent = 'center';
    statLabel.style.alignItems = 'center';
    statLabel.style.gap = '5px';
    statLabel.innerHTML = `${icon} ${label}`;
    stat.appendChild(statLabel);
    
    return stat;
  };
  
  // Modified order of summary stats and ensure they fit in a single row
  summaryContent.appendChild(createSummaryStat('Gesamt', measurements.length, '📊'));
  summaryContent.appendChild(createSummaryStat('Längen', lengthMeasurements.length, '📏'));
  summaryContent.appendChild(createSummaryStat('Höhen', heightMeasurements.length, '📐'));
  summaryContent.appendChild(createSummaryStat('Flächen', areaMeasurements.length, '🔲'));
  
  summary.appendChild(summaryContent);
  dataSection.appendChild(summary);
  
  // Main title for measurement data
  const dataTitle = document.createElement('h2');
  dataTitle.textContent = 'Messdaten';
  dataTitle.style.fontSize = '18px';
  dataTitle.style.marginBottom = '15px';
  dataTitle.style.color = '#000000';
  dataSection.appendChild(dataTitle);
  
  // Create combined table for all measurements
  if (measurements.length > 0) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '30px';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f3f4f6';
    
    ['Nr.', 'Beschreibung', 'Typ', 'Messwert', 'Dachneigung'].forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      th.style.padding = '10px';
      th.style.textAlign = 'left';
      th.style.border = '1px solid #ddd';
      th.style.color = '#000000';
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    measurements.forEach((measurement, index) => {
      const row = document.createElement('tr');
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
      
      // Nr column
      const numCell = document.createElement('td');
      numCell.textContent = (index + 1).toString();
      numCell.style.padding = '10px';
      numCell.style.border = '1px solid #ddd';
      numCell.style.color = '#000000';
      row.appendChild(numCell);
      
      // Description column
      const descCell = document.createElement('td');
      descCell.textContent = measurement.description || '–';
      descCell.style.padding = '10px';
      descCell.style.border = '1px solid #ddd';
      descCell.style.color = '#000000';
      row.appendChild(descCell);
      
      // Type column
      const typeCell = document.createElement('td');
      typeCell.textContent = measurement.type === 'length' ? 'Länge' : 
                           measurement.type === 'height' ? 'Höhe' : 
                           measurement.type === 'area' ? 'Fläche' : '–';
      typeCell.style.padding = '10px';
      typeCell.style.border = '1px solid #ddd';
      typeCell.style.color = '#000000';
      row.appendChild(typeCell);
      
      // Value column
      const valueCell = document.createElement('td');
      valueCell.textContent = `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`;
      if (measurement.type === 'area') {
        valueCell.textContent = `${measurement.value.toFixed(2)} ${measurement.unit || 'm²'}`;
      }
      valueCell.style.padding = '10px';
      valueCell.style.border = '1px solid #ddd';
      valueCell.style.fontWeight = 'bold';
      valueCell.style.color = '#000000';
      row.appendChild(valueCell);
      
      // Inclination column
      const inclinationCell = document.createElement('td');
      if (measurement.type === 'length' && measurement.inclination !== undefined) {
        inclinationCell.textContent = `${Math.abs(measurement.inclination).toFixed(1)}°`;
      } else {
        inclinationCell.textContent = '–';
      }
      inclinationCell.style.padding = '10px';
      inclinationCell.style.border = '1px solid #ddd';
      inclinationCell.style.color = '#000000';
      row.appendChild(inclinationCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    dataSection.appendChild(table);
  }
  
  return dataSection;
};

const createAreaDetailsSection = (measurements: Measurement[]): HTMLElement => {
  const areaSection = document.createElement('div');
  areaSection.style.marginBottom = '30px';
  
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  if (areaMeasurements.length > 0) {
    const areaDetailsTitle = document.createElement('h2');
    areaDetailsTitle.textContent = 'Flächendetails';
    areaDetailsTitle.style.fontSize = '18px';
    areaDetailsTitle.style.marginBottom = '15px';
    areaDetailsTitle.style.color = '#000000';
    areaSection.appendChild(areaDetailsTitle);
    
    // For each area measurement, show its segments
    areaMeasurements.forEach((measurement, mIndex) => {
      if (measurement.segments && measurement.segments.length > 0) {
        const areaTitle = document.createElement('h3');
        areaTitle.textContent = measurement.description 
          ? `Fläche: ${measurement.description}` 
          : `Fläche ${mIndex + 1}`;
        areaTitle.style.fontSize = '16px';
        areaTitle.style.marginTop = '20px';
        areaTitle.style.marginBottom = '10px';
        areaTitle.style.color = '#000000';
        areaSection.appendChild(areaTitle);
        
        const segmentTable = document.createElement('table');
        segmentTable.style.width = '100%';
        segmentTable.style.borderCollapse = 'collapse';
        segmentTable.style.marginBottom = '20px';
        
        // Segment table header
        const segmentThead = document.createElement('thead');
        const segmentHeaderRow = document.createElement('tr');
        segmentHeaderRow.style.backgroundColor = '#f3f4f6';
        
        ['Teilmessung', 'Länge'].forEach(column => {
          const th = document.createElement('th');
          th.textContent = column;
          th.style.padding = '8px';
          th.style.textAlign = 'left';
          th.style.border = '1px solid #ddd';
          th.style.color = '#000000';
          segmentHeaderRow.appendChild(th);
        });
        
        segmentThead.appendChild(segmentHeaderRow);
        segmentTable.appendChild(segmentThead);
        
        // Segment table body
        const segmentTbody = document.createElement('tbody');
        
        measurement.segments.forEach((segment, sIndex) => {
          const segmentRow = document.createElement('tr');
          segmentRow.style.backgroundColor = sIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
          
          // Teilmessung column
          const segmentNumCell = document.createElement('td');
          segmentNumCell.textContent = `Teilmessung ${sIndex + 1}`;
          segmentNumCell.style.padding = '8px';
          segmentNumCell.style.border = '1px solid #ddd';
          segmentNumCell.style.color = '#000000';
          segmentRow.appendChild(segmentNumCell);
          
          // Segment length
          const segmentLengthCell = document.createElement('td');
          segmentLengthCell.textContent = `${segment.length.toFixed(2)} m`;
          segmentLengthCell.style.padding = '8px';
          segmentLengthCell.style.border = '1px solid #ddd';
          segmentLengthCell.style.color = '#000000';
          segmentRow.appendChild(segmentLengthCell);
          
          segmentTbody.appendChild(segmentRow);
        });
        
        segmentTable.appendChild(segmentTbody);
        areaSection.appendChild(segmentTable);
      }
    });
  }
  
  return areaSection;
};
