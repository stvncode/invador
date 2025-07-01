import * as Effect from "effect/Effect"
import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { AchievementOperations } from '../../lib/game/achievements'
import type { PerformanceStats } from '../../lib/game/performance'
import { PerformanceOperations } from '../../lib/game/performance'
import { useGameStore } from '../../lib/game/store'
import { Button } from './button'
import { Card } from './card'

interface DebugPanelProps {
  isVisible: boolean
  onToggle: () => void
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible, onToggle }) => {
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null)
  const [achievementProgress, setAchievementProgress] = useState<any>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const gameStore = useGameStore()
  const { player, enemies, bullets, powerUps, particles, explosions, stats, level, gameTime } = gameStore

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [perfStats, achievements] = await Promise.all([
        Effect.runPromise(PerformanceOperations.getCurrentStats()),
        Effect.runPromise(AchievementOperations.getCurrentProgress())
      ])
      
      setPerformanceStats(perfStats)
      setAchievementProgress(achievements)
      
      // Mock analytics data for now
      setAnalyticsData({
        totalEvents: stats.totalEnemiesDestroyed + stats.totalBulletsFired,
        eventsByType: {
          'enemy_destroyed': stats.totalEnemiesDestroyed,
          'player_shoot': stats.totalBulletsFired,
          'power_up_collected': stats.totalPowerUpsCollected,
          'level_up': level
        }
      })
    } catch (error) {
      console.error('Failed to fetch debug data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isVisible) {
      fetchData()
      const interval = setInterval(fetchData, 2000) // Update every 2 seconds
      return () => clearInterval(interval)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed top-4 right-4 w-80 max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-sm border border-gray-600 rounded-lg p-4 text-white text-xs font-mono z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
          <h3 className="text-cyan-400 font-bold text-sm">🔧 Debug Panel</h3>
          <div className="flex space-x-2">
            <Button
              onClick={fetchData}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1"
            >
              {isLoading ? '...' : '🔄'}
            </Button>
            <Button
              onClick={onToggle}
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Game State */}
          <Card className="p-3">
            <h4 className="text-yellow-400 font-semibold mb-2">🎮 Game State</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>State:</span>
                <span className="text-green-400">{gameStore.gameState}</span>
              </div>
              <div className="flex justify-between">
                <span>Level:</span>
                <span>{level}</span>
              </div>
              <div className="flex justify-between">
                <span>Game Time:</span>
                <span>{Math.round(gameTime / 1000)}s</span>
              </div>
              <div className="flex justify-between">
                <span>Score:</span>
                <span className="text-yellow-400">{player.score.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Entity Counts */}
          <Card className="p-3">
            <h4 className="text-blue-400 font-semibold mb-2">📊 Entities</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Enemies:</span>
                <span className={enemies.length > 20 ? 'text-red-400' : 'text-green-400'}>
                  {enemies.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bullets:</span>
                <span className={bullets.length > 50 ? 'text-red-400' : 'text-green-400'}>
                  {bullets.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Power-ups:</span>
                <span className="text-purple-400">{powerUps.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Particles:</span>
                <span className={particles.length > 100 ? 'text-red-400' : 'text-green-400'}>
                  {particles.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Explosions:</span>
                <span>{explosions.length}</span>
              </div>
            </div>
          </Card>

          {/* Player Status */}
          <Card className="p-3">
            <h4 className="text-green-400 font-semibold mb-2">👤 Player</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Health:</span>
                <span className={player.health < 30 ? 'text-red-400' : 'text-green-400'}>
                  {player.health}/{player.maxHealth}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Lives:</span>
                <span className="text-yellow-400">{player.lives}</span>
              </div>
              <div className="flex justify-between">
                <span>Weapon Level:</span>
                <span>{player.weaponLevel}</span>
              </div>
              <div className="flex justify-between">
                <span>Ship Level:</span>
                <span className="text-purple-400">{player.shipLevel}</span>
              </div>
              {player.shipUpgradeTime > 0 && (
                <div className="flex justify-between">
                  <span>Ship Timer:</span>
                  <span className="text-orange-400">
                    {Math.round(player.shipUpgradeTime / 1000)}s
                  </span>
                </div>
              )}
              {player.invulnerabilityTime > 0 && (
                <div className="flex justify-between">
                  <span>Shield:</span>
                  <span className="text-blue-400">
                    {Math.round(player.invulnerabilityTime / 1000)}s
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Performance */}
          {performanceStats && (
            <Card className="p-3">
              <h4 className="text-red-400 font-semibold mb-2">⚡ Performance</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>FPS:</span>
                  <span className={performanceStats.averageFPS < 30 ? 'text-red-400' : 'text-green-400'}>
                    {performanceStats.averageFPS.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Frame Time:</span>
                  <span>{performanceStats.averageFrameTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory:</span>
                  <span className={performanceStats.currentMemoryUsage > 80 ? 'text-red-400' : 'text-green-400'}>
                    {performanceStats.currentMemoryUsage.toFixed(1)}MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dropped Frames:</span>
                  <span className={performanceStats.droppedFrames > 10 ? 'text-red-400' : 'text-yellow-400'}>
                    {performanceStats.droppedFrames}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className={
                    performanceStats.performanceScore > 80 ? 'text-green-400' : 
                    performanceStats.performanceScore > 60 ? 'text-yellow-400' : 'text-red-400'
                  }>
                    {performanceStats.performanceScore}/100
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Analytics */}
          {analyticsData && (
            <Card className="p-3">
              <h4 className="text-purple-400 font-semibold mb-2">📈 Analytics</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <span>{analyticsData.totalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Enemies Destroyed:</span>
                  <span className="text-green-400">{analyticsData.eventsByType.enemy_destroyed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bullets Fired:</span>
                  <span>{analyticsData.eventsByType.player_shoot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Power-ups Collected:</span>
                  <span className="text-purple-400">{analyticsData.eventsByType.power_up_collected}</span>
                </div>
                <div className="flex justify-between">
                  <span>Level Ups:</span>
                  <span className="text-yellow-400">{analyticsData.eventsByType.level_up}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Achievements */}
          {achievementProgress && (
            <Card className="p-3">
              <h4 className="text-yellow-400 font-semibold mb-2">🏆 Achievements</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Unlocked:</span>
                  <span className="text-green-400">
                    {achievementProgress.unlockedAchievements}/{achievementProgress.totalAchievements}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Progress:</span>
                  <span>
                    {Math.round((achievementProgress.unlockedAchievements / achievementProgress.totalAchievements) * 100)}%
                  </span>
                </div>
                {achievementProgress.recentUnlocks?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="text-xs text-gray-400 mb-1">Recent:</div>
                    {achievementProgress.recentUnlocks.slice(-2).map((achievement: any) => (
                      <div key={achievement.id} className="text-xs text-gray-300">
                        {achievement.icon} {achievement.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Game Stats */}
          <Card className="p-3">
            <h4 className="text-cyan-400 font-semibold mb-2">📊 Stats</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Enemies:</span>
                <span>{stats.totalEnemiesDestroyed}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Bullets:</span>
                <span>{stats.totalBulletsFired}</span>
              </div>
              <div className="flex justify-between">
                <span>Power-ups:</span>
                <span>{stats.totalPowerUpsCollected}</span>
              </div>
              <div className="flex justify-between">
                <span>Bosses Defeated:</span>
                <span className="text-red-400">{stats.bossesDefeated}</span>
              </div>
              <div className="flex justify-between">
                <span>Perfect Levels:</span>
                <span className="text-yellow-400">{stats.perfectLevels}</span>
              </div>
              <div className="flex justify-between">
                <span>Highest Level:</span>
                <span className="text-purple-400">{stats.highestLevel}</span>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export const DebugButton: React.FC<{ onToggle: () => void; isVisible: boolean }> = ({ 
  onToggle, 
  isVisible 
}) => {
  return (
    <motion.button
      onClick={onToggle}
      className={`fixed bottom-4 right-4 z-40 px-3 py-2 rounded-lg font-mono text-xs transition-all ${
        isVisible 
          ? 'bg-cyan-600/80 text-white' 
          : 'bg-black/60 text-gray-400 hover:bg-black/80 hover:text-white'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center space-x-2">
        <span>🔧</span>
        <span>Debug</span>
      </div>
    </motion.button>
  )
} 