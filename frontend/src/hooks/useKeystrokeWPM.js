import { useState, useEffect, useRef, useCallback } from 'react';

export const useKeystrokeWPM = (windowSizeMs = 5000) => {
  const [wpm, setWpm] = useState(0);
  const keystrokesRef = useRef([]);
  const idleTimeoutRef = useRef(null);

  const updateWPM = useCallback(() => {
    const now = Date.now();
    
    // 1. The Sliding Window: Drop keystrokes older than windowSizeMs
    keystrokesRef.current = keystrokesRef.current.filter(time => now - time <= windowSizeMs);
    
    const keysInWindow = keystrokesRef.current.length;

    // 2. Natural Idle Detection
    if (keysInWindow === 0) {
      setWpm(0);
      return;
    }

    // 3. Stable WPM Math
    // Instead of dividing by the tiny time since the first keystroke (which causes 200+ WPM spikes),
    // we calculate the WPM relative to the entire 5-second sliding window.
    // windowSizeMs is 5000ms (5 seconds). 60000 / 5000 = 12 multiplier to reach 1 minute.
    const multiplier = 60000 / windowSizeMs;
    const calculatedWpm = Math.round((keysInWindow / 5) * multiplier);
    
    setWpm(calculatedWpm);
  }, [windowSizeMs]);

  // The Decay Loop: Runs twice a second to recalculate speed even when hands are off the keyboard
  useEffect(() => {
    const decayTimer = setInterval(updateWPM, 500);
    return () => clearInterval(decayTimer);
  }, [updateWPM]);

  useEffect(() => {
    const handleKeyDown = () => {
      keystrokesRef.current.push(Date.now());
      updateWPM();
      
      // Reset WPM to 0 if no keys are pressed for 1.5 seconds
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        setWpm(0);
        keystrokesRef.current = []; // Clear history so it doesn't resume from old WPM
      }, 1500);
    };

    // Only use local event listener if not running in Tauri
    const isTauri = window.__TAURI_IPC__ !== undefined || window.__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
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

    return () => {
      if (!isTauri) {
        window.removeEventListener('keydown', handleKeyDown);
      }
      clearTimeout(idleTimeoutRef.current);
      if (unlistenTauri) {
        unlistenTauri();
      }
    };
  }, [updateWPM]);

  return wpm;
};
