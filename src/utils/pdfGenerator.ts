import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const downloadPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    console.log(`Starting PDF generation for element: ${elementId}`);
    
    // CRITICAL FIX: Apply pdf-safe class BEFORE html2canvas reads computed styles
    // This forces the browser to compute HEX colors instead of oklch, preventing crashes
    element.classList.add('pdf-safe');
    
    // Wait a bit to ensure the browser applies the new styles
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: true,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      allowTaint: true,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        try {
          // 1. Remove all linked stylesheets that might contain modern CSS (oklch, etc.)
          // which cause html2canvas to crash during its CSS parsing phase.
          // We rely on our .pdf-safe inline styles and the cloned styles we fix.
          const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
          links.forEach(link => link.remove());

          // 2. Fix all existing style tags
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(style => {
            if (style.innerHTML) {
              style.innerHTML = style.innerHTML
                .replace(/oklch\([^)]+\)/g, '#334155')
                .replace(/oklab\([^)]+\)/g, '#334155')
                .replace(/color\([^)]+\)/g, '#334155')
                .replace(/color-mix\([^)]+\)/g, '#334155')
                .replace(/light-dark\([^)]+\)/g, '#334155')
                .replace(/var\(--[^,)]+\)/g, '#334155'); // Remove variables as they might resolve to oklch
            }
          });

          // 3. Force clean styles on all elements to prevent parsing errors
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el: any) => {
            if (el instanceof HTMLElement) {
              const style = el.getAttribute('style') || '';
              if (style.includes('oklch') || style.includes('oklab') || style.includes('color(') || style.includes('color-mix(')) {
                el.setAttribute('style', style
                  .replace(/oklch\([^)]+\)/g, '#334155')
                  .replace(/oklab\([^)]+\)/g, '#334155')
                  .replace(/color\([^)]+\)/g, '#334155')
                  .replace(/color-mix\([^)]+\)/g, '#334155')
                );
              }
            }
          });

          const target = clonedDoc.getElementById(elementId);
          if (target) {
            target.style.width = '800px';
            target.style.padding = '40px';
            target.style.margin = '0 auto';
            target.style.backgroundColor = '#ffffff';
            target.style.color = '#1e293b';
            target.style.display = 'block';
            target.style.visibility = 'visible';
            target.style.opacity = '1';
            target.style.boxShadow = 'none'; // Shadows can sometimes cause issues
            target.style.borderRadius = '0';
          }
        } catch (cloneError) {
          console.error('Error in html2canvas onclone:', cloneError);
        }
      }
    });

    // Remove the class after capture
    element.classList.remove('pdf-safe');

    console.log('Canvas generated, creating PDF...');
    const imgData = canvas.toDataURL('image/jpeg', 0.9); // Use jpeg for smaller size
    
    // Calculate A4 dimensions in pixels (roughly)
    // 1px = 0.75pt. A4 is 595pt x 842pt. 
    // In px: 794px x 1123px at 96dpi
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      hotfixes: ["px_scaling"]
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    
    // Scale image to fit within A4
    const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
    const canvasWidth = imgProps.width * ratio;
    const canvasHeight = imgProps.height * ratio;

    pdf.addImage(imgData, 'JPEG', (pdfWidth - canvasWidth) / 2, (pdfHeight - canvasHeight) / 2, canvasWidth, canvasHeight);
    pdf.save(`${fileName}.pdf`);
    console.log('PDF saved successfully');
  } catch (error) {
    // Ensure we remove the class even if an error occurs
    element.classList.remove('pdf-safe');
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again or use the Print option.');
  }
};
