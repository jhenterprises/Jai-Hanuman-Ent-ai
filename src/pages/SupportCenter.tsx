import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  where,
  getDocs,
  limit,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  User as UserIcon, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  Headphones,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SupportCenter = () => {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'open' | 'closed' | 'all'>('open');
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update staff presence
  useEffect(() => {
    if (user?.uid) {
      const updatePresence = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            last_active: serverTimestamp()
          });
        } catch (e) {
          console.error("Staff presence update failed", e);
        }
      };
      updatePresence();
      const interval = setInterval(updatePresence, 60000); 
      return () => clearInterval(interval);
    }
  }, [user?.uid]);

  // Listen for all chats
  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, []);

  // Listen for messages in selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', selectedChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    // Mark as read when selected
    const markRead = async () => {
      try {
        await updateDoc(doc(db, 'chats', selectedChat.id), {
          unreadCount: 0
        });
      } catch (e) {}
    };
    markRead();

    return () => unsubscribe();
  }, [selectedChat]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedChat || !user) return;

    const text = input.trim();
    setInput('');

    try {
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), {
        chatId: selectedChat.id,
        senderId: user.uid,
        senderName: user.name || 'Staff',
        text,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        status: 'open'
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const closeChat = async (chatId: string) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        status: 'closed'
      });
      if (selectedChat?.id === chatId) {
        setSelectedChat(prev => ({ ...prev, status: 'closed' }));
      }
    } catch (err) {
      console.error('Error closing chat:', err);
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = 
      chat.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && chat.status === filterStatus;
  });

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r border-slate-700/50 flex flex-col bg-slate-800/40">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Headphones size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-tight">Support Center</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Staff Panel</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
              {(['open', 'closed', 'all'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all ${
                    filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12 px-4 opacity-40">
              <MessageSquare size={32} className="mx-auto mb-2" />
              <p className="text-xs">No chats found</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  selectedChat?.id === chat.id 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-bold text-sm ${selectedChat?.id === chat.id ? 'text-white' : 'text-slate-200'}`}>
                    {chat.customerName}
                  </span>
                  <span className="text-[10px] opacity-70">
                    {chat.lastMessageAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs line-clamp-1 opacity-80 mb-2">
                  {chat.lastMessage || 'Starting fresh chat...'}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                    chat.status === 'open' 
                    ? (selectedChat?.id === chat.id ? 'bg-white/20' : 'bg-green-500/20 text-green-400')
                    : 'bg-slate-700/50 text-slate-500'
                  }`}>
                    {chat.status}
                  </span>
                  {chat.unreadCount > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-900/20">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg tracking-tight">{selectedChat.customerName}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedChat.status === 'open' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                      {selectedChat.status === 'open' ? 'Active Session' : 'Closed Session'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedChat.status === 'open' && (
                  <button 
                    onClick={() => closeChat(selectedChat.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    <XCircle size={14} className="text-red-400" />
                    Close Session
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex gap-4 ${msg.senderId === user.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                    msg.senderId === user.uid 
                    ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' 
                    : 'bg-slate-800 text-slate-500 border-slate-700/50'
                  }`}>
                    {msg.senderId === user.uid ? <Headphones size={18} /> : <UserIcon size={18} />}
                  </div>
                  <div className={`max-w-[70%] group`}>
                    <p className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 mx-2 ${
                      msg.senderId === user.uid ? 'text-blue-400 text-right' : 'text-slate-500'
                    }`}>
                      {msg.senderName} • {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className={`rounded-2xl px-5 py-3 text-sm shadow-xl ${
                      msg.senderId === user.uid 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50 bg-slate-800/10">
              <form onSubmit={handleSend} className="flex items-center gap-3">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type response..."
                  className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="p-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-50">
            <div className="w-24 h-24 bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-600 border border-slate-700">
              <MessageSquare size={48} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Select a Chat</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2">
                Choose a customer from the sidebar to view message history and respond.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportCenter;
