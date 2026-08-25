import { useState, useEffect, useRef } from 'react';

export const useKeystrokeWPM = () => {
  const [wpm, setWpm] = useState(0);
  const keystrokesRef = useRef([]);

  useEffect(() => {
    const handleKeyDown = () => {
      const now = Date.now();
      keystrokesRef.current.push(now);
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Listen for global keydown events from Tauri backend
    let unlistenTauri = null;
    try {
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('global-keydown', (event) => {
          const key = event.payload;
          if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Alt', 'AltGr', 'MetaLeft', 'MetaRight', 'CapsLock'].includes(key)) return;
          handleKeyDown();
        }).then(unlisten => {
          unlistenTauri = unlisten;
        });
      });
    } catch (e) {
      // Not running in Tauri
    }

    const interval = setInterval(() => {
      const now = Date.now();
      // Keep only keystrokes from the last 5 seconds
      keystrokesRef.current = keystrokesRef.current.filter(time => now - time < 5000);
      
      // Calculate WPM: (keystrokes / 5) * 60 / 5 (chars per word)
      const count = keystrokesRef.current.length;
      const currentWpm = (count / 5) * (60 / 5);
      setWpm(Math.round(currentWpm));
    }, 1000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
      if (unlistenTauri) {
        unlistenTauri();
      }
    };
  }, []);

  return wpm;
};
