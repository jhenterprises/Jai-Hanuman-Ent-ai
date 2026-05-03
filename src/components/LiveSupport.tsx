import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User as UserIcon, Loader2, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  setDoc,
  where,
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';

const LiveSupport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOperatorAvailable, setIsOperatorAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check operator availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const q = query(
          collection(db, 'users'),
          where('role', 'in', ['admin', 'staff']),
          where('last_active', '>=', Timestamp.fromDate(fiveMinutesAgo)),
          limit(1)
        );
        const snapshot = await getDocs(q);
        setIsOperatorAvailable(!snapshot.empty);
      } catch (error) {
        console.error('Availability check error:', error);
      }
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Update user's presence - REMOVED (handled globally in DashboardLayout)

  // Listen for messages
  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const chatId = user.uid;
    
    // Ensure chat document exists
    const ensureChat = async () => {
      const chatRef = doc(db, 'chats', chatId);
      try {
        await setDoc(chatRef, {
          customerId: user.uid,
          customerName: user.name || user.email || 'Anonymous',
          status: 'open',
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          unreadCount: 0
        }, { merge: true });
      } catch (e) {
        console.error("Chat init failed", e);
      }
    };
    ensureChat();

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [user?.uid, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user?.uid) return;

    const text = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const chatId = user.uid;
      const messageData = {
        chatId,
        senderId: user.uid,
        senderName: user.name || 'User',
        text,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        status: 'open'
      });

    } catch (error) {
      console.error('Chat Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <motion.button
          drag
          dragMomentum={false}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_rgba(34,197,94,0.8)] cursor-grab active:cursor-grabbing z-40 flex items-center justify-center"
        >
          <div className="relative">
            <MessageSquare size={24} />
            {isOperatorAvailable && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
            )}
          </div>
        </motion.button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-green-600 to-teal-500 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                <Headphones size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tight">Live Support</span>
                <span className="text-[11px] font-medium opacity-90 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isOperatorAvailable ? 'bg-green-400 animate-pulse' : 'bg-slate-300'}`}></span>
                  {isOperatorAvailable ? 'Operator Available' : 'Offline - Replied soon'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-green-500">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Welcome to Support</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    How can we help you today? Send a message to start chatting with our team.
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex gap-2.5 ${msg.senderId === user.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.senderId === user.uid 
                  ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                  : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  {msg.senderId === user.uid ? <UserIcon size={14} /> : <Headphones size={14} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm transition-all duration-300 ${
                  msg.senderId === user.uid 
                    ? 'bg-green-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1 opacity-70 text-right ${msg.senderId === user.uid ? 'text-green-100' : 'text-slate-400'}`}>
                    {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 flex-row animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2 border border-slate-100 shadow-sm">
                  <span className="text-sm text-slate-400">Sending...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <form onSubmit={handleSend} className="flex items-center gap-2 group">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:grayscale text-white rounded-xl transition-all shadow-md active:scale-95"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveSupport;
