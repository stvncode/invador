import { motion } from 'framer-motion'
import React, { useEffect, useRef } from 'react'
import { spriteManager } from '../lib/game/sprites'
import { useGameStore } from '../lib/game/store'
import { Button } from './ui/button'
import { SoundToggle } from './ui/sound-toggle'

export const GameMenu: React.FC = () => {
  const startGame = useGameStore(state => state.startGame)
  const setGameState = useGameStore(state => state.setGameState)
  const getTopScores = useGameStore(state => state.getTopScores)

  const topScores = getTopScores(5)

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900">
      {/* Sound Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <SoundToggle />
      </div>

      <motion.div 
        className="text-center space-y-8 p-8"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Logo and Title */}
        <div className="space-y-6">
          <GameLogo />
        </div>

        <motion.p 
          className="text-xl text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          A modern twist on the classic arcade game
        </motion.p>

        {/* Menu Buttons */}
        <motion.div 
          className="flex flex-col justify-center items-center space-y-4 mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={startGame}
            className="w-64 h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 transform hover:scale-105 transition-all"
          >
            START GAME
          </Button>

          <Button
            onClick={() => setGameState('settings')}
            variant="outline"
            className="w-64 h-14 text-lg font-semibold border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
          >
            SETTINGS
          </Button>

          <Button
            onClick={() => setGameState('highScores')}
            variant="outline"
            className="w-64 h-14 text-lg font-semibold border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-black transition-all"
          >
            HIGH SCORES
          </Button>
        </motion.div>

        {/* High Scores Preview */}
        {topScores.length > 0 && (
          <motion.div 
            className="mt-12 p-6 bg-black/50 rounded-lg border border-cyan-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <h3 className="text-xl font-bold text-cyan-400 mb-4">TOP SCORES</h3>
            <div className="space-y-2">
              {topScores.slice(0, 3).map((score, index) => (
                <div key={score.id} className="flex justify-between text-gray-300">
                  <span>#{index + 1} {score.playerName}</span>
                  <span className="text-yellow-400">{score.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Controls Info */}
        <motion.div 
          className="mt-8 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p>Use arrow keys to move • Space to shoot • ESC to pause</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

// Logo component using sprite
const GameLogo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Try to draw logo sprite, fallback to pixel art if not available
    if (!spriteManager.drawSprite(ctx, 'logo', 0, 0, canvas.width, canvas.height)) {
      // Fallback: draw a simple space invader shape using rectangles
      ctx.fillStyle = '#00ffff'
      
      // Simple pixel art invader shape
      const scale = 4
      const pixels = [
        [0,0,1,0,0,0,0,0,1,0,0],
        [0,0,0,1,0,0,0,1,0,0,0],
        [0,0,1,1,1,1,1,1,1,0,0],
        [0,1,1,0,1,1,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1],
        [1,0,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,1],
        [0,0,0,1,1,0,1,1,0,0,0],
      ]
      
      const startX = (canvas.width - pixels[0].length * scale) / 2
      const startY = (canvas.height - pixels.length * scale) / 2
      
      pixels.forEach((row, y) => {
        row.forEach((pixel, x) => {
          if (pixel) {
            ctx.fillRect(startX + x * scale, startY + y * scale, scale, scale)
          }
        })
      })
    }
  }, [])

  return (
    <motion.canvas
      ref={canvasRef}
      width={550}
      height={200}
      className="mx-auto"
      style={{ imageRendering: 'pixelated' }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 150 }}
    />
  )
} 