import { Timestamp } from 'firebase/firestore';

export interface DocumentFolder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string; // 'global' or userId
  type: 'customer' | 'application' | 'service' | 'staff' | 'general';
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

export interface DocumentFile {
  id: string;
  folderId: string;
  fileName: string;
  fileType: string;
  size: number;
  downloadURL: string;
  storagePath: string;
  uploadedBy: string;
  ownerId: string; // 'global' or userId
  createdAt: Timestamp | any;
}
