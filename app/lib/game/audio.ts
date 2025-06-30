import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Runtime from "effect/Runtime"

// ===== Error Types =====
export interface AudioError {
  readonly _tag: "AudioError"
  readonly message: string
  readonly cause?: unknown
}

export const createAudioError = (message: string, cause?: unknown): AudioError => ({
  _tag: "AudioError" as const,
  message,
  cause,
})

// ===== Types =====
export interface SoundState {
  readonly audio: HTMLAudioElement
  readonly volume: number
  readonly loop: boolean
  readonly loaded: boolean
}

export interface AudioSettings {
  readonly masterVolume: number
  readonly musicVolume: number
  readonly sfxVolume: number
  readonly muted: boolean
}

export interface SoundConfig {
  readonly name: string
  readonly path: string
  readonly volume: number
  readonly loop?: boolean
}

// ===== Audio Service Interface =====
export interface AudioService {
  readonly loadSound: (config: SoundConfig) => Effect.Effect<void, AudioError>
  readonly loadAllSounds: (configs: readonly SoundConfig[]) => Effect.Effect<void, AudioError>
  readonly playSound: (name: string, forcePlay?: boolean) => Effect.Effect<void, AudioError>
  readonly stopSound: (name: string) => Effect.Effect<void, AudioError>
  readonly pauseSound: (name: string) => Effect.Effect<void, AudioError>
  readonly resumeSound: (name: string) => Effect.Effect<void, AudioError>
  readonly setMuted: (muted: boolean) => Effect.Effect<void, AudioError>
  readonly isMuted: () => Effect.Effect<boolean, never>
  readonly updateSettings: (settings: Partial<AudioSettings>) => Effect.Effect<void, AudioError>
  readonly startBackgroundMusic: () => Effect.Effect<void, AudioError>
  readonly stopBackgroundMusic: () => Effect.Effect<void, AudioError>
}

// ===== Service Tag =====
export const AudioService = Context.GenericTag<AudioService>("AudioService")

// ===== Implementation =====
const makeAudioService = (): Effect.Effect<AudioService, never> =>
  Effect.gen(function* (_) {
    const soundsRef = yield* _(Ref.make(new Map<string, SoundState>()))
    const settingsRef = yield* _(Ref.make<AudioSettings>({
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.8,
      muted: false,
    }))

    const loadSound = (config: SoundConfig) =>
      Effect.gen(function* (_) {
        const sounds = yield* _(Ref.get(soundsRef))
        
        if (sounds.has(config.name)) {
          return
        }

        const audio = new Audio(config.path)
        audio.preload = 'auto'

        yield* _(Effect.async<void, AudioError>((resume) => {
          const onLoad = () => {
            audio.removeEventListener('canplaythrough', onLoad)
            audio.removeEventListener('error', onError)
            
            const soundState: SoundState = {
              audio,
              volume: config.volume,
              loop: config.loop || false,
              loaded: true,
            }
            
            // Update sounds map
            Effect.runSync(Ref.update(soundsRef, sounds => 
              new Map(sounds).set(config.name, soundState)
            ))
            
            resume(Effect.void)
          }

          const onError = () => {
            audio.removeEventListener('canplaythrough', onLoad)
            audio.removeEventListener('error', onError)
            resume(Effect.fail(createAudioError(`Failed to load sound: ${config.name} from ${config.path}`)))
          }

          audio.addEventListener('canplaythrough', onLoad)
          audio.addEventListener('error', onError)
          audio.load()
        }))
      })

    const loadAllSounds = (configs: readonly SoundConfig[]) =>
      Effect.gen(function* (_) {
        yield* _(Effect.log("Loading sounds..."))
        yield* _(Effect.all(configs.map(loadSound), { concurrency: "unbounded" }))
        yield* _(Effect.log("All sounds loaded!"))
      })

    const playSound = (name: string, forcePlay: boolean = false) =>
      Effect.gen(function* (_) {
        const settings = yield* _(Ref.get(settingsRef))
        const sounds = yield* _(Ref.get(soundsRef))

        if (settings.muted && !forcePlay) {
          return
        }

        const sound = sounds.get(name)
        if (!sound) {
          yield* _(Effect.fail(createAudioError(`Sound not found: ${name}`)))
          return
        }

        if (!sound.loaded) {
          yield* _(Effect.fail(createAudioError(`Sound not loaded: ${name}`)))
          return
        }

        yield* _(Effect.try({
          try: () => {
            const { audio, volume, loop } = sound
            
            audio.currentTime = 0
            audio.loop = loop
            
            const finalVolume = volume * 
              (name.includes('music') ? settings.musicVolume : settings.sfxVolume) * 
              settings.masterVolume
            
            audio.volume = Math.max(0, Math.min(1, finalVolume))
            
            const playPromise = audio.play()
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.warn(`Failed to play sound: ${name}`, error)
              })
            }
          },
          catch: (error) => createAudioError(`Error playing sound: ${name}`, error),
        }))
      })

    const stopSound = (name: string) =>
      Effect.gen(function* (_) {
        const sounds = yield* _(Ref.get(soundsRef))
        const sound = sounds.get(name)
        
        if (sound) {
          yield* _(Effect.sync(() => {
            sound.audio.pause()
            sound.audio.currentTime = 0
          }))
        }
      })

    const pauseSound = (name: string) =>
      Effect.gen(function* (_) {
        const sounds = yield* _(Ref.get(soundsRef))
        const sound = sounds.get(name)
        
        if (sound) {
          yield* _(Effect.sync(() => sound.audio.pause()))
        }
      })

    const resumeSound = (name: string) =>
      Effect.gen(function* (_) {
        const settings = yield* _(Ref.get(settingsRef))
        
        if (settings.muted) return

        const sounds = yield* _(Ref.get(soundsRef))
        const sound = sounds.get(name)
        
        if (sound && sound.audio.paused) {
          yield* _(Effect.try({
            try: () => {
              sound.audio.play().catch(error => {
                console.warn(`Failed to resume sound: ${name}`, error)
              })
            },
            catch: (error) => createAudioError(`Error resuming sound: ${name}`, error),
          }))
        }
      })

    const setMuted = (muted: boolean) =>
      Effect.gen(function* (_) {
        yield* _(Ref.update(settingsRef, settings => ({ ...settings, muted })))
        const sounds = yield* _(Ref.get(soundsRef))

        if (muted) {
          yield* _(Effect.sync(() => {
            sounds.forEach((sound) => {
              if (!sound.audio.paused) {
                sound.audio.pause()
              }
            })
          }))
        } else {
          const music = sounds.get('level1-music')
          if (music && music.audio.paused && music.audio.currentTime > 0) {
            yield* _(resumeSound('level1-music'))
          }
        }
      })

    const isMuted = () =>
      Effect.gen(function* (_) {
        const settings = yield* _(Ref.get(settingsRef))
        return settings.muted
      })

    const updateSettings = (newSettings: Partial<AudioSettings>) =>
      Effect.gen(function* (_) {
        yield* _(Ref.update(settingsRef, settings => ({ ...settings, ...newSettings })))
        const settings = yield* _(Ref.get(settingsRef))
        const sounds = yield* _(Ref.get(soundsRef))

        yield* _(Effect.sync(() => {
          sounds.forEach((sound, name) => {
            const finalVolume = sound.volume * 
              (name.includes('music') ? settings.musicVolume : settings.sfxVolume) * 
              settings.masterVolume
            
            sound.audio.volume = Math.max(0, Math.min(1, finalVolume))
          })
        }))
      })

    const startBackgroundMusic = () =>
      Effect.gen(function* (_) {
        const settings = yield* _(Ref.get(settingsRef))
        if (!settings.muted) {
          yield* _(playSound('level1-music'))
        }
      })

    const stopBackgroundMusic = () => stopSound('level1-music')

    return {
      loadSound,
      loadAllSounds,
      playSound,
      stopSound,
      pauseSound,
      resumeSound,
      setMuted,
      isMuted,
      updateSettings,
      startBackgroundMusic,
      stopBackgroundMusic,
    }
  })

// ===== Service Layer =====
export const AudioServiceLayer = Layer.effect(AudioService, makeAudioService())

// ===== Default Sound Configurations =====
export const defaultSoundConfigs: readonly SoundConfig[] = [
  { name: 'shoot', path: '/sounds/shoot.wav', volume: 0.3 },
  { name: 'explosion', path: '/sounds/explosion.mp3', volume: 0.8 },
  { name: 'low-health', path: '/sounds/low-health.mp3', volume: 0.7 },
  { name: 'power-up', path: '/sounds/power-up.mp3', volume: 0.5 },
  { name: 'level1-music', path: '/sounds/level1.mp3', volume: 0.4, loop: true },
]

// ===== Runtime & Helper Functions =====
export const audioRuntime = Runtime.defaultRuntime

export const runAudioEffect = <A, E>(effect: Effect.Effect<A, E>) =>
  Runtime.runPromise(audioRuntime)(Effect.provide(effect, AudioServiceLayer))

// ===== Legacy Compatibility Layer =====
let _audioServiceInstance: AudioService | null = null

// Initialize the service instance
const initAudioService = async () => {
  if (!_audioServiceInstance) {
    _audioServiceInstance = await Runtime.runPromise(audioRuntime)(
      Effect.provide(makeAudioService(), AudioServiceLayer)
    )
  }
  return _audioServiceInstance
}

export const soundManager = {
  init: async () => {
    const audio = await initAudioService()
    await Runtime.runPromise(audioRuntime)(
      Effect.provide(audio.loadAllSounds(defaultSoundConfigs), AudioServiceLayer)
    )
  },
  
  playSound: (name: string) => {
    if (_audioServiceInstance) {
      Runtime.runPromise(audioRuntime)(
        Effect.provide(_audioServiceInstance.playSound(name), AudioServiceLayer)
      ).catch(error => console.warn(`Failed to play sound ${name}:`, error))
    }
  },
  
  stopSound: (name: string) => {
    if (_audioServiceInstance) {
      Runtime.runPromise(audioRuntime)(
        Effect.provide(_audioServiceInstance.stopSound(name), AudioServiceLayer)
      ).catch(error => console.warn(`Failed to stop sound ${name}:`, error))
    }
  },
  
  setMuted: (muted: boolean) => {
    // Quick fix: cache muted state and apply immediately
    localStorage.setItem('audio-muted', JSON.stringify(muted))
    if (_audioServiceInstance) {
      Runtime.runPromise(audioRuntime)(
        Effect.provide(_audioServiceInstance.setMuted(muted), AudioServiceLayer)
      ).catch(error => console.warn(`Failed to set muted ${muted}:`, error))
    }
  },
  
  isMuted: (): boolean => {
    // Quick fix: return cached muted state
    try {
      return JSON.parse(localStorage.getItem('audio-muted') || 'false')
    } catch {
      return false
    }
  },
  
  startBackgroundMusic: () => {
    if (_audioServiceInstance) {
      Runtime.runPromise(audioRuntime)(
        Effect.provide(_audioServiceInstance.startBackgroundMusic(), AudioServiceLayer)
      ).catch(error => console.warn(`Failed to start background music:`, error))
    }
  },
  
  stopBackgroundMusic: () => {
    if (_audioServiceInstance) {
      Runtime.runPromise(audioRuntime)(
        Effect.provide(_audioServiceInstance.stopBackgroundMusic(), AudioServiceLayer)
      ).catch(error => console.warn(`Failed to stop background music:`, error))
    }
  },
} 