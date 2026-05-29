import { db, storage } from '../lib/firebase';
import { collection, doc, addDoc, getDocs, deleteDoc, query, where, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { DocumentFolder, DocumentFile } from '../types/documents';

const FOLDERS_COLLECTION = 'documentFolders';
const FILES_COLLECTION = 'documents';

export const createFolder = async (folder: Omit<DocumentFolder, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), {
    ...folder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getFolders = async (ownerId?: string, parentId: string | null = null) => {
  let q;
  if (ownerId && ownerId !== 'all') {
     q = query(
      collection(db, FOLDERS_COLLECTION),
      where('parentId', '==', parentId),
      where('ownerId', 'in', ['global', ownerId])
    );
  } else {
     q = query(
        collection(db, FOLDERS_COLLECTION),
        where('parentId', '==', parentId)
      );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as DocumentFolder));
};

export const searchFoldersAndFiles = async (searchTerm: string, ownerId?: string, excludeFolderId?: string | null) => {
    // Basic prefix matching or use frontend filtering
    // In Firestore, true full text search requires an external service, 
    // so we will query more broadly and filter in memory since we are building a simple drive.
    
    // For large scale, we should index arrays of search terms.
    
    const foldersQ = ownerId && ownerId !== 'all' ? 
        query(collection(db, FOLDERS_COLLECTION), where('ownerId', 'in', ['global', ownerId])) :
        collection(db, FOLDERS_COLLECTION);
        
    const filesQ = ownerId && ownerId !== 'all' ? 
        query(collection(db, FILES_COLLECTION), where('ownerId', 'in', ['global', ownerId])) :
        collection(db, FILES_COLLECTION);

    const [folderSnap, fileSnap] = await Promise.all([getDocs(foldersQ), getDocs(filesQ)]);
    
    // Build full array of folders
    const allFolders = folderSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as DocumentFolder));
    
    // Exclude descendants if provided
    let excludedSet = new Set<string>();
    if (excludeFolderId) {
        excludedSet.add(excludeFolderId);
        // Build exclusion tree recursively (since we have all folders in memory)
        let addedNew = true;
        while(addedNew) {
            addedNew = false;
            for (const f of allFolders) {
                if (f.parentId && excludedSet.has(f.parentId) && !excludedSet.has(f.id)) {
                    excludedSet.add(f.id);
                    addedNew = true;
                }
            }
        }
    }
    
    const term = searchTerm.toLowerCase();
    
    const folders = allFolders
        .filter(f => !excludedSet.has(f.id))
        .filter(f => f.name.toLowerCase().includes(term));
        
    const files = fileSnap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) } as DocumentFile))
        .filter(f => !excludedSet.has(f.folderId))
        .filter(f => f.fileName.toLowerCase().includes(term));
        
    return { folders, files };
};

export const getFiles = async (folderId: string, ownerId?: string) => {
  let q;
  if (ownerId && ownerId !== 'all') {
      q = query(
        collection(db, FILES_COLLECTION),
        where('folderId', '==', folderId),
        where('ownerId', 'in', ['global', ownerId])
      );
  } else {
      q = query(
        collection(db, FILES_COLLECTION),
        where('folderId', '==', folderId)
      );
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as DocumentFile));
};

export const uploadFile = (
  file: File,
  folderId: string,
  ownerId: string,
  uploadedBy: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storagePath = `documents/${ownerId}/${folderId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        const fileDoc: Omit<DocumentFile, 'id'> = {
          folderId,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          size: file.size,
          downloadURL,
          storagePath,
          uploadedBy,
          ownerId,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, FILES_COLLECTION), fileDoc);
        resolve(docRef.id);
      }
    );
  });
};

export const renameFile = async (documentId: string, newName: string) => {
  await updateDoc(doc(db, FILES_COLLECTION, documentId), {
    fileName: newName
  });
};

export const deleteFile = async (documentId: string, storagePath: string) => {
  const sfRef = doc(db, FILES_COLLECTION, documentId);
  await deleteDoc(sfRef);
  const stRef = ref(storage, storagePath);
  try {
     await deleteObject(stRef);
  } catch (e) {
     // Ignore missing object
  }
};

export const renameFolder = async (folderId: string, newName: string) => {
  await updateDoc(doc(db, FOLDERS_COLLECTION, folderId), {
    name: newName,
    updatedAt: serverTimestamp()
  });
};

export const deleteFolder = async (folderId: string) => {
  // Simple delete just for the folder node.
  // Note: True recursive delete should ideally be done by a Cloud Function.
  await deleteDoc(doc(db, FOLDERS_COLLECTION, folderId));
};
