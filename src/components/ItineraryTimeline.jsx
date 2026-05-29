import React, { useState, useEffect } from 'react';
import { Bus, Utensils, MapPin, Music, Plus, ChevronUp, AlertCircle, Hotel, Trash2 } from 'lucide-react';
import { fetchItinerary, addItineraryItem } from '../lib/itineraryService';
import { isMockMode } from '../lib/supabaseClient';
import { MOCK_ITINERARY_ITEMS, saveMockData } from '../lib/mockDatabase';
import { supabase } from '../lib/supabaseClient';

const iconMap = {
  transport: Bus,
  food: Utensils,
  activity: MapPin,
  music: Music,
  accommodation: Hotel,
};

const categoryColors = {
  transport: 'bg-purple-100 text-purple-600',
  food: 'bg-orange-100 text-orange-600',
  activity: 'bg-teal-100 text-teal-600',
  music: 'bg-pink-100 text-pink-600',
  accommodation: 'bg-blue-100 text-blue-600',
};

const TimelineSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
    <div className="flex justify-between items-center mb-6">
      <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
      <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
    </div>
    <div className="space-y-8">
      {[1, 2].map((day) => (
        <div key={day} className="flex items-start gap-4">
          <div className="w-24 flex-shrink-0">
            <div className="h-4 w-16 bg-slate-200 rounded"></div>
          </div>
          <div className="flex-1 relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200"></div>
            <div className="absolute left-0 top-2 w-3 h-3 bg-slate-200 rounded-full -translate-x-[5px] ring-4 ring-white"></div>
            <div className="space-y-4">
              {[1, 2].map((card) => (
                <div key={card} className="bg-slate-50 border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-200 rounded-lg w-9 h-9"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-16 bg-slate-200 rounded"></div>
                      <div className="h-4 w-40 bg-slate-200 rounded"></div>
                      <div className="h-3 w-28 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6 border border-red-100 text-center space-y-4">
    <div className="inline-flex items-center justify-center p-3 bg-red-50 rounded-full text-red-500">
      <AlertCircle className="w-6 h-6" />
    </div>
    <h3 className="text-md font-bold text-gray-900">Failed to load itinerary</h3>
    <p className="text-sm text-gray-500 max-w-xs mx-auto">{message || 'Failed to load data. Try again.'}</p>
    <button 
      onClick={onRetry}
      className="bg-accent/10 hover:bg-accent/20 text-accent font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200"
    >
      Try Again
    </button>
  </div>
);

export const ItineraryTimeline = ({ tripId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', refreshTrigger, items: initialItems, onRefresh }) => {
  const [items, setItems] = useState(initialItems || null);
  const [loading, setLoading] = useState(!initialItems);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('activity');
  const [submitting, setSubmitting] = useState(false);

  const loadItinerary = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await fetchItinerary(tripId);
      if (fetchErr) {
        setError(fetchErr.message || 'Failed to load itinerary data.');
      } else {
        setItems(data);
      }
    } catch (err) {
      setError('An unexpected error occurred while loading itinerary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialItems) {
      loadItinerary();
    }
  }, [tripId, initialItems, refreshTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startTime) return;

    setSubmitting(true);
    try {
      const { error: addErr } = await addItineraryItem(tripId, {
        title,
        location,
        start_time: new Date(startTime).toISOString(),
        notes,
        category_icon: categoryIcon
      });

      if (addErr) {
        alert('Failed to save activity: ' + addErr.message);
      } else {
        setTitle('');
        setLocation('');
        setStartTime('');
        setNotes('');
        setCategoryIcon('activity');
        setShowAddForm(false);
        await loadItinerary();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert('An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this activity from the itinerary?')) return;
    setDeletingId(itemId);
    try {
      if (isMockMode) {
        const idx = MOCK_ITINERARY_ITEMS.findIndex(i => i.id === itemId);
        if (idx !== -1) { MOCK_ITINERARY_ITEMS.splice(idx, 1); saveMockData(); }
      } else {
        const { error: delErr } = await supabase.from('itinerary_items').delete().eq('id', itemId);
        if (delErr) throw delErr;
      }
      await loadItinerary();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to delete activity: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <TimelineSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadItinerary} />;

  // Group items by date
  const groupedByDate = items ? items.reduce((acc, item) => {
    const date = new Date(item.start_time).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {}) : {};

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary">Itinerary Timeline</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#E8A87C] hover:bg-[#d8976b] text-white font-bold text-sm rounded-xl px-4 py-2 hover:shadow-lg transition-all duration-200"
        >
          {showAddForm ? (
            <>
              <ChevronUp className="w-4 h-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add Activity
            </>
          )}
        </button>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-gray-100 rounded-xl p-4 space-y-4 hover:shadow-md transition-all duration-200">
          <h3 className="font-bold text-primary text-sm">Add New Activity</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Visit Park Güell"
                className="w-full text-sm rounded-lg border-gray-200 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Carrer d'Olot, s/n"
                className="w-full text-sm rounded-lg border-gray-200 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date & Start Time *</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
              <select
                value={categoryIcon}
                onChange={e => setCategoryIcon(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800"
              >
                <option value="activity">🎯 Activity</option>
                <option value="food">🍴 Food & Drinks</option>
                <option value="transport">🚌 Transport</option>
                <option value="accommodation">🏨 Accommodation</option>
                <option value="music">🎵 Music / Show</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Confirmation codes, dress codes, tickets..."
              className="w-full text-sm rounded-lg border-gray-200 px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 h-20 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl px-4 py-2 text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Activity'}
          </button>
        </form>
      )}

      {(!items || items.length === 0) ? (
        <div className="bg-slate-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-500 py-12">
          <MapPin className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <h3 className="font-bold text-gray-700">No Itinerary Found</h3>
          <p className="text-sm text-gray-400">Click "Add Activity" above to create one.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([date, dayItems]) => (
            <div key={date} className="relative">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-16 md:w-24 flex-shrink-0">
                  <div className="text-xs md:text-sm font-bold text-primary break-words">{date}</div>
                </div>

                <div className="flex-1 relative min-w-0">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                  
                  <div className="space-y-4">
                    {dayItems.map((item) => {
                      const Icon = iconMap[item.category_icon] || MapPin;
                      const colorClass = categoryColors[item.category_icon] || 'bg-teal-100 text-teal-600';
                      const time = new Date(item.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'UTC'
                      });

                      return (
                        <div key={item.id} className="relative pl-6 md:pl-8 group">
                          <div className="absolute left-0 top-2 w-3 h-3 bg-accent rounded-full -translate-x-[5px] ring-4 ring-white"></div>

                          <div className="bg-white border border-gray-100 rounded-xl p-3 md:p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                            <div className="flex items-start gap-2 md:gap-3">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass.split(' ')[0]}`}>
                                <Icon className={`w-5 h-5 ${colorClass.split(' ')[1]}`} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-500">{time}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colorClass}`}>
                                    {item.category_icon || 'activity'}
                                  </span>
                                </div>
                                <h3 className="font-bold text-primary mb-1 break-words leading-tight">{item.title}</h3>
                                {item.location && <p className="text-xs md:text-sm text-gray-600 break-words leading-snug">{item.location}</p>}
                                {item.notes && (
                                  <p className="text-[10px] md:text-xs text-gray-500 mt-2 italic break-words leading-snug">{item.notes}</p>
                                )}
                              </div>

                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                title="Delete activity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
