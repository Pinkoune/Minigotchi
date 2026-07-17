import type { PetState } from '../../game/types'
import { currentMood, type Mood } from '../../game/personality'

// All pet art is original inline SVG (see public/assets/ATTRIBUTIONS.md).
// Each form defines a body silhouette + palette; the face is drawn from the
// current mood so every form gets idle/happy/sad/sick/sleepy/eating states.

interface FormArt {
  body: JSX.Element
  faceY: number
  faceScale?: number
}

const ART: Record<string, FormArt> = {
  egg: {
    faceY: 0,
    body: (
      <g>
        <ellipse cx="60" cy="70" rx="34" ry="42" fill="#f6ead8" stroke="#c9b28f" strokeWidth="3" />
        <circle cx="48" cy="55" r="5" fill="#c9b28f" />
        <circle cx="72" cy="80" r="7" fill="#d8c3a0" />
        <circle cx="58" cy="92" r="4" fill="#c9b28f" />
      </g>
    ),
  },
  blobby: {
    faceY: 62,
    body: (
      <g>
        <path
          d="M60 26 C90 26 96 58 94 78 C92 98 78 106 60 106 C42 106 28 98 26 78 C24 58 30 26 60 26 Z"
          fill="#8fd3f4"
          stroke="#5ba8cc"
          strokeWidth="3"
        />
        <ellipse cx="60" cy="100" rx="26" ry="6" fill="#5ba8cc" opacity="0.25" />
      </g>
    ),
  },
  roundy: {
    faceY: 60,
    body: (
      <g>
        <circle cx="60" cy="68" r="40" fill="#ffd66b" stroke="#d9a832" strokeWidth="3" />
        <circle cx="34" cy="38" r="9" fill="#ffd66b" stroke="#d9a832" strokeWidth="3" />
        <circle cx="86" cy="38" r="9" fill="#ffd66b" stroke="#d9a832" strokeWidth="3" />
        <ellipse cx="42" cy="80" rx="7" ry="5" fill="#f2a65a" opacity="0.6" />
        <ellipse cx="78" cy="80" rx="7" ry="5" fill="#f2a65a" opacity="0.6" />
      </g>
    ),
  },
  spiky: {
    faceY: 64,
    body: (
      <g>
        <path
          d="M60 24 L70 40 L86 34 L84 52 L100 60 L84 68 L88 86 L70 84 L60 104 L50 84 L32 86 L36 68 L20 60 L36 52 L34 34 L50 40 Z"
          fill="#b7e07a"
          stroke="#7ba844"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
    ),
  },
  flutter: {
    faceY: 58,
    body: (
      <g>
        <ellipse className="wing" cx="26" cy="58" rx="16" ry="26" fill="#e8c8f8" stroke="#b48cd4" strokeWidth="2.5" />
        <ellipse className="wing wing-r" cx="94" cy="58" rx="16" ry="26" fill="#e8c8f8" stroke="#b48cd4" strokeWidth="2.5" />
        <ellipse cx="60" cy="66" rx="30" ry="36" fill="#c9a0e8" stroke="#9868c0" strokeWidth="3" />
        <path d="M52 32 Q56 18 50 14 M68 32 Q64 18 70 14" stroke="#9868c0" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  bricky: {
    faceY: 58,
    body: (
      <g>
        <rect x="24" y="30" width="72" height="72" rx="14" fill="#f2a65a" stroke="#c47f38" strokeWidth="3" />
        <rect x="30" y="96" width="18" height="10" rx="4" fill="#c47f38" />
        <rect x="72" y="96" width="18" height="10" rx="4" fill="#c47f38" />
        <path d="M36 30 L44 16 L52 30 M68 30 L76 16 L84 30" fill="#f2a65a" stroke="#c47f38" strokeWidth="3" strokeLinejoin="round" />
      </g>
    ),
  },
  aureli: {
    faceY: 58,
    body: (
      <g>
        <circle cx="60" cy="64" r="38" fill="#ffe08a" stroke="#e0b040" strokeWidth="3" />
        <path
          d="M60 10 L64 22 L76 18 L72 30 L84 32 L74 40"
          fill="none"
          stroke="#e0b040"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M60 10 L56 22 L44 18 L48 30 L36 32 L46 40"
          fill="none"
          stroke="#e0b040"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="60" cy="64" r="44" fill="none" stroke="#ffe08a" strokeWidth="2" opacity="0.5" />
      </g>
    ),
  },
  midori: {
    faceY: 58,
    body: (
      <g>
        <ellipse cx="60" cy="66" rx="36" ry="38" fill="#a8d8a8" stroke="#6faa6f" strokeWidth="3" />
        <ellipse cx="38" cy="34" rx="10" ry="14" fill="#a8d8a8" stroke="#6faa6f" strokeWidth="3" transform="rotate(-20 38 34)" />
        <ellipse cx="82" cy="34" rx="10" ry="14" fill="#a8d8a8" stroke="#6faa6f" strokeWidth="3" transform="rotate(20 82 34)" />
        <path d="M60 104 Q78 100 82 92" stroke="#6faa6f" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  grumbo: {
    faceY: 66,
    body: (
      <g>
        <path
          d="M28 100 C20 70 28 40 60 38 C92 40 100 70 92 100 C80 108 40 108 28 100 Z"
          fill="#b8a8c8"
          stroke="#84708f"
          strokeWidth="3"
        />
        <path d="M40 46 Q46 38 52 44 M68 44 Q74 38 80 46" stroke="#84708f" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  chonko: {
    faceY: 56,
    body: (
      <g>
        <ellipse cx="60" cy="72" rx="46" ry="38" fill="#f8b8c8" stroke="#d8809c" strokeWidth="3" />
        <ellipse cx="60" cy="86" rx="30" ry="16" fill="#fcd8e0" />
        <circle cx="26" cy="42" r="8" fill="#f8b8c8" stroke="#d8809c" strokeWidth="3" />
        <circle cx="94" cy="42" r="8" fill="#f8b8c8" stroke="#d8809c" strokeWidth="3" />
      </g>
    ),
  },
  sagey: {
    faceY: 56,
    body: (
      <g>
        <ellipse cx="60" cy="66" rx="34" ry="38" fill="#c8d8e8" stroke="#8ba0b8" strokeWidth="3" />
        <path d="M42 78 Q50 94 46 104 M78 78 Q70 94 74 104" stroke="#e8eef4" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M48 74 Q60 84 72 74" stroke="#e8eef4" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  creaky: {
    faceY: 60,
    body: (
      <g>
        <path
          d="M34 100 C26 76 30 46 60 42 C90 46 94 76 86 100 C72 106 48 106 34 100 Z"
          fill="#d8c8b0"
          stroke="#a8926f"
          strokeWidth="3"
        />
        <path d="M40 56 L48 60 M80 56 L72 60" stroke="#a8926f" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },
}

function Face({ mood, y, eating }: { mood: Mood; y: number; eating: boolean }) {
  const eyeY = y
  const mouthY = y + 16
  if (mood === 'sleeping') {
    return (
      <g stroke="#3a3a4a" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d={`M40 ${eyeY} q6 3 12 0`} />
        <path d={`M68 ${eyeY} q6 3 12 0`} />
        <path d={`M54 ${mouthY} q6 3 12 0`} opacity="0.6" />
      </g>
    )
  }
  const eyes =
    mood === 'sick' ? (
      <g stroke="#3a3a4a" strokeWidth="3" strokeLinecap="round">
        <path d={`M42 ${eyeY - 4} l8 8 M50 ${eyeY - 4} l-8 8`} />
        <path d={`M70 ${eyeY - 4} l8 8 M78 ${eyeY - 4} l-8 8`} />
      </g>
    ) : (
      <g fill="#3a3a4a">
        <circle cx="46" cy={eyeY} r={mood === 'happy' ? 5 : 4} />
        <circle cx="74" cy={eyeY} r={mood === 'happy' ? 5 : 4} />
        {mood === 'happy' && (
          <g fill="#fff">
            <circle cx="47.5" cy={eyeY - 1.5} r="1.5" />
            <circle cx="75.5" cy={eyeY - 1.5} r="1.5" />
          </g>
        )}
      </g>
    )
  let mouth: JSX.Element
  if (eating) {
    mouth = <ellipse cx="60" cy={mouthY} rx="7" ry="6" fill="#3a3a4a" />
  } else if (mood === 'happy') {
    mouth = <path d={`M50 ${mouthY - 2} q10 10 20 0`} stroke="#3a3a4a" strokeWidth="3" fill="none" strokeLinecap="round" />
  } else if (mood === 'sad' || mood === 'sick' || mood === 'hungry' || mood === 'dirty') {
    mouth = <path d={`M50 ${mouthY + 6} q10 -8 20 0`} stroke="#3a3a4a" strokeWidth="3" fill="none" strokeLinecap="round" />
  } else {
    mouth = <path d={`M52 ${mouthY} h16`} stroke="#3a3a4a" strokeWidth="3" strokeLinecap="round" />
  }
  return (
    <g>
      {eyes}
      {mouth}
    </g>
  )
}

function Accessory({ id }: { id: string }) {
  switch (id) {
    case 'hat-party':
      return (
        <g transform="translate(60 6)">
          <path d="M0 22 L-14 22 L0 -8 L14 22 Z" fill="#ff8fa3" stroke="#d4607a" strokeWidth="2" transform="rotate(8)" />
          <circle cx="1" cy="-8" r="4" fill="#ffd66b" />
        </g>
      )
    case 'hat-crown':
      return (
        <g transform="translate(60 10)">
          <path d="M-16 12 L-16 -2 L-8 6 L0 -8 L8 6 L16 -2 L16 12 Z" fill="#ffd700" stroke="#c8a000" strokeWidth="2" />
        </g>
      )
    case 'bow':
      return (
        <g transform="translate(60 108)">
          <path d="M0 0 L-12 -7 L-12 7 Z M0 0 L12 -7 L12 7 Z" fill="#e5484d" stroke="#b03038" strokeWidth="2" />
          <circle r="3.5" fill="#b03038" />
        </g>
      )
    case 'glasses':
      return (
        <g transform="translate(0 -2)" stroke="#3a3a4a" strokeWidth="2.5" fill="none">
          <circle cx="46" cy="60" r="9" />
          <circle cx="74" cy="60" r="9" />
          <path d="M55 60 h10" />
        </g>
      )
    default:
      return null
  }
}

export function PetSprite({
  pet,
  accessory,
  eating = false,
  size = 150,
}: {
  pet: PetState
  accessory: string | null
  eating?: boolean
  size?: number
}) {
  const art = ART[pet.formId] ?? ART.blobby
  const mood = currentMood(pet)
  const dead = !pet.alive
  const animClass = dead ? 'pet-dead' : mood === 'sleeping' ? 'pet-sleep' : mood === 'happy' ? 'pet-bounce' : 'pet-bob'
  return (
    <svg viewBox="0 0 120 130" width={size} height={size * (130 / 120)} className={`pet ${animClass}`} role="img" aria-label={pet.name}>
      <g className="pet-body">
        {art.body}
        {pet.stage !== 'egg' && <Face mood={dead ? 'sick' : mood} y={art.faceY} eating={eating && !dead} />}
        {pet.stage !== 'egg' && accessory && <Accessory id={accessory} />}
        {pet.sick && !dead && (
          <g className="sick-bubbles" fill="#9ec5e8" opacity="0.9">
            <circle cx="98" cy="40" r="4" />
            <circle cx="106" cy="30" r="6" />
          </g>
        )}
        {mood === 'sleeping' && (
          <g className="zzz" fill="none" stroke="#8ba0b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M96 30 h10 l-10 10 h10" />
            <path d="M108 14 h8 l-8 8 h8" />
          </g>
        )}
      </g>
    </svg>
  )
}
