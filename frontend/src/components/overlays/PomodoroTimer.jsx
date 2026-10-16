import React, { useState, useEffect } from 'react';
import './Overlays.css';

export default function PomodoroTimer({
  onCompleteSession,
  onRunningChange,
  onClose,
}) {
  const [mode, setMode] = useState('focus'); // 'focus' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (onRunningChange) {
      onRunningChange(isRunning);
    }
    return () => {
      if (onRunningChange) onRunningChange(false);
    };
  }, [isRunning, onRunningChange]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (onCompleteSession) {
            onCompleteSession(mode);
          }
          const nextMode = mode === 'focus' ? 'break' : 'focus';
          setMode(nextMode);
          return nextMode === 'focus' ? 25 * 60 : 5 * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, mode, onCompleteSession]);

  const switchMode = (newMode) => {
    setIsRunning(true);
    setMode(newMode);
    if (newMode === 'focus') setSecondsLeft(25 * 60);
    else if (newMode === 'break') setSecondsLeft(5 * 60);
    else if (newMode === 'quick') setSecondsLeft(10);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div
      className="pomodoro-card"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pomodoro-header">
        <span className="pomodoro-title">
          {mode === 'break' ? '☕ Break' : '🍅 Focus'}
        </span>
        <button className="pomo-close-btn" onClick={onClose} title="Close">
          ×
        </button>
      </div>

      <div className="pomodoro-time">
        {mins}:{secs}
      </div>

      <div className="pomodoro-controls">
        <button
          className={`pomo-btn ${isRunning ? 'active' : ''}`}
          onClick={() => setIsRunning((r) => !r)}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button className="pomo-btn" onClick={() => switchMode('focus')}>
          25m
        </button>
        <button className="pomo-btn" onClick={() => switchMode('break')}>
          5m
        </button>
        <button
          className="pomo-btn"
          onClick={() => switchMode('quick')}
          title="10-second demo timer"
        >
          10s
        </button>
      </div>
    </div>
  );
}
