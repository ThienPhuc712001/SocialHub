import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { auth } from '../services/api'
import { Sparkles } from 'lucide-react'
import { WavyBackground } from '@/components/ui/wavy-background'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { MovingBorder } from '@/components/ui/moving-border'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getErrorMessage } from '../utils/format'

const LoginPage: React.FC = () => {
  const { login, register, theme } = useAuth()
  const { addToast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const forgotModalRef = useFocusTrap(showForgotPassword)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetStep, setResetStep] = useState(0)
  const [resetToken, setResetToken] = useState('')
  const [resetUserId, setResetUserId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
        addToast('Welcome back!', 'success')
      } else {
        await register(username, email, password)
        addToast('Account created!', 'success')
      }
} catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    } finally { setLoading(false) }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      const res = await auth.forgotPassword(forgotEmail)
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken)
        setResetUserId(res.data.userId || '')
        setResetStep(1)
        addToast('Reset token generated', 'success')
      } else {
        addToast(res.data.message, 'info')
      }
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    } finally { setForgotLoading(false) }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    try {
      await auth.resetPassword(resetToken, resetUserId, newPassword)
      addToast('Password reset successfully! You can now login.', 'success')
      setShowForgotPassword(false)
      setResetStep(0)
      setForgotEmail('')
      setResetToken('')
      setResetUserId('')
      setNewPassword('')
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    } finally { setResetLoading(false) }
  }

  return (
    <WavyBackground containerClassName="min-h-screen overflow-hidden" backgroundFill={theme === 'dark' ? '#0a0a1a' : '#f5f5f5'} speed="slow">
      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none floating-orb" />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.12, 0.04] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none floating-orb-slow" />

      {showForgotPassword ? (
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} ref={forgotModalRef} role="dialog" aria-modal="true" aria-label="Reset password">
          <MovingBorder containerClassName="w-full max-w-md" className="glass-heavy bg-white/[0.04] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.5)]" duration={4000} rx="20" ry="20">
            <div className="flex items-center space-x-3 mb-8">
              <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-12 h-12 bg-gradient-to-br from-primary via-accent to-pink-500 rounded-xl flex items-center justify-center shadow-lg glow">
                <Sparkles className="text-white" size={24} />
              </motion.div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-primary via-accent to-pink-500 bg-clip-text text-transparent">Reset Password</h1>
            </div>

            {resetStep === 0 ? (
              <form onSubmit={(e) => { if (forgotLoading) { e.preventDefault(); return; } handleForgotPassword(e); }} className="space-y-4">
                <p className="text-text-secondary text-sm">Enter your email address to get a reset token.</p>
                <input type="email" placeholder="Email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                  className="w-full px-5 py-4 input-glass rounded-xl text-text placeholder-text-muted" />
                <ShimmerButton className={`w-full py-4 font-bold text-lg ${forgotLoading ? 'opacity-50 pointer-events-none' : ''}`} background="rgba(139, 92, 246, 1)" shimmerColor="#c4b5fd" shimmerDuration="2s">
                  {forgotLoading ? 'Processing...' : 'Get Reset Token'}
                </ShimmerButton>
              </form>
            ) : (
              <form onSubmit={(e) => { if (resetLoading) { e.preventDefault(); return; } handleResetPassword(e); }} className="space-y-4">
                <p className="text-text-secondary text-sm">Enter the reset token and your new password.</p>
                <input type="text" placeholder="Reset Token" value={resetToken} onChange={e => setResetToken(e.target.value)} required
                  className="w-full px-5 py-4 input-glass rounded-xl text-text placeholder-text-muted" />
                <input type="hidden" value={resetUserId} />
                <input type="password" placeholder="New Password (min 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                  className="w-full px-5 py-4 input-glass rounded-xl text-text placeholder-text-muted" />
                <ShimmerButton className={`w-full py-4 font-bold text-lg ${resetLoading ? 'opacity-50 pointer-events-none' : ''}`} background="rgba(139, 92, 246, 1)" shimmerColor="#c4b5fd" shimmerDuration="2s">
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </ShimmerButton>
              </form>
            )}

            <div className="mt-6 text-center">
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setShowForgotPassword(false); setResetStep(0); }} className="text-text-muted hover:text-primary transition-colors card-press">
                Back to login
              </motion.button>
            </div>
          </MovingBorder>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
          <MovingBorder containerClassName="w-full max-w-md" className="glass-heavy bg-white/[0.04] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.5)]" duration={4000} rx="20" ry="20">
            <div className="flex items-center space-x-3 mb-8">
              <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-12 h-12 bg-gradient-to-br from-primary via-accent to-pink-500 rounded-xl flex items-center justify-center shadow-lg glow pulse-glow">
                <Sparkles className="text-white" size={24} />
              </motion.div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-accent to-pink-500 bg-clip-text text-transparent">SocialHub</h1>
            </div>

            <TextGenerateEffect words={isLogin ? 'Welcome Back' : 'Create Account'} className="text-2xl text-text mb-8" />

            <form onSubmit={(e) => { if (loading) { e.preventDefault(); return; } handleSubmit(e); }} className="space-y-4">
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required minLength={3}
                    className="w-full px-5 py-4 input-glass rounded-xl text-text placeholder-text-muted" />
                </motion.div>
              )}
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-5 py-4 input-glass rounded-xl text-text placeholder-text-muted" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full px-5 py-4 input-glass rounded-xl text-text placeholder-text-muted" />
              <ShimmerButton className={`w-full py-4 font-bold text-lg ${loading ? 'opacity-50 pointer-events-none' : ''}`} background="rgba(139, 92, 246, 1)" shimmerColor="#c4b5fd" shimmerDuration="2s">
                {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
              </ShimmerButton>
            </form>

            {isLogin && (
              <div className="mt-3 text-center">
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowForgotPassword(true)} className="text-text-muted hover:text-primary transition-colors text-sm card-press">
                  Forgot password?
                </motion.button>
              </div>
            )}

            <div className="mt-6 text-center">
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setIsLogin(!isLogin)} className="text-text-muted hover:text-primary transition-colors card-press">
                {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
              </motion.button>
            </div>
          </MovingBorder>
        </motion.div>
      )}
    </WavyBackground>
  )
}

export default LoginPage