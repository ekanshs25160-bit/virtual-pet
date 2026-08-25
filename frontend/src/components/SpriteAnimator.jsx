import React from 'react';

export const SpriteAnimator = ({ petState, petSpriteRef }) => {
  let spriteClass = 'state-idle';

  switch (petState) {
    case 'ROAMING':
    case 'DRAGGING':
      spriteClass = 'state-walking';
      break;
    case 'PETTING':
      spriteClass = 'sprite-petting'; // Left this as sprite-petting because it wasn't in snippet
      break;
    case 'KNEADING':
      spriteClass = 'state-typing';
      break;
    case 'OVERHEATING':
      spriteClass = 'state-overheat';
      break;
    case 'THINKING':
      spriteClass = 'state-thinking';
      break;
    case 'JUMPING':
      spriteClass = 'state-jumping';
      break;
    case 'IDLE':
    default:
      spriteClass = 'state-idle';
      break;
  }

  return (
    <div 
      ref={petSpriteRef}
      className={`pet-sprite ${spriteClass}`}
      style={{ transform: 'scaleX(1) scale(1.5)' }} // Base transform, overridden by rAF in Pet.jsx
    />
  );
};
