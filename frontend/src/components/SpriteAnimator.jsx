import React from 'react';
import { CAT_PATTERNS } from './overlays/ComnyangHub';

export const SpriteAnimator = ({
  petState,
  petSpriteRef,
  eyeFollowRef,
  gazeFrame = 4,
  peekSide = null,
  dragTilt = 0,
  stretchFactor = 1,
  isShaking = false,
  isLanding = false,
  patternId = 'black',
  markings = {},
}) => {
  let spriteClass = 'state-eyes-follow';

  switch (petState) {
    case 'POUNCING':
    case 'MOUSE_HUNT':
      spriteClass = 'state-mouse-hunt';
      break;
    case 'DRAGGING':
      spriteClass = 'state-dragging';
      break;
    case 'PETTING':
      spriteClass = 'sprite-petting';
      break;
    case 'KNEADING':
      spriteClass = 'state-typing';
      break;
    case 'OVERHEATING':
      spriteClass = 'state-overheat';
      break;
    case 'PAPER_UNROLL':
      spriteClass = 'state-paper-unroll';
      break;
    case 'THINKING':
      spriteClass = 'state-thinking';
      break;
    case 'FOCUS_MODE':
      spriteClass = 'state-focus-mode';
      break;
    case 'PEEKING':
      spriteClass = `state-peeking ${
        peekSide === 'left' ? 'peek-left' : 'peek-right'
      }`;
      break;
    case 'GROOMING':
      spriteClass = 'state-grooming';
      break;
    case 'SLEEPING':
      spriteClass = 'state-sleeping';
      break;
    case 'JUMPING':
    case 'AGENT_DONE_JUMP':
    case 'EATING':
    case 'WATER_REMINDER':
    case 'MESSAGE_REMINDER':
      spriteClass = 'state-jumping';
      break;
    case 'STRETCH_REMINDER':
      spriteClass = 'state-stretch-reminder';
      break;
    case 'IDLE':
    default:
      spriteClass = 'state-eyes-follow';
      break;
  }

  const patternObj =
    CAT_PATTERNS.find((p) => p.id === patternId) || CAT_PATTERNS[0];

  const isGiantStretch = petState === 'STRETCH_REMINDER';
  const isEyeFollowIdle = petState === 'IDLE';

  return (
    <div
      ref={petSpriteRef}
      className={`pet-flipper ${isGiantStretch ? 'stretch-grow-mode' : ''}`}
      style={{
        transform: isGiantStretch ? 'scale(2.25)' : 'scale(1.5)',
      }}
    >
      <div
        className={`pet-physics-wrap ${isLanding ? 'mochi-landing' : ''} ${
          isShaking ? 'mochi-shake-wobble' : ''
        }`}
        style={{
          transform: `rotate(${dragTilt}deg) scaleY(${stretchFactor})`,
        }}
      >
        {/* Drink Water Reminder Badge */}
        {petState === 'WATER_REMINDER' && (
          <div className="water-cup-badge">💧🥤</div>
        )}

        <div ref={eyeFollowRef} className="pet-eye-follow-layer">
          <div
            className={`pet-sprite ${spriteClass}`}
            style={{
              filter: patternObj.filter,
              ...(isEyeFollowIdle
                ? {
                    backgroundPositionX: `calc(var(--frame-width) * -${gazeFrame})`,
                  }
                : {}),
            }}
          />

          {isEyeFollowIdle && (
            <div className="idle-customization-layer">
              {markings?.blush && (
                <>
                  <span className="pixel-blush left" />
                  <span className="pixel-blush right" />
                </>
              )}
              {markings?.stripes && <span className="pixel-forehead-stripe" />}
              {markings?.calicoPatch && <span className="pixel-calico-spot" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


