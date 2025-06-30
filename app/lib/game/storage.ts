import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { GameSettings, GameStats, HighScore } from './types'

// Storage errors - functional approach
export interface StorageError {
  readonly _tag: "StorageError"
  readonly message: string
  readonly cause?: unknown
}

// Helper function to create storage errors
export const createStorageError = (message: string, cause?: unknown): StorageError => ({
  _tag: "StorageError" as const,
  message,
  cause,
})

// Storage service interface
export interface StorageService {
  readonly save: <T>(key: string, value: T) => Effect.Effect<void, StorageError>
  readonly load: <T>(key: string, schema: Schema.Schema<T>) => Effect.Effect<T | null, StorageError>
  readonly remove: (key: string) => Effect.Effect<void, StorageError>
  readonly clear: () => Effect.Effect<void, StorageError>
}

// Service tag
export const StorageService = Context.GenericTag<StorageService>("StorageService")

// Browser localStorage implementation
const makeLocalStorageService = (): StorageService => ({
  save: <T>(key: string, value: T) =>
    Effect.try({
      try: () => {
        localStorage.setItem(key, JSON.stringify(value))
      },
      catch: (error) => createStorageError(`Failed to save ${key}`, error),
    }),

  load: <T>(key: string, schema: Schema.Schema<T>) =>
    Effect.gen(function* (_) {
      const item = yield* _(Effect.try({
        try: () => localStorage.getItem(key),
        catch: (error) => createStorageError(`Failed to load ${key}`, error),
      }))

      if (item === null) return null

      const parsed = yield* _(Effect.try({
        try: () => JSON.parse(item),
        catch: (error) => createStorageError(`Failed to parse ${key}`, error),
      }))

      return yield* _(Schema.decodeUnknown(schema)(parsed).pipe(
        Effect.mapError(error => createStorageError(`Failed to decode ${key}`, error))
      ))
    }),

  remove: (key: string) =>
    Effect.try({
      try: () => localStorage.removeItem(key),
      catch: (error) => createStorageError(`Failed to remove ${key}`, error),
    }),

  clear: () =>
    Effect.try({
      try: () => localStorage.clear(),
      catch: (error) => createStorageError("Failed to clear storage", error),
    }),
})

// Memory storage implementation (for testing)
const makeMemoryStorageService = (): StorageService => {
  const storage = new Map<string, string>()
  
  return {
    save: <T>(key: string, value: T) =>
      Effect.try({
        try: () => storage.set(key, JSON.stringify(value)),
        catch: (error) => createStorageError(`Failed to save ${key}`, error),
      }).pipe(Effect.asVoid),

    load: <T>(key: string, schema: Schema.Schema<T>) =>
      Effect.gen(function* (_) {
        const item = storage.get(key) ?? null
        if (item === null) return null

        const parsed = yield* _(Effect.try({
          try: () => JSON.parse(item),
          catch: (error) => createStorageError(`Failed to parse ${key}`, error),
        }))

        return yield* _(Schema.decodeUnknown(schema)(parsed).pipe(
          Effect.mapError(error => createStorageError(`Failed to decode ${key}`, error))
        ))
      }),

    remove: (key: string) =>
      Effect.sync(() => storage.delete(key)).pipe(Effect.asVoid),

    clear: () =>
      Effect.sync(() => storage.clear()),
  }
}

// Service layers
export const LocalStorageServiceLayer = Layer.succeed(StorageService, makeLocalStorageService())
export const MemoryStorageServiceLayer = Layer.succeed(StorageService, makeMemoryStorageService())

// Game-specific storage operations
export const GameStorage = {
  // Settings operations
  saveSettings: (settings: GameSettings) =>
    Effect.gen(function* (_) {
      const storage = yield* _(StorageService)
      yield* _(storage.save("game-settings", settings))
    }),

  loadSettings: () =>
    Effect.gen(function* (_) {
      const storage = yield* _(StorageService)
      return yield* _(storage.load("game-settings", Schema.Unknown))
    }),

  // High scores operations
  saveHighScores: (scores: HighScore[]) =>
    Effect.gen(function* (_) {
      const storage = yield* _(StorageService)
      yield* _(storage.save("high-scores", scores))
    }),

  loadHighScores: () =>
    Effect.gen(function* (_) {
      const storage = yield* _(StorageService)
      const scores = yield* _(storage.load("high-scores", Schema.Array(Schema.Unknown)))
      return scores ?? []
    }),

  // Statistics operations
  saveStats: (stats: GameStats) =>
    Effect.gen(function* (_) {
      const storage = yield* _(StorageService)
      yield* _(storage.save("game-stats", stats))
    }),

  loadStats: () =>
    Effect.gen(function* (_) {
      const storage = yield* _(StorageService)
      return yield* _(storage.load("game-stats", Schema.Unknown))
    }),

  // Clear all game data
  clearGameData: () =>
    Effect.gen(function* (_) {
      const storage = yield* _(StorageService)
      yield* _(storage.remove("game-settings"))
      yield* _(storage.remove("high-scores"))
      yield* _(storage.remove("game-stats"))
    }),
}

// Runtime for running storage operations
import * as Runtime from "effect/Runtime"

export const storageRuntime = Runtime.defaultRuntime

// Helper functions to run storage operations
export const runStorageEffect = <A, E>(effect: Effect.Effect<A, E>) =>
  Runtime.runPromise(storageRuntime)(Effect.provide(effect, LocalStorageServiceLayer)) 