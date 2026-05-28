import React, { useEffect, useRef, useState } from 'react';

export const CursorPlane = () => {
  const planeRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const planePos = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    // Don't show on touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };

    const handleMouseLeave = () => {
      setVisible(false);
    };

    const animate = () => {
      const plane = planeRef.current;
      if (!plane) { rafRef.current = requestAnimationFrame(animate); return; }

      planePos.current.x += (mousePos.current.x - planePos.current.x) * 0.15;
      planePos.current.y += (mousePos.current.y - planePos.current.y) * 0.15;

      plane.style.left = (planePos.current.x - 12) + 'px';
      plane.style.top = (planePos.current.y - 12) + 'px';

      // Rotate based on movement direction
      const dx = mousePos.current.x - planePos.current.x;
      const dy = mousePos.current.y - planePos.current.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      plane.style.transform = `rotate(${angle + 90}deg)`;

      rafRef.current = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={planeRef}
      className={`cursor-plane ${visible ? 'visible' : ''}`}
    >
      ✈️
    </div>
  );
};
