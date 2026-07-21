import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  increment,
  getDoc,
  getDocs,
  setDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chat, Message, ChatStatus, QuickReply } from '../types/chat';

const CHATS_COLLECTION = 'supportChats';
const MESSAGES_COLLECTION = 'supportMessages';
const QUICK_REPLIES_COLLECTION = 'quickReplies';

export const chatService = {
  // Create or get existing chat for a customer
  async getOrCreateChat(user: { uid: string, name: string, email: string, photoURL?: string }): Promise<string> {
    const q = query(
      collection(db, CHATS_COLLECTION),
      where('customerId', '==', user.uid),
      where('status', 'in', ['OPEN', 'PENDING', 'IN_PROGRESS']),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Create new chat
    const chatData: Omit<Chat, 'id'> = {
      customerId: user.uid,
      customerName: user.name,
      customerEmail: user.email,
      customerPhotoURL: user.photoURL,
      lastMessage: '',
      lastMessageAt: Timestamp.now(),
      lastSenderId: '',
      status: 'OPEN',
      unreadCount: {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, CHATS_COLLECTION), chatData);
    
    // Send initial auto-reply
    await this.sendAutoReply(docRef.id, 'WELCOME');
    
    return docRef.id;
  },

  async sendMessage(params: {
    chatId: string;
    senderId: string;
    senderName: string;
    senderRole: 'user' | 'staff' | 'admin';
    message: string;
    messageType?: 'text' | 'image' | 'file';
    fileUrl?: string;
    fileName?: string;
  }) {
    const { chatId, senderId, senderName, senderRole, message, messageType = 'text', fileUrl, fileName } = params;

    const baseMessageData: Partial<Message> = {
      chatId,
      senderId,
      senderName,
      senderRole,
      message,
      messageType,
      isAutoReply: false,
      seen: false,
      createdAt: Timestamp.now(),
    };
    if (fileUrl !== undefined) baseMessageData.fileUrl = fileUrl;
    if (fileName !== undefined) baseMessageData.fileName = fileName;

    const messageData = baseMessageData as Omit<Message, 'id'>;

    // Use transaction to update chat and message atomically
    await runTransaction(db, async (transaction) => {
      const chatRef = doc(db, CHATS_COLLECTION, chatId);
      const chatDoc = await transaction.get(chatRef);
      
      if (!chatDoc.exists()) throw new Error('Chat does not exist');
      
      const chat = chatDoc.data() as Chat;
      
      // Update unread counts for everyone else in the chat
      const unreadCount = { ...chat.unreadCount };
      // In a real app we'd have participants, but here it's User and (Staff/Admin)
      // If user sends, increment for assignedTo or all staff?
      // For now, let's just mark who sent it.
      
      transaction.update(chatRef, {
        lastMessage: messageType === 'text' ? message : `Sent a ${messageType}`,
        lastMessageAt: serverTimestamp(),
        lastSenderId: senderId,
        status: senderRole === 'user' ? 'PENDING' : 'IN_PROGRESS',
        updatedAt: serverTimestamp(),
      });

      const messageRef = doc(collection(db, MESSAGES_COLLECTION));
      transaction.set(messageRef, messageData);
    });

    // Handle auto-replies for users
    if (senderRole === 'user') {
      await this.handleKeywordAutoReply(chatId, message);
    }
  },

  async handleKeywordAutoReply(chatId: string, message: string) {
    const text = message.toLowerCase();
    
    if (text.includes('refund')) {
      await this.sendAutoReply(chatId, 'REFUND');
    } else if (text.includes('wallet')) {
      await this.sendAutoReply(chatId, 'WALLET');
    } else if (text.includes('app') || text.includes('status')) {
      await this.sendAutoReply(chatId, 'APPLICATION');
    }
  },

  async sendAutoReply(chatId: string, type: 'WELCOME' | 'REFUND' | 'WALLET' | 'APPLICATION' | 'OFFLINE') {
    let message = '';
    switch (type) {
      case 'WELCOME':
        message = 'Hello 👋 Welcome to Support Center.\n\nOur team has received your message.\nPlease wait while our support staff reviews your request.\n\nTypical response time: 5–15 minutes.';
        break;
      case 'REFUND':
        message = 'Refund requests are typically processed within 24-48 working hours. Thank you for your patience.';
        break;
      case 'WALLET':
        message = 'Wallet transfer requests are under verification. Please avoid duplicate requests.';
        break;
      case 'APPLICATION':
        message = 'Your application is currently under review. Status updates will appear in your dashboard.';
        break;
      case 'OFFLINE':
        message = 'Support team is currently offline. Your message has been saved and we will respond soon.';
        break;
    }

    const messageData: Omit<Message, 'id'> = {
      chatId,
      senderId: 'system',
      senderName: 'Support Bot',
      senderRole: 'admin',
      message,
      messageType: 'text',
      isAutoReply: true,
      seen: false,
      createdAt: Timestamp.now(),
    };

    await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
    
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
      lastMessage: message,
      lastMessageAt: serverTimestamp(),
      lastSenderId: 'system',
      updatedAt: serverTimestamp(),
    });
  },

  async updateChatStatus(chatId: string, status: ChatStatus) {
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
      status,
      updatedAt: serverTimestamp(),
    });
  },

  async assignChat(chatId: string, staffId: string, staffName: string) {
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
      assignedTo: staffId,
      assignedName: staffName,
      status: 'IN_PROGRESS',
      updatedAt: serverTimestamp(),
    });
  },

  async setTyping(chatId: string, userId: string, isTyping: boolean) {
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
      [`typing.${userId}`]: isTyping,
    });
  },

  async markAsSeen(chatId: string, messageIds: string[]) {
    // In a real app we'd use a batch update
    for (const id of messageIds) {
      await updateDoc(doc(db, MESSAGES_COLLECTION, id), { seen: true });
    }
  },

  // Quick Replies CRUD
  async getQuickReplies() {
    const q = query(collection(db, QUICK_REPLIES_COLLECTION), orderBy('category'), orderBy('title'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickReply));
  },

  async addQuickReply(data: Omit<QuickReply, 'id' | 'createdAt' | 'updatedAt'>) {
    await addDoc(collection(db, QUICK_REPLIES_COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async deleteQuickReply(id: string) {
    // Implementation for admin
  }
};
