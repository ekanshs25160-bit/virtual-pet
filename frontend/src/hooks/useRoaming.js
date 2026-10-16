import { useState, useEffect, useRef } from 'react';

export const useRoaming = ({
  position,
  setPosition,
  isDragging,
  isIdle,
  isBusy,
  gravityMode,
  treatPosition,
  onReachTreat,
}) => {
  const [isRoaming, setIsRoaming] = useState(false);
  const [moveDurationMs, setMoveDurationMs] = useState(2000);
  const [moveDirection, setMoveDirection] = useState(null); // 1 (east) or -1 (west)

  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Gravity effect: when gravityMode is enabled and not dragging, pull down to the Dock perch
  useEffect(() => {
    if (!gravityMode || isDragging) return;
    const floorY = Math.max(100, window.innerHeight - 135);
    if (Math.abs(positionRef.current.y - floorY) > 8) {
      setMoveDurationMs(550);
      setPosition((prev) => ({ x: prev.x, y: floorY }));
    }
  }, [gravityMode, isDragging, setPosition]);

  // Seeking a dropped Fish Treat
  useEffect(() => {
    if (!treatPosition || isDragging) return;

    const dx = treatPosition.x - positionRef.current.x;
    const dy = treatPosition.y - positionRef.current.y;
    const dist = Math.hypot(dx, dy);

    const duration = Math.max(600, Math.min(2800, Math.round((dist / 130) * 1000)));
    setMoveDirection(dx >= 0 ? 1 : -1);
    setMoveDurationMs(duration);
    setIsRoaming(true);

    const targetY = gravityMode
      ? Math.max(100, window.innerHeight - 135)
      : treatPosition.y;

    setPosition({ x: treatPosition.x, y: targetY });

    const timer = setTimeout(() => {
      setIsRoaming(false);
      setMoveDirection(null);
      if (onReachTreat) onReachTreat();
    }, duration);

    return () => clearTimeout(timer);
  }, [treatPosition, isDragging, gravityMode, setPosition, onReachTreat]);

  // Autonomous wandering loop
  useEffect(() => {
    if (isDragging || isIdle || isBusy || treatPosition) {
      setIsRoaming(false);
      setMoveDirection(null);
      return;
    }

    let moveCompleteTimeout;
    const decisionInterval = setInterval(() => {
      // 65% chance to take a stroll, 35% chance to chill in place
      if (Math.random() > 0.35) {
        const margin = 90;
        const maxX = Math.max(margin + 40, window.innerWidth - margin - 64);
        const maxY = Math.max(margin + 40, window.innerHeight - margin - 80);

        const current = positionRef.current;
        // Pick a nearby-to-medium step so movement looks organic
        const stepX = (Math.random() - 0.5) * 340;
        const stepY = gravityMode ? 0 : (Math.random() - 0.5) * 220;

        const nextX = Math.max(margin, Math.min(maxX, current.x + stepX));
        const nextY = gravityMode
          ? Math.max(100, window.innerHeight - 135)
          : Math.max(margin, Math.min(maxY, current.y + stepY));

        const dx = nextX - current.x;
        const dy = nextY - current.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 25) return;

        const duration = Math.max(900, Math.min(3200, Math.round((dist / 85) * 1000)));

        setMoveDirection(dx >= 0 ? 1 : -1);
        setMoveDurationMs(duration);
        setIsRoaming(true);
        setPosition({ x: nextX, y: nextY });

        clearTimeout(moveCompleteTimeout);
        moveCompleteTimeout = setTimeout(() => {
          setIsRoaming(false);
          setMoveDirection(null);
        }, duration);
      } else {
        setIsRoaming(false);
        setMoveDirection(null);
      }
    }, 5200);

    return () => {
      clearInterval(decisionInterval);
      clearTimeout(moveCompleteTimeout);
    };
  }, [isDragging, isIdle, isBusy, treatPosition, gravityMode, setPosition]);

  return { isRoaming, moveDurationMs, moveDirection, setMoveDurationMs };
};
