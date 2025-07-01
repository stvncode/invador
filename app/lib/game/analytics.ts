import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import * as MetricBoundaries from "effect/MetricBoundaries"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import type { GameEvent, GameMetrics, SessionSummary } from './types'

// ===== Analytics Error Types =====
export interface AnalyticsError {
  readonly _tag: "AnalyticsError"
  readonly message: string
  readonly cause?: unknown
}

export const createAnalyticsError = (message: string, cause?: unknown): AnalyticsError => ({
  _tag: "AnalyticsError" as const,
  message,
  cause,
})

// ===== Game Event Schema =====
export const GameEventSchema = Schema.Struct({
  id: Schema.String,
  timestamp: Schema.Number,
  type: Schema.Literal("enemy_destroyed", "player_shoot", "power_up_collected", "level_up", "game_over", "achievement_unlocked"),
  data: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  sessionId: Schema.String,
})

// ===== Metrics =====
export const enemyDestroyedMetric = Metric.counter("enemy_destroyed")
export const playerShotsMetric = Metric.counter("player_shots")
export const powerUpsCollectedMetric = Metric.counter("power_ups_collected")
export const levelUpsMetric = Metric.counter("level_ups")
export const frameTimeMetric = Metric.histogram("frame_time", MetricBoundaries.linear({ start: 0, width: 100, count: 20 }))
export const memoryUsageMetric = Metric.gauge("memory_usage")

// ===== Analytics Service Interface =====
export interface AnalyticsService {
  readonly trackEvent: (event: GameEvent) => Effect.Effect<void, AnalyticsError>
  readonly getMetrics: () => Effect.Effect<GameMetrics, AnalyticsError>
  readonly startSession: () => Effect.Effect<void, AnalyticsError>
  readonly endSession: () => Effect.Effect<SessionSummary, AnalyticsError>
  readonly getEventStream: () => Stream.Stream<GameEvent, AnalyticsError>
  readonly getPerformanceStream: () => Stream.Stream<PerformanceData, AnalyticsError>
}

export const AnalyticsService = Context.GenericTag<AnalyticsService>("AnalyticsService")

// ===== Performance Data =====
export interface PerformanceData {
  readonly timestamp: number
  readonly frameTime: number
  readonly memoryUsage: number
  readonly entityCount: number
  readonly fps: number
}

// ===== Analytics Service Implementation =====
const makeAnalyticsService = (): Effect.Effect<AnalyticsService, never> =>
  Effect.gen(function* (_) {
    const eventQueue = yield* _(Queue.unbounded<GameEvent>())
    const performanceQueue = yield* _(Queue.unbounded<PerformanceData>())
    const sessionRef = yield* _(Ref.make<{ id: string; startTime: number } | null>(null))
    const metricsRef = yield* _(Ref.make<GameMetrics>({
      totalEvents: 0,
      eventsByType: new Map(),
      averageFrameTime: 0,
      peakMemoryUsage: 0,
      sessionDuration: 0,
    }))

    const trackEvent = (event: GameEvent) =>
      Effect.gen(function* (_) {
        // Validate event with schema
        const validatedEvent = yield* _(
          Effect.try({
            try: () => Schema.decodeSync(GameEventSchema)(event),
            catch: (error) => createAnalyticsError("Invalid event format", error)
          })
        )

        // Update metrics
        if (event.type === "enemy_destroyed") yield* _(Metric.increment(enemyDestroyedMetric))
        if (event.type === "player_shoot") yield* _(Metric.increment(playerShotsMetric))
        if (event.type === "power_up_collected") yield* _(Metric.increment(powerUpsCollectedMetric))
        if (event.type === "level_up") yield* _(Metric.increment(levelUpsMetric))

        // Store in queue for processing
        yield* _(Queue.offer(eventQueue, validatedEvent))

        // Update local metrics
        yield* _(Ref.update(metricsRef, metrics => ({
          ...metrics,
          totalEvents: metrics.totalEvents + 1,
          eventsByType: new Map(metrics.eventsByType).set(
            event.type,
            (metrics.eventsByType.get(event.type) || 0) + 1
          )
        })))

        yield* _(Effect.log(`📊 Event tracked: ${event.type}`))
      })

    const getMetrics = () =>
      Effect.gen(function* (_) {
        const metrics = yield* _(Ref.get(metricsRef))
        const session = yield* _(Ref.get(sessionRef))
        
        if (session) {
          const duration = Date.now() - session.startTime
          return { ...metrics, sessionDuration: duration }
        }
        
        return metrics
      })

    const startSession = () =>
      Effect.gen(function* (_) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        yield* _(Ref.set(sessionRef, { id: sessionId, startTime: Date.now() }))
        yield* _(Effect.log(`🎮 Analytics session started: ${sessionId}`))
      })

    const endSession = () =>
      Effect.gen(function* (_) {
        const session = yield* _(Ref.get(sessionRef))
        if (!session) {
          yield* _(Effect.fail(createAnalyticsError("No active session")))
        }

        const duration = Date.now() - session!.startTime
        const metrics = yield* _(getMetrics())
        
        yield* _(Ref.set(sessionRef, null))
        
        const summary: SessionSummary = {
          sessionId: session!.id,
          duration,
          totalEvents: metrics.totalEvents,
          eventsByType: Object.fromEntries(metrics.eventsByType),
          averageFrameTime: metrics.averageFrameTime,
          peakMemoryUsage: metrics.peakMemoryUsage,
        }

        yield* _(Effect.log(`📊 Session ended: ${session!.id} (${duration}ms)`))
        return summary
      })

    const getEventStream = () =>
      Stream.fromQueue(eventQueue).pipe(
        Stream.tap(event => Effect.log(`📊 Processing event: ${event.type}`))
      )

    const getPerformanceStream = () =>
      Stream.fromQueue(performanceQueue).pipe(
        Stream.tap(data => {
          Metric.update(frameTimeMetric, data.frameTime)
          Metric.set(memoryUsageMetric, data.memoryUsage)
          return Effect.succeed(void 0)
        }),
        Stream.tap(data => Effect.log(`⚡ Performance: ${data.fps.toFixed(1)} FPS, ${data.memoryUsage.toFixed(1)}MB`)),
        Stream.mapError(() => createAnalyticsError("Performance stream error"))
      )

    return {
      trackEvent,
      getMetrics,
      startSession,
      endSession,
      getEventStream,
      getPerformanceStream,
    }
  })

export const AnalyticsServiceLayer = Layer.effect(AnalyticsService, makeAnalyticsService())

// ===== Analytics Operations =====
export const AnalyticsOperations = {
  trackEnemyDestroyed: (enemyType: string, points: number) =>
    Effect.gen(function* (_) {
      const analytics = yield* _(AnalyticsService)
      yield* _(analytics.trackEvent({
        id: `event_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        type: "enemy_destroyed",
        data: { enemyType, points },
        sessionId: "current", // Will be replaced with actual session ID
      }))
    }).pipe(Effect.provide(AnalyticsServiceLayer)),

  trackPlayerShoot: (weaponType: string, bulletCount: number) =>
    Effect.gen(function* (_) {
      const analytics = yield* _(AnalyticsService)
      yield* _(analytics.trackEvent({
        id: `event_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        type: "player_shoot",
        data: { weaponType, bulletCount },
        sessionId: "current",
      }))
    }).pipe(Effect.provide(AnalyticsServiceLayer)),

  trackPowerUpCollected: (powerUpType: string) =>
    Effect.gen(function* (_) {
      const analytics = yield* _(AnalyticsService)
      yield* _(analytics.trackEvent({
        id: `event_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        type: "power_up_collected",
        data: { powerUpType },
        sessionId: "current",
      }))
    }).pipe(Effect.provide(AnalyticsServiceLayer)),

  trackLevelUp: (newLevel: number, score: number) =>
    Effect.gen(function* (_) {
      const analytics = yield* _(AnalyticsService)
      yield* _(analytics.trackEvent({
        id: `event_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        type: "level_up",
        data: { newLevel, score },
        sessionId: "current",
      }))
    }).pipe(Effect.provide(AnalyticsServiceLayer)),

  startAnalyticsSession: () =>
    Effect.gen(function* (_) {
      const analytics = yield* _(AnalyticsService)
      yield* _(analytics.startSession())
    }).pipe(Effect.provide(AnalyticsServiceLayer)),

  endAnalyticsSession: () =>
    Effect.gen(function* (_) {
      const analytics = yield* _(AnalyticsService)
      return yield* _(analytics.endSession())
    }).pipe(Effect.provide(AnalyticsServiceLayer)),

  getCurrentMetrics: () =>
    Effect.gen(function* (_) {
      const analytics = yield* _(AnalyticsService)
      return yield* _(analytics.getMetrics())
    }).pipe(Effect.provide(AnalyticsServiceLayer)),
} 