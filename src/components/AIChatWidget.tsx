import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Minus } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AIChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [aiConfig, setAiConfig] = useState<any>(null);

  // Load AI Config
  useEffect(() => {
    const fetchAIConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'ai_copilot');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAiConfig(data);
          
          if (data.enabled && data.enableWelcomeMessage && data.welcomeMessage) {
            setChatHistory(prev => {
              if (prev.length === 0) {
                return [{ role: 'model', parts: [{ text: data.welcomeMessage }] }];
              }
              return prev;
            });
          }
        } else {
          setChatHistory(prev => {
            if (prev.length === 0) {
              return [{ role: 'model', parts: [{ text: 'Hello! Welcome to JH Digital Seva Kendra. I am JH Digital Assistant, your Customer Support Executive. Ask me about PAN, Aadhaar, Voter ID, Passport, Recharge or how to track your applications!' }] }];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error loading AI configuration client-side:', err);
      }
    };
    fetchAIConfig();
  }, []);

  useEffect(() => {
    const handleOpenAIChat = () => setIsOpen(true);
    window.addEventListener('nz-open-ai-chat', handleOpenAIChat);
    return () => window.removeEventListener('nz-open-ai-chat', handleOpenAIChat);
  }, []);

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
        body: JSON.stringify({ 
          history: newHistory,
          user: user ? { email: user.email, role: user.role, uid: user.uid } : null
        }),
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

  // If AI Copilot is disabled globally, do not show anything
  if (aiConfig && aiConfig.enabled === false) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] h-[550px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">JH Digital Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                    <span className="text-[10px] text-blue-100 uppercase tracking-widest font-black">Support Executive</span>
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
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/45 flex flex-col"
            >
              {displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-white">JH Digital Assistant</h4>
                  <p className="text-xs text-slate-400">Ask me how to apply for services, list documents, active processes, and track application status instantly.</p>
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
                        "px-4 py-2.5 rounded-2xl text-xs shadow-sm whitespace-pre-wrap leading-relaxed",
                        isUser 
                          ? "bg-blue-600 text-white rounded-br-none font-bold" 
                          : "bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none font-medium"
                      )}>
                        {text}
                      </div>
                    </div>
                  );
                })
              )}
              {loading && (
                 <div className="flex flex-col mr-auto items-start max-w-[85%] mt-4">
                 <div className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 rounded-bl-none flex gap-1 items-center h-10 shadow-sm">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
               </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 py-2 text-xs focus:outline-none bg-transparent text-white placeholder-slate-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  message.trim() && !loading
                    ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
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
            ? "from-slate-700 to-slate-800 text-white rotate-90" 
            : "from-blue-600 to-indigo-600 text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};
