import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Paperclip, 
  Smile, 
  Minus, 
  MoreVertical,
  Check,
  CheckCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { useChatMessages } from '../../hooks/useChatMessages';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { messages, loading } = useChatMessages(chatId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user && !chatId) {
      chatService.getOrCreateChat(user).then(setChatId);
    }
  }, [isOpen, user, chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !chatId || !user) return;

    const currentMsg = message;
    setMessage('');
    
    try {
      await chatService.sendMessage({
        chatId,
        senderId: user.uid,
        senderName: user.name,
        senderRole: user.role as any,
        message: currentMsg,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessage(currentMsg); // Restore on error
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          >
            {/* Header */}
            <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Customer Support</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-blue-100">Always active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded">
                  <Minus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
            >
              {loading && !messages.length ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="font-medium text-gray-900">How can we help?</h4>
                  <p className="text-sm text-gray-500">Ask us anything about recharges, bill payments, or applications.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === user.uid;
                  const isSystem = msg.senderId === 'system';
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap leading-relaxed",
                        isMe 
                          ? "bg-blue-600 text-white rounded-br-none" 
                          : isSystem 
                            ? "bg-amber-50 text-amber-900 border border-amber-100 rounded-bl-none"
                            : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                      )}>
                        {msg.message}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                        {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : ''}
                        {isMe && (
                          msg.seen ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 py-2 text-sm focus:outline-none"
              />
              <button 
                type="button" 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                onClick={() => alert('Attachments coming soon!')}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={!message.trim()}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  message.trim() 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors border-4 border-white",
          isOpen ? "bg-red-500 text-white rotate-90" : "bg-blue-600 text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};
