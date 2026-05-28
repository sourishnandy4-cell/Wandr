import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronDown, Palette } from 'lucide-react';

export const ThemeToggle = () => {
  const { activeTheme, setTheme, THEME_LIST } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentTheme = THEME_LIST.find(t => t.id === activeTheme) || THEME_LIST[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="theme-picker" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="theme-picker-trigger"
        title="Change Theme"
        aria-label="Change theme"
        id="theme-picker-btn"
      >
        <span style={{ fontSize: '1.1rem' }}>{currentTheme.icon}</span>
        <span className="hidden md:inline" style={{ fontSize: '0.8rem' }}>{currentTheme.name}</span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div className="theme-picker-dropdown" id="theme-picker-dropdown">
          <div style={{
            padding: '10px 16px 8px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Palette className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}>
              Choose Theme
            </span>
          </div>

          {THEME_LIST.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                setTheme(theme.id);
                setIsOpen(false);
              }}
              className={`theme-picker-option ${activeTheme === theme.id ? 'active' : ''}`}
              id={`theme-option-${theme.id}`}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{theme.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--picker-text)',
                  letterSpacing: '-0.01em',
                }}>
                  {theme.name}
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  marginTop: '1px',
                }}>
                  {theme.description}
                </div>
              </div>
              <div className="theme-picker-swatches">
                {theme.preview.slice(1).map((color, i) => (
                  <div
                    key={i}
                    className="theme-picker-swatch"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
