import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ChatState, Conversation, Message } from '../types';
import { api } from '../lib/api';
import { performanceMonitor } from '../lib/performance';

interface ChatActions {
  setCurrentConversation: (conversation: Conversation | null) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation | null>;
  setLoading: (loading: boolean) => void;
  setTyping: (typing: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

interface ExtendedChatState extends ChatState {
  hasMoreMessages: boolean;
  messageOffset: number;
  optimisticMessages: Message[];
}

const initialState: ExtendedChatState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  error: null,
  hasMoreMessages: false,
  messageOffset: 0,
  optimisticMessages: [],
};

export const useChatStore = create<ExtendedChatState & ChatActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setCurrentConversation: (conversation) => {
      const endTimer = performanceMonitor.startTimer('store.setCurrentConversation');
      
      set({ 
        currentConversation: conversation, 
        messages: [],
        messageOffset: 0,
        hasMoreMessages: false,
        optimisticMessages: []
      });
      
      if (conversation) {
        get().loadMessages(conversation.id);
      }
      
      endTimer();
    },

    loadConversations: async () => {
      const endTimer = performanceMonitor.startTimer('store.loadConversations');
      set({ isLoading: true, error: null });
      
      try {
        const { data, error, success } = await api.getConversations();
        if (success) {
          set({ conversations: data });
        } else {
          set({ error });
        }
      } catch (error) {
        set({ error: 'Failed to load conversations' });
      } finally {
        set({ isLoading: false });
        endTimer();
      }
    },

    loadMessages: async (conversationId) => {
      const endTimer = performanceMonitor.startTimer('store.loadMessages');
      set({ isLoading: true, error: null, messageOffset: 0 });
      
      try {
        const { data, error, success } = await api.getMessages(conversationId, 50, 0);
        if (success) {
          set({ 
            messages: data,
            messageOffset: data.length,
            hasMoreMessages: data.length === 50
          });
        } else {
          set({ error });
        }
      } catch (error) {
        set({ error: 'Failed to load messages' });
      } finally {
        set({ isLoading: false });
        endTimer();
      }
    },

    loadMoreMessages: async (conversationId) => {
      const { messageOffset, messages, isLoading } = get();
      if (isLoading) return;

      const endTimer = performanceMonitor.startTimer('store.loadMoreMessages');
      set({ isLoading: true });
      
      try {
        const { data, error, success } = await api.getMessages(conversationId, 50, messageOffset);
        if (success) {
          set({ 
            messages: [...data, ...messages],
            messageOffset: messageOffset + data.length,
            hasMoreMessages: data.length === 50
          });
        } else {
          set({ error });
        }
      } catch (error) {
        set({ error: 'Failed to load more messages' });
      } finally {
        set({ isLoading: false });
        endTimer();
      }
    },

    sendMessage: async (conversationId, content) => {
      const endTimer = performanceMonitor.startTimer('store.sendMessage');
      set({ isTyping: true, error: null });

      const tempUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        conversation_id: conversationId,
        content,
        role: 'user',
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, tempUserMessage],
        optimisticMessages: [...state.optimisticMessages, tempUserMessage],
      }));

      try {
        const { data, error, success } = await api.sendMessage(conversationId, content);

        if (success && data) {
          if (Array.isArray(data)) {
            // Back-end returned both the persisted user message and the assistant reply.
            const [userMessage, aiMessage] = data;

            set((state) => ({
              messages: [
                ...state.messages.filter((msg) => msg.id !== tempUserMessage.id),
                userMessage,
                aiMessage,
              ],
              // Optimistic user message has now been replaced with the real one
              optimisticMessages: state.optimisticMessages.filter(
                (msg) => msg.id !== tempUserMessage.id
              ),
            }));
          } else {
            // Back-end returned only the assistant reply. Keep the optimistic user
            // message and just append the assistant message.
            const aiMessage = data;
            set((state) => ({
              messages: [
                ...state.messages,
                aiMessage,
              ],
              // Clear optimistic list – its message is now considered final.
              optimisticMessages: state.optimisticMessages.filter(
                (msg) => msg.id !== tempUserMessage.id
              ),
            }));
          }
        } else {
          set({ error });
          // Remove optimistic message on error
          set((state) => ({
            messages: state.messages.filter(msg => msg.id !== tempUserMessage.id),
            optimisticMessages: state.optimisticMessages.filter(msg => msg.id !== tempUserMessage.id),
          }));
        }
      } catch (error) {
        set({ error: 'Failed to send message' });
        set((state) => ({
          messages: state.messages.filter(msg => msg.id !== tempUserMessage.id),
          optimisticMessages: state.optimisticMessages.filter(msg => msg.id !== tempUserMessage.id),
        }));
      } finally {
        set({ isTyping: false });
        endTimer();
      }
    },

    createConversation: async (title = 'New Conversation') => {
      const endTimer = performanceMonitor.startTimer('store.createConversation');
      set({ isLoading: true, error: null });
      
      try {
        const { data, error, success } = await api.createConversation(title);
        if (success && data) {
          set((state) => ({
            conversations: [data, ...state.conversations],
            currentConversation: data,
            messages: [],
            messageOffset: 0,
            hasMoreMessages: false,
            optimisticMessages: []
          }));
          return data;
        } else {
          set({ error });
          return null;
        }
      } catch (error) {
        set({ error: 'Failed to create conversation' });
        return null;
      } finally {
        set({ isLoading: false });
        endTimer();
      }
    },

    setLoading: (isLoading) => set({ isLoading }),
    setTyping: (isTyping) => set({ isTyping }),
    setError: (error) => set({ error }),
    resetState: () => set(initialState),
  }))
);

// Performance monitoring subscription
useChatStore.subscribe(
  (state) => state.messages.length,
  (messageCount) => {
    performanceMonitor.recordMetric('store.messageCount', messageCount);
  }
);