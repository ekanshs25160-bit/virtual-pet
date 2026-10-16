import React from 'react';
import './Overlays.css';

export default function SpeechBubble({ message, mood = 'normal' }) {
  if (!message) return null;

  return (
    <div className={`speech-bubble mood-${mood}`}>
      <span className="speech-text">{message}</span>
    </div>
  );
}
