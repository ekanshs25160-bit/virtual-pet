import React, { useState, useEffect } from 'react';
import { useMousePosition } from '../hooks/useMousePosition';
import { useKeystrokeWPM } from '../hooks/useKeystrokeWPM';
import { useSystemIdleTracker } from '../hooks/useSystemIdleTracker';
import { useMochiDrag } from '../hooks/useMochiDrag';
import { useRoaming } from '../hooks/useRoaming';
import './Pet.css';

const Pet = () => {
  const mousePos = useMousePosition();
  const wpm = useKeystrokeWPM();
  const { isIdle, idleTime } = useSystemIdleTracker(10000);
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const { isDragging, onMouseDown } = useMochiDrag(position, setPosition);
  const { isRoaming } = useRoaming(setPosition, isDragging, isIdle);
  
  const [animation, setAnimation] = useState('idle');
  const [direction, setDirection] = useState('south');
  const [message, setMessage] = useState('');
  const [isTalking, setIsTalking] = useState(false);

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
  };

  // Determine direction based on mouse position relative to pet
  useEffect(() => {
    if (isDragging) return;

    const dx = mousePos.x - position.x - 44;
    const dy = mousePos.y - position.y - 44;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    let dir = 'east';
    if (angle >= 90 || angle < -90) dir = 'west';

    setDirection(dir);
  }, [mousePos, position, isDragging]);

  // Determine animation state
  useEffect(() => {
    if (isTalking) return; // Keep talking message

    if (isDragging) {
      setAnimation('dragging');
      setMessage('Put me down!');
    } else if (wpm > 0) {
      setAnimation('typing');
      setMessage(`Typing fast! ${wpm} WPM`);
    } else if (isIdle) {
      setAnimation('sleeping');
      setMessage('Zzz...');
    } else if (isRoaming) {
      setAnimation('roaming');
      setMessage('');
    } else {
      setAnimation('idle');
      setMessage('');
    }
  }, [isDragging, wpm, isIdle, isRoaming, isTalking]);


  return (
    <div 
      className={`pet-container ${animation === 'typing' ? 'pet-typing' : ''} ${animation === 'roaming' ? 'pet-roaming' : ''}`}
      style={{ 
        left: position.x, 
        top: position.y,
        opacity: animation === 'sleeping' ? 0.6 : 1,
        transition: isDragging ? 'none' : 'left 2s ease-in-out, top 2s ease-in-out, opacity 0.5s ease'
      }}
      onMouseDown={onMouseDown}
      onClick={handleClick}
    >
      {message && <div className="speech-bubble">{message}</div>}
      <div 
        className={`pet-sprite ${animation === 'roaming' ? 'sprite-walk' : 'sprite-idle'}`}
        style={{ transform: direction === 'west' ? 'scaleX(-1) scale(1.5)' : 'scaleX(1) scale(1.5)' }}
      />
    </div>
  );
};

export default Pet;
