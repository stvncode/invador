import { motion } from 'framer-motion';
import React from 'react';
import { useGameStore } from '../lib/game/store';
import { Button } from './ui/button';

export const GameMenu: React.FC = () => {
  const startGame = useGameStore(state => state.startGame);
  const setGameState = useGameStore(state => state.setGameState);
  const highScores = useGameStore(state => state.highScores);
  const getTopScores = useGameStore(state => state.getTopScores);

  const topScores = getTopScores(5);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900">
      <motion.div 
        className="text-center space-y-8 p-8"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Title */}
        <motion.h1 
          className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          SPACE INVADERS
        </motion.h1>

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
          className="flex flex-col space-y-4 mt-12"
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
  );
}; 