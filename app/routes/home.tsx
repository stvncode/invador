import { Game } from '../components/Game'
import { GameMenu } from '../components/GameMenu'
import { useGameStore } from '../lib/game/store'
import type { Route } from "./+types/home"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Space Invaders" },
    { name: "description", content: "Classic Space Invaders game built with React Router v7" },
  ]
}

export default function Home() {
  const gameState = useGameStore(state => state.gameState)
  
  // Show menu by default, game when started
  if (gameState === 'playing' || gameState === 'paused' || gameState === 'gameOver') {
    return <Game />
  }
  
  return <GameMenu />
}

// Temporary development helper - add settings link
export function DevSettingsLink() {
  return (
    <div className="fixed top-4 left-4 z-50">
      <a
        href="/settings"
        className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-medium hover:bg-cyan-400 transition-colors"
      >
        ⚙️ Settings
      </a>
    </div>
  )
}