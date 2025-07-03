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
  const [musicStarted, setMusicStarted] = useState(false)
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const startGame = useGameStore(state => state.startGame)
  const resetGame = useGameStore(state => state.resetGame)
  const stats = useGameStore(state => state.stats)
  const getTopScores = useGameStore(state => state.getTopScores)
  const [showStats, setShowStats] = useState(false)

  // Initialize audio but don't start music yet (browser restrictions)
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await soundManager.init()
        setAudioInitialized(true)
        console.log('Audio system initialized successfully')
      } catch (error) {
        console.warn('Failed to initialize audio:', error)
        setAudioInitialized(true) // Continue anyway
      }
    }

    if (!audioInitialized) {
      initializeAudio()
    }
  }, [audioInitialized])

  // Start background music after first user interaction
  const startBackgroundMusic = async () => {
    if (audioInitialized && !musicStarted) {
      try {
        soundManager.startBackgroundMusic()
        setMusicStarted(true)
        console.log('Background music started')
      } catch (error) {
        console.warn('Failed to start background music:', error)
        // Don't show error to user for music - it's not critical
      }
    }
  }

  // Get best score and stats
  const topScores = getTopScores(5)
  const bestScore = topScores.length > 0 ? topScores[0].score : 0

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleStartGame = async () => {
    try {
      setIsLoading(true)
      
      // Start music on user interaction
      await startBackgroundMusic()
      
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

  const handleSettings = async () => {
    // Start music on user interaction
    await startBackgroundMusic()
    navigate('/settings')
  }

  return (
    <div 
      className="flex items-center justify-center min-h-screen text-white relative overflow-hidden"
      style={{
        backgroundImage: 'url(/home-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        backgroundColor: '#000000' // Fallback color
      }}
    >
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

        {/* Best Score Display */}
        {bestScore > 0 && (
          <motion.div
            className="bg-black/70 rounded-lg p-4 border border-yellow-500/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-yellow-400 text-sm font-semibold mb-1">🏆 BEST SCORE</div>
            <div className="text-white text-2xl font-bold">
              {bestScore.toLocaleString()}
            </div>
            {stats.highestLevel > 0 && (
              <div className="text-gray-400 text-xs mt-1">
                Highest Level: {stats.highestLevel}
              </div>
            )}
          </motion.div>
        )}

        {/* Menu Buttons */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={handleStartGame}
              disabled={isLoading}
              size="lg"
              className="w-full h-16 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold text-xl py-6 shadow-2xl shadow-purple-500/30 border-2 border-purple-400/50 backdrop-blur-sm relative overflow-hidden group"
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {/* Button content */}
              <span className="relative z-10 flex items-center justify-center">
                <span>{isLoading ? 'Starting...' : 'START GAME'}</span>
              </span>
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={() => setShowStats(!showStats)}
              variant="outline"
              size="lg"
              className="w-full h-16 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:via-blue-500/30 hover:to-indigo-500/30 border-2 border-cyan-400/50 text-cyan-300 hover:text-cyan-200 font-bold text-xl py-6 shadow-2xl shadow-cyan-500/20 backdrop-blur-md relative overflow-hidden group"
            >
              {/* Animated border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-400/20 to-indigo-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Button content */}
              <span className="relative z-10 flex items-center justify-center">
                <span>📊 STATISTICS</span>
              </span>
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={handleSettings}
              variant="outline"
              size="lg"
              className="w-full h-16 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 hover:from-purple-500/30 hover:via-pink-500/30 hover:to-red-500/30 border-2 border-purple-400/50 text-purple-300 hover:text-purple-200 font-bold text-xl py-6 shadow-2xl shadow-purple-500/20 backdrop-blur-md relative overflow-hidden group"
            >
              {/* Animated border effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-red-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Button content */}
              <span className="relative z-10 flex items-center justify-center">
                <span>⚙️ SETTINGS</span>
              </span>
            </Button>
          </motion.div>
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

        {/* Statistics Panel */}
        {showStats && (
          <motion.div
            className="bg-black/80 rounded-lg p-6 border border-cyan-500/50"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-cyan-400 mb-4">📈 Your Stats</h3>
            
            {/* High Scores */}
            {topScores.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-yellow-400 mb-2">🏆 High Scores</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {topScores.map((score, index) => (
                    <div key={score.id} className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        #{index + 1} {score.playerName}
                      </span>
                      <span className="text-yellow-400">
                        {score.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-black/50 rounded p-3 border border-red-500/30">
                <div className="text-red-400 font-semibold">Enemies Destroyed</div>
                <div className="text-white text-lg font-bold">{stats.totalEnemiesDestroyed}</div>
              </div>
              <div className="bg-black/50 rounded p-3 border border-blue-500/30">
                <div className="text-blue-400 font-semibold">Shots Fired</div>
                <div className="text-white text-lg font-bold">{stats.totalBulletsFired}</div>
              </div>
              <div className="bg-black/50 rounded p-3 border border-green-500/30">
                <div className="text-green-400 font-semibold">Power-ups</div>
                <div className="text-white text-lg font-bold">{stats.totalPowerUpsCollected}</div>
              </div>
              <div className="bg-black/50 rounded p-3 border border-purple-500/30">
                <div className="text-purple-400 font-semibold">Playtime</div>
                <div className="text-white text-lg font-bold">{formatTime(stats.totalPlayTime)}</div>
              </div>
            </div>

            {stats.totalBulletsFired > 0 && (
              <div className="mt-4 bg-black/50 rounded p-3 border border-yellow-500/30">
                <div className="text-yellow-400 font-semibold">Best Accuracy</div>
                <div className="text-white text-lg font-bold">
                  {Math.round((stats.totalEnemiesDestroyed / stats.totalBulletsFired) * 100)}%
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div 
          className="text-gray-400 text-sm space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p>🎮 Use ARROW KEYS to move, SPACE to shoot</p>
          <p>🚀 Collect power-ups to upgrade your ship</p>
          <p>⚡ Press B to activate special abilities</p>
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