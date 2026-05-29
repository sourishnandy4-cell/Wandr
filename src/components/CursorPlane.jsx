import React, { useEffect, useRef, useState } from 'react';

export const CursorPlane = () => {
  const planeRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const mousePos = useRef({ x: -200, y: -200 });
  const planePos = useRef({ x: -200, y: -200 });
  const rafRef = useRef(null);
  const isTouchDevice = useRef(
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );

  useEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;

    /* ── DESKTOP: smooth cursor-following plane ─────────────────────── */
    if (!isTouchDevice.current) {
      const onMouseMove = (e) => {
        mousePos.current = { x: e.clientX, y: e.clientY };
        setVisible(true);
      };
      const onMouseLeave = () => setVisible(false);

      const animate = () => {
        planePos.current.x += (mousePos.current.x - planePos.current.x) * 0.15;
        planePos.current.y += (mousePos.current.y - planePos.current.y) * 0.15;

        plane.style.left = (planePos.current.x - 12) + 'px';
        plane.style.top  = (planePos.current.y - 12) + 'px';

        const dx = mousePos.current.x - planePos.current.x;
        const dy = mousePos.current.y - planePos.current.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        plane.style.transform = `rotate(${angle + 90}deg)`;

        rafRef.current = requestAnimationFrame(animate);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseleave', onMouseLeave);
      rafRef.current = requestAnimationFrame(animate);

      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    /* ── MOBILE: touch-following plane ──────────────────────────────── */
    let hideTimer = null;

    const onTouchStart = (e) => {
      const t = e.touches[0];
      mousePos.current = { x: t.clientX, y: t.clientY };
      planePos.current  = { x: t.clientX, y: t.clientY };
      plane.style.left = (t.clientX - 16) + 'px';
      plane.style.top  = (t.clientY - 16) + 'px';
      plane.style.transform = 'rotate(-45deg) scale(1.2)';
      setVisible(true);
      clearTimeout(hideTimer);
    };

    const onTouchMove = (e) => {
      const t = e.touches[0];
      const dx = t.clientX - mousePos.current.x;
      const dy = t.clientY - mousePos.current.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      mousePos.current = { x: t.clientX, y: t.clientY };

      // Smooth snap — no rAF needed, touchmove fires at screen refresh rate
      planePos.current.x += (t.clientX - planePos.current.x) * 0.35;
      planePos.current.y += (t.clientY - planePos.current.y) * 0.35;

      plane.style.left = (planePos.current.x - 16) + 'px';
      plane.style.top  = (planePos.current.y - 16) + 'px';
      plane.style.transform = `rotate(${angle + 90}deg) scale(1.1)`;

      clearTimeout(hideTimer);
    };

    const onTouchEnd = () => {
      plane.style.transform += ' scale(0.8)';
      hideTimer = setTimeout(() => setVisible(false), 800);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div
      ref={planeRef}
      className={`cursor-plane ${visible ? 'visible' : ''} ${isTouchDevice.current ? 'touch-plane' : ''}`}
      style={{ pointerEvents: 'none' }}
    >
      ✈️
    </div>
  );
};
