import * as S from "@effect/schema/Schema";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

// ===== Error Types =====
export interface GameStorageError {
  readonly _tag: "GameStorageError";
  readonly message: string;
  readonly cause?: unknown;
}

export interface GameLogicError {
  readonly _tag: "GameLogicError";
  readonly message: string;
  readonly cause?: unknown;
}

export const GameStorageError = (message: string, cause?: unknown): GameStorageError => ({
  _tag: "GameStorageError",
  message,
  cause,
});

export const GameLogicError = (message: string, cause?: unknown): GameLogicError => ({
  _tag: "GameLogicError", 
  message,
  cause,
});

// ===== Storage Service =====
export interface StorageService {
  readonly save: (key: string, data: unknown) => Effect.Effect<void, GameStorageError>;
  readonly load: <T>(key: string, schema: S.Schema<T, unknown>) => Effect.Effect<Option.Option<T>, GameStorageError>;
  readonly remove: (key: string) => Effect.Effect<void, GameStorageError>;
}

export const StorageService = Context.GenericTag<StorageService>("@services/StorageService");

export const StorageServiceLive = Layer.succeed(
  StorageService,
  {
    save: (key, data) =>
      Effect.try({
        try: () => localStorage.setItem(key, JSON.stringify(data)),
        catch: (error) => GameStorageError(`Failed to save ${key}`, error),
      }),
    
    load: (key, schema) =>
      Effect.try({
        try: () => {
          const item = localStorage.getItem(key);
          if (!item) return Option.none();
          
          const parsed = JSON.parse(item);
          const decoded = S.decodeUnknownSync(schema)(parsed);
          return Option.some(decoded);
        },
        catch: (error) => GameStorageError(`Failed to load ${key}`, error),
      }),
    
    remove: (key) =>
      Effect.try({
        try: () => localStorage.removeItem(key),
        catch: (error) => GameStorageError(`Failed to remove ${key}`, error),
      }),
  }
);

// Helper functions for game logic
export const isColliding = (
  a: { position: { x: number; y: number }; size: { width: number; height: number } },
  b: { position: { x: number; y: number }; size: { width: number; height: number } }
): boolean => {
  return (
    a.position.x < b.position.x + b.size.width &&
    a.position.x + a.size.width > b.position.x &&
    a.position.y < b.position.y + b.size.height &&
    a.position.y + a.size.height > b.position.y
  );
};

// Main services layer
export const ServicesLive = StorageServiceLive; 