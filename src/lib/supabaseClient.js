import { createClient } from '@supabase/supabase-js';

// In production (GitHub Pages) these are injected by the GitHub Actions workflow
// via repository secrets: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
// For local dev, copy .env.example → .env and fill in your project values.
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Falls back to high-fidelity localStorage mock mode when no real project is configured.
export const isMockMode =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL === 'your_supabase_url_here' ||
  SUPABASE_ANON_KEY === 'your_supabase_anon_key_here';

if (isMockMode) {
  console.info('[Wandr] No Supabase config detected — running in offline mock mode.');
} else {
  console.info('[Wandr] Supabase client initialised.');
}

export const supabase = !isMockMode
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
