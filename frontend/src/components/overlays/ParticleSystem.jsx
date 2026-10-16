import React from 'react';
import './Overlays.css';

const STATE_PARTICLES = {
  PETTING: ['♥', '♪'],
  OVERHEATING: ['💦', '🔥', '💢'],
  THINKING: ['💡', '✨'],
  EATING: ['♥', '🐟', '✨'],
  JUMPING: ['✨', '♪', '♥'],
  AGENT_DONE_JUMP: ['🎉', '✨', '♥'],
  STRETCH_REMINDER: ['🧘', '✨'],
  WATER_REMINDER: ['💧', '🥤', '💧'],
  MESSAGE_REMINDER: ['🔔', '❗', '🐾'],
};

export default function ParticleSystem({ petState, burstParticles = [] }) {
  const ambient = STATE_PARTICLES[petState] || [];

  return (
    <div className="particle-layer">
      {ambient.map((symbol, idx) => (
        <span
          key={`${petState}-${idx}`}
          className={`particle ambient-p-${idx}`}
        >
          {symbol}
        </span>
      ))}
      {burstParticles.map((p) => (
        <span
          key={p.id}
          className="particle burst-particle"
          style={{
            left: `${p.offsetX}px`,
            top: `${p.offsetY}px`,
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}
