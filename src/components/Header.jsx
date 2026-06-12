import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, BellOff, Menu, Loader2, MapPin, DollarSign, Calendar, X } from 'lucide-react';
import { fetchItinerary } from '../lib/itineraryService';
import { fetchRecentExpenses } from '../lib/expenseService';
import { isMockMode } from '../lib/supabaseClient';

export const Header = ({ tripId, tripName, dateRange, user, onLogout, onSwitchTrip, onProfileClick, onMenuClick, onNavigate, onSyncToCloud }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchWrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); setShowResults(false); return; }
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setShowResults(true);
      const query = q.toLowerCase();
      const results = [];
      try {
        const { data: itineraryData } = await fetchItinerary(tripId);
        (itineraryData || []).forEach(item => {
          if (
            item.title?.toLowerCase().includes(query) ||
            item.location?.toLowerCase().includes(query) ||
            item.notes?.toLowerCase().includes(query)
          ) {
            results.push({ type: 'activity', id: item.id, title: item.title, subtitle: item.location || 'No location', tab: 'itinerary' });
          }
        });
      } catch (_) {}
      try {
        const { data: expenseData } = await fetchRecentExpenses(tripId);
        (expenseData || []).forEach(exp => {
          if (
            exp.description?.toLowerCase().includes(query) ||
            exp.category?.toLowerCase().includes(query) ||
            exp.paid_by?.toLowerCase().includes(query)
          ) {
            results.push({ type: 'expense', id: exp.id, title: exp.description, subtitle: `${exp.category || 'General'} · Paid by ${exp.paid_by}`, tab: 'expenses' });
          }
        });
      } catch (_) {}
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
  };

  const handleResultClick = (result) => {
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
    if (onNavigate) onNavigate(result.tab);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const hasUnread = notifications.some(n => n.unread);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleToggleRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: !n.unread } : n));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <header className="wandr-header relative z-20 px-4 py-3 mb-6">
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Left: Mobile Menu + Trip Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg bg-transparent border-none cursor-pointer text-[var(--text-secondary)] transition-all duration-200 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="trip-name text-[clamp(1.1rem,2vw,1.5rem)] font-extrabold tracking-tight text-[var(--text-primary)] m-0 whitespace-nowrap overflow-hidden text-ellipsis">
                {tripName}
              </h1>
              {tripId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId) && user && onSyncToCloud && (
                <button
                  onClick={onSyncToCloud}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-teal)] text-white text-xs font-bold rounded-full border-none cursor-pointer shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md"
                  title="Upload this local trip to the cloud database to sync with your phone"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Sync to Cloud
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-block px-2.5 py-1 bg-[var(--accent-glow)] text-[var(--accent)] text-xs font-semibold rounded-full whitespace-nowrap font-sans">
                {dateRange}
              </span>
              {isMockMode(true) ? (
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem('wandr_supabase_offline');
                    window.location.reload();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-yellow-800 text-[10px] font-extrabold rounded-full shadow-sm cursor-pointer hover:bg-yellow-100/70 transition-all duration-200 whitespace-nowrap select-none font-sans"
                  title="Wandr is currently offline or blocked by Brave Shields/Adblocker on this device. Click to reconnect to live cloud."
                  style={{ border: '1px solid rgba(220,180,0,0.25)', background: 'rgba(250,230,150,0.25)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                  Local Mode (Reconnect Cloud)
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-emerald-700 text-[10px] font-extrabold rounded-full shadow-sm whitespace-nowrap select-none font-sans"
                  style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.1)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Cloud Synced
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-[400px]" ref={searchWrapperRef}>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              placeholder="Search activities, expenses..."
              className="w-full pl-[42px] py-2.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm outline-none transition-all duration-300 backdrop-blur-md focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--input-focus-ring)]"
              style={{ paddingRight: searchQuery ? '36px' : '14px' }}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-0 hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Results Dropdown */}
            {showResults && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: 'var(--picker-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 50,
                overflow: 'hidden',
                animation: 'scaleIn 0.2s ease-out',
                backdropFilter: 'blur(20px)',
              }}>
                {searchLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No results for "{searchQuery}"
                  </div>
                ) : (
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {searchResults.map((r) => (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => handleResultClick(r)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid var(--border-subtle)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => e.target.closest('button').style.background = 'var(--picker-hover)'}
                        onMouseLeave={(e) => e.target.closest('button').style.background = 'none'}
                      >
                        <div style={{
                          padding: '6px',
                          borderRadius: '8px',
                          flexShrink: 0,
                          background: r.type === 'activity' ? 'var(--accent-glow)' : 'rgba(46, 196, 182, 0.15)',
                          color: r.type === 'activity' ? 'var(--accent)' : 'var(--accent-teal)',
                        }}>
                          {r.type === 'activity' ? <Calendar className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {r.type === 'activity' && <MapPin className="w-3 h-3" style={{ flexShrink: 0 }} />}
                            {r.subtitle}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '20px',
                          flexShrink: 0,
                          background: r.type === 'activity' ? 'var(--accent-glow)' : 'rgba(46, 196, 182, 0.15)',
                          color: r.type === 'activity' ? 'var(--accent)' : 'var(--accent-teal)',
                        }}>
                          {r.type === 'activity' ? 'Activity' : 'Expense'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Theme Picker, Notifications & User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowDropdown(false);
              }}
              style={{
                position: 'relative',
                padding: '8px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
              className="hover:bg-gray-100"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {hasUnread && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '8px',
                  height: '8px',
                  background: 'var(--accent-coral)',
                  borderRadius: '50%',
                  animation: 'glow-pulse 2s ease-in-out infinite',
                }} />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                right: 0,
                marginTop: '8px',
                width: '320px',
                background: 'var(--picker-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-xl)',
                padding: '12px 0',
                zIndex: 50,
                animation: 'scaleIn 0.2s ease-out',
                backdropFilter: 'blur(20px)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px 8px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '4px',
                }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Trip Alerts
                  </span>
                  {notifications.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)' }}>
                      <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }}>Mark all read</button>
                      <span>•</span>
                      <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                    </div>
                  )}
                </div>

                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <BellOff style={{ width: '28px', height: '28px', color: 'var(--text-muted)', marginBottom: '4px' }} />
                      <h4 style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0 }}>All Caught Up!</h4>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>No active alerts for this journey.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleToggleRead(n.id)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                          position: 'relative',
                          transition: 'background 0.2s ease',
                          background: n.unread ? 'var(--accent-glow)' : 'transparent',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        {n.unread && (
                          <span style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '6px',
                            height: '6px',
                            background: 'var(--accent)',
                            borderRadius: '50%',
                          }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0, paddingLeft: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '4px' }}>
                            <h4 style={{
                              fontSize: '0.75rem',
                              fontWeight: n.unread ? 800 : 600,
                              color: 'var(--text-primary)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {n.title}
                            </h4>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{n.time}</span>
                          </div>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.text}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
              className="hover:bg-gray-100"
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '2px solid var(--glass-border)',
                    transition: 'border-color 0.3s ease',
                  }}
                />
              ) : (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, var(--accent), var(--accent-teal))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#fff',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}>
                  {user?.initials || 'W'}
                </div>
              )}
              <span className="hidden md:block" style={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                {user?.name || 'Traveler'}
              </span>
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div style={{
                position: 'absolute',
                right: 0,
                marginTop: '8px',
                width: '192px',
                background: 'var(--picker-bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-xl)',
                padding: '6px 0',
                zIndex: 50,
                animation: 'scaleIn 0.2s ease-out',
                backdropFilter: 'blur(20px)',
              }}>
                {[
                  { label: 'Customize Profile', onClick: () => { setShowDropdown(false); onProfileClick?.(); }, color: 'var(--accent)', weight: 700 },
                  { label: 'Settings', onClick: () => { setShowDropdown(false); onNavigate?.('settings'); }, color: 'var(--text-secondary)', weight: 500 },
                  { label: 'Switch / New Trip', onClick: () => { setShowDropdown(false); onSwitchTrip?.(); }, color: 'var(--text-secondary)', weight: 500 },
                  { label: 'Sign Out', onClick: () => { setShowDropdown(false); onLogout?.(); }, color: 'var(--accent-coral)', weight: 500 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: item.color,
                      fontWeight: item.weight,
                      fontSize: '0.85rem',
                      transition: 'background 0.2s ease',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--picker-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
