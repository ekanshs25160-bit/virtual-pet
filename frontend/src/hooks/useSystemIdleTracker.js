import { useState, useEffect, useRef, useCallback } from 'react';
import { listenTauri } from '../services/tauriEvents';

export const useSystemIdleTracker = (idleTimeout = 15000, isDragging = false) => {
  const [isIdle, setIsIdle] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const [cursorPounceTarget, setCursorPounceTarget] = useState(null);

  const lastActivityRef = useRef(Date.now());
  const isDraggingRef = useRef(isDragging);
  const cursorPosRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    time: Date.now(),
  });
  const moveHistoryRef = useRef([]);
  const wiggleHistoryRef = useRef([]);
  const lastPounceTimeRef = useRef(0);

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

      // Ignore sub-pixel jitter so grooming / sleeping can actually kick in
      if (stepDist > 3) markActive();

      // 1. Mouse Hunt: fast cursor travel within a 160ms sliding window
      const moves = moveHistoryRef.current.filter((m) => now - m.time <= 160);
      if (stepDist > 1) moves.push({ dist: stepDist, time: now });
      moveHistoryRef.current = moves;
      const rollingDist = moves.reduce((sum, m) => sum + m.dist, 0);

      if (rollingDist > 240 && now - lastPounceTimeRef.current > 4500) {
        lastPounceTimeRef.current = now;
        moveHistoryRef.current = [];
        setCursorPounceTarget({ x, y, timestamp: now });
        return;
      }

      // 2. Rapid side-to-side cursor wiggle
      if (Math.abs(dx) > 14) {
        const dir = dx > 0 ? 1 : -1;
        const hist = wiggleHistoryRef.current;
        if (hist.length === 0 || hist[hist.length - 1].dir !== dir) {
          hist.push({ dir, time: now });
        }
        wiggleHistoryRef.current = hist.filter((item) => now - item.time < 750);

        if (
          wiggleHistoryRef.current.length >= 3 &&
          now - lastPounceTimeRef.current > 4500
        ) {
          lastPounceTimeRef.current = now;
          wiggleHistoryRef.current = [];
          setCursorPounceTarget({ x, y, timestamp: now });
        }
      }
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

  const clearPounceTarget = useCallback(() => setCursorPounceTarget(null), []);

  return {
    isIdle,
    idleTime,
    cursorPosRef,
    cursorPounceTarget,
    clearPounceTarget,
  };
};
