import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 max-w-md w-full text-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
              className="w-16 h-16 bg-red-500/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-5"
            >
              <AlertTriangle size={32} className="text-red-400" />
            </motion.div>
            <h2 className="text-xl font-bold gradient-text mb-2">Something went wrong</h2>
            <p className="text-text-muted text-sm mb-6">
              {this.state.error?.message || 'An unexpected error occurred. Please try again or refresh the page.'}
            </p>
            <div className="flex space-x-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => this.setState({ hasError: false })}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press flex items-center space-x-2"
              >
                <RefreshCw size={16} />
                <span>Try Again</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 glass-card rounded-xl font-medium text-text-muted card-press"
              >
                Reload Page
              </motion.button>
            </div>
            {this.state.error && (
              <p className="text-text-subtle text-xs mt-4 font-mono bg-black/10 rounded-lg p-2">
                {this.state.error.message}
              </p>
            )}
          </motion.div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary