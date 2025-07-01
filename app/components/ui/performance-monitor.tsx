import * as Effect from "effect/Effect"
import { motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import type { AchievementProgress } from '../../lib/game/achievements'
import { AchievementOperations } from '../../lib/game/achievements'
import type { PerformanceMetrics, PerformanceStats } from '../../lib/game/performance'
import { performanceMonitor, PerformanceOperations } from '../../lib/game/performance'

interface PerformanceMonitorProps {
  className?: string;
  isVisible?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  className = '', 
  isVisible = false 
}) => {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [achievements, setAchievements] = useState<AchievementProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const performanceStats = await Effect.runPromise(PerformanceOperations.getCurrentStats())
setStats(performanceStats)
    } catch (error) {
      console.error('Failed to fetch performance stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAchievements = async () => {
    try {
      const achievementProgress = await Effect.runPromise(AchievementOperations.getCurrentProgress())
      setAchievements(achievementProgress)
    } catch (error) {
      console.error('Failed to fetch achievements:', error)
    }
  }

  useEffect(() => {
    if (isVisible) {
      fetchStats()
      fetchAchievements()
      
      const interval = setInterval(() => {
        fetchStats()
        fetchAchievements()
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed top-4 right-4 bg-black/80 backdrop-blur-sm border border-gray-600 rounded-lg p-4 text-white text-sm font-mono z-50 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-cyan-400 font-bold">Effect-TS Monitor</h3>
        <div className="flex space-x-2">
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs disabled:opacity-50"
          >
            {isLoading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="space-y-2 mb-4">
        <h4 className="text-yellow-400 font-semibold">Performance</h4>
        {stats ? (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>FPS:</span>
              <span className={stats.averageFPS < 30 ? 'text-red-400' : 'text-green-400'}>
                {stats.averageFPS.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Frame Time:</span>
              <span>{stats.averageFrameTime.toFixed(1)}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Memory:</span>
              <span className={stats.currentMemoryUsage > 80 ? 'text-red-400' : 'text-green-400'}>
                {stats.currentMemoryUsage.toFixed(1)}MB
              </span>
            </div>
            <div className="flex justify-between">
              <span>Dropped Frames:</span>
              <span className={stats.droppedFrames > 10 ? 'text-red-400' : 'text-yellow-400'}>
                {stats.droppedFrames}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Performance Score:</span>
              <span className={
                stats.performanceScore > 80 ? 'text-green-400' : 
                stats.performanceScore > 60 ? 'text-yellow-400' : 'text-red-400'
              }>
                {stats.performanceScore}/100
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-xs">Loading...</div>
        )}
      </div>

      {/* Achievement Progress */}
      <div className="space-y-2">
        <h4 className="text-purple-400 font-semibold">Achievements</h4>
        {achievements ? (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Unlocked:</span>
              <span className="text-green-400">
                {achievements.unlockedAchievements}/{achievements.totalAchievements}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Progress:</span>
              <span>
                {Math.round((achievements.unlockedAchievements / achievements.totalAchievements) * 100)}%
              </span>
            </div>
            {achievements.recentUnlocks.length > 0 && (
              <div className="mt-2">
                <div className="text-yellow-400 mb-1">Recent:</div>
                {achievements.recentUnlocks.slice(-3).map((achievement) => (
                  <div key={achievement.id} className="text-xs text-gray-300">
                    {achievement.icon} {achievement.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 text-xs">Loading...</div>
        )}
      </div>

      {/* Effect-TS Status */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="flex items-center space-x-2 text-xs">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400">Effect-TS Active</span>
        </div>
      </div>
    </motion.div>
  )
}

export const PerformanceButton: React.FC<{ 
  onToggle: () => void 
  isVisible: boolean 
}> = ({ onToggle, isVisible }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderTime: 0,
    updateTime: 0
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({ ...performanceMonitor.metrics })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.button
      onClick={onToggle}
      className={`fixed bottom-4 left-4 z-40 px-3 py-2 rounded-lg font-mono text-xs transition-all ${
        isVisible 
          ? 'bg-cyan-600/80 text-white' 
          : 'bg-black/60 text-gray-400 hover:bg-black/80 hover:text-white'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          metrics.fps >= 55 ? 'bg-green-400' :
          metrics.fps >= 45 ? 'bg-yellow-400' : 'bg-red-400'
        }`} />
        <span>{Math.round(metrics.fps)} FPS</span>
      </div>
    </motion.button>
  )
} 