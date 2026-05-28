import React, { createContext, useContext, useState, useEffect } from 'react';

// ── Theme definitions ──────────────────────────────────────────────────────────
export const THEME_LIST = [
  {
    id: 'neon',
    name: 'Neon',
    icon: '⚡',
    description: 'Cyberpunk dark with electric glow',
    preview: ['#0f0c29', '#00f0ff', '#ff00aa', '#4A90D9'],
  },
  {
    id: 'retro',
    name: 'Retro',
    icon: '📻',
    description: 'Warm 80s nostalgia vibes',
    preview: ['#fdf6e3', '#e8692d', '#6b8e23', '#d4a017'],
  },
  {
    id: 'island',
    name: 'Island',
    icon: '🏝️',
    description: 'Tropical paradise freshness',
    preview: ['#e0f7fa', '#0077b6', '#ff6b6b', '#2d6a4f'],
  },
  {
    id: 'cosy',
    name: 'Cosy',
    icon: '🕯️',
    description: 'Warm cabin with soft pastels',
    preview: ['#faf5f0', '#d4736e', '#87a96b', '#7c6f64'],
  },
  {
    id: 'eclipse',
    name: 'Eclipse',
    icon: '🌑',
    description: 'Sleek slate-dark with refined white contrast',
    preview: ['#0b0f19', '#1e293b', '#6366f1', '#3b82f6'],
  },
  {
    id: 'sakura',
    name: 'Sakura',
    icon: '🌸',
    description: 'Vibrant cherry blossom pinks and warm wood',
    preview: ['#fff0f3', '#ff8da1', '#ff5c7a', '#8a2846'],
  },
];

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState(() => {
    const saved = localStorage.getItem('wandr_theme');
    // Migrate legacy dark/light values
    if (saved === 'dark') return 'neon';
    if (saved === 'light') return 'cosy';
    // Validate saved value is a known theme
    if (saved && THEME_LIST.some(t => t.id === saved)) return saved;
    return 'cosy';
  });

  useEffect(() => {
    localStorage.setItem('wandr_theme', activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);
    // Also set the dark class for any remaining Tailwind dark: utilities
    if (activeTheme === 'neon') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [activeTheme]);

  const setTheme = (themeId) => {
    if (THEME_LIST.some(t => t.id === themeId)) {
      setActiveTheme(themeId);
    }
  };

  // For backward compat with components using isDark
  const isDark = activeTheme === 'neon';

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme, isDark, THEME_LIST }}>
      {children}
    </ThemeContext.Provider>
  );
};
