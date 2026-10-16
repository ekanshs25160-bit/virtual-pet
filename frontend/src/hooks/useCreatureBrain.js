import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToAiAgent } from '../services/aiAgentSocket';
import { listenTauri } from '../services/tauriEvents';

export const useCreatureBrain = ({
  isDragging,
  wpm,
  userName,
  stretchIntervalMin,
  waterIntervalMin,
  reminders,
  onTriggerReminder,
  onAiStateChange,
}) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [paperLengthCm, setPaperLengthCm] = useState(0);
  const [activeAppName, setActiveAppName] = useState('Desktop');
  const [inferredActivity, setInferredActivity] = useState('Chilling');

  const scrollTimeoutRef = useRef(null);
  const firedReminderIdsRef = useRef(new Set());
  const promptHeuristicTimerRef = useRef(null);
  const lastTypingBurstRef = useRef(0);

  // 1. Global & Local Scroll -> Paper Unroll
  useEffect(() => {
    const triggerScroll = (deltaY = 10) => {
      setIsScrolling(true);
      setPaperLengthCm((prev) => +(prev + Math.max(0.2, Math.abs(deltaY) * 0.02)).toFixed(1));
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 650);
    };

    const handleWheel = (e) => {
      triggerScroll(e.deltaY || 12);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    const unlistenScroll = listenTauri('global-scroll', (event) => {
      const dy = event.payload ? event.payload.delta_y : 12;
      triggerScroll(dy);
    });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(scrollTimeoutRef.current);
      unlistenScroll();
    };
  }, []);

  // 2. Native System Brain Context + AI Agent Process Monitor
  useEffect(() => {
    const unlistenContext = listenTauri('brain-context-update', (event) => {
      if (!event.payload) return;
      const { active_app, ai_agent_working, ai_agent_name } = event.payload;
      if (active_app) setActiveAppName(active_app);

      if (ai_agent_working) {
        setInferredActivity(`AI Agent (${ai_agent_name || 'Active'})`);
      } else {
        setInferredActivity('Chilling');
      }
    });

    const unsubAgent = subscribeToAiAgent((payload) => {
      if (onAiStateChange) onAiStateChange(payload);
    });

    return () => {
      if (unlistenContext) unlistenContext();
      unsubAgent();
    };
  }, [onAiStateChange]);

  // 3. Autonomous Heuristic Brain: infer user's current activity from typing and scrolling
  useEffect(() => {
    if (wpm >= 60) {
      lastTypingBurstRef.current = Date.now();
      setInferredActivity('Speed Coding / Overdrive 🔥');
    } else if (wpm > 0) {
      lastTypingBurstRef.current = Date.now();
      setInferredActivity('Typing / Kneading ⌨️');
    } else if (isScrolling) {
      setInferredActivity('Reading & Unrolling Paper 🧻');
    }
  }, [wpm, isScrolling]);

  // 4. Stretch Reminder Timer
  useEffect(() => {
    if (!stretchIntervalMin || stretchIntervalMin <= 0) return;
    const ms = stretchIntervalMin * 60 * 1000;
    const timer = setInterval(() => {
      if (!isDragging && onTriggerReminder) {
        onTriggerReminder('STRETCH');
      }
    }, ms);
    return () => clearInterval(timer);
  }, [stretchIntervalMin, isDragging, onTriggerReminder]);

  // 5. Drink Water Reminder Timer
  useEffect(() => {
    if (!waterIntervalMin || waterIntervalMin <= 0) return;
    const ms = waterIntervalMin * 60 * 1000;
    const timer = setInterval(() => {
      if (!isDragging && onTriggerReminder) {
        onTriggerReminder('WATER');
      }
    }, ms);
    return () => clearInterval(timer);
  }, [waterIntervalMin, isDragging, onTriggerReminder]);

  // 6. Custom Scheduled Message Reminders (HH:MM)
  useEffect(() => {
    if (!reminders || reminders.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${hh}:${mm}`;

      reminders.forEach((rem) => {
        const key = `${rem.id}-${currentHHMM}`;
        if (rem.time === currentHHMM && !firedReminderIdsRef.current.has(key)) {
          firedReminderIdsRef.current.add(key);
          if (onTriggerReminder) {
            onTriggerReminder('CUSTOM', rem.text);
          }
        }
      });
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [reminders, onTriggerReminder]);

  return {
    isScrolling,
    paperLengthCm,
    activeAppName,
    inferredActivity,
    setInferredActivity,
  };
};
