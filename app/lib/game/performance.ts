/**
 * Performance optimizations for the game engine
 * Includes FPS monitoring, memory management, and rendering optimizations
 */

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
