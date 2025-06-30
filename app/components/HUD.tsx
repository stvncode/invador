import { motion } from 'framer-motion';
import React from 'react';
import { useGameStore } from '../lib/game/store';

export const HUD: React.FC = () => {
  const player = useGameStore(state => state.player);
  const level = useGameStore(state => state.level);
  const enemies = useGameStore(state => state.enemies);
  const gameTime = useGameStore(state => state.gameTime);

  const healthPercentage = (player.health / player.maxHealth) * 100;
  const minutes = Math.floor(gameTime / 60000);
  const seconds = Math.floor((gameTime % 60000) / 1000);

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4">
      <div className="flex justify-between items-start">
        {/* Left side - Player stats */}
        <div className="space-y-2">
          {/* Score */}
          <motion.div 
            className="bg-black/70 rounded-lg p-3 border border-cyan-500/50"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-cyan-400 text-sm font-semibold">SCORE</div>
            <div className="text-white text-xl font-bold">
              {player.score.toLocaleString()}
            </div>
          </motion.div>

          {/* Health Bar */}
          <motion.div 
            className="bg-black/70 rounded-lg p-3 border border-red-500/50"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-red-400 text-sm font-semibold mb-1">HEALTH</div>
            <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  healthPercentage > 60 ? 'bg-green-500' :
                  healthPercentage > 30 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: `${healthPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-white text-sm mt-1">
              {player.health} / {player.maxHealth}
            </div>
          </motion.div>

          {/* Lives */}
          <motion.div 
            className="bg-black/70 rounded-lg p-3 border border-green-500/50"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-green-400 text-sm font-semibold">LIVES</div>
            <div className="flex space-x-1 mt-1">
              {Array.from({ length: player.lives }).map((_, i) => (
                <div key={i} className="w-4 h-4 bg-green-500 rounded-full" />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Center - Level and Wave info */}
        <div className="text-center">
          <motion.div 
            className="bg-black/70 rounded-lg p-4 border border-purple-500/50"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-purple-400 text-lg font-bold">LEVEL {level}</div>
            <div className="text-white text-sm">Enemies: {enemies.length}</div>
            <div className="text-gray-400 text-xs mt-1">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </motion.div>
        </div>

        {/* Right side - Weapon and power-ups */}
        <div className="space-y-2">
          {/* Weapon Level */}
          <motion.div 
            className="bg-black/70 rounded-lg p-3 border border-blue-500/50"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-blue-400 text-sm font-semibold">WEAPON</div>
            <div className="text-white text-xl font-bold">
              LV {player.weaponLevel}
            </div>
            <div className="flex space-x-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full ${
                    i < player.weaponLevel ? 'bg-blue-500' : 'bg-gray-600'
                  }`} 
                />
              ))}
            </div>
          </motion.div>

          {/* Shield/Invulnerability */}
          {player.invulnerable && (
            <motion.div 
              className="bg-black/70 rounded-lg p-3 border border-yellow-500/50"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <div className="text-yellow-400 text-sm font-semibold">SHIELD</div>
              <div className="text-white text-sm">
                {Math.ceil(player.invulnerabilityTime / 1000)}s
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom warning */}
      {player.health <= 30 && (
        <motion.div 
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <div className="bg-red-500/80 text-white px-4 py-2 rounded-lg font-bold">
            LOW HEALTH!
          </div>
        </motion.div>
      )}
    </div>
  );
}; 