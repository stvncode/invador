import { motion } from 'framer-motion'
import React from 'react'
import { Button } from './button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    this.props.onError?.(error, errorInfo)
    
    // Log to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} reset={this.handleReset} />
      }

      return <DefaultErrorFallback error={this.state.error!} reset={this.handleReset} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error
  reset: () => void
}

export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, reset }) => {
  return (
    <div 
      className="flex items-center justify-center min-h-screen"
      style={{
        backgroundImage: 'url(/page-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        backgroundColor: '#000000' // Fallback color
      }}
    >
      <motion.div 
        className="text-center space-y-6 p-8 max-w-md mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="text-6xl"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, -5, 5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          💥
        </motion.div>

        <div>
          <h1 className="text-4xl font-bold text-red-400 mb-2">
            Game Crashed!
          </h1>
          <p className="text-gray-300 text-lg">
            Something went wrong with the space invaders
          </p>
        </div>

        <div className="bg-black/50 p-4 rounded-lg border border-red-500/30">
          <p className="text-sm text-red-300 font-mono">
            {error.message}
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={reset}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            🔄 Restart Game
          </Button>
          
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
          >
            🌐 Reload Page
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          If this keeps happening, try refreshing your browser or check the console for more details.
        </p>
      </motion.div>
    </div>
  )
}

export const GameErrorFallback: React.FC<ErrorFallbackProps> = ({ error, reset }) => {
  return (
    <motion.div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="bg-gradient-to-b from-red-900 to-black p-8 rounded-lg border border-red-500/50 max-w-md mx-4"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400">Game Error</h2>
          <p className="text-gray-300">{error.message}</p>
          
          <div className="flex space-x-3">
            <Button onClick={reset} size="sm">
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline" 
              size="sm"
            >
              Exit to Menu
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 