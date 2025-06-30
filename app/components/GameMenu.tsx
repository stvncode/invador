import { motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { soundManager } from '../lib/game/audio'
import { useGameStore } from '../lib/game/store'
// Import components individually to avoid circular imports
import { Button } from './ui/button'
import { SoundToggle } from './ui/sound-toggle'
import { useToast } from './ui/toast'

export const GameMenu: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const startGame = useGameStore(state => state.startGame)
  const resetGame = useGameStore(state => state.resetGame)

  // Initialize audio and start background music
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await soundManager.init()
        soundManager.startBackgroundMusic()
        setAudioInitialized(true)
      } catch (error) {
        console.warn('Failed to initialize audio:', error)
        // Don't show toast for audio init failure as it's not critical
      }
    }

    if (!audioInitialized) {
      initializeAudio()
    }
  }, [audioInitialized])

  const handleStartGame = () => {
    try {
      setIsLoading(true)
      resetGame()
      startGame()
      navigate('/')
      addToast({
        type: 'info',
        title: 'Game Starting',
        description: 'Prepare for battle!',
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to start game:', error)
      addToast({
        type: 'error',
        title: 'Failed to Start Game',
        description: 'Please try again',
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettings = () => {
    navigate('/settings')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900 text-white relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-md mx-auto px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="mb-8"
        >
          <div className="mb-12">
            <img 
              src="/logo.png" 
              alt="Space Invaders Logo"
              className="mx-auto max-w-full h-auto rounded-lg"
              style={{ 
                imageRendering: 'pixelated',
                maxHeight: '200px',
                width: 'auto'
              }}
              onError={(e) => {
                // Hide image and show text fallback if logo fails to load
                e.currentTarget.style.display = 'none'
                const fallback = e.currentTarget.nextElementSibling as HTMLElement
                if (fallback) fallback.style.display = 'block'
              }}
            />
            {/* Text fallback - hidden by default */}
            <div className="hidden">
              <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                INVADORS
              </h1>
              <p className="text-cyan-300 text-lg mt-2">Space Combat Simulator</p>
            </div>
          </div>
        </motion.div>

        {/* Menu Buttons */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button
            onClick={handleStartGame}
            disabled={isLoading}
            size="lg"
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-bold text-lg py-4"
          >
            {isLoading ? 'Starting...' : '🚀 START GAME'}
          </Button>
          
          <Button
            onClick={handleSettings}
            variant="outline"
            size="lg"
            className="w-full border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black font-bold text-lg py-4"
          >
            ⚙️ SETTINGS
          </Button>
        </motion.div>

        {/* Sound Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex justify-center mt-8"
        >
          <SoundToggle />
        </motion.div>

        {/* Version Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center"
        >
          <p className="text-gray-500 text-sm">
            v1.0.0 | Built with React Router v7 & Effect-TS
          </p>
        </motion.div>
      </div>

      {/* Floating Particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, -100],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
} 