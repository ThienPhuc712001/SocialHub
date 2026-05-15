import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, User, Users, Zap, Camera, Sparkles, Check, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { profiles } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../utils/format'
import { compressMediaFile, shouldCompress } from '../utils/compression'
import Avatar from './Avatar'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [compressingImage, setCompressingImage] = useState(false)
  const modalRef = useFocusTrap(isOpen)

  const steps = [
    {
      title: 'Welcome to SocialHub!',
      description: 'Let\'s get you set up in just a few steps.',
      icon: Sparkles,
      content: (
        <div className="text-center space-y-4">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 bg-gradient-to-br from-primary via-accent to-pink-500 rounded-2xl flex items-center justify-center mx-auto"
          >
            <Sparkles className="text-white" size={32} />
          </motion.div>
          <p className="text-text-secondary">Connect with friends, share moments, and discover amazing content.</p>
        </div>
      )
    },
    {
      title: 'Complete Your Profile',
      description: 'Add a photo and bio to let others know about you.',
      icon: User,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <Avatar
                src={avatarPreview || user?.avatar}
                name={user?.username || ''}
                size={80}
                className="ring-4 ring-primary/20"
              />
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors">
                <Camera size={16} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      try {
                        if (shouldCompress(file, 150)) {
                          setCompressingImage(true)
                          addToast('Compressing profile image...', 'info')

                          const compressedFile = await compressMediaFile(file, 'profile')
                          const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1)

                          if (compressionRatio !== '0.0') {
                            addToast(`Profile image compressed! Saved ${compressionRatio}%`, 'success')
                          }

                          setAvatar(compressedFile)
                        } else {
                          setAvatar(file)
                        }

                        const reader = new FileReader()
                        reader.onload = (e) => setAvatarPreview(e.target?.result as string)
                        reader.readAsDataURL(file)
                      } catch (error) {
                        addToast('Failed to process image', 'error')
                        console.error('Image compression error:', error)
                      } finally {
                        setCompressingImage(false)
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <textarea
            placeholder="Tell us about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={150}
            rows={3}
            className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none"
          />
          <p className="text-text-subtle text-xs text-center">{bio.length}/150 characters</p>
        </div>
      )
    },
    {
      title: 'Find Your Friends',
      description: 'Connect with people you know to get started.',
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-accent/15 rounded-2xl flex items-center justify-center mx-auto">
              <Users size={24} className="text-accent" />
            </div>
            <p className="text-text-secondary">We'll help you find friends and interesting people to follow.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/explore')}
            className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium card-press"
          >
            Explore Users
          </motion.button>
        </div>
      )
    },
    {
      title: 'Discover Features',
      description: 'Learn what makes SocialHub special.',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 glass-card rounded-xl text-center space-y-2"
            >
              <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center mx-auto">
                <Camera size={20} className="text-primary" />
              </div>
              <p className="text-text font-medium text-sm">Share Photos</p>
              <p className="text-text-subtle text-xs">Post images and moments</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 glass-card rounded-xl text-center space-y-2"
            >
              <div className="w-10 h-10 bg-accent/15 rounded-lg flex items-center justify-center mx-auto">
                <Users size={20} className="text-accent" />
              </div>
              <p className="text-text font-medium text-sm">Connect</p>
              <p className="text-text-subtle text-xs">Follow friends and creators</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 glass-card rounded-xl text-center space-y-2"
            >
              <div className="w-10 h-10 bg-pink-500/15 rounded-lg flex items-center justify-center mx-auto">
                <Sparkles size={20} className="text-pink-500" />
              </div>
              <p className="text-text font-medium text-sm">Stories</p>
              <p className="text-text-subtle text-xs">Share temporary moments</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 glass-card rounded-xl text-center space-y-2"
            >
              <div className="w-10 h-10 bg-blue-500/15 rounded-lg flex items-center justify-center mx-auto">
                <Check size={20} className="text-blue-500" />
              </div>
              <p className="text-text font-medium text-sm">Real-time</p>
              <p className="text-text-subtle text-xs">Live updates and chat</p>
            </motion.div>
          </div>
        </div>
      )
    },
    {
      title: 'You\'re All Set!',
      description: 'Start exploring and sharing your moments.',
      icon: Check,
      content: (
        <div className="text-center space-y-4">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto"
          >
            <Check className="text-white" size={32} />
          </motion.div>
          <p className="text-text-secondary">Welcome to the community! Let's create your first post.</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium card-press"
          >
            Start Exploring
          </motion.button>
        </div>
      )
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Update profile if avatar or bio changed
      if (avatar || bio) {
        const formData = new FormData()
        if (avatar) formData.append('avatar', avatar)
        if (bio) formData.append('bio', bio)
        await profiles.updateFormData(formData)
        await updateUser()
        addToast('Profile updated!', 'success')
      }

      // Mark onboarding as complete
      localStorage.setItem('onboardingCompleted', 'true')
      onClose()
      addToast('Welcome to SocialHub!', 'success')
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const skipOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome onboarding"
          className="relative w-full max-w-lg glass-heavy bg-surface/95 rounded-2xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={skipOnboarding}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-text transition-colors"
          >
            <X size={20} />
          </motion.button>

          {/* Progress indicator */}
          <div className="flex items-center space-x-2 mb-6">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                animate={{
                  backgroundColor: index <= currentStep ? '#8b5cf6' : '#374151',
                  scale: index === currentStep ? 1.2 : 1
                }}
                className="h-2 flex-1 rounded-full"
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="text-center mb-8">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                  {(() => {
                    const Icon = steps[currentStep].icon
                    return <Icon size={24} className="text-primary" />
                  })()}
                </div>
              </div>
              <h2 className="text-2xl font-bold gradient-text">{steps[currentStep].title}</h2>
              <p className="text-text-secondary">{steps[currentStep].description}</p>
              <div className="mt-6">
                {steps[currentStep].content}
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed card-press"
            >
              <ChevronLeft size={18} />
              <span>Back</span>
            </motion.button>

            <div className="text-text-subtle text-sm">
              {currentStep + 1} of {steps.length}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={nextStep}
              disabled={loading || compressingImage}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium shadow-glow-sm card-press disabled:opacity-50"
            >
              {(loading || compressingImage) ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                />
              ) : (
                <>
                  <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                  <ChevronRight size={18} />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default OnboardingModal