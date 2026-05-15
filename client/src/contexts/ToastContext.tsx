import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export const useToast = () => useContext(ToastContext)

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <CheckCircle size={18} className="text-emerald-300" />
    case 'error': return <AlertCircle size={18} className="text-red-300" />
    case 'warning': return <AlertTriangle size={18} className="text-amber-300" />
    default: return <Info size={18} className="text-blue-300" />
  }
}

const getColors = (type: ToastType) => {
  switch (type) {
    case 'success': return { border: 'border-emerald-500/25', bg: 'bg-emerald-500/[0.08]', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]', bar: 'bg-emerald-400' }
    case 'error': return { border: 'border-red-500/25', bg: 'bg-red-500/[0.08]', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]', bar: 'bg-red-400' }
    case 'warning': return { border: 'border-amber-500/25', bg: 'bg-amber-500/[0.08]', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]', bar: 'bg-amber-400' }
    default: return { border: 'border-blue-500/25', bg: 'bg-blue-500/[0.08]', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]', bar: 'bg-blue-400' }
  }
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timeout = timeouts.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeouts.current.delete(id)
    }
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    const timeout = setTimeout(() => {
      removeToast(id)
    }, 4500)
    timeouts.current.set(id, timeout)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => {
            const colors = getColors(toast.type)
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 120, scale: 0.85 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 120, scale: 0.85, transition: { duration: 0.25 } }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`pointer-events-auto flex items-center space-x-3 p-4 rounded-xl backdrop-blur-2xl border ${colors.border} ${colors.bg} ${colors.glow} relative overflow-hidden`}
              >
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 4.5, ease: 'linear' }}
                  style={{ backgroundColor: colors.bar.replace('bg-', 'var(--tw-bg-opacity,1) ').replace('emerald-400', '#34d399').replace('red-400', '#f87171').replace('amber-400', '#fbbf24').replace('blue-400', '#60a5fa') }}
                >
                  <div className={`h-full rounded-full ${colors.bar}`} />
                </motion.div>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {getIcon(toast.type)}
                </motion.div>
                <p className="text-text text-sm flex-1 font-medium leading-snug">{toast.message}</p>
                <motion.button
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => removeToast(toast.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </motion.button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}