// Authentication Service
// Handles user signup, login, logout

import { supabase, isMockMode } from './supabaseClient';

// ── Secure password hashing (Web Crypto API — zero dependencies) ──────────────
const hashPassword = async (password, salt) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password + 'wandr_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateSalt = () => {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateSessionToken = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

// ── Mock user store helpers ───────────────────────────────────────────────────
const getMockUsers = () => {
  try {
    const raw = localStorage.getItem('wandr_mock_users');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const saveMockUsers = (users) => {
  localStorage.setItem('wandr_mock_users', JSON.stringify(users));
};

// ── Active session store ──────────────────────────────────────────────────────
// Each session token maps to an email, stored under wandr_sessions.
// On login we generate a new token; on logout we remove it.
const getSessions = () => {
  try {
    const raw = localStorage.getItem('wandr_sessions');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};
const saveSessions = (s) => localStorage.setItem('wandr_sessions', JSON.stringify(s));

export const validateMockSession = (token) => {
  if (!token) return null;
  const sessions = getSessions();
  const email = sessions[token];
  if (!email) return null;
  const users = getMockUsers();
  return users[email] || null;
};

/**
 * Sign up a new user
 * @param {Object} userData - { email, password, username, region, currencySymbol, currencyCode }
 * @returns {Promise<Object>} User data
 */
export async function signUp({ email, password, username, region, currencySymbol, currencyCode }) {
  if (isMockMode()) {
    const users = getMockUsers();
    if (users[email]) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const sessionToken = generateSessionToken();

    const mockUser = {
      id: `user-${Date.now()}`,
      email,
      username,
      passwordHash,
      salt,
      created_at: new Date().toISOString(),
      region: region || 'IN',
      currencySymbol: currencySymbol || '₹',
      currencyCode: currencyCode || 'INR',
      avatar: null,
      avatarColorClass: 'bg-gradient-to-tr from-[#654ea3] to-[#eaafc8]',
    };

    users[email] = mockUser;
    saveMockUsers(users);

    // Create session
    const sessions = getSessions();
    sessions[sessionToken] = email;
    saveSessions(sessions);

    localStorage.setItem('username', username);
    // Return safe user (no hash/salt)
    return {
      user: { 
        id: mockUser.id, 
        email, 
        username, 
        created_at: mockUser.created_at,
        region: mockUser.region,
        currencySymbol: mockUser.currencySymbol,
        currencyCode: mockUser.currencyCode,
        avatar: mockUser.avatar,
        avatarColorClass: mockUser.avatarColorClass
      },
      sessionToken,
      error: null,
    };
  }

  // Sign up with Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;

  // Create user profile
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .insert([
      {
        id: authData.user.id,
        email,
        name: username,
      },
    ])
    .select()
    .single();

  if (profileError) throw profileError;

  return { user: authData.user, profile: profileData, error: null };
}

/**
 * Log in an existing user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} User data
 */
export async function login({ email, password }) {
  if (isMockMode()) {
    const users = getMockUsers();
    const storedUser = users[email];

    if (!storedUser) {
      throw new Error('No account found with this email. Please sign up first.');
    }

    // Verify password
    const attemptHash = await hashPassword(password, storedUser.salt);
    if (attemptHash !== storedUser.passwordHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Self-healing: Ensure a stable ID is present for legacy users
    let usersUpdated = false;
    if (!storedUser.id) {
      storedUser.id = `user-${Date.now()}`;
      usersUpdated = true;
    }
    if (!storedUser.region) {
      storedUser.region = 'IN';
      storedUser.currencySymbol = '₹';
      storedUser.currencyCode = 'INR';
      usersUpdated = true;
    }
    if (usersUpdated) {
      users[email] = storedUser;
      saveMockUsers(users);
    }

    const sessionToken = generateSessionToken();
    const sessions = getSessions();
    sessions[sessionToken] = email;
    saveSessions(sessions);

    localStorage.setItem('username', storedUser.username);
    return {
      user: { 
        id: storedUser.id, 
        email, 
        username: storedUser.username, 
        created_at: storedUser.created_at,
        region: storedUser.region || 'IN',
        currencySymbol: storedUser.currencySymbol || '₹',
        currencyCode: storedUser.currencyCode || 'INR',
        avatar: storedUser.avatar || null,
        avatarColorClass: storedUser.avatarColorClass || 'bg-gradient-to-tr from-[#654ea3] to-[#eaafc8]'
      },
      sessionToken,
      error: null,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return { user: data.user, profile, error: null };
}

/**
 * Log out the current user
 * @returns {Promise<void>}
 */
export async function logout(sessionToken) {
  if (isMockMode()) {
    if (sessionToken) {
      const sessions = getSessions();
      delete sessions[sessionToken];
      saveSessions(sessions);
    }
    localStorage.removeItem('username');
    localStorage.removeItem('tripMeta');
    localStorage.removeItem('itineraryItems');
    localStorage.removeItem('expenses');
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current user session
 * @returns {Promise<Object>} User session
 */
export async function getCurrentUser() {
  if (isMockMode()) {
    // Session-token based validation — NOT just checking any mockUser in localStorage
    const sessionToken = sessionStorage.getItem('wandr_session_token');
    if (!sessionToken) return { user: null, error: null };
    const user = validateMockSession(sessionToken);
    if (user) {
      return {
        user: { 
          id: user.id || `user-${Date.now()}`, 
          email: user.email, 
          username: user.username, 
          created_at: user.created_at,
          region: user.region || 'IN',
          currencySymbol: user.currencySymbol || '₹',
          currencyCode: user.currencyCode || 'INR',
          avatar: user.avatar || null,
          avatarColorClass: user.avatarColorClass || 'bg-gradient-to-tr from-[#654ea3] to-[#eaafc8]'
        },
        error: null,
      };
    }
    return { user: null, error: null };
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) return { user: null, error };
  if (!user) return { user: null, error: null };

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile, error: null };
}

/**
 * Search for users by username
 * @param {string} searchTerm - Username to search for
 * @returns {Promise<Array>} Array of users
 */
export async function searchUsers(searchTerm) {
  if (isMockMode()) {
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .ilike('name', `%${searchTerm}%`)
    .limit(10);

  if (error) throw error;
  return data;
}
