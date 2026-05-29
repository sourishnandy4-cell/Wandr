import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, BellOff, Menu, Loader2, MapPin, DollarSign, Calendar, X } from 'lucide-react';
import { fetchItinerary } from '../lib/itineraryService';
import { fetchRecentExpenses } from '../lib/expenseService';

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
    <header className="wandr-header" style={{ position: 'relative', zIndex: 20, padding: '12px 16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}>
        {/* Left: Mobile Menu + Trip Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="md:hidden"
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="trip-name" style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: 'var(--text-primary)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {tripName}
              </h1>
              {tripId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId) && user && onSyncToCloud && (
                <button
                  onClick={onSyncToCloud}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-teal))',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                  title="Upload this local trip to the cloud database to sync with your phone"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Sync to Cloud
                </button>
              )}
            </div>
            <span style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '4px 10px',
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '20px',
              whiteSpace: 'nowrap',
            }}>
              {dateRange}
            </span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden lg:flex" style={{ flex: 1, maxWidth: '400px' }} ref={searchWrapperRef}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              placeholder="Search activities, expenses..."
              style={{
                width: '100%',
                paddingLeft: '42px',
                paddingRight: searchQuery ? '36px' : '14px',
                paddingTop: '10px',
                paddingBottom: '10px',
                borderRadius: '50px',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
              }}
              onFocusCapture={(e) => {
                e.target.style.boxShadow = `0 0 0 3px var(--input-focus-ring)`;
                e.target.style.borderColor = 'var(--accent)';
              }}
              onBlurCapture={(e) => {
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = 'var(--glass-border)';
              }}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                }}
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
