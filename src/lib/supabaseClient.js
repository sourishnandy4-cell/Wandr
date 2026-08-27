import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes('<your') || trimmed.includes('xxxx') || trimmed.length < 10) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

const hasValidConfig = isValidUrl(envUrl) && !!envKey && typeof envKey === 'string' && envKey.trim().length > 20 && !envKey.includes('...');

const SUPABASE_URL      = hasValidConfig ? envUrl.trim() : null;
const SUPABASE_ANON_KEY = hasValidConfig ? envKey.trim() : null;

export const staticMockMode = !hasValidConfig;

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
  console.info('[Wandr] No valid Supabase config provided — running seamlessly in offline mock mode.');
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

export const getFriendlyErrorMessage = (err, defaultMsg = 'An error occurred.') => {
  const rawError = err ? `\n\n[Diagnostic Details: ${err.message || String(err)}]` : '';
  if (isNetworkError(err)) {
    return 'Failed to connect to the cloud database.\n\n' +
           'This is commonly caused by:\n' +
           '1. An adblocker or privacy extension (e.g., Brave Shields, uBlock Origin) blocking the database server. Try turning off shields/adblocker for this site.\n' +
           '2. A network firewall or office/school Wi-Fi restriction blocking database ports.\n' +
           '3. Your device being offline or having an unstable connection.\n\n' +
           'Please check your connection and try again.' + rawError;
  }
  return (err?.message || defaultMsg) + rawError;
};

