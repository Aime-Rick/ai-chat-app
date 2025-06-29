import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Settings, LogOut, User, Search, Archive } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useChatStore } from '../../store/chatStore';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDebounce } from '../../hooks/useDebounce';
import { auth } from '../../lib/supabase';
import type { Conversation } from '../../types';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConversationItem = memo(({ 
  conversation, 
  isActive, 
  onClick 
}: { 
  conversation: Conversation; 
  isActive: boolean; 
  onClick: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      w-full text-left p-3 rounded-lg transition-all duration-200 group
      ${isActive
        ? 'bg-blue-50 border-blue-200 border shadow-sm'
        : 'hover:bg-gray-50 border border-transparent hover:shadow-sm'
      }
    `}
  >
    <div className="flex items-center">
      <MessageSquare className={`w-4 h-4 mr-3 flex-shrink-0 ${
        isActive ? 'text-blue-600' : 'text-gray-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          isActive ? 'text-blue-900' : 'text-gray-900'
        }`}>
          {conversation.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(conversation.updated_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  </motion.button>
));

ConversationItem.displayName = 'ConversationItem';

export const Sidebar: React.FC<SidebarProps> = memo(({ isOpen, onClose }) => {
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    createConversation,
    isLoading,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarWidth] = useLocalStorage('sidebarWidth', 320);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!debouncedSearch.trim()) return conversations;
    
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [conversations, debouncedSearch]);

  const handleNewChat = async () => {
    await createConversation();
    onClose();
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    onClose();
  };

  const handleSignOut = async () => {
    await auth.signOut();
    window.location.reload();
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -sidebarWidth }}
        animate={{ x: isOpen ? 0 : -sidebarWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 z-50 h-full bg-white border-r border-gray-200 flex flex-col lg:relative lg:translate-x-0 shadow-lg lg:shadow-none"
        style={{ width: sidebarWidth }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">AI Chat</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden p-1"
            >
              ×
            </Button>
          </div>
          
          <Button
            onClick={handleNewChat}
            disabled={isLoading}
            className="w-full mb-3"
            loading={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>

          {/* Search */}
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4 text-gray-400" />}
            className="text-sm"
          />
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={currentConversation?.id === conversation.id}
                  onClick={() => handleConversationSelect(conversation)}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-sm">
              <User className="w-4 h-4 mr-3" />
              Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Archive className="w-4 h-4 mr-3" />
              Archived
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm">
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';