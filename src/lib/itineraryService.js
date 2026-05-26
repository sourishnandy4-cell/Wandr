import { supabase, isMockMode } from './supabaseClient';
import {
  mockFetchItinerary,
  mockAddItineraryItem,
} from './mockDatabase';

/**
 * Fetch all itinerary items for a trip, ordered chronologically.
 */
export const fetchItinerary = async (tripId) => {
  if (isMockMode) {
    return mockFetchItinerary(tripId);
  }

  const { data, error } = await supabase
    .from('itinerary_items')
    .select('id, title, location, start_time, notes, category_icon')
    .eq('trip_id', tripId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[fetchItinerary]', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};

/**
 * Add a new itinerary activity for a trip.
 */
export const addItineraryItem = async (tripId, item) => {
  if (isMockMode) {
    return mockAddItineraryItem(tripId, item);
  }

  const { data, error } = await supabase
    .from('itinerary_items')
    .insert([{
      trip_id: tripId,
      title: item.title,
      location: item.location || '',
      start_time: item.start_time,
      notes: item.notes || '',
      category_icon: item.category_icon || 'activity',
    }])
    .select()
    .single();

  if (error) {
    console.error('[addItineraryItem]', error.message);
    return { data: null, error };
  }
  return { data, error: null };
};
