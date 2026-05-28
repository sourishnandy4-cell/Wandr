/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Kept for backward compat — neon theme adds 'dark' class
  theme: {
    extend: {
      colors: {
        'warm-bg':           '#F9F8F4',
        'primary':           '#2E3F5C',
        'accent':            '#E8A87C',
        'activity-green':    '#6DB8A8',
        'transport-purple':  '#C4B5D0',
        // Dark mode colors (used by neon theme)
        'dark-bg':           '#0f1117',
        'dark-card':         '#1e2433',
        'dark-primary':      '#4a5f7f',
        'dark-text':         '#e5e5e5',
        'dark-border':       '#2a3347',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-4px)' },
          '40%':      { transform: 'translateX(4px)' },
          '60%':      { transform: 'translateX(-4px)' },
          '80%':      { transform: 'translateX(4px)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px var(--accent-glow, rgba(74,144,217,0.25))' },
          '50%':      { boxShadow: '0 0 40px var(--accent-glow, rgba(74,144,217,0.25)), 0 0 60px var(--accent-glow, rgba(74,144,217,0.25))' },
        },
        cardEntrance: {
          '0%':   { opacity: '0', transform: 'translateY(30px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn:        'fadeIn 0.35s ease-out both',
        shake:         'shake 0.4s ease-in-out',
        float:         'float 4s ease-in-out infinite',
        shimmer:       'shimmer 3s linear infinite',
        glowPulse:     'glowPulse 2s ease-in-out infinite',
        cardEntrance:  'cardEntrance 0.5s ease-out both',
        scaleIn:       'scaleIn 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};
