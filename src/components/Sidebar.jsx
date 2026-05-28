import React from 'react';
import { LayoutDashboard, MapPin, Receipt, FileText, LogOut, Plane, Bot, Users, X, Map, Cloud, Settings } from 'lucide-react';

export const Sidebar = ({ activeTab = 'dashboard', onTabChange, user, onLogout, onProfileClick, isOpen, onClose }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'itinerary', label: 'Itinerary', icon: MapPin },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'weather', label: 'Weather', icon: Cloud },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'ai', label: 'Finance AI', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        wandr-sidebar fixed left-0 top-0 h-screen w-64 z-50
        transform transition-transform duration-300 ease-in-out
        md:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
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
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
