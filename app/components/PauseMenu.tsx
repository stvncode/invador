import { motion } from 'framer-motion';
import React from 'react';
import { useGameStore } from '../lib/game/store';
import { Button } from './ui/button';

export const PauseMenu: React.FC = () => {
  const resumeGame = useGameStore(state => state.resumeGame);
  const resetGame = useGameStore(state => state.resetGame);
  const setGameState = useGameStore(state => state.setGameState);
  const player = useGameStore(state => state.player);
  const level = useGameStore(state => state.level);

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div 
        className="bg-gray-900 rounded-lg p-8 border border-cyan-500/50 text-center space-y-6 max-w-md w-full mx-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.h2 
          className="text-3xl font-bold text-cyan-400"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          GAME PAUSED
        </motion.h2>

        {/* Game Stats */}
        <motion.div 
          className="grid grid-cols-2 gap-4 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-black/50 rounded p-3">
            <div className="text-gray-400 text-sm">Score</div>
            <div className="text-white font-bold">{player.score.toLocaleString()}</div>
          </div>
          <div className="bg-black/50 rounded p-3">
            <div className="text-gray-400 text-sm">Level</div>
            <div className="text-white font-bold">{level}</div>
          </div>
          <div className="bg-black/50 rounded p-3">
            <div className="text-gray-400 text-sm">Health</div>
            <div className="text-white font-bold">{player.health}/{player.maxHealth}</div>
          </div>
          <div className="bg-black/50 rounded p-3">
            <div className="text-gray-400 text-sm">Lives</div>
            <div className="text-white font-bold">{player.lives}</div>
          </div>
        </motion.div>

        {/* Menu Buttons */}
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={resumeGame}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            RESUME GAME
          </Button>

          <Button
            onClick={() => setGameState('settings')}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
          >
            SETTINGS
          </Button>

          <Button
            onClick={resetGame}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            RESTART
          </Button>

          <Button
            onClick={resetGame}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
          >
            QUIT TO MENU
          </Button>
        </motion.div>

        <motion.div 
          className="text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Press ESC to resume
        </motion.div>
      </motion.div>
    </div>
  );
}; 