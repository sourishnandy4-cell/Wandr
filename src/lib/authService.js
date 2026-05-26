// Authentication Service
// Handles user signup, login, logout

import { supabase, USE_MOCK_MODE } from './supabaseClient';

/**
 * Sign up a new user
 * @param {Object} userData - { email, password, username }
 * @returns {Promise<Object>} User data
 */
export async function signUp({ email, password, username }) {
  if (USE_MOCK_MODE) {
    // Mock mode - store in localStorage
    const mockUser = {
      id: `user-${Date.now()}`,
      email,
      username,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('mockUser', JSON.stringify(mockUser));
    localStorage.setItem('username', username);
    return { user: mockUser, error: null };
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
  if (USE_MOCK_MODE) {
    // Mock mode - check localStorage
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      const user = JSON.parse(mockUser);
      localStorage.setItem('username', user.username);
      return { user, error: null };
    }
    throw new Error('No account found. Please sign up first.');
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
export async function logout() {
  if (USE_MOCK_MODE) {
    localStorage.removeItem('mockUser');
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
  if (USE_MOCK_MODE) {
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      return { user: JSON.parse(mockUser), error: null };
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
  if (USE_MOCK_MODE) {
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
