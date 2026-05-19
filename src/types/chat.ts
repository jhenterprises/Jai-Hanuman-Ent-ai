import { Timestamp } from 'firebase/firestore';

export type ChatStatus = 'OPEN' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Chat {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhotoURL?: string;
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastSenderId: string;
  status: ChatStatus;
  assignedTo?: string;
  assignedName?: string;
  unreadCount: {
    [userId: string]: number;
  };
  typing?: {
    [userId: string]: boolean;
  };
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'staff' | 'admin';
  message: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  isAutoReply: boolean;
  seen: boolean;
  createdAt: Timestamp;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
