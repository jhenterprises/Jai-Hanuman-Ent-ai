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
    
    // Ensure element is visible for capture
    const originalStyle = element.style.cssText;
    const parent = element.parentElement;
    const originalParentStyle = parent ? parent.style.cssText : '';

    // Temporarily make it visible but off-screen if it was hidden
    if (parent && (parent.classList.contains('opacity-0') || parent.style.opacity === '0')) {
      parent.style.opacity = '1';
      parent.style.pointerEvents = 'none';
      parent.style.position = 'fixed';
      parent.style.top = '0';
      parent.style.left = '-9999px';
    }

    // Check if element exists and has dimensions
    const rect = element.getBoundingClientRect();
    console.log(`Element dimensions: ${rect.width}x${rect.height}`);
    
    // CRITICAL FIX: Apply pdf-safe class BEFORE html2canvas reads computed styles
    element.classList.add('pdf-safe');
    
    // Wait longer to ensure the browser applies the new styles and finishes any transitions
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('Calling html2canvas...');
    try {
      const canvas = await html2canvas(element, {
        scale: 1.2, // Further reduced scale for better compatibility and memory
        useCORS: true,
        allowTaint: true, // Allow tainted canvas if CORS fails (might prevent toDataURL but better than crash)
        logging: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        imageTimeout: 15000, // 15 seconds timeout for images
        onclone: (clonedDoc) => {
          try {
            console.log('html2canvas onclone started');
            // CRITICAL: html2canvas crashes when parsing stylesheets containing oklch
            const styleTags = clonedDoc.querySelectorAll('style');
            styleTags.forEach(style => {
              if (style.innerHTML) {
                // More aggressive replacement for all modern CSS color functions
                style.innerHTML = style.innerHTML
                  .replace(/oklch\([^)]+\)/g, '#cccccc')
                  .replace(/oklab\([^)]+\)/g, '#cccccc')
                  .replace(/color\([^)]+\)/g, '#cccccc')
                  .replace(/color-mix\([^)]+\)/g, '#cccccc')
                  .replace(/light-dark\([^)]+\)/g, '#cccccc')
                  .replace(/var\(--[^)]+\)/g, '#666666'); // Replace variables too just in case
              }
            });

            // Also check inline styles
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
              
              // Ensure Lucide icons (SVGs) have dimensions
              if (el.tagName === 'svg') {
                if (!el.getAttribute('width')) el.setAttribute('width', '24');
                if (!el.getAttribute('height')) el.setAttribute('height', '24');
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
              target.style.position = 'relative';
              target.style.top = '0';
              target.style.left = '0';
              target.style.boxShadow = 'none'; // Shadows can sometimes cause issues
            }
            console.log('html2canvas onclone completed');
          } catch (cloneError) {
            console.error('Error in html2canvas onclone:', cloneError);
          }
        }
      });

      console.log('Canvas generated successfully');
      
      // Restore original styles
      element.classList.remove('pdf-safe');
      if (parent) parent.style.cssText = originalParentStyle;

      const imgData = canvas.toDataURL('image/png');
      console.log('Image data generated, length:', imgData.length);
      
      if (imgData === 'data:,') {
        throw new Error('Canvas toDataURL failed (returned empty data)');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${fileName}.pdf`);
      console.log('PDF saved successfully');
    } catch (innerError) {
      console.error('Error during html2canvas or jsPDF processing:', innerError);
      throw innerError;
    }
  } catch (error) {
    // Ensure we remove the class even if an error occurs
    element.classList.remove('pdf-safe');
    console.error('CRITICAL Error generating PDF:', error);
    // Log more details if available
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    alert('Failed to generate PDF. Please try again or use the Print option.');
  }
};
