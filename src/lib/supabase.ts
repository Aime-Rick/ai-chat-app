import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      // If signup is successful but user already exists, try to create profile manually
      if (data.user && !error) {
        // Ensure user profile exists
        await auth.ensureUserProfile(data.user.id, email, name);
      }

      return { data, error };
    } catch (error) {
      console.error('Signup error:', error);
      return { data: null, error: error as any };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // If signin is successful, ensure user profile exists
      if (data.user && !error) {
        await auth.ensureUserProfile(data.user.id, data.user.email || email);
      }

      return { data, error };
    } catch (error) {
      console.error('Signin error:', error);
      return { data: null, error: error as any };
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Ensure user profile exists in users table
  ensureUserProfile: async (userId: string, email: string, name?: string) => {
    try {
      // Check if profile exists - use maybeSingle() to handle zero rows gracefully
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email,
            name: name || email.split('@')[0]
          }]);

        if (error) {
          console.error('Error creating user profile:', error);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  },

  // Get user profile from users table
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: { name?: string; avatar_url?: string }) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  }
};