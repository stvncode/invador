import { motion } from 'framer-motion'
import React from 'react'
import { cn } from '../../lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <motion.div
      className={cn(
        'rounded-full border-2 border-transparent border-t-cyan-400 border-r-purple-400',
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )
}

interface SkeletonProps {
  className?: string
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, lines = 1 }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <motion.div
          key={i}
          className="h-4 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  )
}

interface LoadingScreenProps {
  title?: string
  subtitle?: string
  progress?: number
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  title = "Loading...", 
  subtitle,
  progress 
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-blue-900 to-purple-900">
      <motion.div 
        className="text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"
          animate={{ 
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {title}
        </motion.div>

        {subtitle && (
          <p className="text-xl text-gray-300">{subtitle}</p>
        )}

        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>

        {progress !== undefined && (
          <div className="w-64 mx-auto">
            <div className="bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{Math.round(progress)}%</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export const ButtonLoading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center space-x-2">
    <LoadingSpinner size="sm" />
    <span>{children}</span>
  </div>
) 