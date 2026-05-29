import React from 'react';
import { LayoutDashboard, MapPin, Receipt, FileText, LogOut, Plane, Bot, Users, X, Map, Cloud, Settings, Compass, Loader2 } from 'lucide-react';

export const Sidebar = ({ 
  activeTab = 'dashboard', 
  onTabChange, 
  user, 
  onLogout, 
  onProfileClick, 
  isOpen, 
  onClose,
  existingTrips = [],
  activeTripId = null,
  onSelectTrip = null,
  tripsLoading = false
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'itinerary', label: 'Itinerary', icon: MapPin },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'weather', label: 'Weather', icon: Cloud },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay — must sit above everything including the header */}
      {isOpen && (
        <div 
          className="fixed inset-0 md:hidden"
          style={{ zIndex: 99998, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar — one level above the overlay */}
      <aside 
        className={`
          wandr-sidebar fixed left-0 top-0 h-screen w-64
          transform transition-transform duration-300 ease-in-out
          md:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}
        style={{ zIndex: 99999 }}
      >
        {/* Logo + Close Button */}
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="logo-icon"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: '#fff',
                background: `linear-gradient(135deg, var(--accent), var(--accent-teal))`,
                boxShadow: `0 4px 15px var(--accent-glow)`,
              }}
            >
              ✈️
            </div>
            <span style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              color: 'var(--text-on-sidebar)',
            }}>
              Wandr
            </span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden"
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-on-sidebar-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }} className="custom-scrollbar">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange?.(item.id);
                  onClose?.();
                }}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  animationDelay: `${index * 0.03}s`,
                }}
                id={`nav-${item.id}`}
              >
                <Icon className="w-5 h-5" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: 'inherit' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Saved Trips Switcher */}
        {existingTrips && existingTrips.length > 0 && (
          <div style={{
            padding: '16px 12px 8px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 850,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-on-sidebar-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 4px',
            }}>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-on-sidebar)' }}>
                <Compass className="w-3.5 h-3.5 text-accent animate-pulse" />
                Your Saved Trips
              </span>
              {tripsLoading && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
            </div>
            
            <div style={{
              maxHeight: '130px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px',
            }} className="custom-scrollbar">
              {existingTrips.map(trip => {
                const isActive = trip.id === activeTripId;
                return (
                  <button
                    key={trip.id}
                    onClick={() => {
                      if (!isActive) {
                        onSelectTrip?.(trip.id);
                        onClose?.();
                      }
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                      border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'inherit',
                    }}
                    className={`hover:bg-white/5 group`}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '4px' }}>
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: isActive ? 'var(--accent)' : 'var(--text-on-sidebar)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {trip.name}
                      </div>
                      <div style={{
                        fontSize: '0.6rem',
                        color: 'var(--text-on-sidebar-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}>
                        {trip.destination}
                      </div>
                    </div>
                    {isActive && (
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        boxShadow: '0 0 6px var(--accent)',
                        flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User Section */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              onClick={onProfileClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flex: 1,
                minWidth: 0,
                padding: '8px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              className="hover:bg-white/5"
              title="Customize Profile"
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    boxShadow: `0 0 10px var(--accent-glow)`,
                    border: '2px solid rgba(255,255,255,0.15)',
                  }}
                />
              ) : (
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, var(--accent), var(--accent-teal))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#fff',
                  fontSize: '0.8rem',
                  flexShrink: 0,
                  boxShadow: `0 0 10px var(--accent-glow)`,
                }}>
                  {user?.initials || 'W'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--text-on-sidebar)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user?.name || 'Traveler'}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-on-sidebar-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user?.role || 'Trip Member'}
                </div>
              </div>
            </div>
            <button 
              onClick={onLogout}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-on-sidebar-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              className="hover:bg-white/10"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
