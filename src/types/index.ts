export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  metadata?: {
    model?: string;
    tokens_used?: number;
    response_time?: number;
    context_messages?: number;
    has_memory?: boolean;
    provider?: string;
  };
}

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}