// Supabase Client Configuration
// Person C: API Services

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// For development without Supabase, use mock mode
const USE_MOCK_MODE = !supabaseUrl || !supabaseAnonKey;

let supabase = null;

if (!USE_MOCK_MODE) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase, USE_MOCK_MODE };
