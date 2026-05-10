import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lcfhvhhexidtbzcxwryx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZmh2aGhleGlkdGJ6Y3h3cnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQ2MjAsImV4cCI6MjA4ODc1MDYyMH0.N7YbFODZhzPQ2Rgtqp760JUmGlw010dFxRwm1MYCvVo';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

