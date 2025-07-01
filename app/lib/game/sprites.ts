// Simple sprite management system with Effect-TS architecture
// but synchronous operations for game performance

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

// ===== Default Sprite Configurations =====
export const defaultSpriteConfigs = [
  // Player ship sprites - 4 tiers
  { name: 'ship1', path: '/ship/ship1.png' },
  { name: 'ship1-boost', path: '/ship/boost1.png' },
  { name: 'ship2', path: '/ship/ship2.png' },
  { name: 'ship2-boost', path: '/ship/boost2.png' },
  { name: 'ship3', path: '/ship/ship3.png' },
  { name: 'ship3-boost', path: '/ship/boost3.png' },
  { name: 'ship4', path: '/ship/ship4.png' },
  { name: 'ship4-boost', path: '/ship/boost4.png' },
  // Legacy fallback
  { name: 'player', path: '/ship.png' },
  // Enemy sprites
  { name: 'boss', path: '/enemies/boss.png' },
  { name: 'basic-enemy', path: '/enemies/basic-enemy.png' },
  { name: 'fast-enemy', path: '/enemies/fast-enemy.png' },
  { name: 'shooter-enemy', path: '/enemies/shooter-enemy.png' },
  { name: 'heavy-enemy', path: '/enemies/heavy-enemy.png' },
  { name: 'kamikaze-enemy', path: '/enemies/kamikaze.png' },
  { name: 'shielded-enemy', path: '/enemies/shielded.png' },
  { name: 'spliting-enemy', path: '/enemies/spliting.png' },
  // Power-up sprites
  { name: 'health-powerup', path: '/power-up/health.png' },
  { name: 'shield-powerup', path: '/power-up/shield.png' },
  { name: 'weapon-powerup', path: '/power-up/weapon.png' },
  { name: 'ship-powerup', path: '/power-up/ship.png' },
  { name: 'time-slow-powerup', path: '/power-up/time-slow.png' },
  { name: 'auto-shoot-powerup', path: '/power-up/auto-shoot.png' },
  { name: 'blast-powerup', path: '/power-up/blast.png' },
  // Explosion animation frames
  { name: 'explosion1', path: '/explosion/explosion.png' },
  { name: 'explosion2', path: '/explosion/explosion2.png' },
  { name: 'explosion3', path: '/explosion/explosion3.png' },
  { name: 'explosion4', path: '/explosion/explosion4.png' },
  { name: 'explosion5', path: '/explosion/explosion5.png' },
  { name: 'explosion6', path: '/explosion/explosion6.png' },
  { name: 'explosion7', path: '/explosion/explosion7.png' },
  // UI assets
  { name: 'logo', path: '/logo.png' },
  { name: 'home-bg', path: '/home-bg.png' },
  { name: 'hud-bg', path: '/hud-bg.png' },
  { name: 'page-bg', path: '/page-bg.png' },
]

export interface SpriteInfo {
  image: HTMLImageElement
  width: number
  height: number
  loaded: boolean
}

// Simple cached sprite storage
const loadedSprites = new Map<string, SpriteInfo>()

const loadSprite = async (name: string, path: string): Promise<void> => {
  if (loadedSprites.has(name)) return

  return new Promise((resolve, reject) => {
    const image = new Image()
    
    image.onload = () => {
      const spriteInfo: SpriteInfo = {
        image,
        width: image.width,
        height: image.height,
        loaded: true,
      }
      loadedSprites.set(name, spriteInfo)
      resolve()
    }

    image.onerror = () => {
      console.warn(`Failed to load sprite: ${name} from ${path}`)
      resolve() // Don't reject, just continue
    }

    image.src = path
  })
}

const loadAllSprites = async (): Promise<void> => {
  console.log('Loading sprites...')
  try {
    await Promise.all(
      defaultSpriteConfigs.map(config => loadSprite(config.name, config.path))
    )
    console.log('All sprites loaded successfully!')
  } catch (error) {
    console.error('Error loading sprites:', error)
  }
}

const getSprite = (name: string): SpriteInfo | null => {
  return loadedSprites.get(name) || null
}

const isLoaded = (name: string): boolean => {
  const sprite = loadedSprites.get(name)
  return sprite ? sprite.loaded : false
}

const getAllLoadedSprites = (): string[] => {
  return Array.from(loadedSprites.keys()).filter(name => isLoaded(name))
}

const drawSprite = (
  ctx: CanvasRenderingContext2D,
  spriteName: string,
  x: number,
  y: number,
  width?: number,
  height?: number,
  rotation: number = 0
): boolean => {
  const sprite = getSprite(spriteName)
  if (!sprite || !sprite.loaded) {
    return false
  }

  try {
    const drawWidth = width || sprite.width
    const drawHeight = height || sprite.height

    if (rotation !== 0) {
      ctx.save()
      ctx.translate(x + drawWidth / 2, y + drawHeight / 2)
      ctx.rotate(rotation)
      ctx.drawImage(sprite.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      ctx.restore()
    } else {
      ctx.drawImage(sprite.image, x, y, drawWidth, drawHeight)
    }
    return true
  } catch (error) {
    console.warn(`Error drawing sprite ${spriteName}:`, error)
    return false
  }
}

const parseSpriteSheet = (
  image: HTMLImageElement, 
  shipsPerRow: number = 4,
  bulletOffset: number = 32
) => {
  const shipWidth = 32
  const shipHeight = 32
  const bulletWidth = 8
  const bulletHeight = 16
  
  return {
    getShipSprite: (shipIndex: number) => ({
      x: (shipIndex % shipsPerRow) * (shipWidth + bulletOffset),
      y: Math.floor(shipIndex / shipsPerRow) * shipHeight,
      width: shipWidth,
      height: shipHeight
    }),
    getBulletSprite: (shipIndex: number) => ({
      x: (shipIndex % shipsPerRow) * (shipWidth + bulletOffset) + shipWidth,
      y: Math.floor(shipIndex / shipsPerRow) * shipHeight + (shipHeight - bulletHeight) / 2,
      width: bulletWidth,
      height: bulletHeight
    })
  }
}

// ===== Effect-TS Service Interface =====
export interface SpriteService {
  readonly loadSprite: (name: string, path: string) => Effect.Effect<void, never>
  readonly loadAllSprites: () => Effect.Effect<void, never>
  readonly getSprite: (name: string) => Effect.Effect<SpriteInfo | null, never>
  readonly isLoaded: (name: string) => Effect.Effect<boolean, never>
  readonly getAllLoadedSprites: () => Effect.Effect<string[], never>
  readonly drawSprite: (
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    rotation?: number
  ) => Effect.Effect<boolean, never>
}

export const SpriteService = Context.GenericTag<SpriteService>("SpriteService")

const makeSpriteService = (): SpriteService => ({
  loadSprite: (name, path) => Effect.promise(() => loadSprite(name, path)),
  loadAllSprites: () => Effect.promise(() => loadAllSprites()),
  getSprite: (name) => Effect.sync(() => getSprite(name)),
  isLoaded: (name) => Effect.sync(() => isLoaded(name)),
  getAllLoadedSprites: () => Effect.sync(() => getAllLoadedSprites()),
  drawSprite: (ctx, spriteName, x, y, width, height, rotation) =>
    Effect.sync(() => drawSprite(ctx, spriteName, x, y, width, height, rotation)),
})

export const SpriteServiceLayer = Layer.succeed(SpriteService, makeSpriteService())

// Export sprite manager
export const spriteManager = {
  loadSprite,
  loadAllSprites,
  getSprite,
  isLoaded,
  getAllLoadedSprites,
  drawSprite,
  parseSpriteSheet,
} 