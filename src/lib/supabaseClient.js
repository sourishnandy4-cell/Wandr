import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://rggsvpjiwhdicgaukcaa.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZ3N2cGppd2hkaWNnYXVrY2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTgwMjksImV4cCI6MjA5NTM5NDAyOX0.2eQxJpPxgd255NsqHhxyF3sWjm40Xe7YFWqCrdI8hS0';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

const isValidUrl = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && url.includes('supabase.co');
  } catch {
    return false;
  }
};

const staticMockMode = false;

// Enable runtime mock mode if a network request fails
export const setRuntimeMockMode = () => {
  try { sessionStorage.setItem('wandr_supabase_offline', 'true'); } catch {}
};

export const isMockMode = (ignoreActiveTripId = false) => {
  if (staticMockMode) return true;
  try {
    if (sessionStorage.getItem('wandr_supabase_offline') === 'true') return true;
    if (!ignoreActiveTripId) {
      const activeTripId = localStorage.getItem('wandr_active_trip_id');
      if (activeTripId) {
        // If the active trip ID is not a UUID, it must be a locally saved legacy/mock trip.
        // We return true here so that all itinerary/expenses operations for this legacy trip 
        // correctly route to the local storage mock database instead of failing in Supabase.
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeTripId);
        if (!isUUID) return true;
      }
    }
  } catch {}
  return false;
};

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

/**
 * Helper to determine if an error was caused by a network fetch failure
 * (e.g. adblocker blocking supabase.co, DNS failure, or device offline)
 */
export const isNetworkError = (err) => {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    err instanceof TypeError ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('network_error') ||
    msg.includes('unreachable')
  );
};

/**
 * Returns a user-friendly diagnostic message for network errors
 */
export const getFriendlyErrorMessage = (err, defaultMsg = 'An error occurred.') => {
  if (isNetworkError(err)) {
    return 'Failed to connect to the cloud database.\n\n' +
           'This is commonly caused by:\n' +
           '1. An adblocker or privacy extension (e.g., Brave Shields, uBlock Origin) blocking the database server. Try turning off shields/adblocker for this site.\n' +
           '2. A network firewall or office/school Wi-Fi restriction blocking database ports.\n' +
           '3. Your device being offline or having an unstable connection.\n\n' +
           'Please check your connection and try again.';
  }
  return err.message || defaultMsg;
};

