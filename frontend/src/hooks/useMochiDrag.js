import { useState, useCallback, useRef, useEffect } from 'react';

export const useMochiDrag = (position, setPosition, onDropCallback) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTilt, setDragTilt] = useState(0);
  const [stretchFactor, setStretchFactor] = useState(1);
  const [isShaking, setIsShaking] = useState(false);
  const [isLanding, setIsLanding] = useState(false);

  const dragInfo = useRef({
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastDir: 0,
    reversals: [],
    isDragging: false,
  });

  const shakeTimeoutRef = useRef(null);
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const target = e.currentTarget;
      if (target.setPointerCapture && e.pointerId !== undefined) {
        try {
          target.setPointerCapture(e.pointerId);
        } catch (_) {}
      }

      setIsDragging(true);
      setIsLanding(false);

      dragInfo.current = {
        isDragging: true,
        hasMoved: false,
        offsetX: e.clientX - positionRef.current.x,
        offsetY: e.clientY - positionRef.current.y,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastDir: 0,
        reversals: [],
      };

      const onPointerMove = (moveEvent) => {
        if (!dragInfo.current.isDragging) return;

        const totalDist = Math.hypot(
          moveEvent.clientX - dragInfo.current.startX,
          moveEvent.clientY - dragInfo.current.startY
        );
        if (totalDist > 6) {
          dragInfo.current.hasMoved = true;
        }

        const now = Date.now();
        const vx = moveEvent.clientX - dragInfo.current.lastX;
        dragInfo.current.lastX = moveEvent.clientX;

        // Detect side-to-side shaking while dragging ("shaking it makes it wobble side to side")
        if (Math.abs(vx) > 8) {
          const dir = vx > 0 ? 1 : -1;
          if (dir !== dragInfo.current.lastDir) {
            dragInfo.current.lastDir = dir;
            dragInfo.current.reversals.push(now);
            dragInfo.current.reversals = dragInfo.current.reversals.filter(
              (t) => now - t < 500
            );
            if (dragInfo.current.reversals.length >= 3) {
              setIsShaking(true);
              clearTimeout(shakeTimeoutRef.current);
              shakeTimeoutRef.current = setTimeout(() => {
                setIsShaking(false);
              }, 450);
            }
          }
        }

        // Swing tilt based on horizontal drag velocity
        const clampedTilt = Math.max(-24, Math.min(24, vx * 1.15));
        setDragTilt(clampedTilt);

        // Mochi stretch when lifting upward
        const dy = dragInfo.current.startY - moveEvent.clientY;
        if (dy > 10) {
          const stretch = Math.min(1.65, 1 + (dy - 10) / 260);
          setStretchFactor(stretch);
        } else {
          setStretchFactor(1);
        }

        const nextX = Math.max(
          0,
          Math.min(
            window.innerWidth - 68,
            moveEvent.clientX - dragInfo.current.offsetX
          )
        );
        const nextY = Math.max(
          24,
          Math.min(
            window.innerHeight - 96,
            moveEvent.clientY - dragInfo.current.offsetY
          )
        );

        setPosition({ x: nextX, y: nextY });
      };

      const onPointerUp = (upEvent) => {
        if (target.releasePointerCapture && upEvent.pointerId !== undefined) {
          try {
            target.releasePointerCapture(upEvent.pointerId);
          } catch (_) {}
        }
        const wasMoved = dragInfo.current.hasMoved;
        dragInfo.current.isDragging = false;
        setIsDragging(false);
        setIsShaking(false);
        setDragTilt(0);
        setStretchFactor(1);

        // Squishy Mochi landing bounce only if actually dragged
        if (wasMoved) {
          setIsLanding(true);
          setTimeout(() => setIsLanding(false), 450);

          if (onDropCallback) {
            onDropCallback(positionRef.current);
          }
        }

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [setPosition, onDropCallback]
  );

  return {
    isDragging,
    dragTilt,
    stretchFactor,
    isShaking,
    isLanding,
    onPointerDown,
  };
};
