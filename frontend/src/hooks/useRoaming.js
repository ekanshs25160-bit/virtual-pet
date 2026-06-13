import { useState, useEffect } from 'react';

export const useRoaming = (setPosition, isDragging, isIdle) => {
  const [isRoaming, setIsRoaming] = useState(false);

  useEffect(() => {
    // Stop roaming if the user is dragging the pet or the system is idle
    if (isDragging || isIdle) {
      setIsRoaming(false);
      return;
    }

    let timeoutId;
    let isMounted = true;

    const roam = () => {
      if (!isMounted) return;

      // 30% chance to pause and stand still for a few seconds
      if (Math.random() < 0.3) {
        setIsRoaming(false);
        timeoutId = setTimeout(roam, 2000 + Math.random() * 3000);
        return;
      }

      setIsRoaming(true);

      // Pick a random destination relative to the current position
      setPosition(prev => {
        const padding = 100;
        // Move within a -250 to 250 pixel radius
        const deltaX = Math.random() * 500 - 250;
        const deltaY = Math.random() * 500 - 250;
        
        const targetX = Math.max(padding, Math.min(window.innerWidth - padding, prev.x + deltaX));
        const targetY = Math.max(padding, Math.min(window.innerHeight - padding, prev.y + deltaY));
        
        return { x: targetX, y: targetY };
      });

      // Let the CSS transition handle the movement over 2 seconds
      const moveDuration = 2000;
      
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        setIsRoaming(false);
        // Wait a bit before moving again
        timeoutId = setTimeout(roam, 1000 + Math.random() * 3000);
      }, moveDuration);
    };

    // Initial delay before first move
    timeoutId = setTimeout(roam, 2000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isDragging, isIdle, setPosition]);

  return { isRoaming };
};
