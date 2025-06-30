import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../lib/game/store';
import { Button } from './ui/button';
import { Input } from './ui/input';

export const GameOverScreen: React.FC = () => {
  const player = useGameStore(state => state.player);
  const level = useGameStore(state => state.level);
  const stats = useGameStore(state => state.stats);
  const resetGame = useGameStore(state => state.resetGame);
  const addHighScore = useGameStore(state => state.addHighScore);
  const getTopScores = useGameStore(state => state.getTopScores);
  
  const [playerName, setPlayerName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const topScores = getTopScores(10);
  const isHighScore = topScores.length < 10 || player.score > topScores[topScores.length - 1]?.score;

  useEffect(() => {
    const timer = setTimeout(() => setShowStats(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmitScore = async () => {
    if (playerName.trim()) {
             const highScore = {
         id: `score-${Date.now()}-${Math.random()}`,
         playerName: playerName.trim(),
         score: player.score,
         level: level,
         date: new Date().toISOString(),
         duration: stats.totalPlayTime,
       };
      
      await addHighScore(highScore);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-red-900 via-black to-purple-900">
      <motion.div 
        className="text-center space-y-6 p-8 max-w-2xl mx-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Game Over Title */}
        <motion.h1 
          className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          GAME OVER
        </motion.h1>

        {/* Final Score */}
        <motion.div 
          className="bg-black/70 rounded-lg p-6 border border-red-500/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-red-400 text-lg font-semibold">FINAL SCORE</div>
          <div className="text-white text-4xl font-bold mt-2">
            {player.score.toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm mt-1">
            Level {level} • {stats.totalEnemiesDestroyed} enemies destroyed
          </div>
        </motion.div>

        {/* High Score Entry */}
        {isHighScore && !isSubmitted && (
          <motion.div 
            className="bg-yellow-500/20 rounded-lg p-6 border border-yellow-500/50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-yellow-400 text-xl font-bold mb-4">🎉 NEW HIGH SCORE! 🎉</div>
            <div className="space-y-4">
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-black/50 border-yellow-500/50 text-white placeholder-gray-400"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitScore()}
              />
              <Button
                onClick={handleSubmitScore}
                disabled={!playerName.trim()}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                SUBMIT SCORE
              </Button>
            </div>
          </motion.div>
        )}

        {/* Game Statistics */}
        {showStats && (
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="bg-black/50 rounded-lg p-4 border border-cyan-500/30">
              <div className="text-cyan-400 text-sm font-semibold">Enemies</div>
              <div className="text-white text-xl font-bold">{stats.totalEnemiesDestroyed}</div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-green-500/30">
              <div className="text-green-400 text-sm font-semibold">Accuracy</div>
              <div className="text-white text-xl font-bold">
                {Math.round((stats.totalEnemiesDestroyed / Math.max(stats.totalBulletsFired, 1)) * 100)}%
              </div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-purple-500/30">
              <div className="text-purple-400 text-sm font-semibold">Shots</div>
              <div className="text-white text-xl font-bold">{stats.totalBulletsFired}</div>
            </div>
            <div className="bg-black/50 rounded-lg p-4 border border-blue-500/30">
              <div className="text-blue-400 text-sm font-semibold">Power-ups</div>
              <div className="text-white text-xl font-bold">{stats.totalPowerUpsCollected}</div>
            </div>
          </motion.div>
        )}

        {/* High Scores Table */}
        {isSubmitted && topScores.length > 0 && (
          <motion.div 
            className="bg-black/70 rounded-lg p-6 border border-purple-500/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <h3 className="text-xl font-bold text-purple-400 mb-4">HIGH SCORES</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {topScores.map((score, index) => (
                <div 
                  key={score.id} 
                  className={`flex justify-between p-2 rounded ${
                    score.playerName === playerName ? 'bg-yellow-500/20 border border-yellow-500/50' : ''
                  }`}
                >
                  <span className="text-gray-300">
                    #{index + 1} {score.playerName}
                  </span>
                  <span className="text-yellow-400 font-bold">
                    {score.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <Button
            onClick={resetGame}
            className="w-full sm:w-48 h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            PLAY AGAIN
          </Button>

          <Button
            onClick={resetGame}
            variant="outline"
            className="w-full sm:w-48 h-12 text-lg font-semibold border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
          >
            MAIN MENU
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}; 