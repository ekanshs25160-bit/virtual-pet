import { useState, useEffect, useRef } from 'react';

export const useSystemIdleTracker = (idleTimeout = 30000, isDragging = false) => {
  const [isIdle, setIsIdle] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (isIdle) setIsIdle(false);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      if (isDragging) {
        lastActivityRef.current = Date.now(); // Prevent idle trigger while dragging
        if (isIdle) setIsIdle(false);
        return;
      }
      
      const now = Date.now();
      const diff = now - lastActivityRef.current;
      setIdleTime(diff);
      if (diff > idleTimeout) {
        setIsIdle(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [idleTimeout, isIdle]);

  return { isIdle, idleTime };
};
