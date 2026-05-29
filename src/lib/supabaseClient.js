import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://rggsvpjiwhdicgaukcaa.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZ3N2cGppd2hkaWNnYXVrY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTgwMjksImV4cCI6MjA5NTM5NDAyOX0.2eQxJpPxgd255NsqHhxyF3sWjm40Xe7YFWqCrdI8hS0';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || DEFAULT_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && url.includes('supabase.co');
  } catch {
    return false;
  }
};

// Static mock mode: credentials are missing or invalid
const staticMockMode =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  !isValidUrl(SUPABASE_URL) ||
  SUPABASE_URL === 'your_supabase_url_here' ||
  SUPABASE_ANON_KEY === 'your_supabase_anon_key_here' ||
  SUPABASE_ANON_KEY.length < 100;

// Runtime connectivity flag — flipped to true the first time a fetch fails
let _runtimeMockMode = staticMockMode;

export const setRuntimeMockMode = () => {
  if (!_runtimeMockMode) {
    _runtimeMockMode = true;
    console.warn('[Wandr] Supabase unreachable — switching to offline mock mode for this session.');
    // Persist flag so all subsequent reads in this session use mock storage
    try { sessionStorage.setItem('wandr_supabase_offline', '1'); } catch {}
  }
};

// Restore runtime flag if we already detected offline in this session
try {
  if (sessionStorage.getItem('wandr_supabase_offline') === '1') _runtimeMockMode = true;
} catch {}

export const isMockMode = () => _runtimeMockMode;

if (staticMockMode) {
  console.info('[Wandr] No Supabase config — running in offline mock mode.');
} else {
  console.info('[Wandr] Supabase client initialised →', SUPABASE_URL);
}

export const supabase = !staticMockMode
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// USE_MOCK_MODE kept for authService.js backward-compat (it checks at import time)
export const USE_MOCK_MODE = staticMockMode;
