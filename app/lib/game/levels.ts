import type { AttackPattern, EnemyType, LevelConfig, MovementPattern } from './types'

// Simple mathematical level progression
export const LEVEL_PROGRESSION = {
  EARLY_POINTS_PER_LEVEL: 1000, // First 5 levels: every 1000 points
  LATE_POINTS_MULTIPLIER: 1.5, // After level 5: 1.5x more points needed each level
  HEALTH_MULTIPLIER_PER_LEVEL: 1.2, // 20% more health per level
  SPEED_MULTIPLIER_PER_LEVEL: 1.1, // 10% faster per level
  POINTS_MULTIPLIER_PER_LEVEL: 1.15, // 15% more points per level
}

// Calculate what level the player should be at based on score
export const calculateLevelFromScore = (score: number): number => {
  if (score < LEVEL_PROGRESSION.EARLY_POINTS_PER_LEVEL * 5) {
    // First 5 levels: simple division
    return Math.floor(score / LEVEL_PROGRESSION.EARLY_POINTS_PER_LEVEL) + 1
  } else {
    // After level 5: exponential scaling
    const baseScore = LEVEL_PROGRESSION.EARLY_POINTS_PER_LEVEL * 5 // 5000 points for level 5
    const remainingScore = score - baseScore
    
    // Calculate additional levels with increasing requirements
    let currentLevel = 5
    let currentRequirement = LEVEL_PROGRESSION.EARLY_POINTS_PER_LEVEL * LEVEL_PROGRESSION.LATE_POINTS_MULTIPLIER // 1500 for level 6
    let totalUsed = 0
    
    while (totalUsed + currentRequirement <= remainingScore) {
      totalUsed += currentRequirement
      currentLevel++
      currentRequirement *= LEVEL_PROGRESSION.LATE_POINTS_MULTIPLIER // Each level requires 1.5x more
    }
    
    return currentLevel
  }
}

// Calculate score needed for next level
export const getScoreForNextLevel = (currentLevel: number): number => {
  if (currentLevel <= 5) {
    return currentLevel * LEVEL_PROGRESSION.EARLY_POINTS_PER_LEVEL
  } else {
    // Calculate cumulative score needed
    let totalScore = LEVEL_PROGRESSION.EARLY_POINTS_PER_LEVEL * 5 // First 5 levels
    let requirement = LEVEL_PROGRESSION.EARLY_POINTS_PER_LEVEL * LEVEL_PROGRESSION.LATE_POINTS_MULTIPLIER
    
    for (let level = 6; level <= currentLevel; level++) {
      totalScore += requirement
      requirement *= LEVEL_PROGRESSION.LATE_POINTS_MULTIPLIER
    }
    
    return totalScore
  }
}

// Enemy stats templates for different levels
export const getEnemyStats = (type: EnemyType, level: number) => {
  const baseStats = {
    basic: { health: 25, points: 50, speed: 80, armor: 0, shield: 0 },
    fast: { health: 15, points: 75, speed: 150, armor: 0, shield: 0 },
    heavy: { health: 75, points: 100, speed: 50, armor: 2, shield: 0 },
    shooter: { health: 40, points: 125, speed: 70, armor: 0, shield: 0 },
    kamikaze: { health: 20, points: 80, speed: 200, armor: 0, shield: 0 },
    shielded: { health: 50, points: 150, speed: 60, armor: 1, shield: 25 },
    regenerator: { health: 60, points: 175, speed: 65, armor: 0, shield: 0 },
    swarm: { health: 10, points: 25, speed: 120, armor: 0, shield: 0 },
    elite: { health: 100, points: 200, speed: 90, armor: 2, shield: 50 },
    'mini-boss': { health: 200, points: 500, speed: 80, armor: 3, shield: 100 },
    boss: { health: 500, points: 1000, speed: 60, armor: 5, shield: 200 },
    'mega-boss': { health: 1000, points: 2500, speed: 70, armor: 8, shield: 400 },
  }

  const base = baseStats[type]
  const healthMultiplier = Math.pow(LEVEL_PROGRESSION.HEALTH_MULTIPLIER_PER_LEVEL, level - 1)
  const speedMultiplier = Math.pow(LEVEL_PROGRESSION.SPEED_MULTIPLIER_PER_LEVEL, level - 1)
  const pointsMultiplier = Math.pow(LEVEL_PROGRESSION.POINTS_MULTIPLIER_PER_LEVEL, level - 1)
  
  return {
    health: Math.floor(base.health * healthMultiplier),
    maxHealth: Math.floor(base.health * healthMultiplier),
    points: Math.floor(base.points * pointsMultiplier),
    speed: Math.floor(base.speed * speedMultiplier),
    armor: base.armor + Math.floor(level / 3),
    shield: Math.floor(base.shield * healthMultiplier),
    maxShield: Math.floor(base.shield * healthMultiplier),
  }
}

// Movement patterns for different enemy types
export const getMovementPattern = (type: EnemyType): MovementPattern => {
  const patterns: Record<EnemyType, MovementPattern> = {
    basic: 'linear',
    fast: 'zigzag',
    heavy: 'linear',
    shooter: 'sine',
    kamikaze: 'aggressive',
    shielded: 'diagonal',
    regenerator: 'evasive',
    swarm: 'formation',
    elite: 'circle',
    'mini-boss': 'sine',
    boss: 'circle',
    'mega-boss': 'teleport',
  }
  return patterns[type]
}

// Attack patterns for different enemy types
export const getAttackPattern = (type: EnemyType): AttackPattern => {
  const patterns: Record<EnemyType, AttackPattern> = {
    basic: 'none',
    fast: 'none',
    heavy: 'single',
    shooter: 'burst',
    kamikaze: 'none',
    shielded: 'single',
    regenerator: 'spread',
    swarm: 'none',
    elite: 'homing',
    'mini-boss': 'missile',
    boss: 'laser',
    'mega-boss': 'spawn-minions',
  }
  return patterns[type]
}

// Get available enemy types for a given level
export const getAvailableEnemyTypes = (level: number): EnemyType[] => {
  const types: EnemyType[] = ['basic']
  
  if (level >= 2) types.push('fast')
  if (level >= 3) types.push('heavy')
  if (level >= 4) types.push('shooter')
  if (level >= 5) types.push('kamikaze')
  if (level >= 6) types.push('shielded')
  if (level >= 7) types.push('regenerator')
  if (level >= 8) types.push('elite')
  if (level >= 9) types.push('swarm')
  if (level >= 10 && Math.random() < 0.1) types.push('mini-boss') // 10% chance
  if (level >= 15 && Math.random() < 0.05) types.push('boss') // 5% chance
  if (level >= 20 && Math.random() < 0.02) types.push('mega-boss') // 2% chance
  
  return types
}

// Get spawn rate for a given level (gets faster as level increases)
export const getSpawnRate = (level: number): number => {
  const baseRate = 2000 // 2 seconds
  const reductionPerLevel = 50 // 50ms faster per level
  const minRate = 400 // Minimum 400ms between spawns
  
  return Math.max(minRate, baseRate - (level - 1) * reductionPerLevel)
}

// Get max enemies on screen for a given level
export const getMaxEnemiesForLevel = (level: number): number => {
  const baseMax = 8
  const increasePerLevel = 1
  const maxLimit = 25
  
  return Math.min(maxLimit, baseMax + Math.floor((level - 1) / 2) * increasePerLevel)
}

// Simple level info for display
export const getLevelInfo = (level: number) => {
  const levelNames = [
    "First Contact",
    "Speed Demons", 
    "Heavy Artillery",
    "Return Fire",
    "Guardian Zone",
    "Chaos Theory",
    "Kamikaze Run",
    "Shielded Assault", 
    "Living Machines",
    "The Gauntlet",
    // After level 10, generate names
  ]
  
  if (level <= levelNames.length) {
    return {
      name: levelNames[level - 1],
      description: `Level ${level}`,
    }
  }
  
  // Generate names for higher levels
  const cycle = Math.floor((level - 11) / 10) + 1
  const position = ((level - 11) % 10) + 1
  
  return {
    name: `Sector ${cycle}-${position}`,
    description: `Deep Space Combat`,
  }
}

// Check if player should advance to next level (simple math-based)
export const canAdvanceToLevel = (currentLevel: number, score: number): boolean => {
  const calculatedLevel = calculateLevelFromScore(score)
  return calculatedLevel > currentLevel
}

// Legacy function for compatibility - now uses simple math
export const getLevelConfig = (levelNumber: number): LevelConfig => {
  const info = getLevelInfo(levelNumber)
  
  return {
    levelNumber,
    name: info.name,
    description: info.description,
    waves: [], // Not used in simple system
    requiredScore: getScoreForNextLevel(levelNumber - 1),
    background: `space-${((levelNumber - 1) % 3) + 1}`,
    music: levelNumber % 5 === 0 ? 'boss1' : 'level1',
    powerUpChance: Math.max(0.1, 0.3 - levelNumber * 0.01),
    difficultyMultiplier: 1 + (levelNumber - 1) * 0.2,
  }
} 