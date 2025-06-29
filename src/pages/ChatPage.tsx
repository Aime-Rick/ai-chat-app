import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { Button } from '../components/ui/Button';
import { useChatStore } from '../store/chatStore';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Network status hook
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const ChatPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);
  const { loadConversations, error, setError } = useChatStore();
  const isOnline = useNetworkStatus();

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    // Load conversations when the component mounts
    loadConversations();
  }, [loadConversations]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      
      // Escape to close sidebar on mobile
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Auto-close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Network status indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm z-50">
          <WifiOff className="w-4 h-4 inline mr-2" />
          You're offline. Some features may not work.
        </div>
      )}

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSidebarToggle}
          className="bg-white shadow-md hover:shadow-lg transition-shadow"
          title="Toggle sidebar (Cmd+K)"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block transition-all duration-300 ${
        sidebarCollapsed ? 'w-0' : 'w-80'
      } flex-shrink-0`}>
        {!sidebarCollapsed && (
          <Sidebar isOpen={true} onClose={() => {}} />
        )}
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-white min-w-0 relative">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
              <span className="text-sm text-red-700">{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              ×
            </Button>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 min-h-0">
          <ChatArea />
        </div>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:block absolute top-4 left-4 bg-white shadow-md hover:shadow-lg transition-shadow"
          title={`${sidebarCollapsed ? 'Show' : 'Hide'} sidebar (Cmd+K)`}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </main>
    </div>
  );
};