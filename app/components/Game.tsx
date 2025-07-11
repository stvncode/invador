import React, { useCallback, useEffect, useRef, useState } from 'react'
import { match } from 'ts-pattern'
import { soundManager } from '../lib/game/audio'
import { PerformanceOperations } from '../lib/game/performance'
import { spriteManager } from '../lib/game/sprites'
import { useGameStore } from '../lib/game/store'
import { GameMenu } from './GameMenu'
import { GameOverScreen } from './GameOverScreen'
import { HUD } from './HUD'
import { PauseMenu } from './PauseMenu'
import { DebugButton as UiDebugButton, DebugPanel as UiDebugPanel } from './ui/debug-panel'

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
  const [debugPanelVisible, setDebugPanelVisible] = useState(false)

  // Screen shake effect
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0, intensity: 0 });
  const lastPlayerHealth = useRef(player.health);

  // Check for damage and trigger screen shake
  useEffect(() => {
    if (player.health < lastPlayerHealth.current) {
      const damage = lastPlayerHealth.current - player.health;
      const shakeIntensity = Math.min(10, damage * 2); // More damage = more shake
      
      setScreenShake({ x: 0, y: 0, intensity: shakeIntensity });
      
      // Reset shake after animation
      const timer = setTimeout(() => {
        setScreenShake({ x: 0, y: 0, intensity: 0 });
      }, 300);
      
      return () => clearTimeout(timer);
    }
    lastPlayerHealth.current = player.health;
  }, [player.health]);

  // Animate screen shake
  useEffect(() => {
    if (screenShake.intensity > 0) {
      const interval = setInterval(() => {
        setScreenShake(prev => ({
          x: (Math.random() - 0.5) * prev.intensity,
          y: (Math.random() - 0.5) * prev.intensity,
          intensity: Math.max(0, prev.intensity - 0.5)
        }));
      }, 16); // ~60fps
      
      return () => clearInterval(interval);
    }
  }, [screenShake.intensity]);

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
        
        // Start performance monitoring
        try {
          await PerformanceOperations.startPerformanceMonitoring()
          console.log('Performance monitoring started')
        } catch (error) {
          console.warn('Failed to start performance monitoring:', error)
        }
        
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

    // Record performance metrics
    try {
      PerformanceOperations.recordFrame(deltaTime)
      PerformanceOperations.recordEntities(enemies.length + bullets.length + powerUps.length + particles.length)
    } catch (error) {
      // Silently fail performance recording
    }

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
      <div 
        className="relative w-full h-screen"
        style={{
          backgroundImage: 'url(/page-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          backgroundColor: '#000000' // Fallback color
        }}
      >
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
    <div 
      className="relative w-full h-screen"
      style={{
        backgroundImage: 'url(/page-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        backgroundColor: '#000000' // Fallback color
      }}
    >
      <GameCanvas />
      <HUD />
      <UiDebugButton onToggle={() => setDebugPanelVisible(!debugPanelVisible)} isVisible={debugPanelVisible} />
      {debugPanelVisible && <UiDebugPanel isVisible={debugPanelVisible} onToggle={() => setDebugPanelVisible(!debugPanelVisible)} />}
      
      {/* Legacy Sound Debug - Only in development */}
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
  
  // Screen shake effect
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0, intensity: 0 });
  const lastPlayerHealth = useRef(player.health);

  // Check for damage and trigger screen shake
  useEffect(() => {
    if (player.health < lastPlayerHealth.current) {
      const damage = lastPlayerHealth.current - player.health;
      const shakeIntensity = Math.min(10, damage * 2); // More damage = more shake
      
      setScreenShake({ x: 0, y: 0, intensity: shakeIntensity });
      
      // Reset shake after animation
      const timer = setTimeout(() => {
        setScreenShake({ x: 0, y: 0, intensity: 0 });
      }, 300);
      
      return () => clearTimeout(timer);
    }
    lastPlayerHealth.current = player.health;
  }, [player.health]);

  // Animate screen shake
  useEffect(() => {
    if (screenShake.intensity > 0) {
      const interval = setInterval(() => {
        setScreenShake(prev => ({
          x: (Math.random() - 0.5) * prev.intensity,
          y: (Math.random() - 0.5) * prev.intensity,
          intensity: Math.max(0, prev.intensity - 0.5)
        }));
      }, 16); // ~60fps
      
      return () => clearInterval(interval);
    }
  }, [screenShake.intensity]);

  // Canvas rendering with retro space background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const time = Date.now() * 0.001;
    const width = config.canvas.width;
    const height = config.canvas.height;

    // Apply screen shake
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);

    // Clear canvas with game-bg image
    const backgroundImage = new Image();
    backgroundImage.crossOrigin = 'anonymous';
    
    try {
      backgroundImage.src = '/game-bg.png';
      if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, width, height);
      } else {
        backgroundImage.onload = () => {
          ctx.drawImage(backgroundImage, 0, 0, width, height);
        };
        backgroundImage.onerror = () => {
          // Fallback to gradient if image fails to load
          const spaceGradient = ctx.createLinearGradient(0, 0, 0, height);
          spaceGradient.addColorStop(0, '#000008');
          spaceGradient.addColorStop(0.5, '#000011');
          spaceGradient.addColorStop(1, '#000003');
          ctx.fillStyle = spaceGradient;
          ctx.fillRect(0, 0, width, height);
        };
      }
    } catch (error) {
      // Fallback to gradient if image fails to load
      const spaceGradient = ctx.createLinearGradient(0, 0, 0, height);
      spaceGradient.addColorStop(0, '#000008');
      spaceGradient.addColorStop(0.5, '#000011');
      spaceGradient.addColorStop(1, '#000003');
      ctx.fillStyle = spaceGradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Classic retro star field
    const drawRetroStars = () => {
      // Large bright stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const x = (i * 73.2 + time * 20) % (width + 10);
        const y = (i * 127.1) % height;
        const twinkle = Math.sin(i + time * 2) * 0.3 + 0.7;
        
        ctx.globalAlpha = twinkle;
        ctx.fillRect(x, y, 2, 2);
        
        // Add cross effect for bright stars
        if (i % 3 === 0) {
          ctx.fillRect(x - 1, y + 1, 4, 1);
          ctx.fillRect(x + 1, y - 1, 1, 4);
        }
      }

      // Medium stars
      ctx.fillStyle = '#cccccc';
      for (let i = 0; i < 80; i++) {
        const x = (i * 113.7 + time * 15) % (width + 5);
        const y = (i * 89.3) % height;
        const twinkle = Math.sin(i * 0.7 + time * 1.5) * 0.2 + 0.8;
        
        ctx.globalAlpha = twinkle;
        ctx.fillRect(x, y, 1, 1);
      }

      // Small background stars
      ctx.fillStyle = '#888888';
      for (let i = 0; i < 120; i++) {
        const x = (i * 157.3 + time * 10) % (width + 2);
        const y = (i * 67.7) % height;
        
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y, 1, 1);
      }
      
      ctx.globalAlpha = 1;
    };

    drawRetroStars();

    // Distant planets/moons (classic retro touch)
    const drawRetroObjects = () => {
      // Large planet in background
      const planetX = width * 0.8 + Math.sin(time * 0.1) * 20;
      const planetY = height * 0.2 + Math.cos(time * 0.08) * 10;
      const planetRadius = 60;
      
      const planetGradient = ctx.createRadialGradient(
        planetX - 15, planetY - 15, 0,
        planetX, planetY, planetRadius
      );
      planetGradient.addColorStop(0, '#444466');
      planetGradient.addColorStop(0.7, '#222244');
      planetGradient.addColorStop(1, '#111122');
      
      ctx.fillStyle = planetGradient;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Planet rings
      ctx.strokeStyle = '#333355';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.ellipse(planetX, planetY, planetRadius + 20, 8, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.globalAlpha = 1;
    };

    drawRetroObjects();

    // Enhanced player rendering with ship levels and boost effects
    if (player.isActive) {
      // Get input state for boost effects
      const inputState = useGameStore.getState().inputState;
      const isMoving = inputState.left || inputState.right;
      const isShooting = inputState.shoot;
      const showBoost = isMoving || isShooting;
      
      // Determine ship sprite based on ship level
      const shipSprite = `ship${player.shipLevel}`;
      const boostSprite = `ship${player.shipLevel}-boost`;
      
             // Draw boost effects first (behind the ship)
       if (showBoost && spriteManager.isLoaded(boostSprite)) {
         // Boost effects with animation based on ship level
         const boostIntensity = player.shipLevel >= 4
           ? Math.sin(time * 15) * 0.15 + 0.85  // Ultra-fast pulse for dual laser ship
           : player.shipLevel === 3 
           ? Math.sin(time * 12) * 0.2 + 0.8    // Faster pulse for laser ship
           : Math.sin(time * 8) * 0.3 + 0.7;     // Normal pulse
        
        ctx.globalAlpha = boostIntensity;
        
                 // Position boost slightly behind the ship
         const boostX = player.shipLevel === 2 ? player.position.x - 3 : player.position.x;
         const boostY = player.position.y + match(player.shipLevel).with(1, () => 19).with(2, () => 24).with(3, () => 18).with(4, () => 20).otherwise(() => 18); // Adjust based on ship
        
        spriteManager.drawSprite(ctx, boostSprite, boostX, boostY, player.size.width, player.size.height);
        ctx.globalAlpha = 1;
      }
      
      // Draw the main ship sprite
      if (!spriteManager.drawSprite(ctx, shipSprite, player.position.x, player.position.y, player.size.width, player.size.height)) {
        // Fallback to generic ship if specific level doesn't load
        if (!spriteManager.drawSprite(ctx, 'ship1', player.position.x, player.position.y, player.size.width, player.size.height)) {
                     // Final fallback rendering
           const playerColor = player.invulnerable ? '#ff6600' : 
                              player.shipLevel === 4 ? '#ff0088' : 
                              player.shipLevel === 3 ? '#ff00ff' : 
                              player.shipLevel === 2 ? '#00ffff' : '#00ff88';
          
          ctx.shadowColor = playerColor;
          ctx.shadowBlur = player.invulnerable ? 12 : 6;
          ctx.fillStyle = playerColor;
          ctx.globalAlpha = player.invulnerable ? 0.8 : 1;
          
          ctx.fillRect(player.position.x, player.position.y, player.size.width, player.size.height);
          
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }
      
      // Add ship-specific effects
      if (player.invulnerable) {
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = Math.sin(time * 6) * 0.3 + 0.7;
        
        // Redraw ship with glow effect
        spriteManager.drawSprite(ctx, shipSprite, player.position.x, player.position.y, player.size.width, player.size.height);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      
             // Ship level indicator (small visual cue)
       if (player.shipLevel > 1) {
         const indicatorY = player.position.y - 8;
         const indicatorX = player.position.x + player.size.width / 2;
         
         // Draw level indicator
         ctx.fillStyle = player.shipLevel === 4 ? '#ff0088' : 
                        player.shipLevel === 3 ? '#ff00ff' : '#00ffff';
         ctx.globalAlpha = 0.8;
         for (let i = 0; i < player.shipLevel; i++) {
           ctx.fillRect(indicatorX - 4 + (i * 2), indicatorY, 1, 3);
         }
         ctx.globalAlpha = 1;
       }
    }

    // Enhanced enemy rendering with different types and effects
    enemies.forEach((enemy) => {
      if (!enemy.isActive) return;

      // Check if enemy is about to shoot (within 500ms of cooldown)
      const now = Date.now();
      const timeUntilShoot = enemy.shootCooldown - (now - enemy.lastShot);
      const isAboutToShoot = timeUntilShoot > 0 && timeUntilShoot < 500;
      
      // Draw subtle warning indicator if enemy is about to shoot
      if (isAboutToShoot) {
        const warningIntensity = Math.sin(time * 15) * 0.2 + 0.3;
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        ctx.globalAlpha = warningIntensity;
        ctx.strokeRect(
          enemy.position.x - 2, 
          enemy.position.y - 2, 
          enemy.size.width + 4, 
          enemy.size.height + 4
        );
        ctx.globalAlpha = 1;
      }

      // Draw enemy sprite
      let spriteName = '';
      
      switch (enemy.type) {
        case 'boss':
          spriteName = 'boss';
          break;
        case 'heavy':
          spriteName = 'heavy-enemy';
          break;
        case 'fast':
          spriteName = 'fast-enemy';
          break;
        case 'shooter':
          spriteName = 'shooter-enemy';
          break;
        case 'kamikaze':
          spriteName = 'kamikaze-enemy';
          break;
        case 'shielded':
          spriteName = 'shielded-enemy';
          break;
        case 'regenerator':
          spriteName = 'spliting-enemy';
          break;
        case 'swarm':
        case 'basic':
        default:
          spriteName = 'basic-enemy';
          break;
      }
      
      if (!spriteManager.drawSprite(ctx, spriteName, enemy.position.x, enemy.position.y, enemy.size.width, enemy.size.height)) {
        // Fallback rendering for enemies
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(enemy.position.x, enemy.position.y, enemy.size.width, enemy.size.height);
      }

      // Draw health bar for enemies with health
      if (enemy.health < enemy.maxHealth) {
        const healthBarWidth = enemy.size.width;
        const healthBarHeight = 4;
        const healthPercentage = enemy.health / enemy.maxHealth;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(enemy.position.x, enemy.position.y - 8, healthBarWidth, healthBarHeight);
        
        // Health
        ctx.fillStyle = healthPercentage > 0.5 ? '#00ff00' : healthPercentage > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(enemy.position.x, enemy.position.y - 8, healthBarWidth * healthPercentage, healthBarHeight);
      }

      // Draw shield for shielded enemies
      if (enemy.shield > 0) {
        const shieldPercentage = enemy.shield / enemy.maxShield;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = shieldPercentage * 0.8;
        ctx.strokeRect(
          enemy.position.x - 2, 
          enemy.position.y - 2, 
          enemy.size.width + 4, 
          enemy.size.height + 4
        );
        ctx.globalAlpha = 1;
      }
    });

    // Enhanced bullet rendering with different types
    bullets.forEach((bullet) => {
      const isPlayerBullet = bullet.owner === 'player';
      
      if (isPlayerBullet) {
        // Player bullets: different visuals based on type
        switch (bullet.bulletType) {
          case 'basic':
            // Standard blue bullet
            ctx.fillStyle = '#004444';
            ctx.globalAlpha = 0.6;
            ctx.fillRect(bullet.position.x, bullet.position.y + 3, bullet.size.width, 8);
            ctx.globalAlpha = 1;
            
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 3;
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(bullet.position.x, bullet.position.y, bullet.size.width, bullet.size.height);
            ctx.shadowBlur = 0;
            break;
            
          case 'multi-shot':
            // Smaller cyan bullets for multi-shot
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 2;
            ctx.fillStyle = '#00cccc';
            ctx.fillRect(bullet.position.x, bullet.position.y, bullet.size.width, bullet.size.height);
            ctx.shadowBlur = 0;
            break;
            
          case 'laser':
            // Piercing laser beam (different effects based on width for dual vs single)
            const isDualLaser = bullet.size.width >= 3; // Level 4 dual lasers are wider
            const laserPulse = Math.sin(time * 15) * 0.3 + 0.7;
            
            if (isDualLaser) {
              // Level 4 dual laser: Pink/magenta with more intense effects
              ctx.shadowColor = '#ff0088';
              ctx.shadowBlur = 12;
              ctx.fillStyle = '#ff0088';
              ctx.globalAlpha = laserPulse;
              ctx.fillRect(bullet.position.x, bullet.position.y, bullet.size.width, bullet.size.height);
              
              // Bright core
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = laserPulse * 0.9;
              ctx.fillRect(bullet.position.x + 1, bullet.position.y, bullet.size.width - 2, bullet.size.height);
              
              // Outer glow effect
              ctx.shadowColor = '#ff0088';
              ctx.shadowBlur = 16;
              ctx.fillStyle = '#ff0088';
              ctx.globalAlpha = laserPulse * 0.4;
              ctx.fillRect(bullet.position.x - 1, bullet.position.y, bullet.size.width + 2, bullet.size.height);
            } else {
              // Level 3 single laser: Purple
              ctx.shadowColor = '#ff00ff';
              ctx.shadowBlur = 8;
              ctx.fillStyle = '#ff00ff';
              ctx.globalAlpha = laserPulse;
              ctx.fillRect(bullet.position.x, bullet.position.y, bullet.size.width, bullet.size.height);
              
              // Laser outline
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = laserPulse * 0.8;
              ctx.fillRect(bullet.position.x + 0.5, bullet.position.y, bullet.size.width - 1, bullet.size.height);
            }
            
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            break;
            
          default:
            // Fallback basic bullet
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 3;
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(bullet.position.x, bullet.position.y, bullet.size.width, bullet.size.height);
            ctx.shadowBlur = 0;
        }
      } else {
        // Enemy bullets - different colors based on enemy type
        let bulletColor = '#ff3333';
        let glowColor = '#ff3333';
        
        // Try to determine enemy type from bullet ID
        if (bullet.id.includes('boss-bullet')) {
          bulletColor = '#ff0066'; // Darker red for boss bullets
          glowColor = '#ff0066';
        } else if (bullet.id.includes('enemy-bullet')) {
          bulletColor = '#ff3333'; // Standard red for regular enemies
          glowColor = '#ff3333';
        }
        
        // Add pulsing effect for enemy bullets
        const pulseIntensity = Math.sin(time * 8) * 0.2 + 0.8;
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 4;
        ctx.fillStyle = bulletColor;
        ctx.globalAlpha = pulseIntensity;
        ctx.fillRect(bullet.position.x, bullet.position.y, bullet.size.width, bullet.size.height);
        
        // Add a darker core for enemy bullets
        ctx.fillStyle = '#cc0000';
        ctx.globalAlpha = pulseIntensity * 0.7;
        ctx.fillRect(bullet.position.x + 1, bullet.position.y + 1, bullet.size.width - 2, bullet.size.height - 2);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });

    // Enhanced power-up rendering with retro pulsing
    powerUps.forEach((powerUp) => {
      let spriteName = '';
      let fallbackColor = '#ffffff';
      let glowColor = '#ffffff';
      
      switch (powerUp.type) {
        case 'health':
          spriteName = 'health-powerup';
          fallbackColor = '#00ff44';
          glowColor = '#00ff44';
          break;
        case 'weapon':
          spriteName = 'weapon-powerup';
          fallbackColor = '#4488ff';
          glowColor = '#4488ff';
          break;
        case 'shield':
          spriteName = 'shield-powerup';
          fallbackColor = '#ffff44';
          glowColor = '#ffff44';
          break;
        case 'ship':
          spriteName = 'ship-powerup';
          fallbackColor = '#ff00ff';
          glowColor = '#ff00ff';
          break;
        case 'time-slow':
          spriteName = 'time-slow-powerup';
          fallbackColor = '#00ffff';
          glowColor = '#00ffff';
          break;
        case 'auto-shoot':
          spriteName = 'auto-shoot-powerup';
          fallbackColor = '#ff8800';
          glowColor = '#ff8800';
          break;
        case 'blast':
          spriteName = 'blast-powerup';
          fallbackColor = '#ff0066';
          glowColor = '#ff0066';
          break;
        case 'shield-reflect':
          spriteName = 'shield-reflect-powerup';
          fallbackColor = '#00ffff';
          glowColor = '#00ffff';
          break;
        default:
          fallbackColor = '#ffffff';
          glowColor = '#ffffff';
      }

      // Retro pulsing effect
      const pulseIntensity = Math.sin(time * 3) * 0.3 + 0.7;

      if (!spriteManager.drawSprite(ctx, spriteName, powerUp.position.x, powerUp.position.y, powerUp.size.width, powerUp.size.height)) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8 * pulseIntensity;
        ctx.fillStyle = fallbackColor;
        ctx.globalAlpha = pulseIntensity;
        
        ctx.fillRect(powerUp.position.x, powerUp.position.y, powerUp.size.width, powerUp.size.height);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });

    // Enhanced particle effects
    particles.forEach((particle) => {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 2;
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.alpha;
      ctx.fillRect(particle.position.x, particle.position.y, particle.size.width, particle.size.height);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });

    // Screen flash effect for blast power-up
    const blastParticles = particles.filter(p => p.color === '#ff0066');
    if (blastParticles.length > 0) {
      const flashIntensity = Math.min(0.3, blastParticles.length * 0.05);
      ctx.fillStyle = `rgba(255, 0, 102, ${flashIntensity})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Time slow effect - subtle blue tint
    if (player.timeSlowActive) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);
    }

    // Ability activation effect - golden glow
    if (player.invulnerable && player.invulnerabilityTime > 4000) {
      const abilityIntensity = Math.sin(time * 8) * 0.1 + 0.1;
      ctx.fillStyle = `rgba(255, 215, 0, ${abilityIntensity})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Shield reflect effect - cyan glow
    if (player.invulnerable && player.invulnerabilityTime > 6000) {
      const reflectIntensity = Math.sin(time * 12) * 0.15 + 0.15;
      ctx.fillStyle = `rgba(0, 255, 255, ${reflectIntensity})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Fixed explosions with proper radius checking
    explosions.forEach((explosion) => {
      const frameSprite = `explosion${explosion.currentFrame + 1}`;
      if (!spriteManager.drawSprite(ctx, frameSprite, explosion.position.x, explosion.position.y, explosion.size.width, explosion.size.height)) {
        // Safe explosion rendering with radius validation
        const centerX = explosion.position.x + explosion.size.width / 2;
        const centerY = explosion.position.y + explosion.size.height / 2;
        const maxRadius = Math.max(1, explosion.size.width / 2); // Ensure positive radius
        const progress = Math.max(0, Math.min(1, explosion.currentFrame / 6)); // Clamp progress
        
        // Outer ring with safe radius
        const outerRadius = Math.max(1, maxRadius * progress);
        const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius);
        outerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        outerGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.6)');
        outerGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = outerGradient;
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core with safe radius
        const coreRadius = Math.max(1, maxRadius * 0.3 * (1 - progress));
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    });

    // Development info
    if (process.env.NODE_ENV === 'development') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px monospace';
      ctx.fillText(`Entities: ${enemies.length + bullets.length + particles.length + explosions.length}`, 10, height - 10);
    }

    ctx.restore();
  }, [config, player, enemies, bullets, powerUps, particles, explosions, screenShake]);

  return (
    <div className="flex items-center justify-center w-full h-full relative overflow-hidden">
      {/* Enhanced canvas container with retro styling */}
      <div className="relative rounded-lg overflow-hidden shadow-2xl border border-cyan-400/30">
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 via-transparent to-purple-400/5 blur-lg" />
        
        <canvas
          ref={canvasRef}
          width={config.canvas.width}
          height={config.canvas.height}
          className="relative z-10"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Retro corner decorations */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-400/50" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-400/50" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-400/50" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-400/50" />
      </div>
    </div>
  );
};

 