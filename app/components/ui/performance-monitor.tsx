import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { performanceMonitor, type PerformanceMetrics } from '../../lib/game/performance'

interface PerformanceMonitorProps {
  show: boolean
  onToggle?: () => void
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  show, 
  onToggle 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderTime: 0,
    updateTime: 0
  })

  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!show) return

    const interval = setInterval(() => {
      setMetrics({ ...performanceMonitor.metrics })
    }, 100)

    return () => clearInterval(interval)
  }, [show])

  const getPerformanceColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 45) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMemoryColor = (usage: number) => {
    if (usage < 50) return 'text-green-400'
    if (usage < 100) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg border border-gray-700 p-3 font-mono text-xs"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-cyan-400 font-bold">PERFORMANCE</span>
        <div className="flex space-x-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Toggle details"
          >
            {showDetails ? '−' : '+'}
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
              title="Hide monitor"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-300">FPS:</span>
          <span className={getPerformanceColor(metrics.fps)}>
            {Math.round(metrics.fps)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-300">Frame:</span>
          <span className="text-white">
            {metrics.frameTime.toFixed(1)}ms
          </span>
        </div>

        {metrics.memoryUsage > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-300">Memory:</span>
            <span className={getMemoryColor(metrics.memoryUsage)}>
              {metrics.memoryUsage.toFixed(1)}MB
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-600 space-y-1"
          >
            <div className="flex justify-between">
              <span className="text-gray-400">Update:</span>
              <span className="text-blue-300">
                {metrics.updateTime.toFixed(2)}ms
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Render:</span>
              <span className="text-purple-300">
                {metrics.renderTime.toFixed(2)}ms
              </span>
            </div>

            <div className="mt-2">
              <div className="text-gray-400 mb-1">Performance:</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${
                    metrics.fps >= 55 ? 'bg-green-500' :
                    metrics.fps >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, (metrics.fps / 60) * 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {performanceMonitor.isPerformanceLow() && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-red-400 text-center"
              >
                ⚠️ Low Performance
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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