import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import GameScene from './game/GameScene'

function App() {
  const gameContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gameContainer.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1080,
      height: 1920,
      parent: gameContainer.current,
      backgroundColor: '#87CEEB',
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    return () => {
      game.destroy(true)
    }
  }, [])

  return (
    <div
      ref={gameContainer}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#111',
      }}
    />
  )
}

export default App
