import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  User, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Search,
  Hash,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Chat, Message, ChatStatus, QuickReply } from '../../types/chat';
import { chatService } from '../../services/chatService';
import { useChatMessages } from '../../hooks/useChatMessages';
import { useSupportChats } from '../../hooks/useSupportChats';
import { ChatList } from './ChatList';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SupportAdminDash: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [statusFilter, setStatusFilter] = useState<ChatStatus[]>(['OPEN', 'PENDING', 'IN_PROGRESS']);
  const { chats, loading: chatsLoading } = useSupportChats(statusFilter);
  const { messages, loading: messagesLoading } = useChatMessages(selectedChat?.id || null);
  const [inputMessage, setInputMessage] = useState('');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatService.getQuickReplies().then(setQuickReplies);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedChat || !currentUser) return;

    const currentMsg = inputMessage;
    setInputMessage('');
    
    try {
      await chatService.sendMessage({
        chatId: selectedChat.id,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        senderRole: currentUser.role as any,
        message: currentMsg,
      });

      // If chat was open, mark as in progress by staff
      if (selectedChat.status === 'OPEN' || selectedChat.status === 'PENDING') {
        await chatService.assignChat(selectedChat.id, currentUser.uid, currentUser.name);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputMessage(currentMsg);
    }
  };

  const useQuickReply = (content: string) => {
    setInputMessage(content);
    setShowQuickReplies(false);
  };

  const resolveChat = async () => {
    if (!selectedChat) return;
    await chatService.updateChatStatus(selectedChat.id, 'RESOLVED');
    setSelectedChat(null);
  };

  const closeChat = async () => {
    if (!selectedChat) return;
    await chatService.updateChatStatus(selectedChat.id, 'CLOSED');
    setSelectedChat(null);
  };

  const seedQuickReplies = async () => {
    const replies = [
      { title: 'Welcome', content: 'Hello! Welcome to our support center. How can we assist you today?', category: 'general' },
      { title: 'Recharge Issue', content: 'If you are having trouble with a recharge, please provide your mobile number and operator details.', category: 'services' },
      { title: 'Refund Info', content: 'Refunds usually take 5-7 business days to reflect in your original payment method.', category: 'billing' },
      { title: 'Identity Verification', content: 'To process your application, we need a clear photo of your ID card. Please upload it here.', category: 'compliance' },
    ];

    for (const r of replies) {
      await chatService.addQuickReply(r);
    }
    const updated = await chatService.getQuickReplies();
    setQuickReplies(updated);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden rounded-xl border border-gray-100 shadow-sm m-4">
      {/* Sidebar - Chat List */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-100">
        <div className="p-4 border-b border-gray-50 flex items-center gap-2">
          {['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map(status => (
            <button
              key={status}
              onClick={() => {
                if (statusFilter.includes(status as ChatStatus)) {
                  setStatusFilter(statusFilter.filter(s => s !== status));
                } else {
                  setStatusFilter([...statusFilter, status as ChatStatus]);
                }
              }}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                statusFilter.includes(status as ChatStatus)
                  ? status === 'OPEN' ? "bg-red-500 text-white" :
                    status === 'RESOLVED' ? "bg-green-500 text-white" :
                    "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              )}
            >
              {status === 'IN_PROGRESS' ? 'Staff' : status}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatList 
            chats={chats} 
            selectedChatId={selectedChat?.id} 
            onSelectChat={setSelectedChat} 
          />
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50/30 relative">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedChat.customerPhotoURL ? (
                    <img src={selectedChat.customerPhotoURL} className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-blue-50" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      {selectedChat.customerName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                    {selectedChat.customerName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-medium lowercase tracking-wide flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {selectedChat.id.slice(0, 8)}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      selectedChat.status === 'OPEN' ? "text-red-500" : "text-blue-500"
                    )}>
                      {selectedChat.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={resolveChat}
                  className="px-4 py-1.5 bg-green-50 text-green-600 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Resolve
                </button>
                <div className="w-px h-6 bg-gray-100 mx-1" />
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Messages area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6"
            >
              <div className="flex flex-col items-center py-4 mb-4">
                <div className="px-3 py-1 bg-white border border-gray-100 rounded-full shadow-sm text-[10px] text-gray-500 font-medium uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> {format(selectedChat.createdAt.toDate(), 'MMMM dd, yyyy')}
                </div>
              </div>

              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser.uid;
                const isSystem = msg.senderId === 'system';
                const isAuto = msg.isAutoReply;
                
                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex flex-col max-w-[70%]",
                      isMe ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    {!isMe && !isSystem && (
                      <span className="text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase tracking-wider">
                        {msg.senderName}
                      </span>
                    )}
                    <div className={cn(
                      "px-5 py-3 rounded-2xl text-[13px] shadow-sm whitespace-pre-wrap leading-relaxed transition-all",
                      isMe 
                        ? "bg-blue-600 text-white rounded-br-none shadow-blue-100 border border-blue-500" 
                        : isSystem || isAuto
                          ? "bg-amber-50 text-amber-900 border border-amber-100 rounded-bl-none italic"
                          : "bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm"
                    )}>
                      {msg.message}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[10px] text-gray-400 font-medium">
                      {format(msg.createdAt.toDate(), 'HH:mm')}
                      {isMe && (
                        msg.seen ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />
                      )}
                      {isAuto && (
                        <span className="bg-amber-100 text-amber-700 px-1 rounded font-bold uppercase scale-75 origin-left">Auto</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {messagesLoading && (
                <div className="flex justify-center py-4">
                  <div className="animate-pulse text-xs text-gray-400">Loading history...</div>
                </div>
              )}
            </div>

            {/* Quick Replies Panel */}
            <AnimatePresence>
              {showQuickReplies && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-20 left-6 right-6 z-10 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-50 flex items-center justify-between bg-blue-50/50">
                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
                       <Zap className="w-3 h-3" /> Quick Replies
                    </h4>
                    <button onClick={() => setShowQuickReplies(false)} className="text-gray-400 hover:text-gray-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1.5 grid grid-cols-2 gap-1.5">
                    {quickReplies.length > 0 ? (
                      quickReplies.map((reply) => (
                        <button
                          key={reply.id}
                          onClick={() => useQuickReply(reply.content)}
                          className="text-left p-3 hover:bg-blue-50 rounded-lg group transition-colors border border-transparent hover:border-blue-100"
                        >
                          <div className="text-xs font-bold text-gray-700 group-hover:text-blue-700 mb-0.5">{reply.title}</div>
                          <div className="text-[10px] text-gray-500 line-clamp-1">{reply.content}</div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-2 p-8 text-center space-y-4">
                        <p className="text-gray-400 text-xs">No shortcuts configured</p>
                        <button 
                          onClick={seedQuickReplies}
                          className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Setup Shortcuts
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Admin Input area */}
            <div className="p-6 bg-white border-t border-gray-100">
              <form onSubmit={handleSend} className="bg-gray-50 rounded-2xl p-2 flex flex-col gap-2 border border-gray-100 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type a response or use '/' for shortcuts..."
                  className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none"
                />
                <div className="flex items-center justify-between border-t border-gray-100 pt-2 px-2">
                  <div className="flex items-center gap-1">
                    <button 
                      type="button" 
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className={cn(
                        "p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-tight",
                        showQuickReplies ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      )}
                    >
                      <Zap className="w-4 h-4" /> 
                      <span className="hidden sm:inline">Shortcuts</span>
                    </button>
                    <button type="button" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                    <button type="button" className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      Press <span className="bg-white border px-1 rounded mx-1 text-gray-500">Enter</span> to send
                    </div>
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-200",
                        inputMessage.trim() 
                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                      )}
                    >
                      Send Message <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white/50 backdrop-blur-sm">
             <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-[2.5rem] flex items-center justify-center text-blue-500 mb-8 transform rotate-12 animate-float">
                <MessageCircle className="w-12 h-12" />
             </div>
             <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Select a conversation</h2>
             <p className="text-gray-500 max-w-sm leading-relaxed mb-8">
               Manage multiple user queries in real-time. Respond to status updates and support issues instantly.
             </p>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5" /></div>
                  <div className="text-left"><div className="text-[10px] font-bold text-gray-400 uppercase">Wait Time</div><div className="text-sm font-bold text-gray-900">~12m</div></div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5" /></div>
                  <div className="text-left"><div className="text-[10px] font-bold text-gray-400 uppercase">Resolved</div><div className="text-sm font-bold text-gray-900">142</div></div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - User Details */}
      {selectedChat && (
        <div className="w-72 flex-shrink-0 border-l border-gray-100 bg-gray-50/20 p-6 overflow-y-auto">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              {selectedChat.customerPhotoURL ? (
                <img src={selectedChat.customerPhotoURL} className="w-24 h-24 rounded-[2rem] object-cover shadow-2xl ring-4 ring-white" alt="" />
              ) : (
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-200">
                  {selectedChat.customerName.charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg" />
            </div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{selectedChat.customerName}</h3>
            <p className="text-xs text-gray-400 font-medium">{selectedChat.customerEmail}</p>
          </div>

          <div className="space-y-8">
            <section>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-blue-500" /> User Info
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3 group">
                  <div className="w-8 h-8 bg-white border border-gray-100 text-gray-400 rounded-lg flex items-center justify-center group-hover:text-blue-500 group-hover:border-blue-100 transition-all"><Mail className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Email</div>
                    <div className="text-xs font-semibold text-gray-700 truncate">{selectedChat.customerEmail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-8 h-8 bg-white border border-gray-100 text-gray-400 rounded-lg flex items-center justify-center group-hover:text-green-500 group-hover:border-green-100 transition-all"><Clock className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">First Contact</div>
                    <div className="text-xs font-semibold text-gray-700 truncate">{format(selectedChat.createdAt.toDate(), 'dd MMM yyyy')}</div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-blue-500" /> Actions
              </h4>
              <div className="grid gap-2">
                <button className="w-full text-left p-3 bg-white border border-gray-100 text-[11px] font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:border-blue-100 hover:text-blue-700 transition-all flex items-center justify-between group">
                  View Profile <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button className="w-full text-left p-3 bg-white border border-gray-100 text-[11px] font-bold text-gray-700 rounded-xl hover:bg-blue-50 hover:border-blue-100 hover:text-blue-700 transition-all flex items-center justify-between group">
                  Orders History <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button className="w-full text-left p-3 bg-white border border-gray-100 text-[11px] font-bold text-gray-700 rounded-xl hover:bg-red-50 hover:border-red-100 hover:text-red-700 transition-all">
                  Report Abuse
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

const MessageCircle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
