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
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: true, // Enable logging for debugging
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      onclone: (clonedDoc) => {
        try {
          // CRITICAL: html2canvas crashes when parsing stylesheets containing oklch
          // We must replace all oklch/oklab references in the cloned stylesheets
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(style => {
            if (style.innerHTML) {
              // Replace oklch/oklab with safe hex colors in the CSS text
              // This prevents the CSS parser in html2canvas from crashing
              style.innerHTML = style.innerHTML
                .replace(/oklch\([^)]+\)/g, '#cccccc')
                .replace(/oklab\([^)]+\)/g, '#cccccc')
                .replace(/color\([^)]+\)/g, '#cccccc')
                .replace(/color-mix\([^)]+\)/g, '#cccccc')
                .replace(/light-dark\([^)]+\)/g, '#cccccc');
            }
          });

          // Also check inline styles of all elements
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el: any) => {
            if (el.getAttribute('style')) {
              const styleAttr = el.getAttribute('style');
              if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab') || styleAttr.includes('color(') || styleAttr.includes('color-mix(') || styleAttr.includes('light-dark('))) {
                el.setAttribute('style', styleAttr
                  .replace(/oklch\([^)]+\)/g, '#cccccc')
                  .replace(/oklab\([^)]+\)/g, '#cccccc')
                  .replace(/color\([^)]+\)/g, '#cccccc')
                  .replace(/color-mix\([^)]+\)/g, '#cccccc')
                  .replace(/light-dark\([^)]+\)/g, '#cccccc')
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
          }
        } catch (cloneError) {
          console.error('Error in html2canvas onclone:', cloneError);
        }
      }
    });

    // Remove the class after capture
    element.classList.remove('pdf-safe');

    console.log('Canvas generated, creating PDF...');
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${fileName}.pdf`);
    console.log('PDF saved successfully');
  } catch (error) {
    // Ensure we remove the class even if an error occurs
    element.classList.remove('pdf-safe');
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again or use the Print option.');
  }
};
