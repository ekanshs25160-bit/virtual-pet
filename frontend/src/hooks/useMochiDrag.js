import { useState, useCallback, useRef } from 'react';

export const useMochiDrag = (position, setPosition) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ offsetX: 0, offsetY: 0, isDragging: false });

  const onPointerDown = useCallback((e) => {
    // Capture the pointer so that even if it moves fast, it stays targeted to the pet
    e.target.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    dragInfo.current = {
      isDragging: true,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y
    };

    const onPointerMove = (moveEvent) => {
      if (!dragInfo.current.isDragging) return;
      setPosition({
        x: moveEvent.clientX - dragInfo.current.offsetX,
        y: moveEvent.clientY - dragInfo.current.offsetY,
      });
    };

    const onPointerUp = (upEvent) => {
      upEvent.target.releasePointerCapture(upEvent.pointerId);
      dragInfo.current.isDragging = false;
      setIsDragging(false);
      
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      
      try {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('set_click_through', { ignore: true }).catch(console.error);
        });
      } catch (e) { /* Not running in Tauri */ }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [position, setPosition]);

  return { isDragging, onPointerDown };
};
