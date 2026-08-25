import React from 'react';

export const SpriteAnimator = ({ petState, petSpriteRef }) => {
  let spriteClass = 'sprite-idle';

  switch (petState) {
    case 'ROAMING':
    case 'DRAGGING':
      spriteClass = 'sprite-walk';
      break;
    case 'PETTING':
      spriteClass = 'sprite-petting';
      break;
    case 'KNEADING':
      spriteClass = 'sprite-kneading';
      break;
    case 'OVERHEATING':
      spriteClass = 'sprite-overheating';
      break;
    case 'THINKING':
      spriteClass = 'sprite-thinking';
      break;
    case 'IDLE':
    default:
      spriteClass = 'sprite-idle';
      break;
  }

  return (
    <div 
      ref={petSpriteRef}
      className={`pet-sprite-container ${spriteClass}`}
      style={{ transform: 'scaleX(1) scale(1.5)' }} // Base transform, overridden by rAF in Pet.jsx
    />
  );
};
