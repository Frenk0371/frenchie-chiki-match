import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import GameScene from './game/GameScene'
import './App.css'
import './Map.css'

type AppView = 'home' | 'map' | 'game'

const menuItems = [
  { icon: '🗺️', label: 'AVVENTURA', available: true },
  { icon: '🏆', label: 'CLASSIFICHE', available: false },
  { icon: '🐶', label: 'FRENCHIES', available: false },
]

const levelNames = ['Prime mosse', 'Pioggia di punti', 'Raccolta verde', 'Doppia raccolta', 'Sfida di Chiki']

function App() {
  const gameContainer = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<AppView>('home')
  const [notice, setNotice] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [unlockedLevel, setUnlockedLevel] = useState(() => Number(localStorage.getItem('chiki-unlocked-level') || '1'))

  useEffect(() => {
    if (view !== 'game' || !gameContainer.current) return
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1080,
      height: 1920,
      parent: gameContainer.current,
      backgroundColor: '#87CEEB',
      scene: [new GameScene(selectedLevel)],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    })
    return () => game.destroy(true)
  }, [view, selectedLevel])

  useEffect(() => {
    const completed = (event: Event) => {
      const level = (event as CustomEvent<{ level: number }>).detail.level
      setUnlockedLevel(current => {
        const unlocked = Math.max(current, Math.min(5, level + 1))
        localStorage.setItem('chiki-unlocked-level', String(unlocked))
        return unlocked
      })
    }
    window.addEventListener('chiki-level-complete', completed)
    return () => window.removeEventListener('chiki-level-complete', completed)
  }, [])

  const soon = (label: string) => {
    setNotice(`${label}: prossimamente`)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const playLevel = (level: number) => {
    setSelectedLevel(level)
    setView('game')
  }

  if (view === 'game') {
    return <div className="game-shell"><button className="home-back" onClick={() => setView('map')} aria-label="Torna alla mappa">‹</button><div ref={gameContainer} className="game-container" /></div>
  }

  if (view === 'map') {
    return <main className="map-screen"><header className="map-title"><button onClick={() => setView('home')} aria-label="Torna alla home">‹</button><div><small>MONDO 1</small><strong>GIARDINO FIORITO</strong></div><span>⭐ 0/15</span></header><div className="adventure-path">{levelNames.map((name, index) => { const level = index + 1; const locked = level > unlockedLevel; return <div className={`level-stop ${locked ? 'locked' : ''}`} key={level}><button disabled={locked} onClick={() => playLevel(level)}>{locked ? '🔒' : level}</button><span>{locked ? 'Da sbloccare' : name}</span></div> })}</div></main>
  }

  return <main className="home-screen"><div className="sky-glow" /><header className="player-bar"><div className="player"><img src="/chiki-icon.jpeg" alt="Chiki" /><span><strong>Chiki</strong><small>Livello {unlockedLevel}</small></span></div><div className="currencies"><span>❤️ 5</span><span>🪙 1.250</span></div></header><section className="brand-panel" aria-label="Frenchie Chiki Match"><img src="/chiki-icon.jpeg" alt="Icona Frenchie Chiki Match" className="official-icon" /><h1><span>FRENCHIE</span><strong>CHIKI</strong><em>MATCH</em></h1><button className="play-button" onClick={() => setView('map')}>🐾 GIOCA</button></section><nav className="main-menu" aria-label="Menu del gioco">{menuItems.map(item => <button key={item.label} className={item.available ? 'available' : ''} onClick={() => item.available ? setView('map') : soon(item.label)}><span>{item.icon}</span>{item.label}</button>)}</nav><nav className="utility-menu" aria-label="Altre funzioni">{['📅 EVENTI', '✉️ MESSAGGI', '👥 AMICI', '⚙️ IMPOSTAZIONI'].map(item => <button key={item} onClick={() => soon(item.slice(3))}>{item}</button>)}</nav>{notice && <div className="toast" role="status">{notice}</div>}</main>
}

export default App
