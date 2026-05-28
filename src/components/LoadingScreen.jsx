import React, { useEffect, useRef, useState } from 'react';

export const LoadingScreen = ({ onFinished }) => {
  const [hidden, setHidden] = useState(false);
  const starsRef = useRef(null);
  const cloudsRef = useRef(null);

  // Generate stars
  useEffect(() => {
    const container = starsRef.current;
    if (!container) return;
    const count = 80;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      const size = Math.random() * 2.5 + 1;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
      star.style.setProperty('--delay', (Math.random() * 4) + 's');
      container.appendChild(star);
    }
    return () => { container.innerHTML = ''; };
  }, []);

  // Generate clouds
  useEffect(() => {
    const layer = cloudsRef.current;
    if (!layer) return;
    for (let i = 0; i < 6; i++) {
      const cloud = document.createElement('div');
      cloud.classList.add('cloud');
      const w = Math.random() * 200 + 100;
      const h = Math.random() * 60 + 30;
      cloud.style.width = w + 'px';
      cloud.style.height = h + 'px';
      cloud.style.top = (Math.random() * 60 + 10) + '%';
      cloud.style.setProperty('--cloud-duration', (Math.random() * 8 + 8) + 's');
      cloud.style.animationDelay = (Math.random() * 6) + 's';
      layer.appendChild(cloud);
    }
    return () => { layer.innerHTML = ''; };
  }, []);

  // Auto-hide after 2.8s
  useEffect(() => {
    const timer = setTimeout(() => {
      setHidden(true);
      setTimeout(() => {
        if (onFinished) onFinished();
      }, 600); // Wait for fade-out transition
    }, 2800);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className={`loading-screen ${hidden ? 'hidden' : ''}`}>
      {/* Stars */}
      <div ref={starsRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      
      {/* Clouds */}
      <div ref={cloudsRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Plane Animation */}
      <div className="plane-animation-wrapper">
        <div className="plane-trail" style={{ width: '120px', right: '60px', top: '45%' }} />
        <svg className="plane-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"
            fill="url(#planeGradient)"
            stroke="white"
            strokeWidth="0.5"
          />
          <defs>
            <linearGradient id="planeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--plane-gradient-start)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'var(--plane-gradient-end)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Loading Text */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: '20px', textAlign: 'center' }}>
        <div className="loading-title">Wandr</div>
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
        <div className="loading-progress-bar">
          <div className="loading-progress-fill" />
        </div>
      </div>
    </div>
  );
};
