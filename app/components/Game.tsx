import React, { useCallback, useEffect, useRef, useState } from 'react'
import { soundManager } from '../lib/game/audio'
import { spriteManager } from '../lib/game/sprites'
import { useGameStore } from '../lib/game/store'
import { GameMenu } from './GameMenu'
import { GameOverScreen } from './GameOverScreen'
import { HUD } from './HUD'
import { PauseMenu } from './PauseMenu'

export const Game: React.FC = () => {
  const gameState = useGameStore(state => state.gameState);
  const isRunning = useGameStore(state => state.isRunning);
  const isPaused = useGameStore(state => state.isPaused);
  const config = useGameStore(state => state.config);
  
  const player = useGameStore(state => state.player);
  const enemies = useGameStore(state => state.enemies);
  const bullets = useGameStore(state => state.bullets);
  const powerUps = useGameStore(state => state.powerUps);
  const particles = useGameStore(state => state.particles);
  const inputState = useGameStore(state => state.inputState);
  
  const updateGameLogic = useGameStore(state => state.updateGameLogic);
  const movePlayer = useGameStore(state => state.movePlayer);
  const playerShoot = useGameStore(state => state.playerShoot);
  const handleKeyDown = useGameStore(state => state.handleKeyDown);
  const handleKeyUp = useGameStore(state => state.handleKeyUp);
  
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const shootCooldownRef = useRef<number>(0);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true)
  const [soundDebug, setSoundDebug] = useState(false)

  // Initialize sound system and sprites
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Initialize sound system first
        await soundManager.init()
        console.log('Sound system initialized')
        
        // Then initialize sprites
        await spriteManager.loadAllSprites()
        console.log('Sprites loaded')
        
        setSpritesLoaded(true)
        setIsLoading(false)
      } catch (error) {
        console.warn('Failed to initialize game systems:', error)
        setSpritesLoaded(true) // Continue even if some systems fail
        setIsLoading(false)
      }
    }

    initializeGame()
  }, [])

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!isRunning || isPaused) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    // Handle input
    if (inputState.left) {
      movePlayer('left', deltaTime);
    }
    if (inputState.right) {
      movePlayer('right', deltaTime);
    }
    
    // Handle shooting with cooldown
    if (inputState.shoot && shootCooldownRef.current <= 0) {
      playerShoot();
      shootCooldownRef.current = 250; // 250ms cooldown
    }
    
    if (shootCooldownRef.current > 0) {
      shootCooldownRef.current -= deltaTime;
    }

    // Update game logic
    updateGameLogic(deltaTime);

    animationFrameRef.current = requestAnimationFrame((timestamp) => gameLoop(timestamp));
  }, [isRunning, isPaused, inputState, movePlayer, playerShoot, updateGameLogic]);

  // Start game loop
  useEffect(() => {
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame((timestamp) => gameLoop(timestamp));

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDownEvent = (event: KeyboardEvent) => {
      event.preventDefault();
      handleKeyDown(event.key);
    };

    const handleKeyUpEvent = (event: KeyboardEvent) => {
      event.preventDefault();
      handleKeyUp(event.key);
    };

    window.addEventListener('keydown', handleKeyDownEvent);
    window.addEventListener('keyup', handleKeyUpEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDownEvent);
      window.removeEventListener('keyup', handleKeyUpEvent);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Loading screen with better feedback
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center space-y-4">
          <div className="text-2xl font-bold">Loading Game...</div>
          <div className="text-sm text-gray-400">Initializing sound system and sprites</div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        </div>
      </div>
    )
  }

  // Render different screens based on game state
  if (gameState === 'menu') {
    return <GameMenu />;
  }

  if (gameState === 'paused') {
    return (
      <div className="relative w-full h-screen bg-black">
        <GameCanvas />
        <PauseMenu />
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return <GameOverScreen />;
  }

  // Main game screen
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <GameCanvas />
      <HUD />
      
      {/* Debug Panel - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 z-20">
          <button
            onClick={() => setSoundDebug(!soundDebug)}
            className="mb-2 px-3 py-1 bg-blue-600 text-white text-xs rounded"
          >
            {soundDebug ? 'Hide' : 'Show'} Sound Debug
          </button>
          
          {soundDebug && (
            <div className="bg-black/80 rounded-lg p-3 space-y-2 text-xs text-white">
              <div className="font-bold">Sound Debug Panel</div>
              <div className="space-x-2">
                <button 
                  onClick={() => soundManager.playSound('shoot')}
                  className="px-2 py-1 bg-green-600 rounded"
                >
                  Test Shoot
                </button>
                               <button 
                 onClick={() => soundManager.playSound('explosion')}
                 className="px-2 py-1 bg-red-600 rounded"
               >
                 Test Explosion
               </button>
               <button 
                 onClick={() => soundManager.playSound('power-up')}
                 className="px-2 py-1 bg-yellow-600 rounded"
               >
                 Test Power-up
               </button>
              </div>
              <div className="space-x-2">
                <button 
                  onClick={() => soundManager.startBackgroundMusic()}
                  className="px-2 py-1 bg-purple-600 rounded"
                >
                  Start Music
                </button>
                <button 
                  onClick={() => soundManager.stopBackgroundMusic()}
                  className="px-2 py-1 bg-gray-600 rounded"
                >
                  Stop Music
                </button>
              </div>
              <div className="text-xs">
                Muted: {soundManager.isMuted() ? 'Yes' : 'No'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = useGameStore(state => state.config);
  const player = useGameStore(state => state.player);
  const enemies = useGameStore(state => state.enemies);
  const bullets = useGameStore(state => state.bullets);
  const powerUps = useGameStore(state => state.powerUps);
  const particles = useGameStore(state => state.particles);
  const explosions = useGameStore(state => state.explosions);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, config.canvas.width, config.canvas.height);

    // Draw animated stars background
    ctx.fillStyle = '#ffffff';
    const time = Date.now() * 0.0005;
    for (let i = 0; i < 100; i++) {
      const x = (i * 23 + time * 50) % config.canvas.width;
      const y = (i * 37) % config.canvas.height;
      const size = Math.sin(i + time) * 1 + 1;
      ctx.globalAlpha = Math.sin(i * 0.5 + time * 2) * 0.5 + 0.5;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;

    // Draw player (try sprite first, fallback to rectangle)
    if (!spriteManager.drawSprite(ctx, 'player', player.position.x, player.position.y, player.size.width, player.size.height)) {
      ctx.fillStyle = player.invulnerable ? '#ff6600' : '#00ff00';
      ctx.globalAlpha = player.invulnerable ? 0.7 : 1;
      ctx.fillRect(player.position.x, player.position.y, player.size.width, player.size.height);
      ctx.globalAlpha = 1;
    }

    // Draw enemies (with sprites)
    enemies.forEach((enemy) => {
      let spriteName = '';
      let fallbackColor = '#ff4444';
      
      switch (enemy.type) {
        case 'boss':
          spriteName = 'boss';
          fallbackColor = '#ff0000';
          break;
        case 'heavy':
          spriteName = 'heavy-enemy';
          fallbackColor = '#ff6600';
          break;
        case 'fast':
          spriteName = 'fast-enemy';
          fallbackColor = '#ffff00';
          break;
        case 'shooter':
          spriteName = 'shooter-enemy';
          fallbackColor = '#ff00ff';
          break;
        default:
          spriteName = 'basic-enemy';
          fallbackColor = '#ff4444';
      }

      if (!spriteManager.drawSprite(ctx, spriteName, enemy.position.x, enemy.position.y, enemy.size.width, enemy.size.height)) {
        ctx.fillStyle = fallbackColor;
        ctx.fillRect(enemy.position.x, enemy.position.y, enemy.size.width, enemy.size.height);
      }

      // Draw health bar for damaged enemies
      if (enemy.health < enemy.maxHealth) {
        const healthPercent = enemy.health / enemy.maxHealth;
        const barWidth = enemy.size.width;
        const barHeight = 4;
        const barY = enemy.position.y - 8;
        
        // Background
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.position.x, barY, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(enemy.position.x, barY, barWidth * healthPercent, barHeight);
      }
    });

    // Draw bullets
    bullets.forEach((bullet) => {
      ctx.fillStyle = bullet.owner === 'player' ? '#00ffff' : '#ff0000';
      ctx.fillRect(bullet.position.x, bullet.position.y, bullet.size.width, bullet.size.height);
    });

    // Draw power-ups (with sprites)
    powerUps.forEach((powerUp) => {
      let spriteName = '';
      let fallbackColor = '#ffffff';
      
      switch (powerUp.type) {
        case 'health':
          spriteName = 'health-powerup';
          fallbackColor = '#00ff00';
          break;
        case 'weapon':
          spriteName = 'weapon-powerup';
          fallbackColor = '#0000ff';
          break;
        case 'shield':
          spriteName = 'shield-powerup';
          fallbackColor = '#ffff00';
          break;
        default:
          fallbackColor = '#ffffff';
      }

      if (!spriteManager.drawSprite(ctx, spriteName, powerUp.position.x, powerUp.position.y, powerUp.size.width, powerUp.size.height)) {
        // Fallback to colored rectangle if sprite fails
        ctx.fillStyle = fallbackColor;
        ctx.fillRect(powerUp.position.x, powerUp.position.y, powerUp.size.width, powerUp.size.height);
      }
    });

    // Draw particles
    particles.forEach((particle) => {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.alpha;
      ctx.fillRect(particle.position.x, particle.position.y, particle.size.width, particle.size.height);
      ctx.globalAlpha = 1;
    });

    // Draw explosions (sprite-based animation)
    explosions.forEach((explosion) => {
      const frameSprite = `explosion${explosion.currentFrame + 1}`;
      if (!spriteManager.drawSprite(ctx, frameSprite, explosion.position.x, explosion.position.y, explosion.size.width, explosion.size.height)) {
        // Fallback: draw a simple circle if explosion sprite fails
        ctx.fillStyle = '#ff6600';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(
          explosion.position.x + explosion.size.width / 2,
          explosion.position.y + explosion.size.height / 2,
          explosion.size.width / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // Draw debug info
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.font = '12px monospace';
    ctx.fillText(`Enemies: ${enemies.length} | Bullets: ${bullets.length} | Explosions: ${explosions.length} | Sprites: ${spriteManager.getAllLoadedSprites().length}`, 10, 20);
    ctx.globalAlpha = 1;
  }, [config, player, enemies, bullets, powerUps, particles, explosions]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        width={config.canvas.width}
        height={config.canvas.height}
        className="border border-gray-700"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

 