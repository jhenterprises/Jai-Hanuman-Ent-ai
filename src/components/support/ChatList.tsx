import React from 'react';
import { format } from 'date-fns';
import { Search, Filter, MessageCircle } from 'lucide-react';
import { Chat } from '../../types/chat';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chat: Chat) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800">
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 space-y-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Messages
          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
            {chats.length}
          </span>
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">No chats found</p>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={cn(
                "w-full p-4 flex items-start gap-3 text-left transition-all hover:bg-gray-50 dark:hover:bg-slate-800/60 border-b border-gray-50 dark:border-slate-800/40",
                selectedChatId === chat.id ? "bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 border-blue-100 dark:border-blue-800/40" : ""
              )}
            >
              <div className="relative flex-shrink-0">
                {chat.customerPhotoURL ? (
                  <img src={chat.customerPhotoURL} className="w-11 h-11 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-800" alt="" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 font-medium border border-gray-200 dark:border-slate-700">
                    {chat.customerName.charAt(0)}
                  </div>
                )}
                {chat.status === 'OPEN' && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {chat.customerName}
                  </h4>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-medium">
                    {chat.updatedAt ? format(chat.updatedAt.toDate(), 'HH:mm') : ''}
                  </span>
                </div>
                <p className={cn(
                  "text-xs truncate",
                  selectedChatId === chat.id ? "text-gray-600 dark:text-slate-300" : "text-gray-500 dark:text-slate-400"
                )}>
                  {chat.lastMessage || 'Sent a message'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    chat.status === 'OPEN' ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                    chat.status === 'IN_PROGRESS' ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                    chat.status === 'RESOLVED' ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                    "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  )}>
                    {chat.status}
                  </span>
                  {chat.assignedName && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                      • {chat.assignedName}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
