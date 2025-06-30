import * as S from "@effect/schema/Schema";

// Core geometric types
export const Position = S.Struct({
  x: S.Number,
  y: S.Number,
});

export const Velocity = S.Struct({
  x: S.Number,
  y: S.Number,
});

export const Size = S.Struct({
  width: S.Number,
  height: S.Number,
});

// Game entity base
export const Entity = S.Struct({
  id: S.String,
  position: Position,
  velocity: Velocity,
  size: Size,
  health: S.Number,
  maxHealth: S.Number,
  isActive: S.Boolean,
});

// Player entity
export const Player = S.extend(Entity, S.Struct({
  score: S.Number,
  lives: S.Number,
  weaponLevel: S.Number,
  shipLevel: S.Number, // 1, 2, or 3 for different ship tiers
  invulnerable: S.Boolean,
  invulnerabilityTime: S.Number,
}));

// Enhanced enemy types and patterns
export const EnemyType = S.Literal(
  "basic", "fast", "heavy", "shooter", "kamikaze", "shielded", "regenerator",
  "mini-boss", "boss", "mega-boss", "swarm", "elite"
);

export const MovementPattern = S.Literal(
  "linear", "sine", "zigzag", "spiral", "stationary", "diagonal", 
  "circle", "formation", "aggressive", "evasive", "teleport"
);

export const AttackPattern = S.Literal(
  "none", "single", "burst", "spread", "homing", "laser", "missile",
  "shield-break", "emp", "spawn-minions"
);

export const Enemy = S.extend(Entity, S.Struct({
  type: EnemyType,
  points: S.Number,
  shootCooldown: S.Number,
  lastShot: S.Number,
  movementPattern: MovementPattern,
  attackPattern: AttackPattern,
  level: S.Number,
  armor: S.Number,
  shield: S.Number,
  maxShield: S.Number,
  specialAbilityCharge: S.Number,
  spawnTime: S.Number,
  lastAbilityUse: S.Number,
}));

// Level progression system
export const WaveType = S.Literal("normal", "elite", "boss", "survival", "swarm");

export const EnemyWave = S.Struct({
  type: WaveType,
  enemies: S.Array(S.Struct({
    type: EnemyType,
    count: S.Number,
    spawnDelay: S.Number,
    formation: S.optional(S.String),
  })),
  duration: S.Number,
  spawnRate: S.Number,
  difficulty: S.Number,
});

export const LevelConfig = S.Struct({
  levelNumber: S.Number,
  name: S.String,
  description: S.String,
  waves: S.Array(EnemyWave),
  bossWave: S.optional(EnemyWave),
  requiredScore: S.Number,
  timeLimit: S.optional(S.Number),
  background: S.String,
  music: S.String,
  powerUpChance: S.Number,
  difficultyMultiplier: S.Number,
});

// Bullet types
export const BulletType = S.Literal(
  "basic", "laser", "spread", "homing", "piercing", "explosive", "plasma", "energy", "multi-shot"
);
export const BulletOwner = S.Literal("player", "enemy");

export const Bullet = S.extend(Entity, S.Struct({
  damage: S.Number,
  owner: BulletOwner,
  bulletType: BulletType,
  piercing: S.Boolean,
  explosive: S.Boolean,
  homingTarget: S.optional(S.String),
}));

// Enhanced power-ups
export const PowerUpType = S.Literal(
  "health", "weapon", "shield", "ship", "multishot", "speed", "rapid-fire", 
  "piercing", "homing", "extra-life", "score-boost", "invincibility"
);

export const PowerUp = S.extend(Entity, S.Struct({
  type: PowerUpType,
  duration: S.Number,
  rarity: S.Literal("common", "rare", "epic", "legendary"),
}));

// Particles for effects
export const Particle = S.extend(Entity, S.Struct({
  lifetime: S.Number,
  maxLifetime: S.Number,
  color: S.String,
  alpha: S.Number,
}));

// Explosion animation
export const Explosion = S.Struct({
  id: S.String,
  position: Position,
  size: Size,
  currentFrame: S.Number,
  totalFrames: S.Number,
  frameTime: S.Number,
  lifetime: S.Number,
  isActive: S.Boolean,
});

// Game state management
export const GameState = S.Literal("menu", "playing", "paused", "gameOver", "settings", "highScores", "levelTransition");

// Enhanced game configuration
export const GameConfig = S.Struct({
  canvas: S.Struct({
    width: S.Number,
    height: S.Number,
  }),
  player: S.Struct({
    speed: S.Number,
    size: Size,
    maxLives: S.Number,
    invulnerabilityDuration: S.Number,
  }),
  enemies: S.Struct({
    spawnRate: S.Number,
    speed: S.Number,
    maxOnScreen: S.Number,
  }),
  bullets: S.Struct({
    speed: S.Number,
    maxOnScreen: S.Number,
  }),
  difficulty: S.Struct({
    level: S.Number,
    enemySpeedMultiplier: S.Number,
    enemySpawnRateMultiplier: S.Number,
    enemyHealthMultiplier: S.Number,
    scoreMultiplier: S.Number,
  }),
});

// High scores and statistics
export const HighScore = S.Struct({
  id: S.String,
  playerName: S.String,
  score: S.Number,
  level: S.Number,
  date: S.String,
  duration: S.Number,
});

export const GameStats = S.Struct({
  totalEnemiesDestroyed: S.Number,
  totalBulletsFired: S.Number,
  totalPowerUpsCollected: S.Number,
  highestLevel: S.Number,
  totalPlayTime: S.Number,
  accuracy: S.Number,
  bossesDefeated: S.Number,
  perfectLevels: S.Number,
});

// Input handling
export const InputState = S.Struct({
  left: S.Boolean,
  right: S.Boolean,
  up: S.Boolean,
  down: S.Boolean,
  shoot: S.Boolean,
  pause: S.Boolean,
});

// Audio settings
export const AudioSettings = S.Struct({
  masterVolume: S.Number,
  musicVolume: S.Number,
  sfxVolume: S.Number,
  muted: S.Boolean,
});

// Game settings
export const GameSettings = S.Struct({
  audio: AudioSettings,
  graphics: S.Struct({
    particles: S.Boolean,
    screenShake: S.Boolean,
    vsync: S.Boolean,
  }),
  controls: S.Record({ key: S.String, value: S.String }),
  difficulty: S.Literal("easy", "normal", "hard", "nightmare"),
});

// Complete game state
export const GameData = S.Struct({
  gameState: GameState,
  isRunning: S.Boolean,
  isPaused: S.Boolean,
  gameTime: S.Number,
  level: S.Number,
  currentWave: S.Number,
  waveEnemiesRemaining: S.Number,
  levelTransitionTime: S.Number,
  player: Player,
  enemies: S.Array(Enemy),
  bullets: S.Array(Bullet),
  powerUps: S.Array(PowerUp),
  particles: S.Array(Particle),
  inputState: InputState,
  config: GameConfig,
  settings: GameSettings,
  highScores: S.Array(HighScore),
  stats: GameStats,
  lastFrameTime: S.Number,
  deltaTime: S.Number,
  lastSpawnTime: S.Number,
});

// Type exports for use in components
export type Position = S.Schema.Type<typeof Position>;
export type Velocity = S.Schema.Type<typeof Velocity>;
export type Size = S.Schema.Type<typeof Size>;
export type Entity = S.Schema.Type<typeof Entity>;
export type Player = S.Schema.Type<typeof Player>;
export type Enemy = S.Schema.Type<typeof Enemy>;
export type Bullet = S.Schema.Type<typeof Bullet>;
export type PowerUp = S.Schema.Type<typeof PowerUp>;
export type Particle = S.Schema.Type<typeof Particle>;
export type Explosion = S.Schema.Type<typeof Explosion>;
export type GameState = S.Schema.Type<typeof GameState>;
export type GameConfig = S.Schema.Type<typeof GameConfig>;
export type HighScore = S.Schema.Type<typeof HighScore>;
export type GameStats = S.Schema.Type<typeof GameStats>;
export type InputState = S.Schema.Type<typeof InputState>;
export type AudioSettings = S.Schema.Type<typeof AudioSettings>;
export type GameSettings = S.Schema.Type<typeof GameSettings>;
export type GameData = S.Schema.Type<typeof GameData>;
export type EnemyType = S.Schema.Type<typeof EnemyType>;
export type MovementPattern = S.Schema.Type<typeof MovementPattern>;
export type AttackPattern = S.Schema.Type<typeof AttackPattern>;
export type BulletType = S.Schema.Type<typeof BulletType>;
export type BulletOwner = S.Schema.Type<typeof BulletOwner>;
export type PowerUpType = S.Schema.Type<typeof PowerUpType>;
export type WaveType = S.Schema.Type<typeof WaveType>;
export type EnemyWave = S.Schema.Type<typeof EnemyWave>;
export type LevelConfig = S.Schema.Type<typeof LevelConfig>; 