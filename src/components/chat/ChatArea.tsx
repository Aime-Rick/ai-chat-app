import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { useChatStore } from '../../store/chatStore';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

export const ChatArea: React.FC = () => {
  const {
    currentConversation,
    messages,
    isTyping,
    sendMessage,
    createConversation,
    loadMoreMessages,
    hasMoreMessages,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { targetRef: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages.length, isTyping, scrollToBottom]);

  // Load more messages when scrolling to top
  useEffect(() => {
    if (isIntersecting && hasMoreMessages && currentConversation && !isTyping) {
      loadMoreMessages(currentConversation.id);
    }
  }, [isIntersecting, hasMoreMessages, currentConversation, isTyping, loadMoreMessages]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentConversation) {
      // Create new conversation with first message as title
      const newConversation = await createConversation(
        content.slice(0, 50) + (content.length > 50 ? '...' : '')
      );
      if (newConversation) {
        await sendMessage(newConversation.id, content);
      }
    } else {
      await sendMessage(currentConversation.id, content);
    }
  }, [currentConversation, createConversation, sendMessage]);

  // Reduced suggestions to prevent re-renders
  const suggestions = useMemo(() => [
    '✨ What can you help me with?',
    '🚀 Tell me about the latest tech trends',
    '💡 I need help with a creative project',
  ], []);

  // Welcome screen for new conversations
  if (!currentConversation && messages.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Welcome Screen */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md w-full"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-2xl text-white">🤖</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Welcome to AI Chat
            </h2>
            <p className="text-gray-600 mb-8 text-sm sm:text-base">
              Start a conversation with our AI assistant. Ask questions, get help, or just chat!
            </p>
            <div className="grid grid-cols-1 gap-3">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSendMessage(suggestion.substring(2))}
                  className="p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                >
                  <span className="text-gray-700">{suggestion}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Fixed Chat Input */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isTyping}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ minHeight: 0 }}
      >
        <div className="p-4 pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Load more trigger */}
            {hasMoreMessages && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded-full shadow-sm border border-gray-200">
                  Loading more messages...
                </div>
              </div>
            )}
            
            {/* Messages list */}
            {messages.map((message, index) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isLast={index === messages.length - 1}
              />
            ))}
            
            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && <TypingIndicator />}
            </AnimatePresence>
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>
      </div>

      {/* Fixed Chat Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isTyping}
        />
      </div>
    </div>
  );
};