import React, { useState, useEffect } from 'react';
import { Sidebar, Header, ItineraryTimeline, BudgetPieChart, RecentExpenses, BalanceSheet, Login, ProfileModal, TravelDocs, AIAssistant, TripMembers, MapView, WeatherView, LoadingScreen, CursorPlane } from './components';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { supabase, isMockMode as _isMockMode, setRuntimeMockMode } from './lib/supabaseClient';

// Helper: returns true if we should use local mock storage
const isMockMode = () => _isMockMode();
import {
  MOCK_TRIPS,
  MOCK_TRIP_MEMBERS,
  MOCK_ITINERARY_ITEMS,
  MOCK_EXPENSES,
  mockFetchTripMeta,
  mockDeleteTrip,
  saveMockData,
} from './lib/mockDatabase';
import { Loader2, Sparkles, MapPin, Calendar, DollarSign, Compass, ArrowRight, BookOpen, Trash2, Settings, Info, Palette, Globe, Sliders, Bell, Check, ChevronDown } from 'lucide-react';
import { AISettingsPanel } from './components/AISettings';

function App() {
  const { activeTheme, setTheme, THEME_LIST } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tripMeta, setTripMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [error, setError] = useState(null);
  const [destBgUrl, setDestBgUrl] = useState(null);
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
      if (isMockMode()) {
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
          const { data: memberData, error: memberErr } = await supabase
            .from('trip_members')
            .select('trip_id')
            .eq('user_id', currentUser.id);
          
          if (memberErr) {
            const isNet = memberErr.message?.includes('fetch') || memberErr.message?.includes('Failed to fetch') || memberErr.message?.includes('Network');
            if (isNet) {
              setRuntimeMockMode();
              const myTrips = MOCK_TRIPS.filter(trip => {
                const membersEntry = MOCK_TRIP_MEMBERS.find(m => m.trip_id === trip.id);
                return membersEntry && membersEntry.members.includes(currentUser.name);
              });
              setExistingTrips(myTrips);
              return;
            }
          }
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
        if (error) {
          const isNet = error.message?.includes('fetch') || error.message?.includes('Failed to fetch') || error.message?.includes('Network');
          if (isNet) {
            setRuntimeMockMode();
            const myTrips = MOCK_TRIPS.filter(trip => {
              const membersEntry = MOCK_TRIP_MEMBERS.find(m => m.trip_id === trip.id);
              return membersEntry && membersEntry.members.includes(currentUser.name);
            });
            setExistingTrips(myTrips);
            return;
          }
          throw error;
        }
        if (data) {
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
      const isNet = err instanceof TypeError || err.message?.includes('fetch') || err.message?.includes('Network');
      if (isNet) {
        setRuntimeMockMode();
      }
      // On network failure, surface any locally saved trips so the user isn't left with nothing
      try {
        const localTrips = MOCK_TRIPS.filter(trip => {
          const entry = MOCK_TRIP_MEMBERS.find(m => m.trip_id === trip.id);
          return entry && entry.members.includes(currentUser.name);
        });
        if (localTrips.length > 0) setExistingTrips(localTrips);
      } catch {}
    } finally {
      setTripsLoading(false);
    }
  };

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this trip and all its itinerary/expenses? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      if (isMockMode()) {
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
          if (isMockMode()) {
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
    if (!isMockMode()) {
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
      if (isMockMode()) {
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
          const isNet = fetchErr.message?.includes('fetch') || fetchErr.message?.includes('Failed to fetch') || fetchErr.message?.includes('Network');
          if (isNet) {
            setRuntimeMockMode();
            const localTrip = MOCK_TRIPS.find(t => t.id === activeTripId);
            if (localTrip) {
              setTripMeta(localTrip);
              setLoading(false);
              return;
            }
          }
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
      const isNet = err instanceof TypeError || err.message?.includes('fetch');
      if (isNet) {
        setRuntimeMockMode();
        // Retry from local storage
        const localTrip = MOCK_TRIPS.find(t => t.id === activeTripId);
        if (localTrip) { setTripMeta(localTrip); setLoading(false); return; }
      }
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

  // ── Fetch destination background image from Wikipedia (CSP-safe) ──────────
  useEffect(() => {
    if (!tripMeta?.destination) { setDestBgUrl(null); return; }
    const city = tripMeta.destination.split(',')[0].trim();
    let cancelled = false;
    const fetchBg = async () => {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const url = data?.originalimage?.source || data?.thumbnail?.source;
        if (url && !cancelled) setDestBgUrl(url);
      } catch {}
    };
    fetchBg();
    return () => { cancelled = true; };
  }, [tripMeta?.destination]);

  const handleLogout = async () => {
    if (!isMockMode()) {
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

  const handleUpdateUser = async (updatedUser) => {
    localStorage.setItem('wandr_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setShowProfileModal(false);

    try {
      if (isMockMode()) {
        const raw = localStorage.getItem('wandr_mock_users');
        if (raw) {
          const users = JSON.parse(raw);
          if (users[updatedUser.email]) {
            users[updatedUser.email].username = updatedUser.name;
            users[updatedUser.email].avatar = updatedUser.avatar || null;
            users[updatedUser.email].avatarColorClass = updatedUser.avatarColorClass || null;
            localStorage.setItem('wandr_mock_users', JSON.stringify(users));
          }
        }
      } else {
        await supabase.auth.updateUser({
          data: { 
            name: updatedUser.name,
            avatar: updatedUser.avatar || null,
            avatarColorClass: updatedUser.avatarColorClass || null,
          }
        });
      }
    } catch (err) {
      console.error('Error persisting profile data', err);
    }
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

      if (isMockMode()) {
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
      // Network-level failures (Supabase paused / offline) — fall back to local mock storage
      const isNetworkError =
        err instanceof TypeError ||
        err.message === 'Failed to fetch' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('fetch');

      if (isNetworkError) {
        console.warn('[Wandr] Supabase unreachable — saving trip locally instead.', err);
        setRuntimeMockMode();
        try {
          const membersList2 = newTripMembers
            .split(',')
            .map(m => m.trim())
            .filter(m => m.length > 0);
          if (membersList2.length === 0) membersList2.push(currentUser.name);

          const fallbackId = 'trip-' + Date.now();
          MOCK_TRIPS.push({
            id: fallbackId,
            name: newTripName,
            destination: newDestination,
            start_date: newStartDate,
            end_date: newEndDate,
            total_budget: Number(newBudget),
          });
          MOCK_TRIP_MEMBERS.push({ trip_id: fallbackId, members: membersList2 });
          saveMockData();

          localStorage.setItem('wandr_active_trip_id', fallbackId);
          setActiveTripId(fallbackId);

          setNewTripName('');
          setNewDestination('');
          setNewStartDate('');
          setNewEndDate('');
          setNewBudget('');
          setNewTripMembers(currentUser?.name || '');
          return; // success via fallback — no error shown
        } catch (fallbackErr) {
          setOnboardingError('Could not reach the server and local save also failed. Please refresh and try again.');
        }
      } else {
        setOnboardingError(err.message || 'Failed to initialize trip record.');
      }
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <>
        {showLoadingScreen && <LoadingScreen onFinished={() => setShowLoadingScreen(false)} />}
        <CursorPlane />
        <Login onLoginSuccess={setCurrentUser} />
      </>
    );
  }

  // Render onboarding wizard if logged in but no active trip selected
  if (!activeTripId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 font-sans" style={{ background: 'var(--bg-gradient)' }}>

        {/* Demo Mode Banner */}
        {isMockMode() && (
          <div className="w-full max-w-4xl mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-xs">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span><strong>Demo Mode</strong> — You're in demo mode. Data is saved locally on this device only. Nothing is backed up to a cloud server.</span>
          </div>
        )}

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-6 rounded-3xl shadow-xl p-6 md:p-8 hover:shadow-2xl transition-all duration-300 relative overflow-hidden glass-card" style={{ borderRadius: 'var(--radius-lg)' }}>
          
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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4" style={{ background: 'var(--bg-gradient)' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading Wandr Dashboard...</span>
      </div>
    );
  }

  if (error || !tripMeta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4" style={{ background: 'var(--bg-gradient)' }}>
        <div className="inline-flex items-center justify-center p-4 rounded-full mb-2" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--accent-coral)' }}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard Failed to Load</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>{error || 'Failed to retrieve connection meta.'}</p>
        <div className="flex gap-3">
          <button 
            onClick={fetchTripMeta}
            className="font-bold rounded-xl px-5 py-2.5 text-sm transition-all duration-200 btn-animated"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Try Again
          </button>
          <button 
            onClick={handleSwitchTrip}
            className="font-bold rounded-xl px-5 py-2.5 text-sm transition-all duration-200 btn-animated"
            style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}
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
    <div className="min-h-screen transition-colors duration-200" style={{ background: 'var(--bg-gradient)' }}>

      {/* Loading Screen (only on first render) */}
      {showLoadingScreen && <LoadingScreen onFinished={() => setShowLoadingScreen(false)} />}

      {/* Cursor Plane Follower */}
      <CursorPlane />

      {/* ── Demo Mode Banner (sticky, always visible in mock mode) ── */}
      {isMockMode() && (
        <div className="w-full flex items-center gap-2 border-b px-4 py-2 text-xs" style={{ background: 'var(--accent-glow)', borderColor: 'var(--accent-warm)', color: 'var(--text-secondary)' }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-warm)' }} />
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

        {/* ── Destination background image via Wikipedia API (CSP-safe) ── */}
        {destBgUrl && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${destBgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              opacity: 0.1,
              filter: 'saturate(1.3) blur(0px)',
              mixBlendMode: 'luminosity',
            }}
          />
        )}

        <div className="relative max-w-7xl mx-auto p-3 md:p-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn view-transition-enter">
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
            <AIAssistant 
              tripId={tripMeta.id}
              tripName={tripMeta.name}
              tripDestination={tripMeta.destination}
              startDate={tripMeta.start_date}
              endDate={tripMeta.end_date}
              totalBudget={Number(tripMeta.total_budget)}
              currencySymbol={currentUser.currencySymbol || '₹'}
              memberName={currentUser.name || 'Traveller'}
              onGoToSettings={() => setActiveTab('settings')}
              onDashboardUpdate={handleRefresh}
            />
          )}

          {activeTab === 'settings' && (
            <div className="animate-fadeIn max-w-5xl mx-auto space-y-6 font-sans">
              {/* Settings Header */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100 max-w-2xl mx-auto">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-extrabold text-xl text-primary tracking-tight">App Settings</h1>
                  <p className="text-xs text-gray-400">Customise your traveler profile, app appearance, preferences, and AI integrations.</p>
                </div>
              </div>

              {/* Stacked single-column settings sections (one below the other) */}
              <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Appearance card */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                  <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-gray-100">
                    <div className="p-2 bg-accent/10 rounded-xl text-accent">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-primary">Appearance</h3>
                      <p className="text-[11px] text-gray-400">Choose a gorgeous theme for your travel dashboard.</p>
                    </div>
                  </div>

                  {/* Theme visual selector grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {THEME_LIST.map((theme) => {
                      const isActive = activeTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setTheme(theme.id)}
                          className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-300 relative group cursor-pointer ${
                            isActive 
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 scale-[1.01] shadow-sm' 
                              : 'border-gray-150 bg-slate-50 hover:border-gray-250 hover:bg-slate-100/50 hover:scale-[1.005]'
                          }`}
                        >
                          {/* Visual Highlight indicator */}
                          {isActive && (
                            <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span style={{ fontSize: '1.25rem' }} className="group-hover:animate-bounce">{theme.icon}</span>
                            <span className="font-extrabold text-xs text-primary">{theme.name}</span>
                          </div>
                          
                          <p className="text-[10px] text-gray-400 leading-normal flex-1">{theme.description}</p>
                          
                          {/* Color swatches */}
                          <div className="flex gap-1 mt-3">
                            {theme.preview.slice(1).map((color, i) => (
                              <div
                                key={i}
                                className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preferences Card */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                  <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-gray-100">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-primary">Preferences & Localisation</h3>
                      <p className="text-[11px] text-gray-400">Configure currency and custom traveler style tags.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Currency Selector (updates app-wide!) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Default Currency</label>
                      <div className="relative max-w-xs">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {currentUser.currencySymbol || '₹'}
                        </span>
                        <select
                          value={currentUser.currencySymbol || '₹'}
                          onChange={(e) => {
                            const newSymbol = e.target.value;
                            handleUpdateUser({
                              ...currentUser,
                              currencySymbol: newSymbol,
                            });
                          }}
                          className="w-full text-xs rounded-xl border border-gray-250/70 pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white appearance-none font-bold"
                        >
                          <option value="₹">₹ Indian Rupee (INR)</option>
                          <option value="$">$ US Dollar (USD)</option>
                          <option value="€">€ Euro (EUR)</option>
                          <option value="£">£ British Pound (GBP)</option>
                          <option value="¥">¥ Japanese Yen (JPY)</option>
                          <option value="₩">₩ Korean Won (KRW)</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      <p className="text-[9.5px] text-gray-400">This instantly converts the currency symbols across budget charts, expense logs, balance logs, and AI insights.</p>
                    </div>

                    {/* Travel Style Selector (custom preference) */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Travel Style Tag</label>
                      <div className="flex flex-wrap gap-2">
                        {['Backpacker', 'Balanced Explorer', 'Luxury Traveler', 'Adventure Seeker'].map((style) => {
                          const isSelected = currentUser.travelStyle === style || (!currentUser.travelStyle && style === 'Balanced Explorer');
                          return (
                            <button
                              key={style}
                              type="button"
                              onClick={() => {
                                  handleUpdateUser({
                                    ...currentUser,
                                    travelStyle: style,
                                  });
                                }}
                              className={`text-[10.5px] font-extrabold px-3 py-1.5 rounded-full transition-all duration-200 border cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-accent/15 text-accent border-accent/20 font-extrabold shadow-sm'
                                  : 'bg-slate-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                              }`}
                            >
                              {style}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9.5px] text-gray-400">Helps Wandr AI Assistant tailor budget allocations and travel cost advice to your personal travel style.</p>
                    </div>
                  </div>
                </div>

                {/* AI Settings card (Minimalistic) */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                  <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-gray-100">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-primary">AI Integration</h3>
                      <p className="text-[11px] text-gray-400">Configure AI provider keys and model preferences.</p>
                    </div>
                  </div>

                  {/* Compact minimalistic AI settings panel */}
                  <AISettingsPanel onSaved={() => {}} />
                </div>

                {/* App Notifications & Privacy Settings Card */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                  <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-gray-100">
                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-primary">Notifications & Privacy</h3>
                      <p className="text-[11px] text-gray-400">Toggle push alerts and weekly summaries.</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { id: 'notifyAlerts', label: 'Push Travel Alerts', desc: 'Receive instant alerts for budget overruns.' },
                      { id: 'notifyWeekly', label: 'Weekly Summary Emails', desc: 'Get cost breakdown reports and trip statistics.' },
                      { id: 'notifyTips', label: 'AI Smart Advice', desc: 'Receive interactive notifications with tips from AI.' },
                    ].map((item) => {
                      const isChecked = currentUser[item.id] !== false; // default true
                      return (
                        <div key={item.id} className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[11.5px] font-extrabold text-primary">{item.label}</span>
                            <p className="text-[9.5px] text-gray-400 leading-normal">{item.desc}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateUser({
                                ...currentUser,
                                [item.id]: !isChecked,
                              });
                            }}
                            className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 cursor-pointer ${
                              isChecked ? 'bg-primary' : 'bg-gray-200'
                            } flex items-center`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                                isChecked ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

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
