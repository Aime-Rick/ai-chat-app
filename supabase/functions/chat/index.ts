import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client for accessing conversation history
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

// Optimized conversation history fetch with caching
const historyCache = new Map<string, { data: Message[], timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

async function getConversationHistory(conversationId: string, limit: number = 6): Promise<Message[]> {
  try {
    // Check cache first
    const cached = historyCache.get(conversationId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    const messages = (data || []).reverse();
    
    // Cache the result
    historyCache.set(conversationId, { data: messages, timestamp: Date.now() });
    
    // Clean old cache entries
    if (historyCache.size > 100) {
      const oldestKey = historyCache.keys().next().value;
      historyCache.delete(oldestKey);
    }

    return messages;
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    return [];
  }
}

// Function to clean markdown formatting from text
function cleanMarkdownFormatting(text: string): string {
  return text
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic (*text* or _text_)
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks (```code```)
    .replace(/```[\s\S]*?```/g, (match) => {
      // Extract just the code content without the backticks
      return match.replace(/```[\w]*\n?/g, '').replace(/```$/g, '');
    })
    // Remove blockquotes (> text)
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules (--- or ***)
    .replace(/^[-*]{3,}$/gm, '')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove reference links [text][ref] -> text
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    // Remove list markers (- * + 1. 2. etc.)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Optimized AI response with faster processing
async function getAIResponse(prompt: string, conversationHistory: Message[] = []): Promise<string> {
  try {
    // Build optimized conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant. Provide clear, natural responses without any markdown formatting. Do not use bold, italic, headers, code blocks, lists with bullets or numbers, or any other markdown syntax. Write in plain text only, using natural language and proper punctuation. ${conversationHistory.length > 0 ? 'You have conversation context - reference it when relevant.' : ''}`
      }
    ];

    // Add only recent relevant history (reduced for speed)
    const recentHistory = conversationHistory.slice(-6); // Reduced from 20 to 6
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content // Truncate long messages
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: prompt
    });

    // Optimized API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'X-Title': 'AI Chat Application',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: messages,
        max_tokens: 1000, // Reduced from 1500
        temperature: 0.7,
        top_p: 0.9,
        stream: false, // Ensure no streaming for faster response
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response structure from OpenRouter');
    }

    const rawResponse = data.choices[0].message.content || 'I apologize, but I was unable to generate a response. Please try again.';
    
    // Clean any markdown formatting from the response
    const cleanResponse = cleanMarkdownFormatting(rawResponse);
    
    return cleanResponse;
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    
    // Fast fallback response
    return "I'm experiencing some technical difficulties. Please try again in a moment.";
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();

    // Quick input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid message is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (message.length > 4000) {
      return new Response(
        JSON.stringify({ error: 'Message too long. Please limit to 4000 characters.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const startTime = Date.now();

    // Parallel execution: Get history and prepare AI call
    const historyPromise = conversationId ? getConversationHistory(conversationId) : Promise.resolve([]);
    
    const conversationHistory = await historyPromise;
    const response = await getAIResponse(message.trim(), conversationHistory);
    
    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({ 
        response,
        metadata: {
          model: 'deepseek/deepseek-chat-v3-0324:free',
          provider: 'openrouter',
          response_time: responseTime,
          conversation_id: conversationId,
          context_messages: conversationHistory.length,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error. Please try again later.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});