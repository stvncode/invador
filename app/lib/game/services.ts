import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { AudioService, AudioServiceLayer } from './audio'
import { SettingsServiceLayer } from './settings'
import { SpriteService, SpriteServiceLayer } from './sprites'
import { LocalStorageServiceLayer, StorageService } from './storage'

// ===== Error Types =====
export interface GameLogicError {
  readonly _tag: "GameLogicError"
  readonly message: string
  readonly cause?: unknown
}

export const createGameLogicError = (message: string, cause?: unknown): GameLogicError => ({
  _tag: "GameLogicError" as const,
  message,
  cause,
})

// ===== Collision Detection Service =====
export interface CollisionService {
  readonly isColliding: (
    a: { position: { x: number; y: number }; size: { width: number; height: number } },
    b: { position: { x: number; y: number }; size: { width: number; height: number } }
  ) => Effect.Effect<boolean, never>
  readonly getDistance: (
    a: { position: { x: number; y: number } },
    b: { position: { x: number; y: number } }
  ) => Effect.Effect<number, never>
  readonly isInBounds: (
    entity: { position: { x: number; y: number }; size: { width: number; height: number } },
    bounds: { width: number; height: number }
  ) => Effect.Effect<boolean, never>
}

export const CollisionService = Context.GenericTag<CollisionService>("CollisionService")

const makeCollisionService = (): CollisionService => ({
  isColliding: (a, b) =>
    Effect.sync(() => {
      return (
        a.position.x < b.position.x + b.size.width &&
        a.position.x + a.size.width > b.position.x &&
        a.position.y < b.position.y + b.size.height &&
        a.position.y + a.size.height > b.position.y
      )
    }),

  getDistance: (a, b) =>
    Effect.sync(() => {
      const dx = b.position.x - a.position.x
      const dy = b.position.y - a.position.y
      return Math.sqrt(dx * dx + dy * dy)
    }),

  isInBounds: (entity, bounds) =>
    Effect.sync(() => {
      return (
        entity.position.x >= 0 &&
        entity.position.y >= 0 &&
        entity.position.x + entity.size.width <= bounds.width &&
        entity.position.y + entity.size.height <= bounds.height
      )
    }),
})

export const CollisionServiceLayer = Layer.succeed(CollisionService, makeCollisionService())

// ===== Math Utilities Service =====
export interface MathService {
  readonly clamp: (value: number, min: number, max: number) => Effect.Effect<number, never>
  readonly lerp: (from: number, to: number, t: number) => Effect.Effect<number, never>
  readonly randomRange: (min: number, max: number) => Effect.Effect<number, never>
  readonly randomBool: (probability?: number) => Effect.Effect<boolean, never>
  readonly angleToVector: (angle: number) => Effect.Effect<{ x: number; y: number }, never>
  readonly vectorToAngle: (vector: { x: number; y: number }) => Effect.Effect<number, never>
}

export const MathService = Context.GenericTag<MathService>("MathService")

const makeMathService = (): MathService => ({
  clamp: (value, min, max) =>
    Effect.sync(() => Math.max(min, Math.min(max, value))),

  lerp: (from, to, t) =>
    Effect.sync(() => from + (to - from) * t),

  randomRange: (min, max) =>
    Effect.sync(() => Math.random() * (max - min) + min),

  randomBool: (probability = 0.5) =>
    Effect.sync(() => Math.random() < probability),

  angleToVector: (angle) =>
    Effect.sync(() => ({
      x: Math.cos(angle),
      y: Math.sin(angle),
    })),

  vectorToAngle: (vector) =>
    Effect.sync(() => Math.atan2(vector.y, vector.x)),
})

export const MathServiceLayer = Layer.succeed(MathService, makeMathService())

// ===== Game Storage Operations =====
export interface GameStorageService {
  readonly saveGameState: (state: unknown) => Effect.Effect<void, GameLogicError>
  readonly loadGameState: <T>(schema: Schema.Schema<T>) => Effect.Effect<Option.Option<T>, GameLogicError>
  readonly clearGameData: () => Effect.Effect<void, GameLogicError>
  readonly saveHighScore: (score: unknown) => Effect.Effect<void, GameLogicError>
  readonly loadHighScores: () => Effect.Effect<readonly unknown[], GameLogicError>
}

export const GameStorageService = Context.GenericTag<GameStorageService>("GameStorageService")

const makeGameStorageService = (): Effect.Effect<GameStorageService, never, StorageService> =>
  Effect.gen(function* (_) {
    const storage = yield* _(StorageService)

    const saveGameState = (state: unknown) =>
      storage.save("game-state", state).pipe(
        Effect.mapError(error => createGameLogicError("Failed to save game state", error))
      )

    const loadGameState = <T>(schema: Schema.Schema<T>) =>
      storage.load("game-state", schema).pipe(
        Effect.map(result => result ? Option.some(result) : Option.none()),
        Effect.mapError(error => createGameLogicError("Failed to load game state", error))
      )

    const clearGameData = () =>
      Effect.gen(function* (_) {
        yield* _(storage.remove("game-state"))
        yield* _(storage.remove("high-scores"))
        yield* _(storage.remove("game-settings"))
      }).pipe(
        Effect.mapError(error => createGameLogicError("Failed to clear game data", error))
      )

    const saveHighScore = (score: unknown) =>
      storage.save("high-scores", score).pipe(
        Effect.mapError(error => createGameLogicError("Failed to save high score", error))
      )

    const loadHighScores = () =>
      storage.load("high-scores", Schema.Array(Schema.Unknown)).pipe(
        Effect.map(scores => scores || []),
        Effect.mapError(error => createGameLogicError("Failed to load high scores", error))
      )

    return {
      saveGameState,
      loadGameState,
      clearGameData,
      saveHighScore,
      loadHighScores,
    }
  })

export const GameStorageServiceLayer = Layer.effect(GameStorageService, makeGameStorageService()).pipe(
  Layer.provide(LocalStorageServiceLayer)
)

// ===== Combined Services Layer =====
export const ServicesLayer = Layer.mergeAll(
  AudioServiceLayer,
  SpriteServiceLayer,
  LocalStorageServiceLayer,
  CollisionServiceLayer,
  MathServiceLayer,
  GameStorageServiceLayer,
  SettingsServiceLayer
)

// ===== Legacy Helper Functions =====
export const isColliding = (
  a: { position: { x: number; y: number }; size: { width: number; height: number } },
  b: { position: { x: number; y: number }; size: { width: number; height: number } }
): boolean => {
  return (
    a.position.x < b.position.x + b.size.width &&
    a.position.x + a.size.width > b.position.x &&
    a.position.y < b.position.y + b.size.height &&
    a.position.y + a.size.height > b.position.y
  )
}

// ===== Effect-TS Game Operations =====
export const GameOperations = {
  // Initialize all game services
  initializeServices: () =>
    Effect.gen(function* (_) {
      yield* _(Effect.log("Initializing game services..."))
      
      const audio = yield* _(AudioService)
      const sprites = yield* _(SpriteService)
      
      yield* _(Effect.log("Loading audio assets..."))
      yield* _(audio.loadAllSounds([
        { name: 'shoot', path: '/sounds/shoot.wav', volume: 0.3 },
        { name: 'explosion', path: '/sounds/explosion.mp3', volume: 0.8 },
        { name: 'low-health', path: '/sounds/low-health.mp3', volume: 0.7 },
        { name: 'power-up', path: '/sounds/power-up.mp3', volume: 0.5 },
        { name: 'level1-music', path: '/sounds/level1.mp3', volume: 0.4, loop: true },
      ]))
      
      yield* _(Effect.log("Loading sprite assets..."))
      yield* _(sprites.loadAllSprites())
      
      yield* _(Effect.log("All game services initialized!"))
    }),

  // Check entity collision
  checkCollision: (
    a: { position: { x: number; y: number }; size: { width: number; height: number } },
    b: { position: { x: number; y: number }; size: { width: number; height: number } }
  ) =>
    Effect.gen(function* (_) {
      const collision = yield* _(CollisionService)
      return yield* _(collision.isColliding(a, b))
    }),

  // Play sound effect
  playSound: (name: string) =>
    Effect.gen(function* (_) {
      const audio = yield* _(AudioService)
      yield* _(audio.playSound(name))
    }),

  // Draw sprite
  drawSprite: (
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    rotation?: number
  ) =>
    Effect.gen(function* (_) {
      const sprites = yield* _(SpriteService)
      return yield* _(sprites.drawSprite(ctx, spriteName, x, y, width, height, rotation))
    }),

  // Save game data
  saveGameData: (data: unknown) =>
    Effect.gen(function* (_) {
      const gameStorage = yield* _(GameStorageService)
      yield* _(gameStorage.saveGameState(data))
    }),

  // Load game data
  loadGameData: <T>(schema: Schema.Schema<T>) =>
    Effect.gen(function* (_) {
      const gameStorage = yield* _(GameStorageService)
      return yield* _(gameStorage.loadGameState(schema))
    }),
} 