import { useState, useEffect, useRef, useCallback } from 'react';
import { listenTauri } from '../services/tauriEvents';

export const useSystemIdleTracker = (idleTimeout = 15000, isDragging = false) => {
  const [isIdle, setIsIdle] = useState(false);
  const [idleTime, setIdleTime] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const isDraggingRef = useRef(isDragging);
  const cursorPosRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    time: Date.now(),
  });

  // Reset idle immediately on activity (functional updates bail out when unchanged,
  // so this does not cause a re-render on every mouse move).
  const markActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleTime((t) => (t === 0 ? t : 0));
    setIsIdle((v) => (v ? false : v));
  }, []);

  useEffect(() => {
    isDraggingRef.current = isDragging;
    if (isDragging) markActive();
  }, [isDragging, markActive]);

  useEffect(() => {
    const recordMove = (x, y) => {
      const now = Date.now();
      const prev = cursorPosRef.current;
      const dx = x - prev.x;
      const dy = y - prev.y;
      const stepDist = Math.hypot(dx, dy);

      cursorPosRef.current = { x, y, time: now };

      // Ignore sub-pixel jitter so grooming / sleeping can kick in
      if (stepDist > 3) markActive();
    };

    const handleMouseMove = (e) => recordMove(e.clientX, e.clientY);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', markActive);
    window.addEventListener('mousedown', markActive);
    window.addEventListener('wheel', markActive, { passive: true });

    const unlistenMouse = listenTauri('global-mousemove', (event) => {
      if (event.payload) recordMove(event.payload.x, event.payload.y);
    });
    const unlistenKey = listenTauri('global-keydown', markActive);
    const unlistenScroll = listenTauri('global-scroll', markActive);

    const interval = setInterval(() => {
      if (isDraggingRef.current) {
        markActive();
        return;
      }
      const diff = Date.now() - lastActivityRef.current;
      // Quantize to whole seconds so the pet only re-renders once per second
      const quantized = diff < 1000 ? 0 : Math.floor(diff / 1000) * 1000;
      setIdleTime((t) => (t === quantized ? t : quantized));
      if (diff > idleTimeout) setIsIdle((v) => (v ? v : true));
    }, 500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('mousedown', markActive);
      window.removeEventListener('wheel', markActive);
      unlistenMouse();
      unlistenKey();
      unlistenScroll();
      clearInterval(interval);
    };
  }, [idleTimeout, markActive]);

  return {
    isIdle,
    idleTime,
    cursorPosRef,
    markActive,
  };
};
