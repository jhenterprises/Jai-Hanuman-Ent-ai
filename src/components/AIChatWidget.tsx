import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Minus, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // Simple display mapping since history uses role 'user' and 'model'
  const displayMessages = chatHistory.filter((msg) => 
    msg.role === 'user' && !msg.parts?.[0]?.functionResponse
    || msg.role === 'model' && msg.parts?.[0]?.text
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || loading) return;

    const currentMsg = message;
    setMessage('');
    
    const newHistory = [
      ...chatHistory,
      { role: 'user', parts: [{ text: currentMsg }] }
    ];
    setChatHistory(newHistory);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory }),
      });
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      // The backend returns the full aggregated history including tool calls/responses and final model text
      if (data.history) {
        setChatHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Optional: Add a system error message
      setChatHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: 'Sorry, I encountered an error. Please try again.' }] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] h-[550px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-purple-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-purple-100">Powered by Gemini</span>
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
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col"
            >
              {displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="font-medium text-gray-900">Virtual Assistant</h4>
                  <p className="text-sm text-gray-500">I can help you find services, understand documents, and check application status.</p>
                </div>
              ) : (
                displayMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const text = msg.parts?.[0]?.text;
                  if (!text) return null;
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isUser ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap leading-relaxed",
                        isUser 
                          ? "bg-purple-600 text-white rounded-br-none" 
                          : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                      )}>
                        {text}
                      </div>
                    </div>
                  );
                })
              )}
              {loading && (
                 <div className="flex flex-col mr-auto items-start max-w-[85%] mt-4">
                 <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 rounded-bl-none flex gap-1 items-center h-10 shadow-sm">
                   <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
               </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 py-2 text-sm focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  message.trim() && !loading
                    ? "bg-purple-600 text-white shadow-md hover:bg-purple-700" 
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
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all bg-gradient-to-r",
          isOpen 
            ? "from-gray-500 to-gray-600 text-white rotate-90" 
            : "from-purple-600 to-indigo-600 text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};
