import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useKeystrokeWPM } from '../hooks/useKeystrokeWPM';
import { useSystemIdleTracker } from '../hooks/useSystemIdleTracker';
import { useMochiDrag } from '../hooks/useMochiDrag';
import { useCreatureBrain } from '../hooks/useCreatureBrain';
import { SpriteAnimator } from './SpriteAnimator';
import SpeechBubble from './overlays/SpeechBubble';
import PomodoroTimer from './overlays/PomodoroTimer';
import ParticleSystem from './overlays/ParticleSystem';
import ComnyangHub from './overlays/ComnyangHub';
import { triggerAgentSimulation } from '../services/aiAgentSocket';
import { soundFX } from '../services/soundEffects';
import { invokeTauri } from '../services/tauriEvents';
import './Pet.css';

const DEFAULT_SETTINGS = {
  userName: 'Ekansh',
  patternId: 'black',
  eyeColor: '#facc15',
  markings: {
    stripes: false,
    bib: true,
    blush: true,
    calicoPatch: false,
  },
  fixedMessage: '',
  stretchIntervalMin: 25,
  waterIntervalMin: 30,
  reminders: [{ id: 'default-1', time: '18:00', text: 'Wrap up daily goals!' }],
  licenseKey: 'COMNYANG-MULTI-2026-PRO',
};

const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem('comnyang_settings_v1');
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return DEFAULT_SETTINGS;
};

const Pet = () => {
  const wpm = useKeystrokeWPM();
  const [settings, setSettings] = useState(loadSavedSettings);

  const handleUpdateSettings = useCallback((next) => {
    setSettings(next);
    try {
      localStorage.setItem('comnyang_settings_v1', JSON.stringify(next));
    } catch (_) {}
  }, []);

  const [position, setPosition] = useState({
    x: Math.round(window.innerWidth / 2 - 32),
    y: Math.round(window.innerHeight / 2 - 32),
  });

  const [showPomodoro, setShowPomodoro] = useState(false);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [showHub, setShowHub] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [affection, setAffection] = useState(1);
  const [burstParticles, setBurstParticles] = useState([]);

  const [petState, setPetState] = useState('IDLE');
  const [gazeFrame, setGazeFrame] = useState(4);
  const [isPetting, setIsPetting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isEating, setIsEating] = useState(false);
  const [isPouncing, setIsPouncing] = useState(false);
  const [activeReminderType, setActiveReminderType] = useState(null);

  const [message, setMessage] = useState('');
  const [speechMood, setSpeechMood] = useState('normal');
  const [isTalking, setIsTalking] = useState(false);

  const petSpriteRef = useRef(null);
  const eyeFollowRef = useRef(null);
  const clickStartRef = useRef({ x: 0, y: 0, time: 0 });
  const talkTimerRef = useRef(null);
  const reminderTimerRef = useRef(null);
  const pettingTimeoutRef = useRef(null);
  const lastStrokePosRef = useRef(null);
  const strokeAccumRef = useRef(0);
  const lastPurrSoundRef = useRef(0);

  const formatNamePrefix = useCallback(() => {
    return settings.userName?.trim() ? `${settings.userName.trim()}, ` : '';
  }, [settings.userName]);

  const spawnBurst = useCallback((symbols = ['♥', '✨', '♥']) => {
    const now = Date.now();
    const created = symbols.map((symbol, idx) => ({
      id: `${now}-${idx}-${Math.random()}`,
      symbol,
      offsetX: 10 + idx * 18 + Math.round((Math.random() - 0.5) * 12),
      offsetY: -4 + Math.round((Math.random() - 0.5) * 10),
    }));
    setBurstParticles((prev) => [...prev, ...created]);
    setTimeout(() => {
      setBurstParticles((prev) =>
        prev.filter((item) => !created.some((c) => c.id === item.id))
      );
    }, 950);
  }, []);

  const speak = useCallback((msg, duration = 3200, mood = 'normal') => {
    clearTimeout(talkTimerRef.current);
    setMessage(msg);
    setSpeechMood(mood);
    setIsTalking(true);
    talkTimerRef.current = setTimeout(() => {
      setIsTalking(false);
      setMessage('');
    }, duration);
  }, []);

  const handleDropPosition = useCallback((droppedPos) => {
    if (droppedPos.x <= 95) {
      setPosition((prev) => ({ ...prev, x: 2 }));
    } else if (droppedPos.x >= window.innerWidth - 135) {
      setPosition((prev) => ({ ...prev, x: window.innerWidth - 66 }));
    }
  }, []);

  const {
    isDragging,
    dragTilt,
    stretchFactor,
    isShaking,
    isLanding,
    onPointerDown,
  } = useMochiDrag(position, setPosition, handleDropPosition);

  const { isIdle, idleTime, cursorPosRef, cursorPounceTarget, clearPounceTarget } =
    useSystemIdleTracker(15000, isDragging);

  // Detect if user placed the cat on the left or right screen edge for Peeking mode
  const isAtLeftEdge = position.x <= 95;
  const isAtRightEdge = position.x >= window.innerWidth - 135;
  const peekSide = isAtLeftEdge ? 'left' : isAtRightEdge ? 'right' : null;

  const handleTriggerReminder = useCallback(
    (type, customText = '') => {
      clearTimeout(reminderTimerRef.current);
      setActiveReminderType(type);
      soundFX.playMeow();

      const namePrefix = formatNamePrefix();
      if (type === 'STRETCH') {
        spawnBurst(['🧘', '✨', '💪']);
        speak(`${namePrefix}time to stretch big with me! 🧘`, 6500, 'happy');
      } else if (type === 'WATER') {
        spawnBurst(['💧', '🥤', '💧']);
        speak(
          `${namePrefix}drink some water! Stay hydrated 💧`,
          5500,
          'happy'
        );
      } else if (type === 'CUSTOM') {
        spawnBurst(['🔔', '🐾', '✨']);
        speak(
          `${namePrefix}reminder: ${customText || 'Check your notes!'} 🔔`,
          5500,
          'alert'
        );
      }

      reminderTimerRef.current = setTimeout(() => {
        setActiveReminderType(null);
      }, 6500);
    },
    [formatNamePrefix, spawnBurst, speak]
  );

  const thinkingWatchdogRef = useRef(null);

  const handleAiStateChange = useCallback(
    ({ state, message: agentMsg }) => {
      clearTimeout(thinkingWatchdogRef.current);
      if (state === 'THINKING') {
        setIsThinking(true);
        setMessage(agentMsg || 'Thinking along...');
        setSpeechMood('agent');
        // Auto-expire thinking mode after 5s if no new active heartbeat arrives
        thinkingWatchdogRef.current = setTimeout(() => {
          setIsThinking(false);
          setMessage('');
        }, 5000);
      } else if (state === 'SUCCESS' || state === 'DONE') {
        setIsThinking(false);
        setIsJumping(true);
        soundFX.playMeow();
        soundFX.playTreat();
        spawnBurst(['🎉', '✨', '♥']);
        speak(
          agentMsg || `${formatNamePrefix()}AI agent finished! Meow! 🎉`,
          3800,
          'happy'
        );
        setTimeout(() => setIsJumping(false), 1800);
      } else {
        setIsThinking(false);
        if (agentMsg) speak(agentMsg, 3000, 'normal');
      }
    },
    [formatNamePrefix, spawnBurst, speak]
  );

  const {
    isScrolling,
    paperLengthCm,
    activeAppName,
    inferredActivity,
  } = useCreatureBrain({
    isDragging,
    wpm,
    userName: settings.userName,
    stretchIntervalMin: settings.stretchIntervalMin,
    waterIntervalMin: settings.waterIntervalMin,
    reminders: settings.reminders,
    onTriggerReminder: handleTriggerReminder,
    onAiStateChange: handleAiStateChange,
  });

  const isBusy =
    wpm > 0 ||
    isScrolling ||
    isThinking ||
    isJumping ||
    isEating ||
    isPouncing ||
    (showPomodoro && isPomodoroRunning) ||
    Boolean(activeReminderType) ||
    Boolean(peekSide) ||
    showHub;

  // Mouse Hunt (in-place pounce reaction when moving cursor fast, without walking away)
  useEffect(() => {
    if (!cursorPounceTarget || isDragging || isBusy) return;

    setIsPouncing(true);
    soundFX.playJump();
    spawnBurst(['🐾', '❗']);
    speak('Mouse hunt!! 🐾', 2200, 'happy');
    clearPounceTarget();

    const timer = setTimeout(() => {
      setIsPouncing(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, [cursorPounceTarget, isDragging, isBusy, clearPounceTarget, spawnBurst, speak]);

  // 9-Pose Eye Follow via eyes_rolling.png (3x3 directional gaze grid mapped to frames 0..8)
  useEffect(() => {
    let rafId;

    const updateGaze = () => {
      const cursor = cursorPosRef.current;
      const centerX = position.x + 32;
      const centerY = position.y + 32;
      const dx = cursor.x - centerX;
      const dy = cursor.y - centerY;

      // Map (dx, dy) to 3x3 calibrated gaze grid:
      // Row 0: Up-Left (0), Up (1), Up-Right (2)
      // Row 1: Left (3), Center (4), Right (5)
      // Row 2: Down-Left (6), Down (7), Down-Right (8)
      const col = dx < -36 ? 0 : dx > 36 ? 2 : 1;
      const row = dy < -36 ? 0 : dy > 36 ? 2 : 1;
      const nextFrame = row * 3 + col;
      setGazeFrame((prev) => (prev === nextFrame ? prev : nextFrame));

      if (eyeFollowRef.current) {
        eyeFollowRef.current.style.transform = 'none';
      }
    };

    const onMove = () => {
      rafId = requestAnimationFrame(updateGaze);
    };

    updateGaze();
    window.addEventListener('mousemove', onMove);
    const pollInterval = setInterval(updateGaze, 60);

    return () => {
      window.removeEventListener('mousemove', onMove);
      clearInterval(pollInterval);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [position.x, position.y, cursorPosRef]);

  // Sync bounding box with Rust for global click-through toggling
  useEffect(() => {
    const syncBounds = () => {
      const topExtra = showHub ? 340 : 110;
      const leftExtra = showPomodoro || showHub || peekSide === 'right' ? 250 : 85;
      const rightExtra = showPomodoro || showHub || peekSide === 'left' ? 250 : 95;
      const bottomExtra = 85;

      const baseW = 96;
      const baseH = 96;

      invokeTauri('update_pet_bounds', {
        x: Math.max(0, position.x - leftExtra),
        y: Math.max(0, position.y - topExtra),
        width: baseW + leftExtra + rightExtra,
        height: baseH + topExtra + bottomExtra,
      });
    };

    syncBounds();
    const interval = setInterval(syncBounds, 500);
    return () => clearInterval(interval);
  }, [position.x, position.y, showPomodoro, showHub, peekSide]);

  const handlePointerDownWrapper = (e) => {
    clickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsJumping(false);
    setIsPetting(false);
    onPointerDown(e);
  };

  // Purring Pets: stroke the cat with your mouse to make it purr (auto-stops when mouse stops)
  const handlePetMouseMove = (e) => {
    if (isDragging || peekSide) return;
    const prev = lastStrokePosRef.current;
    lastStrokePosRef.current = { x: e.clientX, y: e.clientY };
    if (!prev) return;

    const step = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    strokeAccumRef.current += step;

    if (strokeAccumRef.current >= 18) {
      if (!isPetting) {
        setIsPetting(true);
      }
      const now = Date.now();
      if (now - lastPurrSoundRef.current > 900) {
        lastPurrSoundRef.current = now;
        soundFX.playPurr();
      }
      clearTimeout(pettingTimeoutRef.current);
      pettingTimeoutRef.current = setTimeout(() => {
        setIsPetting(false);
        strokeAccumRef.current = 0;
      }, 1100);
    }
  };

  const handlePetMouseLeave = () => {
    lastStrokePosRef.current = null;
    strokeAccumRef.current = 0;
    clearTimeout(pettingTimeoutRef.current);
    setIsPetting(false);
  };

  const handleClick = (e) => {
    const dx = Math.abs(e.clientX - clickStartRef.current.x);
    const dy = Math.abs(e.clientY - clickStartRef.current.y);
    const timeDiff = Date.now() - clickStartRef.current.time;

    if (dx > 12 || dy > 12 || timeDiff > 650) {
      return;
    }

    const namePrefix = formatNamePrefix();

    // If the cat is peeking from the side edge, clicking it pops it out into the room!
    if (peekSide) {
      soundFX.playMeow();
      soundFX.playJump();
      spawnBurst(['🐾', '✨', '♥']);
      speak(`Peek-a-boo! ${namePrefix}I'm back! 🐾`, 2600, 'happy');
      setPosition((prev) => ({
        x: peekSide === 'left' ? 140 : Math.max(100, window.innerWidth - 200),
        y: prev.y,
      }));
      setIsJumping(true);
      setTimeout(() => {
        setIsJumping(false);
      }, 1100);
      return;
    }

    const lines = [
      `Meow! ${namePrefix}you got this! 🐾`,
      'Prrr... ♥',
      'Got any fish treats? 🐟',
      `${namePrefix}remember to blink & breathe! ✨`,
      'Boop! 🐱',
    ];
    soundFX.playMeow();
    spawnBurst(['♥', '♪']);
    speak(lines[Math.floor(Math.random() * lines.length)], 2600, 'happy');
    setIsJumping(true);
    setTimeout(() => {
      setIsJumping(false);
    }, 1100);
  };

  const feedFishTreat = (e) => {
    if (e) e.stopPropagation();
    setIsEating(true);
    setAffection((a) => a + 1);
    soundFX.playTreat();
    spawnBurst(['🐟', '♥', '✨']);
    speak(
      `Yum!! Thank you ${settings.userName || 'friend'}! 🐟`,
      2400,
      'happy'
    );
    setTimeout(() => {
      setIsEating(false);
    }, 1500);
  };

  // Central Priority State Machine
  useEffect(() => {
    if (isDragging) {
      setPetState('DRAGGING');
      setMessage(
        isShaking ? 'Wobble wobble!! 🍡' : 'Mochi stretch~ Put me down!'
      );
      setSpeechMood('alert');
      return;
    }

    if (activeReminderType === 'STRETCH') {
      setPetState('STRETCH_REMINDER');
      return;
    }

    if (activeReminderType === 'WATER') {
      setPetState('WATER_REMINDER');
      return;
    }

    if (activeReminderType === 'CUSTOM') {
      setPetState('MESSAGE_REMINDER');
      return;
    }

    if (isEating) {
      setPetState('EATING');
      return;
    }

    if (isJumping) {
      setPetState('AGENT_DONE_JUMP');
      return;
    }

    // Peeking Mode: when placed on the left or right edge of the screen
    if (peekSide) {
      setPetState('PEEKING');
      if (!isTalking) {
        setMessage('');
      }
      return;
    }

    // Focus Mode: when Pomodoro timer is running, stays in focus mode while studying/working!
    if (showPomodoro && isPomodoroRunning) {
      setPetState('FOCUS_MODE');
      if (!isTalking) {
        setMessage('');
      }
      return;
    }

    if (isPetting) {
      setPetState('PETTING');
      if (!isTalking) {
        setMessage('Purrr... ♥');
        setSpeechMood('happy');
      }
      return;
    }

    if (isPouncing) {
      setPetState('MOUSE_HUNT');
      return;
    }

    if (wpm >= 60) {
      setPetState('OVERHEATING');
      setMessage(`OVERHEAT! ${wpm} WPM 🔥`);
      setSpeechMood('alert');
      return;
    }

    if (wpm > 0) {
      setPetState('KNEADING');
      setMessage(`Kneading... ${wpm} WPM`);
      setSpeechMood('normal');
      return;
    }

    if (isScrolling) {
      setPetState('PAPER_UNROLL');
      if (!isTalking) {
        setMessage(`Unrolling toilet paper! ${paperLengthCm} cm 🧻`);
        setSpeechMood('normal');
      }
      return;
    }

    if (isThinking) {
      setPetState('THINKING');
      return;
    }

    // Sleeping & Grooming: triggers when idle (no interaction with the cat)
    if (isIdle || idleTime >= 10000) {
      setPetState('SLEEPING');
      if (!isTalking) {
        setMessage('');
      }
      return;
    }

    if (idleTime >= 4000) {
      setPetState('GROOMING');
      if (!isTalking) {
        setMessage('');
      }
      return;
    }

    setPetState('IDLE');
    if (!isTalking) {
      setMessage('');
    }
  }, [
    isDragging,
    isShaking,
    activeReminderType,
    isEating,
    isPouncing,
    isJumping,
    wpm,
    isScrolling,
    paperLengthCm,
    isPetting,
    isThinking,
    showPomodoro,
    isPomodoroRunning,
    peekSide,
    isIdle,
    idleTime,
    isTalking,
  ]);

  return (
    <div
      className={`pet-container ${
        peekSide === 'left'
          ? 'edge-left'
          : peekSide === 'right'
          ? 'edge-right'
          : ''
      }`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        opacity: petState === 'SLEEPING' ? 0.94 : 1,
        transition: isDragging
          ? 'none'
          : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease',
      }}
      onPointerDown={handlePointerDownWrapper}
      onMouseMove={handlePetMouseMove}
      onMouseLeave={handlePetMouseLeave}
      onClick={handleClick}
    >
      <div className="affection-bar">
        {settings.userName ? `${settings.userName}'s Cat` : 'Comnyang'} · Lv.
        {affection} ♥
      </div>

      {/* 15. Fixed Message: Pinned Note above Comnyang's head */}
      {settings.fixedMessage && (
        <div className="fixed-message-pin">📌 {settings.fixedMessage}</div>
      )}

      <SpeechBubble message={message} mood={speechMood} />

      {/* 13. Pomodoro Timer floating next to Comnyang */}
      {showPomodoro && (
        <PomodoroTimer
          onRunningChange={setIsPomodoroRunning}
          onCompleteSession={(completedMode) => {
            if (completedMode !== 'break') {
              feedFishTreat();
              speak(
                `${formatNamePrefix()}Focus complete! Take a break 🍅`,
                4000,
                'happy'
              );
            } else {
              speak(
                `${formatNamePrefix()}Break over! Let's focus 💪`,
                3500,
                'normal'
              );
            }
          }}
          onClose={() => {
            setIsPomodoroRunning(false);
            setShowPomodoro(false);
          }}
        />
      )}

      {/* Comnyang Studio Hub */}
      {showHub && (
        <ComnyangHub
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          activeAppName={activeAppName}
          inferredActivity={inferredActivity}
          onTriggerTestReminder={handleTriggerReminder}
          onSimulateAiAgent={triggerAgentSimulation}
          onClose={() => setShowHub(false)}
        />
      )}

      <ParticleSystem petState={petState} burstParticles={burstParticles} />

      <SpriteAnimator
        petState={petState}
        petSpriteRef={petSpriteRef}
        eyeFollowRef={eyeFollowRef}
        gazeFrame={gazeFrame}
        peekSide={peekSide}
        dragTilt={dragTilt}
        stretchFactor={stretchFactor}
        isShaking={isShaking}
        isLanding={isLanding}
        patternId={settings.patternId}
        markings={settings.markings}
      />

      {/* Hover Quick-Action Bar */}
      <div
        className={`pet-quick-menu ${peekSide === 'right' ? 'menu-left' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={`quick-btn ${showHub ? 'active' : ''}`}
          onClick={() => setShowHub((s) => !s)}
          title="Comnyang Studio (Pattern, Name, Reminders, Brain, License)"
        >
          🎨
        </button>
        <button
          className={`quick-btn ${showPomodoro ? 'active' : ''}`}
          onClick={() => setShowPomodoro((s) => !s)}
          title="Toggle Pomodoro Timer"
        >
          🍅
        </button>
        <button
          className="quick-btn"
          onClick={feedFishTreat}
          title="Feed Fish Treat"
        >
          🐟
        </button>
        <button
          className="quick-btn"
          onClick={() => {
            const muted = soundFX.toggleMute();
            setIsMuted(muted);
          }}
          title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </div>
  );
};

export default Pet;
