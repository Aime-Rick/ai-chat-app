import { supabase } from './supabase';
import { cache, cacheKeys } from './cache';
import { performanceMonitor } from './performance';
import type { Conversation, Message, ApiResponse } from '../types';

// Optimized request queue for better performance
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent = 5; // Increased from 3
  private currentRequests = 0;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.currentRequests >= this.maxConcurrent) return;
    
    this.processing = true;
    
    while (this.queue.length > 0 && this.currentRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (request) {
        this.currentRequests++;
        request().finally(() => {
          this.currentRequests--;
          this.process();
        });
      }
    }
    
    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

// Optimized retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2, // Reduced from 3
  baseDelay: number = 500 // Reduced from 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) break;
      
      // Faster exponential backoff
      const delay = baseDelay * Math.pow(1.5, attempt) + Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export const api = {
  // Optimized conversation management
  createConversation: async (title: string): Promise<ApiResponse<Conversation>> => {
    const endTimer = performanceMonitor.startTimer('api.createConversation');
    
    try {
      const result = await requestQueue.add(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('conversations')
          .insert([{ user_id: user.id, title }])
          .select()
          .single();

        if (error) throw error;

        // Invalidate conversations cache
        cache.delete(cacheKeys.conversations(user.id));
        
        return data;
      });

      endTimer();
      return { data: result, success: true };
    } catch (error) {
      endTimer();
      return { 
        data: null as any, 
        error: error instanceof Error ? error.message : 'Failed to create conversation',
        success: false 
      };
    }
  },

  getConversations: async (): Promise<ApiResponse<Conversation[]>> => {
    const endTimer = performanceMonitor.startTimer('api.getConversations');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const cacheKey = cacheKeys.conversations(user.id);
      const cached = cache.get<Conversation[]>(cacheKey);
      
      if (cached) {
        endTimer();
        return { data: cached, success: true };
      }

      const result = await requestQueue.add(async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(30); // Reduced from 50

        if (error) throw error;
        return data || [];
      });

      // Cache for 3 minutes (reduced from 5)
      cache.set(cacheKey, result, 3 * 60 * 1000);
      
      endTimer();
      return { data: result, success: true };
    } catch (error) {
      endTimer();
      return { 
        data: [] as Conversation[], 
        error: error instanceof Error ? error.message : 'Failed to fetch conversations',
        success: false 
      };
    }
  },

  // Optimized message management
  getMessages: async (conversationId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<Message[]>> => {
    const endTimer = performanceMonitor.startTimer('api.getMessages');
    
    try {
      const cacheKey = `${cacheKeys.messages(conversationId)}:${limit}:${offset}`;
      const cached = cache.get<Message[]>(cacheKey);
      
      if (cached) {
        endTimer();
        return { data: cached, success: true };
      }

      const result = await requestQueue.add(async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
      });

      // Cache for 1 minute (reduced from 2)
      cache.set(cacheKey, result, 60 * 1000);
      
      endTimer();
      return { data: result, success: true };
    } catch (error) {
      endTimer();
      return { 
        data: [] as Message[], 
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
        success: false 
      };
    }
  },

  // Optimized message sending
  sendMessage: async (conversationId: string, content: string): Promise<ApiResponse<Message>> => {
    const endTimer = performanceMonitor.startTimer('api.sendMessage');
    
    try {
      const result = await requestQueue.add(async () => {
        // Save user message first
        const { data: userMessage, error: userError } = await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            content,
            role: 'user'
          }])
          .select()
          .single();

        if (userError) throw userError;

        // Get AI response with increased timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased from 20s to 30s

        try {
          const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              message: content,
              conversationId
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!aiResponse.ok) {
            throw new Error(`AI service error: ${aiResponse.status}`);
          }

          const { response } = await aiResponse.json();

          // Save AI message
          const { data: aiMessage, error: aiError } = await supabase
            .from('messages')
            .insert([{
              conversation_id: conversationId,
              content: response,
              role: 'assistant'
            }])
            .select()
            .single();

          if (aiError) throw aiError;

          // Update conversation timestamp (async, don't wait)
          supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId)
            .then(() => {
              // Invalidate relevant caches after update
              cache.delete(cacheKeys.messages(conversationId));
            });

          return aiMessage;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });

      endTimer();
      return { data: result, success: true };
    } catch (error) {
      endTimer();
      return { 
        data: null as any, 
        error: error instanceof Error ? error.message : 'Failed to send message',
        success: false 
      };
    }
  },

  // Optimized batch operations
  getConversationsWithMessageCounts: async (): Promise<ApiResponse<Array<Conversation & { message_count: number }>>> => {
    const endTimer = performanceMonitor.startTimer('api.getConversationsWithMessageCounts');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const result = await requestQueue.add(async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            messages(count)
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(30); // Reduced from 50

        if (error) throw error;
        
        return (data || []).map(conv => ({
          ...conv,
          message_count: conv.messages?.[0]?.count || 0
        }));
      });

      endTimer();
      return { data: result, success: true };
    } catch (error) {
      endTimer();
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch conversations with counts',
        success: false 
      };
    }
  }
};