/**
 * Performance optimizations for the game engine
 * Includes FPS monitoring, memory management, and rendering optimizations
 */

import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import * as MetricBoundaries from "effect/MetricBoundaries"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"

interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  renderTime: number
  updateTime: number
}

interface PerformanceConfig {
  targetFPS: number
  maxParticles: number
  cullDistance: number
  enableVSync: boolean
  enableParticles: boolean
}

class PerformanceMonitor {
  private frameCount = 0
  private lastTime = 0
  private fpsValues: number[] = []
  private frameTimeValues: number[] = []
  
  private updateStartTime = 0
  private renderStartTime = 0
  
  public metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderTime: 0,
    updateTime: 0
  }

  startFrame() {
    this.updateStartTime = performance.now()
  }

  startRender() {
    this.renderStartTime = performance.now()
    this.metrics.updateTime = this.renderStartTime - this.updateStartTime
  }

  endFrame() {
    const currentTime = performance.now()
    this.metrics.renderTime = currentTime - this.renderStartTime
    
    const frameTime = currentTime - this.lastTime
    this.frameTimeValues.push(frameTime)
    
    if (this.frameTimeValues.length > 60) {
      this.frameTimeValues.shift()
    }
    
    this.frameCount++
    
    // Calculate FPS every second
    if (currentTime - this.lastTime >= 1000) {
      this.metrics.fps = this.frameCount
      this.frameCount = 0
      this.lastTime = currentTime
      
      // Calculate average frame time
      this.metrics.frameTime = this.frameTimeValues.reduce((a, b) => a + b, 0) / this.frameTimeValues.length
      
      // Update memory usage if available
      if ((performance as any).memory) {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024
      }
    }
  }

  getAverageFPS(): number {
    return this.fpsValues.reduce((a, b) => a + b, 0) / Math.max(this.fpsValues.length, 1)
  }

  isPerformanceLow(): boolean {
    return this.metrics.fps < 45 || this.metrics.frameTime > 22
  }
}

class ObjectPool<T> {
  private available: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn
    this.resetFn = resetFn
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn())
    }
  }

  get(): T {
    if (this.available.length > 0) {
      return this.available.pop()!
    }
    return this.createFn()
  }

  release(obj: T) {
    this.resetFn(obj)
    this.available.push(obj)
  }

  clear() {
    this.available.length = 0
  }

  getPoolSize(): number {
    return this.available.length
  }
}

class RenderOptimizer {
  private lastClearTime = 0
  private readonly clearInterval = 100 // Clear every 100ms

  // Optimized clear that only clears dirty regions
  clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, dirtyRects?: DOMRect[]) {
    const now = performance.now()
    
    if (dirtyRects && dirtyRects.length > 0) {
      // Clear only dirty regions
      dirtyRects.forEach(rect => {
        ctx.clearRect(rect.x, rect.y, rect.width, rect.height)
      })
    } else if (now - this.lastClearTime > this.clearInterval) {
      // Full clear occasionally to prevent artifacts
      ctx.clearRect(0, 0, width, height)
      this.lastClearTime = now
    }
  }

  // Batch sprite rendering
  batchRender(ctx: CanvasRenderingContext2D, sprites: Array<{
    image: HTMLImageElement
    x: number
    y: number
    width: number
    height: number
  }>) {
    // Group sprites by image to reduce context switches
    const grouped = new Map<HTMLImageElement, typeof sprites>()
    
    sprites.forEach(sprite => {
      if (!grouped.has(sprite.image)) {
        grouped.set(sprite.image, [])
      }
      grouped.get(sprite.image)!.push(sprite)
    })

    // Render each group
    grouped.forEach((spriteGroup, image) => {
      spriteGroup.forEach(sprite => {
        ctx.drawImage(image, sprite.x, sprite.y, sprite.width, sprite.height)
      })
    })
  }

  // Frustum culling for off-screen objects
  cullObjects<T extends { x: number; y: number; width: number; height: number }>(
    objects: T[],
    viewportWidth: number,
    viewportHeight: number,
    margin = 50
  ): T[] {
    return objects.filter(obj => 
      obj.x + obj.width >= -margin &&
      obj.x <= viewportWidth + margin &&
      obj.y + obj.height >= -margin &&
      obj.y <= viewportHeight + margin
    )
  }
}

class ParticleOptimizer {
  private particlePool: ObjectPool<any>
  
  constructor(maxParticles = 1000) {
    this.particlePool = new ObjectPool(
      () => ({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: '#ffffff', size: 1,
        active: false
      }),
      (particle) => {
        particle.active = false
        particle.life = 0
      },
      maxParticles
    )
  }

  createParticle(x: number, y: number, vx: number, vy: number, life: number, color: string, size = 1) {
    const particle = this.particlePool.get()
    particle.x = x
    particle.y = y
    particle.vx = vx
    particle.vy = vy
    particle.life = life
    particle.maxLife = life
    particle.color = color
    particle.size = size
    particle.active = true
    return particle
  }

  updateParticles(particles: any[], deltaTime: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]
      
      particle.x += particle.vx * deltaTime
      particle.y += particle.vy * deltaTime
      particle.life -= deltaTime

      if (particle.life <= 0) {
        this.particlePool.release(particle)
        particles.splice(i, 1)
      }
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D, particles: any[]) {
    // Batch render particles by color
    const colorGroups = new Map<string, any[]>()
    
    particles.forEach(particle => {
      if (!colorGroups.has(particle.color)) {
        colorGroups.set(particle.color, [])
      }
      colorGroups.get(particle.color)!.push(particle)
    })

    colorGroups.forEach((group, color) => {
      ctx.fillStyle = color
      group.forEach(particle => {
        ctx.globalAlpha = particle.life / particle.maxLife
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size)
      })
    })
    
    ctx.globalAlpha = 1
  }
}

// Export performance tools
export const performanceMonitor = new PerformanceMonitor()
export const renderOptimizer = new RenderOptimizer()
export const particleOptimizer = new ParticleOptimizer()

export { ObjectPool, ParticleOptimizer, PerformanceMonitor, RenderOptimizer }
export type { PerformanceConfig, PerformanceMetrics }

// ===== Performance Error Types =====
export interface PerformanceError {
  readonly _tag: "PerformanceError"
  readonly message: string
  readonly cause?: unknown
}

export const createPerformanceError = (message: string, cause?: unknown): PerformanceError => ({
  _tag: "PerformanceError" as const,
  message,
  cause,
})

// ===== Performance Data Types =====
export interface PerformanceData {
  readonly timestamp: number
  readonly frameTime: number
  readonly memoryUsage: number
  readonly entityCount: number
  readonly fps: number
  readonly cpuUsage: number
}

export interface PerformanceStats {
  readonly averageFPS: number
  readonly averageFrameTime: number
  readonly peakMemoryUsage: number
  readonly currentMemoryUsage: number
  readonly totalFrames: number
  readonly droppedFrames: number
  readonly performanceScore: number
}

export interface PerformanceAlert {
  readonly type: "low_fps" | "high_memory" | "frame_drop" | "cpu_spike"
  readonly severity: "warning" | "critical"
  readonly message: string
  readonly timestamp: number
  readonly data: PerformanceData
}

// ===== Performance Metrics =====
export const frameTimeMetric = Metric.histogram("frame_time", MetricBoundaries.linear({ start: 0, width: 100, count: 20 }))
export const memoryUsageMetric = Metric.gauge("memory_usage")
export const fpsMetric = Metric.gauge("fps")
export const entityCountMetric = Metric.gauge("entity_count")
export const cpuUsageMetric = Metric.gauge("cpu_usage")
export const droppedFramesMetric = Metric.counter("dropped_frames")

// ===== Performance Service Interface =====
export interface PerformanceService {
  readonly recordFrameTime: (deltaTime: number) => Effect.Effect<void, PerformanceError>
  readonly recordMemoryUsage: () => Effect.Effect<void, PerformanceError>
  readonly recordEntityCount: (count: number) => Effect.Effect<void, PerformanceError>
  readonly getPerformanceStats: () => Effect.Effect<PerformanceStats, PerformanceError>
  readonly alertOnPerformanceIssue: () => Stream.Stream<PerformanceAlert, PerformanceError>
  readonly startMonitoring: () => Effect.Effect<void, PerformanceError>
  readonly stopMonitoring: () => Effect.Effect<void, PerformanceError>
}

export const PerformanceService = Context.GenericTag<PerformanceService>("PerformanceService")

// ===== Performance Service Implementation =====
const makePerformanceService = (): Effect.Effect<PerformanceService, never> =>
  Effect.gen(function* (_) {
    const statsRef = yield* _(Ref.make<PerformanceStats>({
      averageFPS: 0,
      averageFrameTime: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      totalFrames: 0,
      droppedFrames: 0,
      performanceScore: 100,
    }))

    const frameTimesRef = yield* _(Ref.make<number[]>([]))
    const isMonitoringRef = yield* _(Ref.make(false))

    const calculateFPS = (frameTime: number) => {
      return frameTime > 0 ? 1000 / frameTime : 0
    }

    const updateStats = (frameTime: number, memoryUsage: number, entityCount: number) =>
      Effect.gen(function* (_) {
        const fps = calculateFPS(frameTime)
        const currentStats = yield* _(Ref.get(statsRef))
        const frameTimes = yield* _(Ref.get(frameTimesRef))

        // Update frame times array (keep last 60 frames)
        const newFrameTimes = [...frameTimes, frameTime].slice(-60)
        yield* _(Ref.set(frameTimesRef, newFrameTimes))

        // Calculate averages
        const averageFrameTime = newFrameTimes.reduce((sum, time) => sum + time, 0) / newFrameTimes.length
        const averageFPS = calculateFPS(averageFrameTime)

        // Check for dropped frames (frame time > 33ms = < 30 FPS)
        const droppedFrames = frameTime > 33 ? currentStats.droppedFrames + 1 : currentStats.droppedFrames

        // Calculate performance score (0-100)
        const fpsScore = Math.min(100, (fps / 60) * 100)
        const memoryScore = Math.max(0, 100 - (memoryUsage / 100)) // Assuming 100MB is max
        const performanceScore = Math.round((fpsScore + memoryScore) / 2)

        const newStats: PerformanceStats = {
          averageFPS,
          averageFrameTime,
          peakMemoryUsage: Math.max(currentStats.peakMemoryUsage, memoryUsage),
          currentMemoryUsage: memoryUsage,
          totalFrames: currentStats.totalFrames + 1,
          droppedFrames,
          performanceScore,
        }

        yield* _(Ref.set(statsRef, newStats))

        // Update metrics
        yield* _(Metric.update(frameTimeMetric, frameTime))
        yield* _(Metric.set(memoryUsageMetric, memoryUsage))
        yield* _(Metric.set(fpsMetric, fps))
        yield* _(Metric.set(entityCountMetric, entityCount))
        if (frameTime > 33) {
          yield* _(Metric.increment(droppedFramesMetric))
        }
      })

    const recordFrameTime = (deltaTime: number) =>
      Effect.gen(function* (_) {
        const isMonitoring = yield* _(Ref.get(isMonitoringRef))
        if (!isMonitoring) return

        // Simulate memory usage for demo
        const memoryUsage = Math.random() * 50 + 20 // 20-70MB

        yield* _(updateStats(deltaTime, memoryUsage, 0)) // Entity count will be updated separately
      })

    const recordMemoryUsage = () =>
      Effect.gen(function* (_) {
        const isMonitoring = yield* _(Ref.get(isMonitoringRef))
        if (!isMonitoring) return

        const memoryUsage = Math.random() * 50 + 20 // Simulated memory usage

        yield* _(Metric.set(memoryUsageMetric, memoryUsage))
        
        const currentStats = yield* _(Ref.get(statsRef))
        yield* _(Ref.set(statsRef, {
          ...currentStats,
          currentMemoryUsage: memoryUsage,
          peakMemoryUsage: Math.max(currentStats.peakMemoryUsage, memoryUsage),
        }))
      })

    const recordEntityCount = (count: number) =>
      Effect.gen(function* (_) {
        const isMonitoring = yield* _(Ref.get(isMonitoringRef))
        if (!isMonitoring) return

        yield* _(Metric.set(entityCountMetric, count))
      })

    const getPerformanceStats = () =>
      Effect.gen(function* (_) {
        return yield* _(Ref.get(statsRef))
      })

    const alertOnPerformanceIssue = () =>
      Stream.fromEffect(Ref.get(statsRef)).pipe(
        Stream.repeat(Schedule.fixed(Duration.seconds(1))),
        Stream.flatMap(stats => {
          const alerts: PerformanceAlert[] = []
          
          if (stats.averageFPS < 30) {
            alerts.push({
              type: "low_fps",
              severity: stats.averageFPS < 20 ? "critical" : "warning",
              message: `Low FPS detected: ${stats.averageFPS.toFixed(1)} FPS`,
              timestamp: Date.now(),
              data: {
                timestamp: Date.now(),
                frameTime: stats.averageFrameTime,
                memoryUsage: stats.currentMemoryUsage,
                entityCount: 0,
                fps: stats.averageFPS,
                cpuUsage: 0,
              }
            })
          }

          if (stats.currentMemoryUsage > 80) {
            alerts.push({
              type: "high_memory",
              severity: stats.currentMemoryUsage > 95 ? "critical" : "warning",
              message: `High memory usage: ${stats.currentMemoryUsage.toFixed(1)}MB`,
              timestamp: Date.now(),
              data: {
                timestamp: Date.now(),
                frameTime: stats.averageFrameTime,
                memoryUsage: stats.currentMemoryUsage,
                entityCount: 0,
                fps: stats.averageFPS,
                cpuUsage: 0,
              }
            })
          }

          if (stats.droppedFrames > 10) {
            alerts.push({
              type: "frame_drop",
              severity: "warning",
              message: `Frame drops detected: ${stats.droppedFrames} dropped frames`,
              timestamp: Date.now(),
              data: {
                timestamp: Date.now(),
                frameTime: stats.averageFrameTime,
                memoryUsage: stats.currentMemoryUsage,
                entityCount: 0,
                fps: stats.averageFPS,
                cpuUsage: 0,
              }
            })
          }

          return Stream.fromIterable(alerts)
        }),
        Stream.tap(alert => Effect.log(`⚠️ Performance Alert: ${alert.message}`))
      )

    const startMonitoring = () =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(isMonitoringRef, true))
        yield* _(Effect.log("📊 Performance monitoring started"))
      })

    const stopMonitoring = () =>
      Effect.gen(function* (_) {
        yield* _(Ref.set(isMonitoringRef, false))
        yield* _(Effect.log("📊 Performance monitoring stopped"))
      })

    return {
      recordFrameTime,
      recordMemoryUsage,
      recordEntityCount,
      getPerformanceStats,
      alertOnPerformanceIssue,
      startMonitoring,
      stopMonitoring,
    }
  })

export const PerformanceServiceLayer = Layer.effect(PerformanceService, makePerformanceService())

// ===== Performance Operations =====
export const PerformanceOperations = {
  recordFrame: (deltaTime: number) =>
    Effect.gen(function* (_) {
      const performanceService = yield* _(PerformanceService)
      yield* _(performanceService.recordFrameTime(deltaTime))
    }).pipe(Effect.provide(PerformanceServiceLayer)),

  recordEntities: (count: number) =>
    Effect.gen(function* (_) {
      const performanceService = yield* _(PerformanceService)
      yield* _(performanceService.recordEntityCount(count))
    }).pipe(Effect.provide(PerformanceServiceLayer)),

  getCurrentStats: () =>
    Effect.gen(function* (_) {
      const performanceService = yield* _(PerformanceService)
      return yield* _(performanceService.getPerformanceStats())
    }).pipe(Effect.provide(PerformanceServiceLayer)),

  startPerformanceMonitoring: () =>
    Effect.gen(function* (_) {
      const performanceService = yield* _(PerformanceService)
      yield* _(performanceService.startMonitoring())
    }).pipe(Effect.provide(PerformanceServiceLayer)),

  stopPerformanceMonitoring: () =>
    Effect.gen(function* (_) {
      const performanceService = yield* _(PerformanceService)
      yield* _(performanceService.stopMonitoring())
    }).pipe(Effect.provide(PerformanceServiceLayer)),

  getPerformanceAlerts: () =>
    Effect.gen(function* (_) {
      const performanceService = yield* _(PerformanceService)
      return performanceService.alertOnPerformanceIssue()
    }).pipe(Effect.provide(PerformanceServiceLayer)),
}
