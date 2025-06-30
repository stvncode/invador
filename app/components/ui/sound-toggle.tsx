import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { soundManager } from '../../lib/game/audio';

interface SoundToggleProps {
  className?: string;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ className = '' }) => {
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial muted state
    const currentMutedState = soundManager.isMuted()
    setIsMuted(currentMutedState)
    setIsLoading(false)
  }, [])

  const toggleSound = async () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    soundManager.setMuted(newMutedState)
  }

  if (isLoading) {
    return (
      <div className={`w-12 h-12 rounded-full bg-gray-700 animate-pulse ${className}`} />
    )
  }

  return (
    <motion.button
      onClick={toggleSound}
      className={`relative w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 
                 hover:from-blue-500 hover:to-purple-500 shadow-lg transition-all duration-200 
                 flex items-center justify-center overflow-hidden ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        key={isMuted ? 'muted' : 'unmuted'}
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 1, rotate: 0 }}
        exit={{ opacity: 0, rotate: 90 }}
        transition={{ duration: 0.2 }}
        className="w-8 h-8 flex items-center justify-center"
      >
        <img 
          src={isMuted ? '/sounds/sound-off.png' : '/sounds/sound-on.png'}
          alt={isMuted ? 'Sound Off' : 'Sound On'}
          className="w-6 h-6 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </motion.div>
      
      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-white opacity-20"
        initial={{ scale: 0 }}
        animate={{ scale: isMuted ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  )
} 