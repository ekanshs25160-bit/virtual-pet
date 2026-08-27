import { useState, useCallback, useRef, useEffect } from 'react';

export const useMochiDrag = (position, setPosition) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ offsetX: 0, offsetY: 0, isDragging: false });
  
  // Use a ref for position to avoid recreating the onPointerDown function on every move
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const onPointerDown = useCallback((e) => {
    // Capture the pointer on the container so that even if it moves fast, it stays targeted
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    dragInfo.current = {
      isDragging: true,
      offsetX: e.clientX - positionRef.current.x,
      offsetY: e.clientY - positionRef.current.y
    };

    const onPointerMove = (moveEvent) => {
      if (!dragInfo.current.isDragging) return;
      setPosition({
        x: moveEvent.clientX - dragInfo.current.offsetX,
        y: moveEvent.clientY - dragInfo.current.offsetY,
      });
    };

    const onPointerUp = (upEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      dragInfo.current.isDragging = false;
      setIsDragging(false);
      
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, [setPosition]);

  return { isDragging, onPointerDown };
};
