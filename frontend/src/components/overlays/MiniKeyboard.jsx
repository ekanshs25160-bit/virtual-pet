import React from 'react';
import './Overlays.css';

export default function MiniKeyboard({ isOverheating, wpm }) {
  return (
    <div className={`mini-keyboard-wrapper ${isOverheating ? 'overheating' : ''}`}>
      <div className="keyboard-base">
        <div className="keycap-row">
          <span className="keycap active" />
          <span className="keycap" />
          <span className="keycap active" />
          <span className="keycap" />
        </div>
        <div className="keycap-row">
          <span className="keycap" />
          <span className="keycap active" />
          <span className="keycap spacebar active" />
          <span className="keycap" />
        </div>
      </div>
      {wpm > 0 && <div className="wpm-indicator">{wpm} WPM</div>}
    </div>
  );
}
