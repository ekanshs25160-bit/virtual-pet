import React from 'react';
import './Overlays.css';

export default function PaperRoll({ paperLengthCm = 0 }) {
  return (
    <div className="paper-roll-wrapper">
      <div className="paper-cylinder">
        <div className="paper-core" />
      </div>
      <div className="paper-sheet">
        <div className="paper-lines" />
      </div>
      <div className="paper-counter">{paperLengthCm} cm</div>
    </div>
  );
}
