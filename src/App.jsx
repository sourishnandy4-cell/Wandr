import React, { useState, useEffect } from 'react';
import { Sidebar, Header, ItineraryTimeline, BudgetPieChart, RecentExpenses, BalanceSheet, Login, ProfileModal, TravelDocs, FinanceAI, TripMembers, MapView, WeatherView } from './components';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase, isMockMode } from './lib/supabaseClient';
import {
  MOCK_TRIPS,
  MOCK_TRIP_MEMBERS,
  MOCK_ITINERARY_ITEMS,
  MOCK_EXPENSES,
  mockFetchTripMeta,
  mockDeleteTrip,
  saveMockData,
} from './lib/mockDatabase';
import { Loader2, Sparkles, MapPin, Calendar, DollarSign, Compass, ArrowRight, BookOpen, Trash2, Settings, Info } from 'lucide-react';
import { AISettingsPanel } from './components/AISettings';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tripMeta, setTripMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wandr_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Wandr: Clear legacy invalid user session structure.', e);
      localStorage.removeItem('wandr_user');
      return null;
    }
  });
  const [activeTripId, setActiveTripId] = useState(() => {
    return localStorage.getItem('wandr_active_trip_id') || null;
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Stash any invite/join params from URL into localStorage immediately on
  //    first load, before the user has logged in. Processed after login below.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinPayload = urlParams.get('join');
    const inviteTripId = urlParams.get('invite');
    if (joinPayload) {
      localStorage.setItem('wandr_pending_join', joinPayload);
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url);
    } else if (inviteTripId) {
      // Only stash legacy ?invite= if it looks like a UUID (not a self-visit)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(inviteTripId)) {
        localStorage.setItem('wandr_pending_invite', inviteTripId);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url);
    }
  }, []);
  
  // Onboarding Form State
  const [newTripName, setNewTripName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newTripMembers, setNewTripMembers] = useState(currentUser ? currentUser.name : '');
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState(null);

  const [existingTrips, setExistingTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  const fetchExistingTrips = async () => {
    if (!currentUser) return;
    setTripsLoading(true);
    try {
      if (isMockMode) {
        // Filter mock trips where current user is a member
        const myTrips = MOCK_TRIPS.filter(trip => {
          const membersEntry = MOCK_TRIP_MEMBERS.find(m => m.trip_id === trip.id);
          return membersEntry && membersEntry.members.includes(currentUser.name);
        });
        setExistingTrips(myTrips);
      } else {
        // First get the trip IDs the user is a member of
        let tripIds = [];
        if (currentUser.id) {
          const { data: memberData } = await supabase
            .from('trip_members')
            .select('trip_id')
            .eq('user_id', currentUser.id);
          if (memberData) tripIds = memberData.map(m => m.trip_id);
        }

        let query = supabase
          .from('trips')
          .select('id, name, destination, start_date, end_date, total_budget');

        if (currentUser.id) {
           if (tripIds.length > 0) {
             query = query.or(`created_by.eq.${currentUser.id},id.in.(${tripIds.join(',')})`);
           } else {
             query = query.eq('created_by', currentUser.id);
           }
        }

        const { data, error } = await query;
        if (!error && data) {
          // Merge in any locally-imported trips (joined via invite link) that aren't
          // already returned by Supabase (e.g. friend opened a ?join= link).
          const supabaseIds = new Set(data.map(t => t.id));
          const localExtras = MOCK_TRIPS.filter(t => {
            if (supabaseIds.has(t.id)) return false;
            const entry = MOCK_TRIP_MEMBERS.find(m => m.trip_id === t.id);
            return entry && entry.members.includes(currentUser.name);
          });
          setExistingTrips([...data, ...localExtras]);
        }
      }
    } catch (err) {
      console.error('Failed to load existing trips:', err);
    } finally {
      setTripsLoading(false);
    }
  };

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this trip and all its itinerary/expenses? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      if (isMockMode) {
        await mockDeleteTrip(tripId);
      } else {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', tripId);
        if (error) throw error;
      }
      await fetchExistingTrips();
    } catch (err) {
      alert("Failed to delete trip: " + err.message);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchExistingTrips();
    }
  }, [currentUser]);

  // Handle Invite Link Join Logic — runs after login, reads stashed payload
  useEffect(() => {
    const processInvite = async () => {
      if (!currentUser) return;

      const joinPayload = localStorage.getItem('wandr_pending_join');
      const inviteTripId = localStorage.getItem('wandr_pending_invite');

      const clearPending = () => {
        localStorage.removeItem('wandr_pending_join');
        localStorage.removeItem('wandr_pending_invite');
      };

      // ── New encoded snapshot join ──────────────────────────────────────
      if (joinPayload) {
        try {
          // Reverse URL-safe base64 encoding (- → +, _ → /) and restore padding
          const standard = joinPayload.replace(/-/g, '+').replace(/_/g, '/');
          const padded   = standard + '=='.slice(0, (4 - standard.length % 4) % 4);
          const json = decodeURIComponent(escape(atob(padded)));
          const { trip, members, itinerary, expenses } = JSON.parse(json);

          if (!trip) throw new Error('Invalid share link — trip data missing.');

          if (!MOCK_TRIPS.find(t => t.id === trip.id)) {
            MOCK_TRIPS.push(trip);
          }

          const existingMembers = MOCK_TRIP_MEMBERS.find(m => m.trip_id === trip.id);
          const incomingMembers = members?.members || [];
          if (!incomingMembers.includes(currentUser.name)) incomingMembers.push(currentUser.name);

          if (existingMembers) {
            incomingMembers.forEach(m => { if (!existingMembers.members.includes(m)) existingMembers.members.push(m); });
          } else {
            MOCK_TRIP_MEMBERS.push({ trip_id: trip.id, members: incomingMembers });
          }

          if (Array.isArray(itinerary)) {
            itinerary.forEach(item => {
              if (!MOCK_ITINERARY_ITEMS.find(i => i.id === item.id)) MOCK_ITINERARY_ITEMS.push(item);
            });
          }

          if (Array.isArray(expenses)) {
            expenses.forEach(exp => {
              if (!MOCK_EXPENSES.find(e => e.id === exp.id)) MOCK_EXPENSES.push(exp);
            });
          }

          saveMockData();
          clearPending();

          localStorage.setItem('wandr_active_trip_id', trip.id);
          setActiveTripId(trip.id);
          await fetchExistingTrips();
          alert(`✅ You've joined "${trip.name}"! The full itinerary and expenses have been imported.`);

        } catch (err) {
          console.error('Failed to process join link:', err);
          alert('This share link appears to be invalid or corrupted. Ask the trip organiser to generate a new one.');
          clearPending();
        }
        return;
      }

      // ── Legacy ?invite= link ───────────────────────────────────────────
      if (inviteTripId) {
        // If this trip ID is already in the user's saved trips, just silently clear — they're the organizer
        const alreadyOwned = MOCK_TRIPS.some(t => t.id === inviteTripId);
        if (alreadyOwned) {
          clearPending();
          return;
        }
        try {
          if (isMockMode) {
            alert('This invite link is outdated. Ask the trip organiser to share a new link from the Members tab.');
            clearPending();
            return;
          } else {
            const { error: joinErr } = await supabase.from('trip_members').insert([{
              trip_id: inviteTripId, user_id: currentUser.id, role: 'member'
            }]);
            if (joinErr && joinErr.code !== '23505') throw joinErr;
          }
          clearPending();
          localStorage.setItem('wandr_active_trip_id', inviteTripId);
          setActiveTripId(inviteTripId);
          await fetchExistingTrips();
          alert('You have successfully joined the trip!');
        } catch (err) {
          console.error('Failed to join trip:', err);
          alert('This invite link is outdated. Ask the trip organiser to share a new link from the Members tab.');
          clearPending();
        }
      }
    };

    processInvite();
  }, [currentUser]);

  // Sync default member name when currentUser loads
  useEffect(() => {
    if (currentUser && !newTripMembers) {
      setNewTripMembers(currentUser.name);
    }
  }, [currentUser]);

  // Refresh trigger state to coordinate live updates between components on mutations
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTripMeta = async () => {
    if (!activeTripId) return;

    // Validate UUID format when not in mock mode to handle legacy mock IDs in localStorage
    if (!isMockMode) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(activeTripId)) {
        console.warn('Wandr: Detected invalid activeTripId UUID, clearing session:', activeTripId);
        localStorage.removeItem('wandr_active_trip_id');
        setActiveTripId(null);
        setTripMeta(null);
        setError('Invalid trip ID. Please select a trip from your saved trips.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (isMockMode) {
        const { data } = await mockFetchTripMeta(activeTripId);
        if (!data) {
          setError('Trip not found. It may have been deleted.');
          localStorage.removeItem('wandr_active_trip_id');
          setActiveTripId(null);
          return;
        }
        setTripMeta(data);
      } else {
        const { data, error: fetchErr } = await supabase
          .from('trips')
          .select('id, name, destination, start_date, end_date, total_budget')
          .eq('id', activeTripId)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

        if (fetchErr) {
          console.error('Fetch trip error:', fetchErr);
          setError('Failed to load trip: ' + (fetchErr.message || 'Unknown error'));
          return;
        }
        
        if (!data) {
          // Before giving up, check whether this trip was imported locally via an invite link.
          // This handles the case where isMockMode=false (Supabase configured) but the friend
          // joined via a ?join= link and the trip was saved into MOCK_TRIPS on their device.
          const localTrip = MOCK_TRIPS.find(t => t.id === activeTripId);
          if (localTrip) {
            setTripMeta(localTrip);
            return;
          }
          // Trip doesn't exist or user doesn't have access
          setError('Trip not found or you don\'t have access. Please check your permissions or select a different trip.');
          localStorage.removeItem('wandr_active_trip_id');
          setActiveTripId(null);
          return;
        }
        
        setTripMeta(data);
      }
    } catch (err) {
      console.error('Unexpected error loading trip:', err);
      setError('An unexpected error occurred while loading trip details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && activeTripId) {
      fetchTripMeta();
    }
  }, [refreshTrigger, currentUser, activeTripId]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = async () => {
    if (!isMockMode) {
      await supabase.auth.signOut();
    } else {
      // Clear session token so other users on this device can't hijack the session
      const token = sessionStorage.getItem('wandr_session_token');
      if (token) {
        try {
          const sessions = JSON.parse(localStorage.getItem('wandr_sessions') || '{}');
          delete sessions[token];
          localStorage.setItem('wandr_sessions', JSON.stringify(sessions));
        } catch {}
        sessionStorage.removeItem('wandr_session_token');
      }
    }
    localStorage.removeItem('wandr_user');
    localStorage.removeItem('wandr_active_trip_id');
    setCurrentUser(null);
    setActiveTripId(null);
    setTripMeta(null);
  };

  const handleSwitchTrip = () => {
    localStorage.removeItem('wandr_active_trip_id');
    setActiveTripId(null);
    setTripMeta(null);
  };

  const handleUpdateUser = (updatedUser) => {
    localStorage.setItem('wandr_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setShowProfileModal(false);
  };

  const handleLoadDemo = () => {
    const demoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    localStorage.setItem('wandr_active_trip_id', demoId);
    setActiveTripId(demoId);
  };

  const handleCreateTripSubmit = async (e) => {
    e.preventDefault();
    setOnboardingError(null);

    if (!newTripName || !newDestination || !newStartDate || !newEndDate || !newBudget || !newTripMembers) {
      setOnboardingError('Please populate all fields.');
      return;
    }

    if (new Date(newStartDate) > new Date(newEndDate)) {
      setOnboardingError('Start date must be before or equal to the end date.');
      return;
    }

    if (Number(newBudget) <= 0) {
      setOnboardingError('Trip budget must be greater than ₹0.');
      return;
    }

    setOnboardingSubmitting(true);
    try {
      const generatedId = 'trip-' + Date.now();
      
      // Parse dynamic companion names
      const membersList = newTripMembers
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      if (membersList.length === 0) {
        membersList.push(currentUser.name);
      }

      if (isMockMode) {
        MOCK_TRIPS.push({
          id: generatedId,
          name: newTripName,
          destination: newDestination,
          start_date: newStartDate,
          end_date: newEndDate,
          total_budget: Number(newBudget),
        });

        MOCK_TRIP_MEMBERS.push({
          trip_id: generatedId,
          members: membersList,
        });

        saveMockData();

        localStorage.setItem('wandr_active_trip_id', generatedId);
        setActiveTripId(generatedId);
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        console.log("Current User ID:", currentUser?.id);
        console.log("Supabase Session:", sessionData.session ? "Active" : "Null");
        if (!sessionData.session) {
          throw new Error("You are not properly authenticated with Supabase. Please sign out and sign in again.");
        }
        
        if (sessionData.session.user.id !== currentUser?.id) {
           console.error("Mismatch: ", sessionData.session.user.id, " !== ", currentUser?.id);
           throw new Error("Your session is invalid or out of sync. Please sign out and sign in again.");
        }

        const { data: tripData, error: insertErr } = await supabase
          .from('trips')
          .insert([{
            name: newTripName,
            destination: newDestination,
            start_date: newStartDate,
            end_date: newEndDate,
            total_budget: Number(newBudget),
            created_by: currentUser.id || null
          }])
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Try inserting into trip_members as owner, fallback gracefully if RLS blocks
        try {
          await supabase.from('trip_members').insert([{
            trip_id: tripData.id,
            user_id: tripData.created_by || currentUser.id,
            role: 'owner'
          }]);
        } catch (mErr) {
          console.warn('Membership association handled by database triggers or RLS constraints.');
        }

        localStorage.setItem('wandr_active_trip_id', tripData.id);
        setActiveTripId(tripData.id);
      }

      // Reset Form State
      setNewTripName('');
      setNewDestination('');
      setNewStartDate('');
      setNewEndDate('');
      setNewBudget('');
      setNewTripMembers(currentUser?.name || '');
    } catch (err) {
      setOnboardingError(err.message || 'Failed to initialize trip record.');
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  // Render onboarding wizard if logged in but no active trip selected
  if (!activeTripId) {
    return (
      <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-4 md:p-6 font-sans">

        {/* Demo Mode Banner */}
        {isMockMode && (
          <div className="w-full max-w-4xl mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-xs">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span><strong>Demo Mode</strong> — You're in demo mode. Data is saved locally on this device only. Nothing is backed up to a cloud server.</span>
          </div>
        )}

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-6 bg-white rounded-3xl shadow-xl border border-gray-100/50 p-6 md:p-8 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
          
          {/* Main Greeting (Header spans full width) */}
          <div className="md:col-span-5 text-center space-y-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/15 text-accent text-xs font-bold rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Welcome, {currentUser.name}!
            </div>
            <h2 className="text-3xl font-extrabold text-primary">Initialize Your Journey</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Start a completely fresh trip and manage your custom timeline, or load the pre-populated Barcelona demo to explore Wandr.
            </p>
            {onboardingError && (
              <div className="max-w-md mx-auto bg-red-50 border border-red-100 rounded-xl p-3 text-red-600 text-xs text-center">
                {onboardingError}
              </div>
            )}
          </div>

          {/* Left Column: Create Fresh Trip Form (3/5 width) */}
          <div className="md:col-span-3 border-r border-gray-100 md:pr-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <Compass className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary text-md">Start a Fresh Trip</h3>
            </div>

            <form onSubmit={handleCreateTripSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Trip Title *</label>
                <input
                  type="text"
                  required
                  value={newTripName}
                  onChange={e => setNewTripName(e.target.value)}
                  placeholder="e.g. Paris Summer Getaway"
                  className="w-full text-sm rounded-xl border-gray-200 px-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all duration-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Destination *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={newDestination}
                    onChange={e => setNewDestination(e.target.value)}
                    placeholder="e.g. Paris, France"
                    className="w-full text-sm rounded-xl border-gray-200 pl-10 pr-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Start Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={newStartDate}
                      onChange={e => setNewStartDate(e.target.value)}
                      className="w-full text-sm rounded-xl border-gray-200 pl-10 pr-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">End Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={newEndDate}
                      onChange={e => setNewEndDate(e.target.value)}
                      className="w-full text-sm rounded-xl border-gray-200 pl-10 pr-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Group Members (comma-separated) *</label>
                <input
                  type="text"
                  required
                  value={newTripMembers}
                  onChange={e => setNewTripMembers(e.target.value)}
                  placeholder="e.g. Sarah, Mike, Chloe"
                  className="w-full text-sm rounded-xl border-gray-200 px-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all duration-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Budget ({currentUser.currencySymbol || '₹'}) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">{currentUser.currencySymbol || '₹'}</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newBudget}
                    onChange={e => setNewBudget(e.target.value)}
                    placeholder="3000"
                    className="w-full text-sm rounded-xl border-gray-200 pl-8 pr-3.5 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#E8A87C] focus:border-transparent bg-white text-gray-800 transition-all duration-200 font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={onboardingSubmitting}
                className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50 mt-1"
              >
                {onboardingSubmitting ? 'Creating Journey...' : 'Create My Trip'}
                {!onboardingSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Right Column: Load Saved Journeys & Demo (2/5 width) */}
          <div className="md:col-span-2 flex flex-col justify-between pl-0 md:pl-2 space-y-6">
            
            {/* Existing Trips / Saved Journeys */}
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-primary text-md">Your Saved Trips</h3>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                  {existingTrips.length}
                </span>
              </div>
              
              {existingTrips.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No saved trips found. Create one on the left!</p>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {existingTrips.map(trip => (
                    <button
                      key={trip.id}
                      onClick={() => {
                        localStorage.setItem('wandr_active_trip_id', trip.id);
                        setActiveTripId(trip.id);
                      }}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-accent/5 border border-slate-150 hover:border-accent/30 rounded-xl transition-all duration-200 flex items-center justify-between group shadow-sm"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <h4 className="font-extrabold text-xs text-primary truncate group-hover:text-accent transition-colors">{trip.name}</h4>
                        <span className="text-[10px] text-gray-400 block mt-0.5 truncate">{trip.destination}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTrip(e, trip.id)}
                          className="p-1.5 text-gray-450 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Sandbox</span>
              </div>
              
              <button
                type="button"
                onClick={handleLoadDemo}
                className="w-full bg-[#E8A87C]/10 hover:bg-[#E8A87C]/20 text-[#d8976b] font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                Load Barcelona Demo Trip
              </button>
              
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-slate-100 hover:bg-slate-200 text-gray-600 font-bold rounded-xl py-2.5 text-xs transition-colors duration-200"
              >
                Sign Out / Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !tripMeta) {
    return (
      <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
        <span className="text-sm text-gray-500 font-medium">Loading Wandr Dashboard...</span>
      </div>
    );
  }

  if (error || !tripMeta) {
    return (
      <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-red-50 rounded-full text-red-500 mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard Failed to Load</h2>
        <p className="text-sm text-gray-500 max-w-sm">{error || 'Failed to retrieve connection meta.'}</p>
        <div className="flex gap-3">
          <button 
            onClick={fetchTripMeta}
            className="bg-accent text-white font-bold rounded-xl px-5 py-2.5 text-sm hover:bg-accent/90 transition-all duration-200"
          >
            Try Again
          </button>
          <button 
            onClick={handleSwitchTrip}
            className="bg-slate-100 text-gray-600 font-bold rounded-xl px-5 py-2.5 text-sm hover:bg-slate-200 transition-all duration-200"
          >
            Switch Trip
          </button>
        </div>
      </div>
    );
  }

  // Format date range for header
  const dateRange = `${new Date(tripMeta.start_date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    timeZone: 'UTC'
  })} – ${new Date(tripMeta.end_date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    timeZone: 'UTC'
  })}`;

  return (
    <div className="min-h-screen bg-warm-bg dark:bg-dark-bg transition-colors duration-200">

      {/* ── Demo Mode Banner (sticky, always visible in mock mode) ── */}
      {isMockMode && (
        <div className="w-full flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-xs">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
          <span>
            <strong>Demo Mode</strong> — data is saved locally on this device only. No cloud backup. Connect Supabase to go live.
          </span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        user={currentUser}
        onLogout={handleLogout}
        onProfileClick={() => setShowProfileModal(true)}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="md:ml-64 min-h-screen relative">

        {/* ── Destination background image (faded, non-intrusive) ── */}
        {tripMeta?.destination && (() => {
          const keyword = encodeURIComponent(tripMeta.destination.split(',')[0].trim());
          return (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(https://source.unsplash.com/1600x900/?${keyword},travel,landscape)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                backgroundAttachment: 'local',
                opacity: 0.07,
                filter: 'saturate(1.2)',
              }}
            />
          );
        })()}

        <div className="relative max-w-7xl mx-auto p-6">
          {/* Header */}
          <Header 
            tripId={tripMeta.id}
            tripName={tripMeta.name}
            dateRange={dateRange}
            user={currentUser}
            onLogout={handleLogout}
            onSwitchTrip={handleSwitchTrip}
            onProfileClick={() => setShowProfileModal(true)}
            onMenuClick={() => setMobileMenuOpen(true)}
            onNavigate={setActiveTab}
          />

          {/* Dynamic Tab Views */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* Left Column - Itinerary */}
              <div className="lg:col-span-2">
                <ItineraryTimeline 
                  tripId={tripMeta.id} 
                  refreshTrigger={refreshTrigger}
                  onRefresh={handleRefresh}
                />
              </div>

              {/* Right Column - Budget & Expenses */}
              <div className="space-y-6">
                <BudgetPieChart 
                  tripId={tripMeta.id}
                  refreshTrigger={refreshTrigger}
                  totalBudget={Number(tripMeta.total_budget)}
                  currencySymbol={currentUser.currencySymbol || '₹'}
                />
                
                <RecentExpenses 
                  tripId={tripMeta.id} 
                  refreshTrigger={refreshTrigger}
                  onRefresh={handleRefresh}
                  currencySymbol={currentUser.currencySymbol || '₹'}
                />
                
                <BalanceSheet 
                  tripId={tripMeta.id} 
                  refreshTrigger={refreshTrigger}
                  onRefresh={handleRefresh}
                  currencySymbol={currentUser.currencySymbol || '₹'}
                />
              </div>
            </div>
          )}

          {activeTab === 'itinerary' && (
            <div className="animate-fadeIn">
              <ItineraryTimeline 
                tripId={tripMeta.id} 
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
              />
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-sans">
              <div className="lg:col-span-2 space-y-6">
                <RecentExpenses 
                  tripId={tripMeta.id} 
                  refreshTrigger={refreshTrigger}
                  onRefresh={handleRefresh}
                  currencySymbol={currentUser.currencySymbol || '₹'}
                />
                <BalanceSheet 
                  tripId={tripMeta.id} 
                  refreshTrigger={refreshTrigger}
                  onRefresh={handleRefresh}
                  currencySymbol={currentUser.currencySymbol || '₹'}
                />
              </div>
              <div className="space-y-6">
                <BudgetPieChart 
                  tripId={tripMeta.id}
                  refreshTrigger={refreshTrigger}
                  totalBudget={Number(tripMeta.total_budget)}
                  currencySymbol={currentUser.currencySymbol || '₹'}
                />
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="animate-fadeIn">
              <TripMembers 
                tripId={tripMeta.id}
                tripName={tripMeta.name}
                tripData={tripMeta}
                currentUser={currentUser}
              />
            </div>
          )}

          {activeTab === 'map' && (
            <div className="animate-fadeIn">
              <MapView
                tripId={tripMeta.id}
                tripDestination={tripMeta.destination}
              />
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="animate-fadeIn">
              <WeatherView
                tripDestination={tripMeta.destination}
              />
            </div>
          )}

          {activeTab === 'docs' && (
            <TravelDocs tripId={tripMeta.id} currentUser={currentUser} tripDestination={tripMeta.destination} />
          )}

          {activeTab === 'ai' && (
            <FinanceAI 
              tripId={tripMeta.id}
              tripName={tripMeta.name}
              tripDestination={tripMeta.destination}
              totalBudget={Number(tripMeta.total_budget)}
              currencySymbol={currentUser.currencySymbol || '₹'}
              onGoToSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'settings' && (
            <div className="animate-fadeIn max-w-lg mx-auto">
              <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="p-2.5 bg-primary/10 rounded-2xl">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-primary tracking-tight">AI Settings</h2>
                    <p className="text-xs text-gray-400">Choose your AI provider and configure your API key.</p>
                  </div>
                </div>
                <AISettingsPanel onSaved={() => {}} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal Customization Overlay */}
      {showProfileModal && (
        <ProfileModal 
          user={currentUser} 
          onClose={() => setShowProfileModal(false)} 
          onSave={handleUpdateUser} 
        />
      )}
    </div>
  );
}

export default App;
