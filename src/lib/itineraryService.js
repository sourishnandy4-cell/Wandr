// Itinerary Service
// Person C: API Services for Itinerary and Trip Data

import { supabase, USE_MOCK_MODE } from './supabaseClient';

/**
 * Get trip metadata by ID
 * @param {string} tripId - Trip UUID
 * @returns {Promise<Object>} Trip metadata
 */
export async function getTripMeta(tripId) {
  if (USE_MOCK_MODE) {
    // Return from localStorage for mock mode
    const saved = localStorage.getItem('tripMeta');
    return saved ? JSON.parse(saved) : null;
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new trip
 * @param {Object} tripData - Trip details
 * @returns {Promise<Object>} Created trip
 */
export async function createTrip(tripData) {
  if (USE_MOCK_MODE) {
    const trip = {
      id: `trip-${Date.now()}`,
      ...tripData,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('tripMeta', JSON.stringify(trip));
    return trip;
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('trips')
    .insert([{ ...tripData, created_by: user.id }])
    .select()
    .single();

  if (error) throw error;

  // Add creator as organizer
  await supabase
    .from('trip_members')
    .insert([{ trip_id: data.id, user_id: user.id, role: 'organizer' }]);

  return data;
}

/**
 * Update trip metadata
 * @param {string} tripId - Trip UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated trip
 */
export async function updateTrip(tripId, updates) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('tripMeta');
    const trip = saved ? JSON.parse(saved) : null;
    const updated = { ...trip, ...updates };
    localStorage.setItem('tripMeta', JSON.stringify(updated));
    return updated;
  }

  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all itinerary items for a trip
 * @param {string} tripId - Trip UUID
 * @returns {Promise<Array>} Array of itinerary items
 */
export async function getItineraryItems(tripId) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('itineraryItems');
    return saved ? JSON.parse(saved) : [];
  }

  const { data, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Add a new itinerary item
 * @param {string} tripId - Trip UUID
 * @param {Object} itemData - Itinerary item details
 * @returns {Promise<Object>} Created itinerary item
 */
export async function addItineraryItem(tripId, itemData) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('itineraryItems');
    const items = saved ? JSON.parse(saved) : [];
    const newItem = {
      id: `i-${Date.now()}`,
      trip_id: tripId,
      ...itemData,
      created_at: new Date().toISOString(),
    };
    items.push(newItem);
    localStorage.setItem('itineraryItems', JSON.stringify(items));
    return newItem;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('itinerary_items')
    .insert([{ trip_id: tripId, ...itemData, created_by: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an itinerary item
 * @param {string} itemId - Itinerary item UUID
 * @returns {Promise<void>}
 */
export async function deleteItineraryItem(itemId) {
  if (USE_MOCK_MODE) {
    const saved = localStorage.getItem('itineraryItems');
    const items = saved ? JSON.parse(saved) : [];
    const filtered = items.filter(item => item.id !== itemId);
    localStorage.setItem('itineraryItems', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}
