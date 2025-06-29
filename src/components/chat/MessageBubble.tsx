import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ 
  message, 
  isLast = false
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-4 group ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
        ${isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
        }
      `}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] sm:max-w-[75%] md:max-w-[70%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`
          relative p-4 rounded-2xl text-sm leading-relaxed shadow-sm max-w-full
          ${isUser 
            ? 'bg-blue-600 text-white rounded-br-md' 
            : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
          }
        `}>
          <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {message.content}
          </div>
          
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`
              absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
              p-1.5 rounded hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1
              ${isUser ? 'text-white/70 hover:text-white focus:ring-white/50' : 'text-gray-400 hover:text-gray-600 focus:ring-gray-300'}
            `}
            title="Copy message"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        
        {/* Timestamp */}
        <p className={`text-xs text-gray-500 mt-2 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = 'MessageBubble';