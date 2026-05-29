import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon, DownloadIcon, PrinterIcon, Loader2Icon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DocumentFile } from '../../types/documents';
import { saveAs } from 'file-saver';
import printJS from 'print-js';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PreviewModalProps {
  file: DocumentFile | null;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1);

  useEffect(() => {
    setPageNumber(1);
    setPdfScale(1);

    const handleResize = () => {
      if (window.innerWidth < 640) {
        setPdfScale(0.6);
      } else if (window.innerWidth < 1024) {
        setPdfScale(0.8);
      } else {
        setPdfScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [file]);

  if (!file) return null;

  const isImage = file.fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);
  const isPdf = file.fileType === 'application/pdf' || /\.pdf$/i.test(file.fileName);

  const handlePrint = () => {
    setIsPrinting(true);
    try {
        if (isPdf) {
           const proxyUrl = `/api/proxy-file?url=${encodeURIComponent(file.downloadURL)}`;
           printJS({ printable: proxyUrl, type: 'pdf', showModal: true });
        } else if (isImage) {
           const proxyUrl = `/api/proxy-file?url=${encodeURIComponent(file.downloadURL)}`;
           printJS({ printable: proxyUrl, type: 'image', documentTitle: file.fileName });
        }
    } catch (e) {
        console.error('Print failed:', e);
        window.open(file.downloadURL, '_blank');
    } finally {
        setIsPrinting(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const prevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const nextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

  return (
    <AnimatePresence>
       <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col">
         {/* Top bar */}
         <div className="flex items-center justify-between p-4 mix-blend-difference">
             <div className="flex-1"></div>
             <div className="flex items-center gap-4">
                 {(isPdf || isImage) && (
                     <button onClick={handlePrint} disabled={isPrinting} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Print">
                         <PrinterIcon className={`w-5 h-5 ${isPrinting ? 'opacity-50' : ''}`}/>
                     </button>
                 )}
                 <button onClick={() => saveAs(file.downloadURL, file.fileName)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Download">
                     <DownloadIcon className="w-5 h-5"/>
                 </button>
                 <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Close">
                     <XIcon className="w-6 h-6"/>
                 </button>
             </div>
         </div>
         
         {/* Content */}
         <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full h-full flex flex-col items-center justify-center"
            >
                {isImage ? (
                   <img 
                      src={file.downloadURL} 
                      alt={file.fileName}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                   />
                ) : isPdf ? (
                   <div className="flex flex-col items-center max-h-full max-w-full overflow-y-auto overflow-x-hidden">
                       <Document
                           file={`/api/proxy-file?url=${encodeURIComponent(file.downloadURL)}`}
                           onLoadSuccess={onDocumentLoadSuccess}
                           loading={
                               <div className="flex flex-col items-center justify-center p-12">
                                   <Loader2Icon className="w-10 h-10 text-white animate-spin mb-4" />
                                   <p className="text-white font-medium">Loading PDF...</p>
                               </div>
                           }
                           error={
                               <div className="text-center text-white space-y-4 bg-slate-800 p-8 rounded-2xl">
                                   <p className="text-red-400">Failed to load PDF.</p>
                                   <button onClick={() => window.open(file.downloadURL, '_blank')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
                                       View Original File
                                   </button>
                               </div>
                           }
                       >
                           <Page 
                               pageNumber={pageNumber} 
                               renderTextLayer={false}
                               renderAnnotationLayer={false}
                               scale={pdfScale}
                               className="shadow-2xl rounded-sm overflow-hidden"
                           />
                       </Document>
                       
                       {/* PDF Controls */}
                       {numPages && numPages > 1 && (
                           <div className="flex items-center gap-4 mt-6 bg-white/10 backdrop-blur-md p-2 rounded-xl sticky bottom-4 shrink-0">
                               <button 
                                   onClick={prevPage} 
                                   disabled={pageNumber <= 1}
                                   className="p-2 text-white hover:bg-white/20 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                               >
                                   <ChevronLeftIcon className="w-5 h-5" />
                               </button>
                               <span className="text-white font-medium text-sm w-20 text-center">
                                   {pageNumber} / {numPages}
                               </span>
                               <button 
                                   onClick={nextPage} 
                                   disabled={pageNumber >= numPages}
                                   className="p-2 text-white hover:bg-white/20 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                               >
                                   <ChevronRightIcon className="w-5 h-5" />
                               </button>
                           </div>
                       )}
                   </div>
                ) : (
                   <div className="text-center text-white space-y-4">
                       <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mx-auto">
                           <DownloadIcon className="w-10 h-10 text-white/50" />
                       </div>
                       <div>
                           <p className="text-lg font-medium">{file.fileName}</p>
                           <p className="text-sm text-white/60">No preview available for this file type.</p>
                       </div>
                       <button onClick={() => saveAs(file.downloadURL, file.fileName)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors inline-block mt-4">
                           Download to view
                       </button>
                   </div>
                )}
            </motion.div>
         </div>
         
         {/* Bottom bar */}
         <div className="p-4 flex items-center justify-center pointer-events-none">
             <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl text-white text-sm font-medium tracking-wide">
                 {file.fileName} • {(file.size / 1024 / 1024).toFixed(2)} MB
             </div>
         </div>
         
       </div>
    </AnimatePresence>
  );
};

export default PreviewModal;
