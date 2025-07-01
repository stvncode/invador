import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { LocalStorageServiceLayer, StorageService } from './storage'
import { AudioSettings, GameSettings } from './types'

// ===== Settings Error Types =====
export interface SettingsError {
  readonly _tag: "SettingsError"
  readonly message: string
  readonly cause?: unknown
}

export const createSettingsError = (message: string, cause?: unknown): SettingsError => ({
  _tag: "SettingsError" as const,
  message,
  cause,
})

// ===== Settings Service Interface =====
export interface SettingsService {
  readonly getSettings: () => Effect.Effect<GameSettings, SettingsError>
  readonly updateSettings: (settings: Partial<GameSettings>) => Effect.Effect<void, SettingsError>
  readonly resetToDefaults: () => Effect.Effect<void, SettingsError>
  readonly updateAudioSettings: (audio: Partial<AudioSettings>) => Effect.Effect<void, SettingsError>
  readonly updateControlBinding: (action: string, key: string) => Effect.Effect<void, SettingsError>
  readonly setDifficulty: (difficulty: "easy" | "normal" | "hard" | "nightmare") => Effect.Effect<void, SettingsError>
  readonly exportSettings: () => Effect.Effect<string, SettingsError>
  readonly importSettings: (settingsJson: string) => Effect.Effect<void, SettingsError>
}

export const SettingsService = Context.GenericTag<SettingsService>("SettingsService")

// ===== Default Settings =====
export const DEFAULT_SETTINGS: GameSettings = {
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
    moveLeft: "ArrowLeft",
    moveRight: "ArrowRight",
    moveUp: "ArrowUp",
    moveDown: "ArrowDown",
    shoot: "Space",
    pause: "Escape",
    menu: "Enter",
  },
  difficulty: "normal",
}

// ===== Difficulty Configurations =====
export const DIFFICULTY_CONFIGS = {
  easy: {
    label: "Easy",
    description: "Casual gameplay with slower enemies",
    enemySpeedMultiplier: 0.7,
    enemySpawnRate: 0.8,
    playerHealthMultiplier: 1.5,
  },
  normal: {
    label: "Normal", 
    description: "Balanced gameplay experience",
    enemySpeedMultiplier: 1.0,
    enemySpawnRate: 1.0,
    playerHealthMultiplier: 1.0,
  },
  hard: {
    label: "Hard",
    description: "Challenging gameplay with fast enemies",
    enemySpeedMultiplier: 1.3,
    enemySpawnRate: 1.2,
    playerHealthMultiplier: 0.8,
  },
  nightmare: {
    label: "Nightmare",
    description: "Extreme difficulty for veterans",
    enemySpeedMultiplier: 1.6,
    enemySpawnRate: 1.5,
    playerHealthMultiplier: 0.5,
  },
}

// ===== Control Action Labels =====
export const CONTROL_LABELS = {
  moveLeft: "Move Left",
  moveRight: "Move Right", 
  moveUp: "Move Up",
  moveDown: "Move Down",
  shoot: "Shoot",
  pause: "Pause Game",
  menu: "Menu/Select",
}

// ===== Settings Service Implementation =====
const makeSettingsService = (): Effect.Effect<SettingsService, never, StorageService> =>
  Effect.gen(function* (_) {
    const storage = yield* _(StorageService)
    
    const SETTINGS_KEY = "game-settings"

    const getSettings = () =>
      storage.load(SETTINGS_KEY, GameSettings).pipe(
        Effect.map(settings => settings || DEFAULT_SETTINGS),
        Effect.mapError(error => createSettingsError("Failed to load settings", error))
      )

    const saveSettings = (settings: GameSettings) =>
      storage.save(SETTINGS_KEY, settings).pipe(
        Effect.mapError(error => createSettingsError("Failed to save settings", error))
      )

    const updateSettings = (updates: Partial<GameSettings>) =>
      Effect.gen(function* (_) {
        const currentSettings = yield* _(getSettings())
        const newSettings: GameSettings = {
          ...currentSettings,
          ...updates,
          audio: { ...currentSettings.audio, ...updates.audio },
          graphics: { ...currentSettings.graphics, ...updates.graphics },
          controls: { ...currentSettings.controls, ...updates.controls },
        }
        yield* _(saveSettings(newSettings))
        yield* _(Effect.log(`Settings updated: ${JSON.stringify(updates)}`))
      })

    const resetToDefaults = () =>
      Effect.gen(function* (_) {
        yield* _(saveSettings(DEFAULT_SETTINGS))
        yield* _(Effect.log("Settings reset to defaults"))
      })

    const updateAudioSettings = (audio: Partial<AudioSettings>) =>
      Effect.gen(function* (_) {
        const currentSettings = yield* _(getSettings())
        yield* _(updateSettings({ 
          audio: { ...currentSettings.audio, ...audio }
        }))
      })

    const updateControlBinding = (action: string, key: string) =>
      updateSettings({ controls: { [action]: key } })

    const setDifficulty = (difficulty: "easy" | "normal" | "hard" | "nightmare") =>
      updateSettings({ difficulty })

    const exportSettings = () =>
      Effect.gen(function* (_) {
        const settings = yield* _(getSettings())
        return JSON.stringify(settings, null, 2)
      })

    const importSettings = (settingsJson: string) =>
      Effect.gen(function* (_) {
        try {
          const parsedSettings = JSON.parse(settingsJson)
          const validatedSettings = yield* _(
            Effect.tryPromise({
              try: () => Schema.decodePromise(GameSettings)(parsedSettings),
              catch: (error) => createSettingsError("Invalid settings format", error)
            })
          )
          yield* _(saveSettings(validatedSettings))
          yield* _(Effect.log("Settings imported successfully"))
        } catch (error) {
          yield* _(Effect.fail(createSettingsError("Failed to parse settings JSON", error)))
        }
      })

    return {
      getSettings,
      updateSettings,
      resetToDefaults,
      updateAudioSettings,
      updateControlBinding,
      setDifficulty,
      exportSettings,
      importSettings,
    }
  })

export const SettingsServiceLayer = Layer.effect(SettingsService, makeSettingsService()).pipe(
  Layer.provide(LocalStorageServiceLayer)
)

// ===== Settings Operations (for use in components) =====
export const SettingsOperations = {
  // Get current settings
  getCurrentSettings: () =>
    Effect.gen(function* (_) {
      const settingsService = yield* _(SettingsService)
      return yield* _(settingsService.getSettings())
    }).pipe(Effect.provide(SettingsServiceLayer)),

  // Save settings
  saveSettings: (settings: GameSettings) =>
    Effect.gen(function* (_) {
      const settingsService = yield* _(SettingsService)
      yield* _(settingsService.updateSettings(settings))
    }).pipe(Effect.provide(SettingsServiceLayer)),

  // Load settings
  loadSettings: () =>
    Effect.gen(function* (_) {
      const settingsService = yield* _(SettingsService)
      return yield* _(settingsService.getSettings())
    }).pipe(Effect.provide(SettingsServiceLayer)),

  // Update volume settings
  updateVolume: (type: "master" | "music" | "sfx", volume: number) =>
    Effect.gen(function* (_) {
      const settingsService = yield* _(SettingsService)
      const audioUpdate = {
        [`${type}Volume`]: Math.max(0, Math.min(1, volume))
      } as Partial<AudioSettings>
      yield* _(settingsService.updateAudioSettings(audioUpdate))
    }).pipe(Effect.provide(SettingsServiceLayer)),

  // Toggle mute
  toggleMute: () =>
    Effect.gen(function* (_) {
      const settingsService = yield* _(SettingsService)
      const currentSettings = yield* _(settingsService.getSettings())
      yield* _(settingsService.updateAudioSettings({ 
        muted: !currentSettings.audio.muted 
      }))
    }).pipe(Effect.provide(SettingsServiceLayer)),

  // Update graphics setting
  updateGraphicsSetting: (setting: keyof GameSettings["graphics"], value: boolean) =>
    Effect.gen(function* (_) {
      const settingsService = yield* _(SettingsService)
      const currentSettings = yield* _(settingsService.getSettings())
      yield* _(settingsService.updateSettings({
        graphics: { ...currentSettings.graphics, [setting]: value }
      }))
    }).pipe(Effect.provide(SettingsServiceLayer)),

  // Validate key binding
  validateKeyBinding: (key: string) =>
    Effect.sync(() => {
      // Check if key is valid and not already used for system functions
      const reservedKeys = ["F5", "F11", "F12", "Tab", "Alt", "Ctrl", "Shift"]
      return !reservedKeys.includes(key) && key.length > 0
    }),
} 