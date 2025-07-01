import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import type { GameEvent } from './analytics'

// ===== Achievement Error Types =====
export interface AchievementError {
  readonly _tag: "AchievementError"
  readonly message: string
  readonly cause?: unknown
}

export const createAchievementError = (message: string, cause?: unknown): AchievementError => ({
  _tag: "AchievementError" as const,
  message,
  cause,
})

// ===== Achievement Schema =====
export const AchievementCriteriaSchema = Schema.Struct({
  type: Schema.Literal("score", "kills", "time", "combo", "accuracy", "survival"),
  target: Schema.Number,
  current: Schema.Number,
  description: Schema.String,
})

export const AchievementSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  criteria: AchievementCriteriaSchema,
  unlocked: Schema.Boolean,
  unlockedAt: Schema.optional(Schema.Number),
  rarity: Schema.Literal("common", "rare", "epic", "legendary"),
  icon: Schema.String,
})

// ===== Achievement Types =====
export type Achievement = Schema.Schema.Type<typeof AchievementSchema>
export type AchievementCriteria = Schema.Schema.Type<typeof AchievementCriteriaSchema>

export interface AchievementProgress {
  readonly totalAchievements: number
  readonly unlockedAchievements: number
  readonly progressByType: Record<string, number>
  readonly recentUnlocks: Achievement[]
}

// ===== Achievement Service Interface =====
export interface AchievementService {
  readonly checkAchievements: (event: GameEvent) => Effect.Effect<Achievement[], AchievementError>
  readonly unlockAchievement: (id: string) => Effect.Effect<void, AchievementError>
  readonly getProgress: () => Effect.Effect<AchievementProgress, AchievementError>
  readonly getAchievementStream: () => Stream.Stream<Achievement, AchievementError>
  readonly resetProgress: () => Effect.Effect<void, AchievementError>
}

export const AchievementService = Context.GenericTag<AchievementService>("AchievementService")

// ===== Default Achievements =====
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_blood",
    name: "First Blood",
    description: "Destroy your first enemy",
    criteria: {
      type: "kills",
      target: 1,
      current: 0,
      description: "Destroy 1 enemy"
    },
    unlocked: false,
    rarity: "common",
    icon: "🎯",
  },
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    description: "Achieve 80% accuracy",
    criteria: {
      type: "accuracy",
      target: 80,
      current: 0,
      description: "Achieve 80% accuracy"
    },
    unlocked: false,
    rarity: "rare",
    icon: "🎯",
  },
  {
    id: "survivor",
    name: "Survivor",
    description: "Survive for 5 minutes",
    criteria: {
      type: "time",
      target: 300000, // 5 minutes in milliseconds
      current: 0,
      description: "Survive for 5 minutes"
    },
    unlocked: false,
    rarity: "epic",
    icon: "⏰",
  },
  {
    id: "combo_master",
    name: "Combo Master",
    description: "Destroy 10 enemies in a row",
    criteria: {
      type: "combo",
      target: 10,
      current: 0,
      description: "Destroy 10 enemies in a row"
    },
    unlocked: false,
    rarity: "legendary",
    icon: "🔥",
  },
  {
    id: "score_champion",
    name: "Score Champion",
    description: "Reach 10,000 points",
    criteria: {
      type: "score",
      target: 10000,
      current: 0,
      description: "Reach 10,000 points"
    },
    unlocked: false,
    rarity: "epic",
    icon: "🏆",
  },
]

// ===== Achievement Service Implementation =====
const makeAchievementService = (): Effect.Effect<AchievementService, never> =>
  Effect.gen(function* (_) {
    const achievementsRef = yield* _(Ref.make(DEFAULT_ACHIEVEMENTS))
    const progressRef = yield* _(Ref.make<AchievementProgress>({
      totalAchievements: DEFAULT_ACHIEVEMENTS.length,
      unlockedAchievements: 0,
      progressByType: {},
      recentUnlocks: [],
    }))

    const updateProgress = () =>
      Effect.gen(function* (_) {
        const achievements = yield* _(Ref.get(achievementsRef))
        const unlocked = achievements.filter(a => a.unlocked)
        const progressByType: Record<string, number> = {}
        
        // Calculate progress by type
        achievements.forEach(achievement => {
          const type = achievement.criteria.type
          if (!progressByType[type]) progressByType[type] = 0
          progressByType[type] += achievement.criteria.current
        })

        const progress: AchievementProgress = {
          totalAchievements: achievements.length,
          unlockedAchievements: unlocked.length,
          progressByType,
          recentUnlocks: unlocked.slice(-5), // Last 5 unlocks
        }

        yield* _(Ref.set(progressRef, progress))
      })

    const checkAchievements = (event: GameEvent) =>
      Effect.gen(function* (_) {
        const achievements = yield* _(Ref.get(achievementsRef))
        const newlyUnlocked: Achievement[] = []

        // Update criteria based on event
        const updatedAchievements = achievements.map(achievement => {
          let updated = false
          const newCriteria = { ...achievement.criteria }

          switch (event.type) {
            case "enemy_destroyed":
              if (achievement.criteria.type === "kills") {
                newCriteria.current += 1
                updated = true
              }
              break
            case "player_shoot":
              if (achievement.criteria.type === "accuracy") {
                // This would need more complex logic to track accuracy
                break
              }
              break
            case "level_up":
              if (achievement.criteria.type === "score") {
                const score = event.data.score as number
                newCriteria.current = Math.max(newCriteria.current, score)
                updated = true
              }
              break
          }

          if (updated) {
            const newAchievement = {
              ...achievement,
              criteria: newCriteria,
              unlocked: newCriteria.current >= newCriteria.target && !achievement.unlocked,
              unlockedAt: newCriteria.current >= newCriteria.target && !achievement.unlocked 
                ? Date.now() 
                : achievement.unlockedAt,
            }

            if (newAchievement.unlocked && !achievement.unlocked) {
              newlyUnlocked.push(newAchievement)
            }

            return newAchievement
          }

          return achievement
        })

        if (newlyUnlocked.length > 0) {
          yield* _(Ref.set(achievementsRef, updatedAchievements))
          yield* _(updateProgress())
          yield* _(Effect.log(`🏆 Achievement unlocked: ${newlyUnlocked.map(a => a.name).join(", ")}`))
        }

        return newlyUnlocked
      })

    const unlockAchievement = (id: string) =>
      Effect.gen(function* (_) {
        const achievements = yield* _(Ref.get(achievementsRef))
        const achievement = achievements.find(a => a.id === id)
        
        if (!achievement) {
          yield* _(Effect.fail(createAchievementError(`Achievement not found: ${id}`)))
        }

        if (achievement!.unlocked) {
          yield* _(Effect.fail(createAchievementError(`Achievement already unlocked: ${id}`)))
        }

        const updatedAchievements = achievements.map(a => 
          a.id === id 
            ? { ...a, unlocked: true, unlockedAt: Date.now() }
            : a
        )

        yield* _(Ref.set(achievementsRef, updatedAchievements))
        yield* _(updateProgress())
        yield* _(Effect.log(`🏆 Achievement manually unlocked: ${achievement!.name}`))
      })

    const getProgress = () =>
      Effect.gen(function* (_) {
        yield* _(updateProgress())
        return yield* _(Ref.get(progressRef))
      })

    const getAchievementStream = () =>
      Stream.fromEffect(Ref.get(achievementsRef)).pipe(
        Stream.flatMap(achievements => Stream.fromIterable(achievements.filter(a => a.unlocked))),
        Stream.tap(achievement => Effect.log(`📊 Achievement stream: ${achievement.name} unlocked`))
      )

    const resetProgress = () =>
      Effect.gen(function* (_) {
        const resetAchievements = DEFAULT_ACHIEVEMENTS.map(a => ({
          ...a,
          unlocked: false,
          unlockedAt: undefined,
          criteria: { ...a.criteria, current: 0 }
        }))
        
        yield* _(Ref.set(achievementsRef, resetAchievements))
        yield* _(updateProgress())
        yield* _(Effect.log("🔄 Achievement progress reset"))
      })

    return {
      checkAchievements,
      unlockAchievement,
      getProgress,
      getAchievementStream,
      resetProgress,
    }
  })

export const AchievementServiceLayer = Layer.effect(AchievementService, makeAchievementService())

// ===== Achievement Operations =====
export const AchievementOperations = {
  checkForUnlocks: (event: GameEvent) =>
    Effect.gen(function* (_) {
      const achievementService = yield* _(AchievementService)
      return yield* _(achievementService.checkAchievements(event))
    }).pipe(Effect.provide(AchievementServiceLayer)),

  getCurrentProgress: () =>
    Effect.gen(function* (_) {
      const achievementService = yield* _(AchievementService)
      return yield* _(achievementService.getProgress())
    }).pipe(Effect.provide(AchievementServiceLayer)),

  unlockSpecificAchievement: (id: string) =>
    Effect.gen(function* (_) {
      const achievementService = yield* _(AchievementService)
      yield* _(achievementService.unlockAchievement(id))
    }).pipe(Effect.provide(AchievementServiceLayer)),

  resetAllAchievements: () =>
    Effect.gen(function* (_) {
      const achievementService = yield* _(AchievementService)
      yield* _(achievementService.resetProgress())
    }).pipe(Effect.provide(AchievementServiceLayer)),
} 