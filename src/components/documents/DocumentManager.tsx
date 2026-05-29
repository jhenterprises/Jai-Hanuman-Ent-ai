import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  FolderIcon, FileIcon, SearchIcon, UploadCloudIcon, 
  MoreVerticalIcon, DownloadIcon, TrashIcon, AlertCircleIcon, FileTextIcon, 
  ImageIcon, FileArchiveIcon, FileCodeIcon, PlusIcon, FolderPlusIcon, ChevronRightIcon 
} from 'lucide-react';
import { DocumentFolder, DocumentFile } from '../../types/documents';
import { getFolders, getFiles, searchFoldersAndFiles, createFolder, deleteFolder, deleteFile } from '../../services/documentService';
import { useAuth } from '../../context/AuthContext';
import UploadModal from './UploadModal';
import PreviewModal from './PreviewModal';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DocumentManager: React.FC = () => {
  const { user } = useAuth();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Home' }]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [softwaresFolderId, setSoftwaresFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  
  // Create folder
  const [createFolderModal, setCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const isGlobalContext = user?.role === 'admin' || user?.role === 'staff';

  const loadContents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Ensure Softwares folder exists at root level globally
      let sId = softwaresFolderId;
      if (!sId) {
         // Query root folders to find 'Softwares'
         const ownerQuery = isGlobalContext ? 'all' : user.uid;
         const rootFolders = await getFolders(ownerQuery, null);
         const sFolder = rootFolders.find(f => f.name.toLowerCase() === 'softwares' || f.name.toLowerCase() === 'software');
         if (sFolder) {
            sId = sFolder.id;
         } else if (isGlobalContext) {
            sId = await createFolder({
               name: 'Softwares',
               parentId: null,
               ownerId: 'global',
               type: 'general'
            });
         }
         if (sId) setSoftwaresFolderId(sId);
      }

      // 2. Load requested contents
      let currentFolders: DocumentFolder[] = [];
      let currentFiles: DocumentFile[] = [];

      if (searchTerm.length > 2) {
         const ownerQuery = isGlobalContext ? 'all' : user.uid;
         const excludeForUser = user.role === 'user' ? sId : null;
         const res = await searchFoldersAndFiles(searchTerm, ownerQuery, excludeForUser);
         currentFolders = res.folders;
         currentFiles = res.files;
      } else {
         const ownerQuery = isGlobalContext ? 'all' : user.uid;
         currentFolders = await getFolders(ownerQuery, currentFolder);
         currentFiles = await getFiles(currentFolder || 'root', ownerQuery);
      }

      setFolders(currentFolders);
      setFiles(currentFiles);

    } catch (e) {
      console.error(e);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [user, currentFolder, searchTerm, isGlobalContext, softwaresFolderId]);

  useEffect(() => {
    const delay = setTimeout(() => {
        loadContents();
    }, 300);
    return () => clearTimeout(delay);
  }, [loadContents]);

  const handleFolderClick = (folder: DocumentFolder) => {
    setSearchTerm('');
    setCurrentFolder(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const displayedFolders = useMemo(() => {
    if (user?.role === 'user') {
       return folders.filter(f => f.name.toLowerCase() !== 'softwares' && f.name.toLowerCase() !== 'software');
    }
    return folders;
  }, [folders, user?.role]);

  const displayedFiles = useMemo(() => {
    if (user?.role === 'user' && softwaresFolderId) {
       return files.filter(f => f.folderId !== softwaresFolderId);
    }
    return files;
  }, [files, user?.role, softwaresFolderId]);

  const handleBreadcrumbClick = (id: string | null, index: number) => {
    setSearchTerm('');
    setCurrentFolder(id);
    setFolderPath(folderPath.slice(0, index + 1));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    try {
      await createFolder({
        name: newFolderName,
        parentId: currentFolder,
        ownerId: user.uid, // Could be generic for admin
        type: 'general'
      });
      setCreateFolderModal(false);
      setNewFolderName('');
      toast.success('Folder created');
      loadContents();
    } catch (e) {
      toast.error('Error creating folder');
    }
  };

  const downloadFile = (url: string, filename: string) => {
    saveAs(url, filename);
  };
  
  const downloadFolderAsZip = async () => {
       if (files.length === 0) {
           toast.error('No files to download');
           return;
       }
       toast.loading('Preparing ZIP...');
       const zip = new JSZip();
       try {
           for (const file of files) {
               const response = await fetch(file.downloadURL);
               const blob = await response.blob();
               zip.file(file.fileName, blob);
           }
           const content = await zip.generateAsync({ type: 'blob' });
           saveAs(content, `${folderPath[folderPath.length-1].name}.zip`);
           toast.dismiss();
           toast.success('Downloaded ZIP');
       } catch (e) {
           toast.dismiss();
           toast.error('Failed to create ZIP');
       }
  };

  const handleDeleteFile = async (id: string, path: string) => {
      if(!window.confirm('Delete this file?')) return;
      try {
          await deleteFile(id, path);
          toast.success('File deleted');
          loadContents();
      } catch (e) {
          toast.error('Error deleting file');
      }
  };
  
  const handleDeleteFolder = async (id: string) => {
      if(!window.confirm('Delete this folder? It must be empty.')) return;
      try {
          await deleteFolder(id);
          toast.success('Folder deleted');
          loadContents();
      } catch (e) {
          toast.error('Error deleting folder');
      }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileTextIcon className="w-8 h-8 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="w-8 h-8 text-yellow-600" />;
    if (type.includes('excel') || type.includes('spreadsheet')) return <FileCodeIcon className="w-8 h-8 text-green-600" />;
    return <FileIcon className="w-8 h-8 text-slate-500" />;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 bg-white border-b border-slate-200 gap-4">
        
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {folderPath.map((item, idx) => (
            <React.Fragment key={idx}>
              <button
                onClick={() => handleBreadcrumbClick(item.id, idx)}
                className={`flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  idx === folderPath.length - 1 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.name}
              </button>
              {idx < folderPath.length - 1 && (
                <ChevronRightIcon className="w-4 h-4 text-slate-400 flex-none" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search files & folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button 
             onClick={() => setCreateFolderModal(true)}
             className="p-2 sm:px-4 sm:py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium text-sm transition-colors flex items-center space-x-2"
          >
             <FolderPlusIcon className="w-5 h-5" />
             <span className="hidden sm:inline">New Folder</span>
          </button>
          <button 
            onClick={() => setUploadModalOpen(true)}
            className="p-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors flex items-center space-x-2 shadow-sm"
          >
            <UploadCloudIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        
        {loading ? (
            <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        ) : (
          <div className="space-y-8">
            
            {/* Folders */}
            {displayedFolders.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 px-1">Folders</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedFolders.map(folder => (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={folder.id}
                      className="group p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                      >
                         <div className="flex items-center space-x-4 overflow-hidden" onClick={() => handleFolderClick(folder)}>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-none">
                              <FolderIcon className="w-6 h-6" fill="currentColor" />
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-slate-900 truncate">{folder.name}</p>
                              <p className="text-xs text-slate-500">{folder.createdAt ? format(folder.createdAt.toDate(), 'MMM d, yyyy') : ''}</p>
                            </div>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrashIcon className="w-4 h-4" />
                         </button>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Files */}
            {(displayedFiles.length > 0 || displayedFolders.length === 0) && (
              <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-sm font-semibold text-slate-900">Files</h3>
                    {displayedFiles.length > 0 && (
                       <button onClick={downloadFolderAsZip} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                          <FileArchiveIcon className="w-4 h-4"/> Download All ZIP
                       </button>
                    )}
                </div>
                
                {displayedFiles.length === 0 ? (
                   <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <UploadCloudIcon className="w-10 h-10 text-slate-400" />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-1">No files here</h4>
                        <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
                            Drag and drop files to upload, or click the Upload button to browse from your computer.
                        </p>
                        <button 
                            onClick={() => setUploadModalOpen(true)}
                            className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors font-medium text-sm shadow-sm"
                        >
                            Select Files
                        </button>
                   </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                       <ul className="divide-y divide-slate-100">
                           {displayedFiles.map(file => (
                               <li key={file.id} className="group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center space-x-4 cursor-pointer flex-1 overflow-hidden" onClick={() => setPreviewFile(file)}>
                                     <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all">
                                         {getFileIcon(file.fileType)}
                                     </div>
                                     <div className="flex-1 truncate">
                                         <p className="font-medium text-slate-900 truncate">{file.fileName}</p>
                                         <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                                             <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                             <span>•</span>
                                             <span>{file.createdAt ? format(file.createdAt.toDate(), 'MMM d, yyyy') : ''}</span>
                                         </div>
                                     </div>
                                  </div>
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => downloadFile(file.downloadURL, file.fileName)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Download">
                                         <DownloadIcon className="w-5 h-5" />
                                     </button>
                                     <button onClick={() => handleDeleteFile(file.id, file.storagePath)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                         <TrashIcon className="w-5 h-5" />
                                     </button>
                                  </div>
                               </li>
                           ))}
                       </ul>
                    </div>
                )}
              </section>
            )}
            
          </div>
        )}
      </div>

      {uploadModalOpen && user && (
         <UploadModal 
            folderId={currentFolder || 'root'} 
            ownerId={isGlobalContext ? 'global' : user.uid}
            onClose={() => { setUploadModalOpen(false); loadContents(); }} 
         />
      )}

      {previewFile && (
         <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {/* Create Folder Modal */}
      {createFolderModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
            >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-full mb-4">
                    <FolderPlusIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Create new folder</h3>
                <p className="text-sm text-slate-500 mb-4">Enter a name for the new folder here.</p>
                
                <input 
                   autoFocus
                   type="text" 
                   value={newFolderName}
                   onChange={e => setNewFolderName(e.target.value)}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                   placeholder="Folder name"
                   onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                />
                
                <div className="flex gap-3">
                    <button onClick={() => setCreateFolderModal(false)} className="flex-1 px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                        Create
                    </button>
                </div>
            </motion.div>
        </div>
      )}

    </div>
  );
};

export default DocumentManager;
