import React, { useState, useEffect, useRef } from 'react';
import { useKeystrokeWPM } from '../hooks/useKeystrokeWPM';
import { useSystemIdleTracker } from '../hooks/useSystemIdleTracker';
import { useMochiDrag } from '../hooks/useMochiDrag';
import { SpriteAnimator } from './SpriteAnimator';
import MiniKeyboard from './overlays/MiniKeyboard';
import './Pet.css';

const Pet = () => {
  const wpm = useKeystrokeWPM();
  const { isIdle, idleTime } = useSystemIdleTracker(10000);
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const { isDragging, onPointerDown } = useMochiDrag(position, setPosition);
  
  const [petState, setPetState] = useState('IDLE');
  const [isPetting, setIsPetting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [message, setMessage] = useState('');
  
  const petSpriteRef = useRef(null);
  const [isTalking, setIsTalking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  const speak = (msg, duration = 3000) => {
    setMessage(msg);
    setIsTalking(true);
    setTimeout(() => {
      setIsTalking(false);
      setMessage('');
    }, duration);
  };

  const handleClick = () => {
    const lines = ['Meow!', 'Prrr...', 'Feed me?', 'I love you!', 'Stop clicking!'];
    speak(lines[Math.floor(Math.random() * lines.length)]);
    setIsJumping(true);
    setTimeout(() => {
      setIsJumping(false);
    }, 1000); // Jump for 1 second
  };

  // Track mouse directly with rAF to bypass React state thrashing
  useEffect(() => {
    let animationFrameId;

    const handleMouseMove = (e) => {
      if (isDragging || !petSpriteRef.current) return;

      const dx = e.clientX - position.x - 44;
      const dy = e.clientY - position.y - 44;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      let scaleX = 1;
      if (angle >= 90 || angle < -90) scaleX = -1;

      animationFrameId = requestAnimationFrame(() => {
        if (petSpriteRef.current) {
          petSpriteRef.current.style.transform = `scaleX(${scaleX}) scale(1.5)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [position.x, position.y, isDragging]);

  // Determine animation state
  useEffect(() => {
    if (isJumping) {
      setPetState('JUMPING');
      return; // Prioritize jumping state over everything else
    }
    
    if (isTalking) return; // Keep talking message
    
    if (isDragging) {
      setPetState('DRAGGING');
      setMessage('Put me down!');
    } else if (isPetting) {
      setPetState('PETTING');
      setMessage('Purrr...');
    } else if (wpm >= 60) {
      setPetState('OVERHEATING');
      setMessage('Too fast! Burning up!');
    } else if (wpm > 0) {
      setPetState('KNEADING');
      setMessage(`Typing... ${wpm} WPM`);
    } else if (isThinking) {
      setPetState('THINKING');
      setMessage('Thinking...');
    } else {
      setPetState('IDLE');
      setMessage('');
    }
  }, [isDragging, isPetting, wpm, isThinking, isIdle, isTalking, isJumping]);


  return (
    <div 
      className={`pet-container`}
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        opacity: 1,
        transition: isDragging ? 'none' : 'transform 2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease'
      }}
      onPointerDown={onPointerDown}
      onClick={handleClick}
      onMouseEnter={() => {
        try {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_click_through', { ignore: false }).catch(console.error);
          });
        } catch (e) { /* Not running in Tauri */ }
      }}
      onMouseLeave={() => {
        if (isDragging) return;
        try {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_click_through', { ignore: true }).catch(console.error);
          });
        } catch (e) { /* Not running in Tauri */ }
      }}
    >
      {message && <div className="speech-bubble">{message}</div>}
      
      {/* Head Hitbox for Petting */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '50%',
          zIndex: 10
        }}
        onMouseEnter={() => setIsPetting(true)}
        onMouseLeave={() => setIsPetting(false)}
      />

      <SpriteAnimator petState={petState} petSpriteRef={petSpriteRef} />

      {/* Floating Mechanical Mini-Keyboard */}
      {(petState === 'KNEADING' || petState === 'OVERHEATING') && (
        <MiniKeyboard isOverheating={petState === 'OVERHEATING'} wpm={wpm} />
      )}
    </div>
  );
};

export default Pet;
