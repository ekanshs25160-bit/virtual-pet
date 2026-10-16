import { useState, useEffect, useRef } from 'react';
import { soundFX } from '../services/soundEffects';
import { listenTauri } from '../services/tauriEvents';

const MODIFIER_KEYS_LOCAL = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
const MODIFIER_KEYS_GLOBAL = [
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'Alt',
  'AltGr',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
];

export const useKeystrokeWPM = () => {
  const [wpm, setWpm] = useState(0);

  const keyTimestampsRef = useRef([]);
  const lastKeyTimeRef = useRef(0);
  const idleTimeoutRef = useRef(null);

  useEffect(() => {
    const recordKeystroke = () => {
      const now = Date.now();
      // Deduplicate when both local window keydown and Tauri global-keydown fire for the same key
      if (now - lastKeyTimeRef.current < 18) return;
      lastKeyTimeRef.current = now;

      soundFX.playKeyTap();

      // Keep keystrokes from the last 2.5 seconds for responsive burst WPM
      const windowMs = 2500;
      const recent = keyTimestampsRef.current.filter((t) => now - t <= windowMs);
      recent.push(now);
      keyTimestampsRef.current = recent;

      if (recent.length === 1) {
        // Immediate feedback on the very first keystroke so Kneading starts right away
        setWpm(28);
      } else {
        const spanMinutes = Math.max(350, now - recent[0]) / 60000;
        const rawWpm = Math.round(recent.length / 5 / spanMinutes);
        setWpm(Math.max(28, Math.min(rawWpm, 220)));
      }

      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        setWpm(0);
        keyTimestampsRef.current = [];
      }, 1100);
    };

    const handleLocalKeyDown = (e) => {
      if (MODIFIER_KEYS_LOCAL.includes(e.key)) return;
      recordKeystroke();
    };

    window.addEventListener('keydown', handleLocalKeyDown);
    const unlistenTauri = listenTauri('global-keydown', (event) => {
      if (MODIFIER_KEYS_GLOBAL.includes(event.payload)) return;
      recordKeystroke();
    });

    return () => {
      window.removeEventListener('keydown', handleLocalKeyDown);
      clearTimeout(idleTimeoutRef.current);
      unlistenTauri();
    };
  }, []);

  return wpm;
};
