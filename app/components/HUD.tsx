import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { getLevelInfo, getScoreForNextLevel } from '../lib/game/levels'
import { useGameStore } from '../lib/game/store'
import { SoundToggle } from './ui/sound-toggle'

export const HUD: React.FC = () => {
  const player = useGameStore(state => state.player)
  const level = useGameStore(state => state.level)
  const enemies = useGameStore(state => state.enemies)
  const gameTime = useGameStore(state => state.gameTime)
  const isBossBattle = useGameStore(state => state.isBossBattle)
  const [displayScore, setDisplayScore] = useState(0)
  
  // Level up notification state
  const [prevLevel, setPrevLevel] = useState(level)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showBossBattle, setShowBossBattle] = useState(false)

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60000)
    const seconds = Math.floor((time % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const healthPercentage = (player.health / player.maxHealth) * 100
  const isLowHealth = healthPercentage <= 30
  const isCriticalHealth = healthPercentage <= 15

  // Animate score counting up
  useEffect(() => {
    const step = Math.ceil((player.score - displayScore) / 10)
    if (displayScore < player.score) {
      const timer = setTimeout(() => {
        setDisplayScore(prev => Math.min(prev + step, player.score))
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [player.score, displayScore])

  // Level up notification effect
  useEffect(() => {
    if (level > prevLevel && prevLevel > 0) {
      console.log(`Level up detected: ${prevLevel} -> ${level}`) // Debug log
      setShowLevelUp(true)
      setPrevLevel(level)
      
      // Hide notification after 2.5 seconds
      const timer = setTimeout(() => {
        console.log('Hiding level up notification') // Debug log
        setShowLevelUp(false)
      }, 2500)
      
      // Cleanup function
      return () => {
        clearTimeout(timer)
      }
    } else if (prevLevel === 0) {
      // Initial level set, don't show notification
      setPrevLevel(level)
    }
  }, [level, prevLevel])

  // Boss battle notification effect
  useEffect(() => {
    if (isBossBattle) {
      setShowBossBattle(true)
      // Keep showing until boss battle ends
    } else {
      setShowBossBattle(false)
    }
  }, [isBossBattle])

  // Also hide notification when level changes again (safety measure)
  useEffect(() => {
    if (showLevelUp && level !== prevLevel) {
      console.log('Force hiding level up notification due to level mismatch') // Debug log
      setShowLevelUp(false)
    }
  }, [level, prevLevel, showLevelUp])

  // Level progression
  const levelInfo = getLevelInfo(level)
  const scoreForNextLevel = getScoreForNextLevel(level)
  const progressToNextLevel = Math.min(100, (player.score / scoreForNextLevel) * 100)
  const pointsToNextLevel = Math.max(0, scoreForNextLevel - player.score)

  // Weapon level indicator (up to level 10)
  const maxWeaponLevel = 10
  const weaponStars = Array.from({ length: maxWeaponLevel }, (_, i) => i < player.weaponLevel)

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-6">
      {/* Level Up Notification at Top */}
      <AnimatePresence mode="wait">
        {showLevelUp && (
          <motion.div
            key={`level-up-${level}`}
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 30, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 mb-4"
          >
            <div className="bg-gradient-to-r from-purple-600/90 to-cyan-600/90 backdrop-blur-xl rounded-lg border border-cyan-400/50 shadow-lg px-6 py-3">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🎉</div>
                <div>
                  <div className="text-lg font-bold text-white">
                    LEVEL {level}
                  </div>
                  <div className="text-sm text-cyan-200">
                    {levelInfo.name} - Enemies grow stronger!
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boss Battle Notification */}
      <AnimatePresence mode="wait">
        {showBossBattle && (
          <motion.div
            key={`boss-battle-${level}`}
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 30, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 mb-4"
          >
            <div className="bg-gradient-to-r from-red-600/90 to-orange-600/90 backdrop-blur-xl rounded-lg border border-red-400/50 shadow-lg px-6 py-3">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🔥</div>
                <div>
                  <div className="text-lg font-bold text-white">
                    BOSS BATTLE!
                  </div>
                  <div className="text-sm text-red-200">
                    Level {level} - Defeat the boss to continue!
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start" style={{ marginTop: (showLevelUp || showBossBattle) ? '80px' : '0px' }}>
        {/* Left Panel - Main Stats */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          {/* Main Stats Panel */}
          <div className="bg-gradient-to-br from-black/80 via-blue-900/40 to-purple-900/30 backdrop-blur-xl rounded-2xl border border-cyan-400/30 shadow-2xl overflow-hidden">
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-transparent to-purple-400/20 animate-pulse" />
            
            <div className="relative p-6 space-y-4">
              {/* Score Section */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-cyan-300 text-sm font-medium tracking-wider uppercase">Score</span>
                </div>
                <motion.div 
                  key={player.score}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent font-mono"
                >
                  {displayScore.toLocaleString()}
                </motion.div>
              </div>

              {/* Level Info Section */}
              <div className="space-y-2 p-3 bg-purple-900/20 rounded-lg border border-purple-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-400 text-sm font-medium">⬡</span>
                    <span className="text-gray-300 text-sm uppercase tracking-wide">Level {level}</span>
                  </div>
                  <span className="text-purple-400 text-lg font-bold font-mono">{level}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-purple-300 font-medium">{levelInfo.name}</div>
                  
                  {/* Progress bar to next level */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Next Level</span>
                      <span className="text-gray-400">{pointsToNextLevel.toLocaleString()} pts</span>
                    </div>
                    <div className="relative bg-black/50 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToNextLevel}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Lives */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-emerald-400 text-xs font-medium">♦</span>
                    <span className="text-gray-300 text-xs uppercase tracking-wide">Lives</span>
                  </div>
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.max(player.lives, 0) }, (_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="w-3 h-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full shadow-lg shadow-emerald-400/50"
                      />
                    ))}
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-blue-400 text-xs font-medium">⧖</span>
                    <span className="text-gray-300 text-xs uppercase tracking-wide">Time</span>
                  </div>
                  <div className="text-lg font-mono text-blue-400">{formatTime(gameTime)}</div>
                </div>

                {/* Enemies */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-red-400 text-xs font-medium">⟐</span>
                    <span className="text-gray-300 text-xs uppercase tracking-wide">Enemies</span>
                  </div>
                  <motion.div 
                    key={enemies.length}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-lg font-mono text-red-400"
                  >
                    {enemies.length}
                  </motion.div>
                </div>
              </div>

              {/* Weapon Level */}
              <div className="space-y-2 pt-2 border-t border-cyan-400/20">
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 text-xs font-medium">⚡</span>
                  <span className="text-gray-300 text-xs uppercase tracking-wide">Weapon Level</span>
                  <span className="text-cyan-400 font-bold">{player.weaponLevel}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {weaponStars.map((filled, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`w-3 h-3 text-xs ${
                        filled 
                          ? 'text-cyan-400 drop-shadow-lg' 
                          : 'text-gray-600'
                      }`}
                    >
                      ★
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Ship Level */}
              <div className="space-y-2 pt-2 border-t border-purple-400/20">
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400 text-xs font-medium">🚀</span>
                  <span className="text-gray-300 text-xs uppercase tracking-wide">Ship Level</span>
                  <span className="text-purple-400 font-bold">{player.shipLevel}</span>
                </div>
                
                {/* Ship Type Display */}
                <div className="space-y-1">
                  <div className={`text-xs font-medium ${
                    player.shipLevel === 4 ? 'text-pink-300' :
                    player.shipLevel === 3 ? 'text-purple-300' :
                    player.shipLevel === 2 ? 'text-cyan-300' : 'text-gray-300'
                  }`}>
                    {player.shipLevel === 4 ? '🔥 Dual Laser Annihilator' :
                     player.shipLevel === 3 ? '⚡ Laser Destroyer' :
                     player.shipLevel === 2 ? '💥 Multi-Shot Cruiser' : '🔹 Basic Fighter'}
                  </div>
                  
                  {/* Ship Level Indicator */}
                  <div className="flex space-x-1">
                    {Array.from({ length: 4 }, (_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`w-4 h-3 rounded-sm border ${
                          i < player.shipLevel 
                            ? player.shipLevel === 4
                              ? 'bg-pink-500 border-pink-400 shadow-pink-400/50'
                              : player.shipLevel === 3 
                              ? 'bg-purple-500 border-purple-400 shadow-purple-400/50' 
                              : player.shipLevel === 2 
                              ? 'bg-cyan-500 border-cyan-400 shadow-cyan-400/50'
                              : 'bg-gray-500 border-gray-400 shadow-gray-400/50'
                            : 'bg-transparent border-gray-600'
                        } shadow-lg`}
                      />
                    ))}
                  </div>
                  
                  {/* Weapon Description */}
                  <div className="text-xs text-gray-400">
                    {player.shipLevel === 4 ? 'Dual Piercing Laser Beams' :
                     player.shipLevel === 3 ? 'Piercing Laser Beam' :
                     player.shipLevel === 2 ? 'Triple Shot Spread' : 'Single Projectile'}
                  </div>
                  
                  {/* Ship Upgrade Timer */}
                  {player.shipUpgradeTime > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        scale: player.shipUpgradeTime <= 3000 ? [1, 1.05, 1] : 1 // Pulse when < 3 seconds
                      }}
                      transition={{ 
                        repeat: player.shipUpgradeTime <= 3000 ? Infinity : 0, 
                        duration: 0.6 
                      }}
                      className={`mt-2 p-2 rounded-lg border transition-all duration-300 ${
                        player.shipUpgradeTime <= 3000 
                          ? 'bg-gradient-to-r from-red-500/30 to-red-600/30 border-red-400/70' 
                          : 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${
                          player.shipUpgradeTime <= 3000 ? 'text-red-300' : 'text-orange-300'
                        }`}>
                          {player.shipUpgradeTime <= 3000 ? '⚠️ Upgrade Expiring' : '⏱️ Upgrade Time'}
                        </span>
                        <span className={`font-mono ${
                          player.shipUpgradeTime <= 3000 ? 'text-red-200' : 'text-orange-200'
                        }`}>
                          {Math.ceil(player.shipUpgradeTime / 1000)}s
                        </span>
                      </div>
                      <div className="mt-1 bg-black/50 rounded-full h-1 overflow-hidden">
                        <motion.div
                          className={`h-full transition-all duration-300 ${
                            player.shipUpgradeTime <= 3000 
                              ? 'bg-gradient-to-r from-red-400 to-red-500' 
                              : 'bg-gradient-to-r from-orange-400 to-red-400'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (player.shipUpgradeTime / 9000) * 100)}%` 
                          }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Health Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <div className={`bg-gradient-to-br backdrop-blur-xl rounded-xl border shadow-2xl overflow-hidden transition-all duration-300 ${
              isCriticalHealth 
                ? 'from-red-900/80 via-red-800/40 to-black/30 border-red-400/50 shadow-red-500/50' 
                : isLowHealth
                ? 'from-yellow-900/80 via-orange-800/40 to-black/30 border-yellow-400/50 shadow-yellow-500/30'
                : 'from-black/80 via-emerald-900/20 to-black/30 border-emerald-400/30 shadow-emerald-500/20'
            }`}>
              {/* Animated border for critical health */}
              {isCriticalHealth && (
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 via-transparent to-red-500/30 animate-pulse" />
              )}
              
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <motion.span 
                      animate={{ 
                        scale: isCriticalHealth ? [1, 1.2, 1] : 1,
                        color: isCriticalHealth ? ['#ef4444', '#fbbf24', '#ef4444'] : '#10b981'
                      }}
                      transition={{ repeat: isCriticalHealth ? Infinity : 0, duration: 0.8 }}
                      className="text-sm font-medium"
                    >
                      ❤️
                    </motion.span>
                    <span className="text-gray-300 text-sm font-medium uppercase tracking-wide">Health</span>
                  </div>
                  <span className="text-white text-sm font-mono">
                    {player.health}/{player.maxHealth}
                  </span>
                </div>
                
                {/* Health Bar */}
                <div className="relative bg-black/50 rounded-full h-4 overflow-hidden border border-gray-600/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${healthPercentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full relative transition-all duration-300 ${
                      isCriticalHealth 
                        ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-400' 
                        : isLowHealth
                        ? 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-orange-400'
                        : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400'
                    }`}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </motion.div>
                  
                  {/* Health bar segments */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="flex-1 border-r border-black/30 last:border-r-0" />
                    ))}
                  </div>
                </div>
                
                {/* Status Effects */}
                <div className="mt-2 flex space-x-2">
                  {player.invulnerable && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="flex items-center space-x-1 bg-yellow-500/20 rounded-full px-2 py-1 border border-yellow-400/50"
                    >
                      <span className="text-yellow-400 text-xs">⚡</span>
                      <span className="text-yellow-300 text-xs font-medium">SHIELD</span>
                    </motion.div>
                  )}
                  
                  {isCriticalHealth && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="flex items-center space-x-1 bg-red-500/20 rounded-full px-2 py-1 border border-red-400/50"
                    >
                      <span className="text-red-400 text-xs">⚠</span>
                      <span className="text-red-300 text-xs font-medium">CRITICAL</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Panel - Sound Toggle */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SoundToggle className="backdrop-blur-xl bg-black/20 border border-cyan-400/30" />
        </motion.div>
      </div>
    </div>
  )
} 