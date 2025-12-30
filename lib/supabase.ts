
import { createClient } from '@supabase/supabase-js';

// Use Vite environment variables for sensitive connection strings.
// These should be configured in the Netlify dashboard.
// Access environment variables through any cast to satisfy type checking for ImportMeta
const supabaseUrl = ((import.meta as any).env.VITE_SUPABASE_URL || '').trim();
// Access environment variables through any cast to satisfy type checking for ImportMeta
const supabaseAnonKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = 
  supabaseUrl.length > 10 && 
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey.length > 10 &&
  supabaseAnonKey.startsWith('eyJ');

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

export const verifyDatabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured) return { success: false, message: "Supabase configuration missing." };
  
  try {
    const { error } = await supabase.from('patrons').select('id').limit(1);
    if (error) {
      if (error.message.includes('relation "patrons" does not exist')) {
        return { success: false, message: "Schema missing. Please run the SQL setup." };
      }
      throw error;
    }
    return { success: true, message: "Cloud Database Connected" };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed." };
  }
};
