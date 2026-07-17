import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { MINIGAME_REWARDS } from '../../game/economy'
import { remainingRewardedPlays } from '../../game/engine'
import type { MinigameId } from '../../game/types'
import { useUiSound } from '../useUiSound'

type Game = MinigameId

function PlaysLeftBadge({ game }: { game: Game }) {
  const save = useGame((s) => s.save)
  if (!save) return null
  const left = remainingRewardedPlays(save, game, Date.now())
  return (
    <span className="mg-plays-left">
      {left > 0 ? `${left} récompense${left > 1 ? 's' : ''} aujourd’hui` : 'Pour le fun (déjà récompensé)'}
    </span>
  )
}

export function MiniGamesScreen() {
  const [game, setGame] = useState<Game | null>(null)
  const ui = useUiSound()
  const open = (g: Game) => {
    ui.click()
    setGame(g)
  }
  if (game === 'rps') return <Rps onBack={() => setGame(null)} />
  if (game === 'memory') return <Memory onBack={() => setGame(null)} />
  if (game === 'catch') return <Catch onBack={() => setGame(null)} />
  return (
    <div className="minigames">
      <h3>Mini-jeux</h3>
      <p className="minigames-sub">Gagnez des pièces pour gâter votre Minigotchi.</p>
      <button className="mg-card" onClick={() => open('rps')}>
        <img src="/assets/icons/mg-rps.svg" alt="" width={32} height={32} />
        <span className="mg-card-text">
          Pierre-feuille-ciseaux
          <PlaysLeftBadge game="rps" />
        </span>
      </button>
      <button className="mg-card" onClick={() => open('memory')}>
        <img src="/assets/icons/mg-memory.svg" alt="" width={32} height={32} />
        <span className="mg-card-text">
          Memory
          <PlaysLeftBadge game="memory" />
        </span>
      </button>
      <button className="mg-card" onClick={() => open('catch')}>
        <img src="/assets/icons/mg-catch.svg" alt="" width={32} height={32} />
        <span className="mg-card-text">
          Attrape-tout !
          <PlaysLeftBadge game="catch" />
        </span>
      </button>
    </div>
  )
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mg-backbar">
      <button onClick={onBack}>← Retour</button>
      <h3>{title}</h3>
    </div>
  )
}

// ---------------------------------------------------------------- RPS ------
const RPS_MOVES = ['rock', 'paper', 'scissors'] as const
type RpsMove = (typeof RPS_MOVES)[number]
const RPS_LABEL: Record<RpsMove, string> = { rock: 'Pierre', paper: 'Feuille', scissors: 'Ciseaux' }
const beats: Record<RpsMove, RpsMove> = { rock: 'scissors', paper: 'rock', scissors: 'paper' }

function Rps({ onBack }: { onBack: () => void }) {
  const dispatch = useGame((s) => s.dispatch)
  const [result, setResult] = useState<string | null>(null)

  const playMove = (move: RpsMove) => {
    const cpu = RPS_MOVES[Math.floor(Math.random() * 3)]
    let outcome: keyof typeof MINIGAME_REWARDS.rps
    if (cpu === move) outcome = 'draw'
    else if (beats[move] === cpu) outcome = 'win'
    else outcome = 'lose'
    const coins = MINIGAME_REWARDS.rps[outcome]
    setResult(
      `${RPS_LABEL[move]} contre ${RPS_LABEL[cpu]} — ${
        outcome === 'win' ? 'Gagné !' : outcome === 'draw' ? 'Égalité.' : 'Perdu…'
      }`,
    )
    if (coins > 0) dispatch({ type: 'earnCoins', amount: coins, source: 'rps' })
  }

  return (
    <div className="minigame">
      <BackBar title="Pierre-feuille-ciseaux" onBack={onBack} />
      <div className="rps-buttons">
        {RPS_MOVES.map((m) => (
          <button key={m} className="rps-btn" onClick={() => playMove(m)}>
            <img src={`/assets/icons/rps-${m}.svg`} alt={RPS_LABEL[m]} width={40} height={40} />
            {RPS_LABEL[m]}
          </button>
        ))}
      </div>
      {result && <p className="mg-result">{result}</p>}
    </div>
  )
}

// ------------------------------------------------------------- Memory ------
const MEMORY_ICONS = ['star', 'heart', 'moon', 'leaf', 'fish', 'bone']

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Memory({ onBack }: { onBack: () => void }) {
  const dispatch = useGame((s) => s.dispatch)
  const [cards] = useState(() => shuffled([...MEMORY_ICONS, ...MEMORY_ICONS]))
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [tries, setTries] = useState(0)
  const [done, setDone] = useState(false)

  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.includes(i) || done) return
    const next = [...flipped, i]
    setFlipped(next)
    if (next.length === 2) {
      setTries((t) => t + 1)
      const [a, b] = next
      if (cards[a] === cards[b]) {
        const newMatched = [...matched, a, b]
        setMatched(newMatched)
        setFlipped([])
        if (newMatched.length === cards.length) {
          const reward =
            tries + 1 <= 8
              ? MINIGAME_REWARDS.memory.perfect
              : tries + 1 <= 12
                ? MINIGAME_REWARDS.memory.good
                : MINIGAME_REWARDS.memory.ok
          setDone(true)
          dispatch({ type: 'earnCoins', amount: reward, source: 'memory' })
        }
      } else {
        setTimeout(() => setFlipped([]), 700)
      }
    }
  }

  return (
    <div className="minigame">
      <BackBar title="Memory" onBack={onBack} />
      <p className="mg-result">Essais : {tries}</p>
      <div className="memory-grid">
        {cards.map((icon, i) => {
          const shown = flipped.includes(i) || matched.includes(i)
          return (
            <button key={i} className={`memory-card${shown ? ' memory-shown' : ''}`} onClick={() => flip(i)}>
              {shown && <img src={`/assets/icons/mem-${icon}.svg`} alt="" width={26} height={26} />}
            </button>
          )
        })}
      </div>
      {done && <p className="mg-result">Bravo, toutes les paires trouvées !</p>}
    </div>
  )
}

// -------------------------------------------------------------- Catch ------
const CATCH_DURATION_S = 25

interface Falling {
  id: number
  x: number // 0..100
  y: number // 0..100
  bad: boolean
}

function Catch({ onBack }: { onBack: () => void }) {
  const dispatch = useGame((s) => s.dispatch)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(CATCH_DURATION_S)
  const [items, setItems] = useState<Falling[]>([])
  const [basketX, setBasketX] = useState(50)
  const [finished, setFinished] = useState(false)
  const seq = useRef(0)
  const scoreRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const spawn = setInterval(() => {
      seq.current += 1
      setItems((it) => [
        ...it,
        { id: seq.current, x: 8 + Math.random() * 84, y: 0, bad: Math.random() < 0.25 },
      ])
    }, 700)
    const fall = setInterval(() => {
      setItems((it) =>
        it
          .map((f) => ({ ...f, y: f.y + 4 }))
          .filter((f) => {
            if (f.y >= 88) {
              setBasketX((bx) => {
                if (Math.abs(f.x - bx) < 14) {
                  const delta = f.bad ? -3 : 2
                  scoreRef.current = Math.max(0, scoreRef.current + delta)
                  setScore(scoreRef.current)
                }
                return bx
              })
              return false
            }
            return true
          }),
      )
    }, 90)
    const clock = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false)
          setFinished(true)
          setItems([])
          const coins = MINIGAME_REWARDS.catch(scoreRef.current)
          if (coins > 0) dispatch({ type: 'earnCoins', amount: coins, source: 'catch' })
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      clearInterval(spawn)
      clearInterval(fall)
      clearInterval(clock)
    }
  }, [running, dispatch])

  const start = () => {
    scoreRef.current = 0
    setScore(0)
    setTimeLeft(CATCH_DURATION_S)
    setItems([])
    setFinished(false)
    setRunning(true)
  }

  return (
    <div className="minigame">
      <BackBar title="Attrape-tout !" onBack={onBack} />
      <p className="mg-result">
        Score : {score} · Temps : {timeLeft}s
      </p>
      <div
        className="catch-area"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setBasketX(((e.clientX - rect.left) / rect.width) * 100)
        }}
      >
        {items.map((f) => (
          <img
            key={f.id}
            src={`/assets/icons/${f.bad ? 'catch-bad' : 'catch-good'}.svg`}
            alt=""
            className="catch-item"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
            width={22}
            height={22}
          />
        ))}
        <img src="/assets/icons/catch-basket.svg" alt="" className="catch-basket" style={{ left: `${basketX}%` }} width={44} height={30} />
        {!running && (
          <button className="primary catch-start" onClick={start}>
            {finished ? `Rejouer (score ${score})` : 'Démarrer'}
          </button>
        )}
      </div>
      <p className="mg-hint">Attrapez les fruits, évitez les cailloux !</p>
    </div>
  )
}
