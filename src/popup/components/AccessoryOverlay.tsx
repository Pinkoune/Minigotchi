// Cosmetic accessories drawn as a floating overlay above the 3D pet.
// Original SVG art (see public/assets/ATTRIBUTIONS.md).

export function AccessoryOverlay({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 60 40" width={64} height={44} className={`accessory accessory-${id}`}>
      {id === 'hat-party' && (
        <g transform="translate(30 30)">
          <path d="M0 6 L-13 6 L0 -24 L13 6 Z" fill="#ff8fa3" stroke="#d4607a" strokeWidth="2" transform="rotate(8)" />
          <circle cx="3" cy="-24" r="4" fill="#ffd66b" />
        </g>
      )}
      {id === 'hat-crown' && (
        <g transform="translate(30 22)">
          <path d="M-16 12 L-16 -6 L-8 3 L0 -12 L8 3 L16 -6 L16 12 Z" fill="#ffd700" stroke="#c8a000" strokeWidth="2" />
          <circle cx="0" cy="6" r="2.5" fill="#e5484d" />
        </g>
      )}
      {id === 'bow' && (
        <g transform="translate(30 20)">
          <path d="M0 0 L-14 -8 L-14 8 Z M0 0 L14 -8 L14 8 Z" fill="#e5484d" stroke="#b03038" strokeWidth="2" />
          <circle r="4" fill="#b03038" />
        </g>
      )}
      {id === 'glasses' && (
        <g transform="translate(30 20)" stroke="#3a3a4a" strokeWidth="2.5" fill="rgba(255,255,255,0.35)">
          <circle cx="-11" cy="0" r="8" />
          <circle cx="11" cy="0" r="8" />
          <path d="M-3 0 h6" fill="none" />
        </g>
      )}
    </svg>
  )
}
