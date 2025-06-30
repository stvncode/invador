import * as Runtime from "effect/Runtime"
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { soundManager } from './audio'
import { isColliding } from './services'
import type {
  Bullet,
  Enemy,
  Explosion,
  GameConfig,
  GameSettings,
  GameState,
  GameStats,
  HighScore,
  InputState,
  Particle,
  Player,
  PowerUp
} from './types'

interface GameStore {
  // Game State
  gameState: GameState;
  isRunning: boolean;
  isPaused: boolean;
  gameTime: number;
  level: number;
  
  // Entities
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  particles: Particle[];
  explosions: Explosion[];
  
  // Input
  inputState: InputState;
  
  // Configuration
  config: GameConfig;
  settings: GameSettings;
  
  // Persistent Data
  highScores: HighScore[];
  stats: GameStats;
  
  // Game Loop
  lastFrameTime: number;
  deltaTime: number;
  lastSpawnTime: number;
  
  // Actions
  setGameState: (state: GameState) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  
  // Player Actions
  updatePlayer: (updates: Partial<Player>) => void;
  movePlayer: (direction: 'left' | 'right', deltaTime: number) => void;
  playerShoot: () => void;
  playerTakeDamage: (damage: number) => void;
  
  // Entity Management
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  updateEnemies: (deltaTime: number) => void;
  
  addBullet: (bullet: Bullet) => void;
  removeBullet: (id: string) => void;
  updateBullets: (deltaTime: number) => void;
  
  addPowerUp: (powerUp: PowerUp) => void;
  removePowerUp: (id: string) => void;
  updatePowerUps: (deltaTime: number) => void;
  collectPowerUp: (id: string) => void;
  
  addParticle: (particle: Particle) => void;
  updateParticles: (deltaTime: number) => void;
  
  addExplosion: (explosion: Explosion) => void;
  updateExplosions: (deltaTime: number) => void;
  
  // Game Logic
  checkCollisions: () => void;
  spawnEnemies: (deltaTime: number) => void;
  updateGameLogic: (deltaTime: number) => void;
  
  // Input Management
  updateInput: (input: Partial<InputState>) => void;
  handleKeyDown: (key: string) => void;
  handleKeyUp: (key: string) => void;
  
  // Settings with Effect-TS
  updateSettings: (settings: Partial<GameSettings>) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  
  // High Scores with Effect-TS
  addHighScore: (score: HighScore) => Promise<void>;
  getTopScores: (limit?: number) => HighScore[];
  
  // Statistics
  updateStats: (updates: Partial<GameStats>) => void;
  incrementStat: (stat: keyof GameStats, amount?: number) => void;
}

const DEFAULT_CONFIG: GameConfig = {
  canvas: {
    width: 800,
    height: 600,
  },
  player: {
    speed: 300,
    size: { width: 40, height: 40 },
    maxLives: 3,
    invulnerabilityDuration: 2000,
  },
  enemies: {
    spawnRate: 2000,
    speed: 100,
    maxOnScreen: 20,
  },
  bullets: {
    speed: 400,
    maxOnScreen: 50,
  },
  difficulty: {
    level: 1,
    enemySpeedMultiplier: 1,
    enemySpawnRateMultiplier: 1,
    scoreMultiplier: 1,
  },
};

const DEFAULT_SETTINGS: GameSettings = {
  audio: {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    muted: false,
  },
  graphics: {
    particles: true,
    screenShake: true,
    vsync: true,
  },
  controls: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    shoot: ' ',
    pause: 'Escape',
  },
  difficulty: 'normal',
};

const createInitialPlayer = (): Player => ({
  id: 'player',
  position: { x: 400, y: 550 },
  velocity: { x: 0, y: 0 },
  size: { width: 40, height: 40 },
  health: 100,
  maxHealth: 100,
  isActive: true,
  score: 0,
  lives: 3,
  weaponLevel: 1,
  invulnerable: false,
  invulnerabilityTime: 0,
});

const initialInputState: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  shoot: false,
  pause: false,
};

const initialStats: GameStats = {
  totalEnemiesDestroyed: 0,
  totalBulletsFired: 0,
  totalPowerUpsCollected: 0,
  highestLevel: 0,
  totalPlayTime: 0,
  accuracy: 0,
};

// Create Effect runtime for async operations
const runtime = Runtime.defaultRuntime;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial State
      gameState: 'menu',
      isRunning: false,
      isPaused: false,
      gameTime: 0,
      level: 1,
      
      player: createInitialPlayer(),
      enemies: [],
      bullets: [],
      powerUps: [],
      particles: [],
      explosions: [],
      
      inputState: initialInputState,
      config: DEFAULT_CONFIG,
      settings: DEFAULT_SETTINGS,
      highScores: [],
      stats: initialStats,
      
      lastFrameTime: 0,
      deltaTime: 0,
      lastSpawnTime: 0,
      
      // Game State Actions
      setGameState: (state) => set({ gameState: state }),
      
      startGame: () => {
        set({
          gameState: 'playing',
          isRunning: true,
          isPaused: false,
          player: createInitialPlayer(),
          enemies: [],
          bullets: [],
          powerUps: [],
          particles: [],
          explosions: [],
          gameTime: 0,
          level: 1,
          inputState: initialInputState,
        });
        
        // Start background music
        soundManager.startBackgroundMusic();
      },
      
      pauseGame: () => {
        set({ gameState: 'paused', isPaused: true });
        soundManager.pauseSound('level1-music');
      },
      
      resumeGame: () => {
        set({ gameState: 'playing', isPaused: false });
        soundManager.resumeSound('level1-music');
      },
      
      endGame: () => {
        set({ 
          gameState: 'gameOver', 
          isRunning: false,
          isPaused: false,
        });
        soundManager.stopBackgroundMusic();
        soundManager.playSound('explosion'); // Player death sound
      },
      
      resetGame: () => set({
        gameState: 'menu',
        isRunning: false,
        isPaused: false,
        player: createInitialPlayer(),
        enemies: [],
        bullets: [],
        powerUps: [],
        particles: [],
        explosions: [],
        gameTime: 0,
        level: 1,
        inputState: initialInputState,
      }),
      
      // Player Actions
      updatePlayer: (updates) => set((state) => ({
        player: { ...state.player, ...updates }
      })),
      
      movePlayer: (direction, deltaTime) => {
        const { player, config } = get();
        const speed = config.player.speed * (deltaTime / 1000);
        const newX = direction === 'left' 
          ? Math.max(0, player.position.x - speed)
          : Math.min(config.canvas.width - player.size.width, player.position.x + speed);
        
        set((state) => ({
          player: {
            ...state.player,
            position: { ...state.player.position, x: newX }
          }
        }));
      },
      
      playerShoot: () => {
        const { player, bullets, config } = get();
        const now = Date.now();
        
        if (bullets.filter(b => b.owner === 'player').length >= config.bullets.maxOnScreen) return;
        if (now - get().lastFrameTime < 200) return; // Shooting cooldown
        
        const bullet: Bullet = {
          id: `bullet-${Date.now()}-${Math.random()}`,
          position: {
            x: player.position.x + player.size.width / 2 - 2,
            y: player.position.y,
          },
          velocity: { x: 0, y: -config.bullets.speed },
          size: { width: 4, height: 8 },
          health: 1,
          maxHealth: 1,
          isActive: true,
          damage: 25 * player.weaponLevel,
          owner: 'player',
          bulletType: 'basic',
        };
        
        get().addBullet(bullet);
        get().incrementStat('totalBulletsFired');
        set({ lastFrameTime: now });
        
        // Play shoot sound
        soundManager.playSound('shoot');
      },
      
      playerTakeDamage: (damage) => {
        const player = get().player;
        const newHealth = Math.max(0, player.health - damage);
        
        get().updatePlayer({ health: newHealth });
        
        // Play low health warning if health is low
        if (newHealth > 0 && newHealth <= 25) {
          soundManager.playSound('low-health');
        }
        
        if (newHealth <= 0) {
          if (player.lives > 1) {
            get().updatePlayer({ 
              lives: player.lives - 1, 
              health: player.maxHealth,
              invulnerable: true,
              invulnerabilityTime: 3000
            });
          } else {
            get().endGame();
          }
        }
      },
      
      // Entity Management
      addEnemy: (enemy) => set((state) => ({
        enemies: [...state.enemies, enemy]
      })),
      
      removeEnemy: (id) => set((state) => ({
        enemies: state.enemies.filter(e => e.id !== id)
      })),
      
      updateEnemies: (deltaTime) => {
        const { enemies, config } = get();
        const speed = config.enemies.speed * (deltaTime / 1000);
        
        set((state) => ({
          enemies: state.enemies
            .map(enemy => ({
              ...enemy,
              position: {
                ...enemy.position,
                y: enemy.position.y + speed
              }
            }))
            .filter(enemy => enemy.position.y < config.canvas.height + 50)
        }));
      },
      
      addBullet: (bullet) => set((state) => ({
        bullets: [...state.bullets, bullet]
      })),
      
      removeBullet: (id) => set((state) => ({
        bullets: state.bullets.filter(b => b.id !== id)
      })),
      
      updateBullets: (deltaTime) => {
        const { bullets, config } = get();
        
        set((state) => ({
          bullets: state.bullets
            .map(bullet => ({
              ...bullet,
              position: {
                x: bullet.position.x + bullet.velocity.x * (deltaTime / 1000),
                y: bullet.position.y + bullet.velocity.y * (deltaTime / 1000),
              }
            }))
            .filter(bullet => 
              bullet.position.y > -50 && 
              bullet.position.y < config.canvas.height + 50 &&
              bullet.position.x > -50 && 
              bullet.position.x < config.canvas.width + 50
            )
        }));
      },
      
      addPowerUp: (powerUp) => set((state) => ({
        powerUps: [...state.powerUps, powerUp]
      })),
      
      removePowerUp: (id) => set((state) => ({
        powerUps: state.powerUps.filter(p => p.id !== id)
      })),
      
      updatePowerUps: (deltaTime) => {
        set((state) => ({
          powerUps: state.powerUps
            .map(powerUp => ({
              ...powerUp,
              position: {
                x: powerUp.position.x + powerUp.velocity.x * deltaTime / 1000,
                y: powerUp.position.y + powerUp.velocity.y * deltaTime / 1000,
              },
              duration: powerUp.duration - deltaTime,
            }))
            .filter(powerUp => 
              powerUp.position.y < get().config.canvas.height + 50 && 
              powerUp.duration > 0
            )
        }));
      },
      
      collectPowerUp: (id) => {
        const powerUp = get().powerUps.find(p => p.id === id);
        if (!powerUp) return;
        
        // Play power-up collection sound
        soundManager.playSound('power-up');
        
        // Create collection effect particles
        for (let i = 0; i < 4; i++) {
          get().addParticle({
            id: `collect-particle-${Date.now()}-${i}`,
            position: {
              x: powerUp.position.x + powerUp.size.width / 2,
              y: powerUp.position.y + powerUp.size.height / 2,
            },
            velocity: {
              x: (Math.random() - 0.5) * 100,
              y: -Math.random() * 100 - 50,
            },
            size: { width: 3, height: 3 },
            health: 1,
            maxHealth: 1,
            isActive: true,
            lifetime: 0,
            maxLifetime: 500,
            color: powerUp.type === 'health' ? '#00ff00' : 
                   powerUp.type === 'weapon' ? '#0000ff' : '#ffff00',
            alpha: 1,
          });
        }
        
        get().removePowerUp(id);
        get().incrementStat('totalPowerUpsCollected');
      },
      
      addParticle: (particle) => set((state) => ({
        particles: [...state.particles, particle]
      })),
      
      updateParticles: (deltaTime) => {
        set((state) => ({
          particles: state.particles
            .map(particle => ({
              ...particle,
              lifetime: particle.lifetime + deltaTime,
              alpha: Math.max(0, 1 - (particle.lifetime / particle.maxLifetime)),
            }))
            .filter(particle => particle.lifetime < particle.maxLifetime)
        }));
      },
      
      addExplosion: (explosion) => set((state) => ({
        explosions: [...state.explosions, explosion]
      })),
      
      updateExplosions: (deltaTime) => {
        set((state) => ({
          explosions: state.explosions
            .map(explosion => {
              const newLifetime = explosion.lifetime + deltaTime;
              const frameProgress = newLifetime / explosion.frameTime;
              const newFrame = Math.floor(frameProgress) % explosion.totalFrames;
              
              return {
                ...explosion,
                lifetime: newLifetime,
                currentFrame: newFrame,
                isActive: frameProgress < explosion.totalFrames
              };
            })
            .filter(explosion => explosion.isActive)
        }));
      },
      
      // Game Logic
      checkCollisions: () => {
        const { player, enemies, bullets, powerUps } = get();
        
        // Player bullets vs enemies
        bullets.filter(b => b.owner === 'player').forEach(bullet => {
          enemies.forEach(enemy => {
            if (isColliding(bullet, enemy)) {
              get().removeBullet(bullet.id);
              
              const newHealth = enemy.health - bullet.damage;
              if (newHealth <= 0) {
                get().removeEnemy(enemy.id);
                get().updatePlayer({ 
                  score: player.score + enemy.points 
                });
                get().incrementStat('totalEnemiesDestroyed');
                
                // Create sprite-based explosion at enemy position
                get().addExplosion({
                  id: `explosion-${Date.now()}-${Math.random()}`,
                  position: {
                    x: enemy.position.x + enemy.size.width / 2 - 32, // Center explosion (64x64)
                    y: enemy.position.y + enemy.size.height / 2 - 32,
                  },
                  size: { width: 64, height: 64 },
                  currentFrame: 0,
                  totalFrames: 7,
                  frameTime: 80, // 80ms per frame = ~560ms total
                  lifetime: 0,
                  isActive: true,
                });
                
                // Chance to spawn power-up (20% for normal enemies, 50% for boss)
                const powerUpChance = enemy.type === 'boss' ? 0.5 : 0.2;
                if (Math.random() < powerUpChance) {
                  const powerUpTypes: Array<'health' | 'weapon' | 'shield'> = ['health', 'weapon', 'shield'];
                  const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                  
                  get().addPowerUp({
                    id: `powerup-${Date.now()}-${Math.random()}`,
                    position: {
                      x: enemy.position.x + enemy.size.width / 2 - 15, // Center power-up
                      y: enemy.position.y + enemy.size.height / 2 - 15,
                    },
                    velocity: { x: 0, y: 50 }, // Slow downward movement
                    size: { width: 30, height: 30 },
                    health: 1,
                    maxHealth: 1,
                    isActive: true,
                    type: powerUpType,
                    duration: 10000, // Power-up lasts 10 seconds on screen before disappearing
                  });
                }
                
                // Create small particle debris
                for (let i = 0; i < 5; i++) {
                  get().addParticle({
                    id: `particle-${Date.now()}-${Math.random()}-${i}`,
                    position: {
                      x: enemy.position.x + enemy.size.width / 2,
                      y: enemy.position.y + enemy.size.height / 2,
                    },
                    velocity: {
                      x: (Math.random() - 0.5) * 150,
                      y: (Math.random() - 0.5) * 150,
                    },
                    size: { width: 2, height: 2 },
                    health: 1,
                    maxHealth: 1,
                    isActive: true,
                    lifetime: 0,
                    maxLifetime: 800,
                    color: '#ffaa00',
                    alpha: 1,
                  });
                }
              } else {
                // Enemy survives, update its health
                set((state) => ({
                  enemies: state.enemies.map(e => 
                    e.id === enemy.id ? { ...e, health: newHealth } : e
                  )
                }));
              }
            }
          });
        });

        // Enemy bullets vs player
        bullets.filter(b => b.owner === 'enemy').forEach(bullet => {
          if (isColliding(bullet, player) && !player.invulnerable) {
            get().removeBullet(bullet.id);
            get().playerTakeDamage(bullet.damage);
          }
        });

        // Enemies vs player
        enemies.forEach(enemy => {
          if (isColliding(enemy, player) && !player.invulnerable) {
            get().removeEnemy(enemy.id);
            get().playerTakeDamage(50);
          }
        });

        // Player vs power-ups
        powerUps.forEach(powerUp => {
          if (isColliding(powerUp, player)) {
            get().collectPowerUp(powerUp.id);
            
            switch (powerUp.type) {
              case 'health':
                get().updatePlayer({
                  health: Math.min(player.maxHealth, player.health + 25)
                });
                break;
              case 'weapon':
                get().updatePlayer({
                  weaponLevel: Math.min(5, player.weaponLevel + 1)
                });
                break;
              case 'shield':
                get().updatePlayer({
                  invulnerable: true,
                  invulnerabilityTime: 5000
                });
                break;
            }
          }
        });
      },
      
      spawnEnemies: (deltaTime) => {
        const { enemies, config, level } = get();
        const now = Date.now();
        
        if (enemies.length >= config.enemies.maxOnScreen) return;
        
        const spawnRate = config.enemies.spawnRate / (1 + level * 0.1);
        
        if (!get().lastSpawnTime || now - get().lastSpawnTime > spawnRate) {
          const enemyTypes: Array<'basic' | 'fast' | 'heavy' | 'shooter' | 'boss'> = ['basic', 'fast', 'heavy'];
          if (level > 3) enemyTypes.push('shooter');
          if (level > 5 && Math.random() < 0.1) enemyTypes.push('boss');
          
          const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
          
          const enemy: Enemy = {
            id: `enemy-${Date.now()}-${Math.random()}`,
            position: {
              x: Math.random() * (config.canvas.width - 40),
              y: -50,
            },
            velocity: { x: 0, y: config.enemies.speed * (1 + level * 0.1) },
            size: enemyType === 'boss' ? { width: 60, height: 60 } : { width: 30, height: 30 },
            health: enemyType === 'boss' ? 100 : enemyType === 'heavy' ? 50 : 25,
            maxHealth: enemyType === 'boss' ? 100 : enemyType === 'heavy' ? 50 : 25,
            isActive: true,
            type: enemyType,
            points: enemyType === 'boss' ? 500 : enemyType === 'heavy' ? 100 : 50,
            shootCooldown: enemyType === 'shooter' ? 2000 : 5000,
            lastShot: 0,
            movementPattern: 'linear',
          };
          
          get().addEnemy(enemy);
          set({ lastSpawnTime: now });
        }
      },
      
      updateGameLogic: (deltaTime) => {
        const state = get();
        if (!state.isRunning || state.isPaused) return;
        
        // Update invulnerability
        if (state.player.invulnerable) {
          const newTime = Math.max(0, state.player.invulnerabilityTime - deltaTime);
          if (newTime <= 0) {
            get().updatePlayer({ invulnerable: false, invulnerabilityTime: 0 });
          } else {
            get().updatePlayer({ invulnerabilityTime: newTime });
          }
        }
        
        get().updateEnemies(deltaTime);
        get().updateBullets(deltaTime);
        get().updatePowerUps(deltaTime);
        get().updateParticles(deltaTime);
        get().updateExplosions(deltaTime);
        get().checkCollisions();
        get().spawnEnemies(deltaTime);
      },
      
      // Input Management
      updateInput: (input) => set((state) => ({
        inputState: { ...state.inputState, ...input }
      })),
      
      handleKeyDown: (key) => {
        const { settings } = get();
        const controls = settings.controls;
        
        if (key === controls.left) get().updateInput({ left: true });
        if (key === controls.right) get().updateInput({ right: true });
        if (key === controls.up) get().updateInput({ up: true });
        if (key === controls.down) get().updateInput({ down: true });
        if (key === controls.shoot) get().updateInput({ shoot: true });
        if (key === controls.pause) {
          const { gameState } = get();
          if (gameState === 'playing') get().pauseGame();
          else if (gameState === 'paused') get().resumeGame();
        }
      },
      
      handleKeyUp: (key) => {
        const { settings } = get();
        const controls = settings.controls;
        
        if (key === controls.left) get().updateInput({ left: false });
        if (key === controls.right) get().updateInput({ right: false });
        if (key === controls.up) get().updateInput({ up: false });
        if (key === controls.down) get().updateInput({ down: false });
        if (key === controls.shoot) get().updateInput({ shoot: false });
      },
      
      // Settings with Effect-TS
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),
      
      saveSettings: async () => {
        // This will be implemented with Effect-TS storage service
        console.log('Saving settings with Effect-TS...');
      },
      
      loadSettings: async () => {
        // This will be implemented with Effect-TS storage service  
        console.log('Loading settings with Effect-TS...');
      },
      
      // High Scores with Effect-TS
      addHighScore: async (score) => {
        set((state) => ({
          highScores: [...state.highScores, score]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
        }));
      },
      
      getTopScores: (limit = 10) => {
        return get().highScores
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      },
      
      // Statistics
      updateStats: (updates) => set((state) => ({
        stats: { ...state.stats, ...updates }
      })),
      
      incrementStat: (stat, amount = 1) => set((state) => ({
        stats: {
          ...state.stats,
          [stat]: (state.stats[stat] as number) + amount
        }
      })),
    }),
    {
      name: 'space-invaders-game',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        highScores: state.highScores,
        stats: state.stats,
      }),
    }
  )
); 