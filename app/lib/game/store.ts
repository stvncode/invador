import * as Runtime from "effect/Runtime"
import { match } from "ts-pattern"
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { soundManager } from './audio'
import {
  calculateLevelFromScore,
  getAttackPattern,
  getAvailableEnemyTypes,
  getEnemyStats,
  getMaxEnemiesForLevel,
  getMovementPattern,
  getSpawnRate
} from './levels'
import { isColliding } from './services'
import { SettingsOperations } from './settings'
import type {
  Bullet,
  Enemy,
  EnemyType,
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
  lastLevelCheck: number; // Track when we last checked for level advancement
  isBossBattle: boolean; // Track if we're in a boss battle
  
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
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  
  // Level Management
  checkLevelAdvancement: () => void;
  
  // Player Actions
  updatePlayer: (updates: Partial<Player>) => void;
  movePlayer: (direction: 'left' | 'right', deltaTime: number) => void;
  playerShoot: () => void;
  playerTakeDamage: (damage: number) => void;
  
  // Entity Management
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  updateEnemies: (deltaTime: number) => void;
  createEnemy: (type: EnemyType, x?: number, y?: number) => Enemy;
  
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
    maxOnScreen: 25,
  },
  bullets: {
    speed: 400,
    maxOnScreen: 100,
  },
  difficulty: {
    level: 1,
    enemySpeedMultiplier: 1,
    enemySpawnRateMultiplier: 1,
    enemyHealthMultiplier: 1,
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
  shipLevel: 1, // Start with basic ship
  shipUpgradeTime: 0, // No upgrade active initially
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
  bossesDefeated: 0,
  perfectLevels: 0,
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
      lastLevelCheck: 0,
      isBossBattle: false,
      
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

      // Game Control Actions
      startGame: () => {
        set({
          gameState: 'playing',
          isRunning: true,
          isPaused: false,
          gameTime: 0,
          level: 1,
          isBossBattle: false,
          player: createInitialPlayer(),
          enemies: [],
          bullets: [],
          powerUps: [],
          particles: [],
          explosions: [],
        });
        get().checkLevelAdvancement();
      },

      pauseGame: () => set({ gameState: 'paused', isPaused: true }),
      resumeGame: () => set({ gameState: 'playing', isPaused: false }),
      endGame: () => {
        set({ gameState: 'gameOver', isRunning: false });
      },
      resetGame: () => {
        set({
          gameTime: 0,
          level: 1,
          isBossBattle: false,
          player: createInitialPlayer(),
          enemies: [],
          bullets: [],
          powerUps: [],
          particles: [],
          explosions: [],
        });
      },

      // Level Management
      checkLevelAdvancement: () => {
        const { level, player, isBossBattle } = get();
        const nextLevel = calculateLevelFromScore(player.score);
        
        console.log(`🔍 Level Check: Current=${level}, Score=${player.score}, Calculated=${nextLevel}, BossBattle=${isBossBattle}`);
        
        // If we're in a boss battle, don't advance until boss is defeated
        if (isBossBattle) {
          const bossEnemies = get().enemies.filter(e => e.type === 'boss');
          if (bossEnemies.length === 0) {
            // Boss defeated! Advance to next level
            console.log(`🏆 Boss defeated! Advancing to level ${level + 1}`);
            set({ 
              level: level + 1,
              isBossBattle: false 
            });
            get().updateStats({ highestLevel: Math.max(get().stats.highestLevel, level + 1) });
          }
          return;
        }
        
        if (nextLevel > level) {
          console.log(`🎉 Level up! Advancing from ${level} to ${nextLevel} with ${player.score} points!`);
          
          // Check if this is a boss level
          if (nextLevel % 10 === 0) {
            console.log(`🔥 BOSS BATTLE! Level ${nextLevel} - Prepare for the ultimate challenge! 🔥`);
            set({ 
              level: nextLevel,
              isBossBattle: true 
            });
          } else {
            set({ level: nextLevel });
          }
          
          // Update stats
          get().updateStats({ highestLevel: Math.max(get().stats.highestLevel, nextLevel) });
        }
      },
      
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
        
        // Different cooldowns for different ship levels
        const cooldown = player.shipLevel >= 3 ? 100 : 200; // Laser ships fire faster
        if (now - get().lastFrameTime < cooldown) return;
        
        const baseDamage = 25 * player.weaponLevel;
        
        // Different firing patterns based on ship level
        match(player.shipLevel).with(1, () => {
            // Basic single shot
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
              damage: baseDamage,
              owner: 'player',
              bulletType: 'basic',
              piercing: false,
              explosive: false,
            };
            get().addBullet(bullet);
            get().incrementStat('totalBulletsFired');
          })
          .with(2, () => {
            // Multi-shot: 3 bullets spread
            const spreadAngle = 0.3; // Angle in radians
            for (let i = 0; i < 3; i++) {
              const angle = (i - 1) * spreadAngle; // -0.3, 0, 0.3 radians
              const bullet: Bullet = {
                id: `bullet-${Date.now()}-${Math.random()}-${i}`,
                position: {
                  x: player.position.x + player.size.width / 2 - 2,
                  y: player.position.y,
                },
                velocity: { 
                  x: Math.sin(angle) * config.bullets.speed * 0.5, 
                  y: -Math.cos(angle) * config.bullets.speed 
                },
                size: { width: 3, height: 6 }, // Smaller bullets for multi-shot
                health: 1,
                maxHealth: 1,
                isActive: true,
                damage: baseDamage * 0.8, // Slightly less damage per bullet
                owner: 'player',
                bulletType: 'multi-shot',
                piercing: false,
                explosive: false,
              };
              get().addBullet(bullet);
            }
            get().incrementStat('totalBulletsFired', 3);
          })
          .with(3, () => {
            // Laser beam: Long piercing bullet
            const bullet: Bullet = {
              id: `laser-${Date.now()}-${Math.random()}`,
              position: {
                x: player.position.x + player.size.width / 2 - 1,
                y: player.position.y,
              },
              velocity: { x: 0, y: -config.bullets.speed * 1.5 }, // Faster laser
              size: { width: 2, height: 30 }, // Long laser beam
              health: 1,
              maxHealth: 1,
              isActive: true,
              damage: baseDamage * 1.5, // More damage
              owner: 'player',
              bulletType: 'laser',
              piercing: true, // Laser can pierce through enemies
              explosive: false,
            };
            get().addBullet(bullet);
            get().incrementStat('totalBulletsFired');
          })
          .with(4, () => {
            // Dual Piercing Lasers: Two parallel laser beams
            const laserOffset = 8; // Distance between the two lasers
            for (let i = 0; i < 2; i++) {
              const bullet: Bullet = {
                id: `dual-laser-${Date.now()}-${Math.random()}-${i}`,
                position: {
                  x: player.position.x + player.size.width / 2 - 1 + (i === 0 ? -laserOffset : laserOffset),
                  y: player.position.y,
                },
                velocity: { x: 0, y: -config.bullets.speed * 1.8 }, // Even faster
                size: { width: 3, height: 35 }, // Thicker and longer laser beams
                health: 1,
                maxHealth: 1,
                isActive: true,
                damage: baseDamage * 1.8, // Maximum damage
                owner: 'player',
                bulletType: 'laser',
                piercing: true, // Piercing through enemies
                explosive: false,
              };
              get().addBullet(bullet);
            }
            get().incrementStat('totalBulletsFired', 2);
          })
          .otherwise(() => {
            // Fallback to basic shot
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
              damage: baseDamage,
              owner: 'player',
              bulletType: 'basic',
              piercing: false,
              explosive: false,
            };
            get().addBullet(bullet);
            get().incrementStat('totalBulletsFired');
          })
        
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
              invulnerabilityTime: 3000,
              shipLevel: 1, // Revert to basic ship on death
              shipUpgradeTime: 0 // Clear upgrade timer
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
        const { enemies, config, player } = get();
        const speed = config.enemies.speed * (deltaTime / 1000);
        
        set((state) => ({
          enemies: state.enemies
            .map(enemy => {
              let newVelocity = { ...enemy.velocity };
              
              // Special behaviors for different enemy types
              switch (enemy.type) {
                case 'kamikaze': {
                  // Kamikaze enemies speed up when damaged and move toward player
                  const damageRatio = 1 - (enemy.health / enemy.maxHealth);
                  const speedMultiplier = 1 + damageRatio * 2; // Up to 3x speed when heavily damaged
                  
                  // Move toward player
                  const dx = player.position.x - enemy.position.x;
                  const dy = player.position.y - enemy.position.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (distance > 0) {
                    newVelocity = {
                      x: (dx / distance) * speed * speedMultiplier,
                      y: (dy / distance) * speed * speedMultiplier,
                    };
                  }
                  break;
                }
                
                case 'shielded': {
                  // Shielded enemies have regenerating shields
                  let newShield = enemy.shield;
                  if (enemy.shield < enemy.maxShield) {
                    newShield = Math.min(enemy.maxShield, enemy.shield + 0.5 * (deltaTime / 1000));
                  }
                  
                  // Move in diagonal pattern
                  const time = Date.now() * 0.001;
                  newVelocity = {
                    x: Math.sin(time + enemy.id.charCodeAt(0)) * speed * 0.5,
                    y: speed,
                  };
                  
                  return {
                    ...enemy,
                    velocity: newVelocity,
                    shield: newShield,
                    position: {
                      x: enemy.position.x + newVelocity.x,
                      y: enemy.position.y + newVelocity.y,
                    },
                  };
                }
                
                case 'regenerator': {
                  // Regenerating enemies heal over time
                  let newHealth = enemy.health;
                  if (enemy.health < enemy.maxHealth) {
                    newHealth = Math.min(enemy.maxHealth, enemy.health + 5 * (deltaTime / 1000));
                  }
                  
                  // Evasive movement
                  const time = Date.now() * 0.002;
                  newVelocity = {
                    x: Math.sin(time + enemy.id.charCodeAt(0)) * speed * 0.8,
                    y: speed * 0.7,
                  };
                  
                  return {
                    ...enemy,
                    velocity: newVelocity,
                    health: newHealth,
                    position: {
                      x: enemy.position.x + newVelocity.x,
                      y: enemy.position.y + newVelocity.y,
                    },
                  };
                }
                
                case 'boss': {
                  // Boss enemies have complex movement patterns
                  const time = Date.now() * 0.001;
                  const phase = Math.floor(time / 5) % 4; // 4 different phases
                  
                  switch (phase) {
                    case 0: // Circle pattern
                      newVelocity = {
                        x: Math.cos(time) * speed * 0.5,
                        y: speed * 0.3,
                      };
                      break;
                    case 1: // Side to side
                      newVelocity = {
                        x: Math.sin(time * 2) * speed * 0.8,
                        y: speed * 0.2,
                      };
                      break;
                    case 2: // Aggressive approach
                      const dx = player.position.x - enemy.position.x;
                      const dy = player.position.y - enemy.position.y;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      if (distance > 0) {
                        newVelocity = {
                          x: (dx / distance) * speed * 0.4,
                          y: (dy / distance) * speed * 0.4,
                        };
                      }
                      break;
                    case 3: // Retreat and shoot
                      newVelocity = {
                        x: Math.sin(time) * speed * 0.3,
                        y: -speed * 0.2, // Move up slightly
                      };
                      break;
                  }
                  break;
                }
                
                default: {
                  // Standard movement
                  newVelocity = { x: 0, y: speed };
                  break;
                }
              }
              
              // Update position
              return {
                ...enemy,
                velocity: newVelocity,
                position: {
                  x: enemy.position.x + newVelocity.x,
                  y: enemy.position.y + newVelocity.y,
                },
              };
            })
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
                   powerUp.type === 'weapon' ? '#0000ff' : 
                   powerUp.type === 'ship' ? '#ff00ff' : '#ffff00',
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
              // Only remove bullet if it's not piercing
              if (!bullet.piercing) {
                get().removeBullet(bullet.id);
              }
              
              let damageDealt = bullet.damage;
              let newHealth = enemy.health;
              let newShield = enemy.shield;
              
              // Handle shielded enemies
              if (enemy.shield > 0) {
                if (enemy.shield >= bullet.damage) {
                  // Shield absorbs all damage
                  newShield = enemy.shield - bullet.damage;
                  damageDealt = 0;
                } else {
                  // Shield breaks, remaining damage goes to health
                  damageDealt = bullet.damage - enemy.shield;
                  newShield = 0;
                }
              }
              
              // Apply remaining damage to health
              if (damageDealt > 0) {
                newHealth = enemy.health - damageDealt;
              }
              
              if (newHealth <= 0) {
                get().removeEnemy(enemy.id);
                get().updatePlayer({ 
                  score: player.score + enemy.points 
                });
                get().incrementStat('totalEnemiesDestroyed');
                
                // Play explosion sound (louder for bosses)
                if (enemy.type === 'boss') {
                  soundManager.playSound('boss-explosion'); // Boss explosion
                  console.log(`💥 Boss defeated! Epic explosion!`);
                } else {
                  soundManager.playSound('explosion'); // Regular explosion
                }
                
                // Check for level advancement after score update
                get().checkLevelAdvancement();
                
                // Special behavior for splitting enemies
                if (enemy.type === 'regenerator') {
                  // Create 2 smaller enemies when destroyed
                  for (let i = 0; i < 2; i++) {
                    const baseEnemy = get().createEnemy('swarm', 
                      enemy.position.x + (i * 20) - 10, 
                      enemy.position.y + 20
                    );
                    // Create new enemy with reduced stats
                    const splitEnemy = {
                      ...baseEnemy,
                      health: Math.floor(enemy.health * 0.3),
                      maxHealth: Math.floor(enemy.health * 0.3),
                      points: Math.floor(enemy.points * 0.2),
                      size: { width: 20, height: 20 },
                    };
                    get().addEnemy(splitEnemy);
                  }
                }
                
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
                  const powerUpTypes: Array<'health' | 'weapon' | 'shield' | 'ship'> = ['health', 'weapon', 'shield', 'ship'];
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
                    rarity: 'common',
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
                // Enemy survives, update its health and shield
                set((state) => ({
                  enemies: state.enemies.map(e => 
                    e.id === enemy.id ? { 
                      ...e, 
                      health: newHealth,
                      shield: newShield
                    } : e
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
            
            match(powerUp.type).with('health', () => {
                get().updatePlayer({
                  health: Math.min(player.maxHealth, player.health + 25)
                });
              })
              .with('weapon', () => {
                get().updatePlayer({
                  weaponLevel: Math.min(10, player.weaponLevel + 1)
                });
              })
              .with('shield', () => {
                get().updatePlayer({
                  invulnerable: true,
                  invulnerabilityTime: 5000
                });
              })
              .with('ship', () => {
                // Randomly assign ship level 2, 3, or 4 for temporary upgrade
                const availableLevels = [2, 3, 4];
                const randomShipLevel = availableLevels[Math.floor(Math.random() * availableLevels.length)];
                const upgradeDuration = 7000 + Math.random() * 2000; // 7-9 seconds
                
                const wasAlreadyUpgraded = player.shipLevel > 1;
                const previousLevel = player.shipLevel;
                
                get().updatePlayer({
                  shipLevel: randomShipLevel,
                  shipUpgradeTime: upgradeDuration
                });
                
                // Show upgrade message based on new ship level
                const shipNames = ['', 'Basic Fighter', 'Multi-Shot Cruiser', 'Laser Destroyer', 'Dual Laser Annihilator'];
                if (wasAlreadyUpgraded) {
                  if (randomShipLevel === previousLevel) {
                    console.log(`🔄 Ship upgrade refreshed: ${shipNames[randomShipLevel]} for ${Math.round(upgradeDuration/1000)}s!`);
                  } else {
                    console.log(`🚀 Ship upgraded from Level ${previousLevel} to Level ${randomShipLevel}: ${shipNames[randomShipLevel]} for ${Math.round(upgradeDuration/1000)}s!`);
                  }
                } else {
                  console.log(`🚀 Temporary ship upgrade to Level ${randomShipLevel}: ${shipNames[randomShipLevel]} for ${Math.round(upgradeDuration/1000)}s!`);
                }
                
                // Create extra upgrade particles for ship upgrades
                for (let i = 0; i < 8; i++) {
                  get().addParticle({
                    id: `ship-upgrade-particle-${Date.now()}-${i}`,
                    position: {
                      x: player.position.x + player.size.width / 2,
                      y: player.position.y + player.size.height / 2,
                    },
                    velocity: {
                      x: (Math.random() - 0.5) * 150,
                      y: -Math.random() * 150 - 100,
                    },
                    size: { width: 4, height: 4 },
                    health: 1,
                    maxHealth: 1,
                    isActive: true,
                    lifetime: 0,
                    maxLifetime: 1000,
                    color: '#ff00ff',
                    alpha: 1,
                  });
                }
              })
              .otherwise(() => {});
          }
        });
      },

      // Entity Management
      createEnemy: (type, x, y) => {
        const { level, config } = get();
        const stats = getEnemyStats(type, level);
        const movementPattern = getMovementPattern(type);
        const attackPattern = getAttackPattern(type);
        
        // Special size adjustments for different enemy types
        let size = { width: 35, height: 35 };
        if (type.includes('boss')) {
          size = { width: 80, height: 80 };
        } else if (type === 'heavy') {
          size = { width: 45, height: 45 };
        } else if (type === 'kamikaze') {
          size = { width: 30, height: 30 };
        } else if (type === 'shielded') {
          size = { width: 40, height: 40 };
        } else if (type === 'swarm') {
          size = { width: 25, height: 25 };
        }
        
        return {
          id: `enemy-${Date.now()}-${Math.random()}`,
          position: {
            x: x ?? Math.random() * (config.canvas.width - size.width),
            y: y ?? -50,
          },
          velocity: { 
            x: 0, 
            y: stats.speed * config.difficulty.enemySpeedMultiplier * (1 / 60) 
          },
          size,
          health: stats.health,
          maxHealth: stats.health,
          isActive: true,
          type,
          points: stats.points,
          shootCooldown: type === 'shooter' ? 2000 : type.includes('boss') ? 1500 : 5000,
          lastShot: 0,
          movementPattern,
          attackPattern,
          level,
          armor: stats.armor,
          shield: stats.shield,
          maxShield: stats.shield,
          specialAbilityCharge: 100,
          spawnTime: Date.now(),
          lastAbilityUse: 0,
        };
      },

      spawnEnemies: (deltaTime) => {
        const { enemies, level, isBossBattle, config } = get();
        const now = Date.now();
        
        // If we're in a boss battle, only spawn boss if none exists
        if (isBossBattle) {
          const bossEnemies = enemies.filter(e => e.type === 'boss');
          if (bossEnemies.length === 0) {
            // Spawn the boss
            const boss = get().createEnemy('boss', config.canvas.width / 2 - 40, -80);
            get().addEnemy(boss);
            console.log(`👹 Boss spawned at level ${level}!`);
          }
          return; // Don't spawn other enemies during boss battle
        }
        
        const maxEnemies = getMaxEnemiesForLevel(level);
        if (enemies.length >= maxEnemies) return;
        
        const spawnRate = getSpawnRate(level);
        
        if (!get().lastSpawnTime || now - get().lastSpawnTime > spawnRate) {
          const availableTypes = getAvailableEnemyTypes(level);
          const enemyType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
          
          const enemy = get().createEnemy(enemyType);
          get().addEnemy(enemy);
          set({ lastSpawnTime: now });
        }
      },
      
      updateGameLogic: (deltaTime) => {
        const state = get();
        if (!state.isRunning || state.isPaused) return;
        
        // Update player timers
        const player = state.player;
        if (player.invulnerabilityTime > 0) {
          const newInvulnerabilityTime = Math.max(0, player.invulnerabilityTime - deltaTime);
          if (newInvulnerabilityTime === 0) {
            get().updatePlayer({ 
              invulnerable: false, 
              invulnerabilityTime: 0 
            });
          } else {
            get().updatePlayer({ invulnerabilityTime: newInvulnerabilityTime });
          }
        }
        
        if (player.shipUpgradeTime > 0) {
          const newShipUpgradeTime = Math.max(0, player.shipUpgradeTime - deltaTime);
          if (newShipUpgradeTime === 0) {
            get().updatePlayer({ 
              shipLevel: 1, 
              shipUpgradeTime: 0 
            });
            console.log('🔄 Ship upgrade expired - back to basic fighter');
          } else {
            get().updatePlayer({ shipUpgradeTime: newShipUpgradeTime });
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
        try {
          const settings = get().settings;
          await Runtime.runPromise(runtime)(
            SettingsOperations.saveSettings(settings)
          );
          console.log('✅ Settings saved successfully with Effect-TS');
        } catch (error) {
          console.error('❌ Failed to save settings:', error);
        }
      },
      
      loadSettings: async () => {
        try {
          const loadedSettings = await Runtime.runPromise(runtime)(
            SettingsOperations.loadSettings()
          );
          set((state) => ({ 
            ...state,
            settings: loadedSettings 
          }));
          console.log('✅ Settings loaded successfully with Effect-TS');
        } catch (error) {
          console.error('❌ Failed to load settings:', error);
          // Keep current settings on error
        }
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