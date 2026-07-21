import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { XIcon, UploadCloudIcon, CheckCircleIcon, XCircleIcon, Loader2Icon } from 'lucide-react';
import { uploadFile } from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';

interface UploadModalProps {
  folderId: string;
  ownerId: string;
  onClose: () => void;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ folderId, ownerId, onClose }) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }));
    setUploads(prev => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxSize: 20 * 1024 * 1024 // 20MB limit matches Firestore rule
  });

  const handleUpload = async () => {
    if (!user || uploads.length === 0) return;
    setIsUploading(true);

    const uploadPromises = uploads.map(async (uploadState, index) => {
      if (uploadState.status === 'success') return;
      
      setUploads(prev => {
        const next = [...prev];
        next[index].status = 'uploading';
        return next;
      });

      try {
        await uploadFile(
          uploadState.file, 
          folderId, 
          ownerId, 
          user.uid,
          (progress) => {
            setUploads(prev => {
              const next = [...prev];
              next[index].progress = progress;
              return next;
            });
          }
        );
        
        setUploads(prev => {
          const next = [...prev];
          next[index].status = 'success';
          next[index].progress = 100;
          return next;
        });
      } catch (error: any) {
        setUploads(prev => {
          const next = [...prev];
          next[index].status = 'error';
          next[index].error = error.message;
          return next;
        });
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
  };

  const removeFile = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const allDone = uploads.length > 0 && uploads.every(u => u.status === 'success' || u.status === 'error');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-850 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative border border-slate-200 dark:border-white/5"
      >
        <button onClick={onClose} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <XIcon className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Upload Files</h3>
        
        {!isUploading && !allDone && (
            <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
            >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UploadCloudIcon className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
                Click or drag files to this area to upload
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Support for PDF, JPG, PNG, DOCX, XLSX, ZIP. Max 20MB.
            </p>
            </div>
        )}

        {uploads.length > 0 && (
          <div className="mt-6 flex-1 overflow-y-auto pr-2 space-y-3 max-h-64 scrollbar-hide">
            {uploads.map((upload, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center space-x-4">
                <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate pr-4">{upload.file.name}</span>
                        {upload.status === 'error' && <span className="text-xs text-red-500 font-medium">Failed</span>}
                        {upload.status === 'success' && <span className="text-xs text-green-500 font-medium">100%</span>}
                        {upload.status === 'uploading' && <span className="text-xs text-blue-500 font-medium">{Math.round(upload.progress)}%</span>}
                    </div>
                    {upload.status === 'uploading' && (
                        <div className="w-full bg-slate-200 dark:bg-slate-750 rounded-full h-1.5 mb-1 overflow-hidden">
                            <motion.div 
                                className="bg-blue-600 h-1.5 rounded-full" 
                                initial={{ width: 0 }}
                                animate={{ width: `${upload.progress}%` }}
                            />
                        </div>
                    )}
                </div>
                <div>
                   {upload.status === 'pending' && !isUploading && (
                       <button onClick={() => removeFile(idx)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition">
                           <XIcon className="w-4 h-4" />
                       </button>
                   )}
                   {upload.status === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                   {upload.status === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                   {upload.status === 'uploading' && <Loader2Icon className="w-5 h-5 text-blue-500 animate-spin" />}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={allDone ? onClose : () => setUploads([])}
            className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            disabled={isUploading}
          >
            {allDone ? 'Close' : 'Clear All'}
          </button>
          {!allDone && (
             <button
                onClick={handleUpload}
                disabled={isUploading || uploads.length === 0}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-2"
              >
                {isUploading ? (
                    <>
                      <Loader2Icon className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                ) : (
                    <span>Start Upload</span>
                )}
             </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UploadModal;
