import { AnimatePresence, motion } from 'framer-motion'
import React, { createContext, useCallback, useContext, useState } from 'react'
import { cn } from '../../lib/utils'

interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id)
    }, toast.duration || 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = "border-l-4 shadow-lg backdrop-blur-sm"
    
    switch (type) {
      case 'success':
        return cn(baseStyles, "bg-green-900/80 border-green-400 text-green-100")
      case 'error':
        return cn(baseStyles, "bg-red-900/80 border-red-400 text-red-100")
      case 'warning':
        return cn(baseStyles, "bg-yellow-900/80 border-yellow-400 text-yellow-100")
      case 'info':
        return cn(baseStyles, "bg-blue-900/80 border-blue-400 text-blue-100")
      default:
        return baseStyles
    }
  }

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return ''
    }
  }

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "p-4 rounded-lg cursor-pointer",
                getToastStyles(toast.type)
              )}
              onClick={() => removeToast(toast.id)}
            >
              <div className="flex items-start space-x-3">
                <span className="text-lg">{getIcon(toast.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{toast.title}</p>
                  {toast.description && (
                    <p className="text-xs opacity-90 mt-1">{toast.description}</p>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    removeToast(toast.id)
                  }}
                  className="text-lg opacity-70 hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
} 