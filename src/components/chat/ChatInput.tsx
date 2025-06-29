import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDebounce } from '../../hooks/useDebounce';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedMessage = useDebounce(message, 300);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled && !isComposing) {
      onSendMessage(message.trim());
      setMessage('');
    }
  }, [message, isLoading, disabled, isComposing, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit, isComposing]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Focus management
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const canSend = message.trim() && !isLoading && !disabled && !isComposing;

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="Type your message..."
            disabled={disabled || isLoading}
            className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors shadow-sm"
            rows={1}
            maxLength={4000}
          />
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          )}
          
          {/* Character count */}
          {message.length > 3500 && (
            <div className="absolute bottom-1 right-3 text-xs text-gray-400">
              {message.length}/4000
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          type="submit"
          disabled={!canSend}
          className="rounded-xl px-4 py-3 transition-all duration-200 shadow-sm"
          loading={isLoading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
      
      {/* Input hints */}
      <div className="mt-2 text-xs text-gray-500 text-center max-w-4xl mx-auto">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};