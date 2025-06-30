import React from 'react';
import { useGameStore } from '../lib/game/store';
import { SoundToggle } from './ui/sound-toggle';

export const HUD: React.FC = () => {
  const player = useGameStore(state => state.player);
  const level = useGameStore(state => state.level);
  const enemies = useGameStore(state => state.enemies);
  const gameTime = useGameStore(state => state.gameTime);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const healthPercentage = (player.health / player.maxHealth) * 100;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4">
      <div className="flex justify-between items-start">
        {/* Left side stats */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 min-w-[200px]">
          <div className="text-white space-y-2">
            <div className="flex justify-between">
              <span className="text-cyan-400">Score:</span>
              <span className="font-mono text-yellow-400">{player.score.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-cyan-400">Lives:</span>
              <span className="font-mono text-green-400">{player.lives}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-cyan-400">Level:</span>
              <span className="font-mono text-purple-400">{level}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-cyan-400">Weapon:</span>
              <span className="font-mono text-blue-400">Level {player.weaponLevel}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-cyan-400">Time:</span>
              <span className="font-mono text-gray-300">{formatTime(gameTime)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-cyan-400">Enemies:</span>
              <span className="font-mono text-red-400">{enemies.length}</span>
            </div>
          </div>
        </div>

        {/* Sound toggle - Top Right */}
        <SoundToggle />
      </div>

      {/* Health bar */}
      <div className="mt-4 max-w-md">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <span className="text-cyan-400 text-sm font-semibold">Health:</span>
            <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  healthPercentage > 60 ? 'bg-green-500' : 
                  healthPercentage > 30 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${healthPercentage}%` }}
              />
            </div>
            <span className="text-white text-sm font-mono min-w-[60px]">
              {player.health}/{player.maxHealth}
            </span>
          </div>
          
          {player.invulnerable && (
            <div className="mt-2 text-center">
              <span className="text-yellow-400 text-xs animate-pulse">
                ⚡ INVULNERABLE ⚡
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 