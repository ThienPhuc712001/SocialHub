import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Eye, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { storyService, StoryHighlight } from '../services/api'
import Avatar from './Avatar'
import { formatRelativeTime } from '../utils/format'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface HighlightViewerProps {
  highlight: StoryHighlight
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

const HighlightViewer: React.FC<HighlightViewerProps> = ({
  highlight,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [viewerCount, setViewerCount] = useState(0)
  const [messages, setMessages] = useState<Array<{ id: string; user: string; message: string; timestamp: Date }>>([])
  const [newMessage, setNewMessage] = useState('')
  const [showMessages, setShowMessages] = useState(false)
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)

  const currentStory = highlight.stories[currentIndex]

  useEffect(() => {
    if (isOpen && currentStory) {
      // Auto-progress through stories
      const timer = setTimeout(() => {
        if (currentIndex < highlight.stories.length - 1) {
          nextStory()
        } else {
          // Loop back to first story
          setCurrentIndex(0)
        }
      }, 5000)

      // Progress bar animation
      const progressTimer = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 100))
      }, 100)

      return () => {
        clearTimeout(timer)
        clearInterval(progressTimer)
        setProgress(0)
      }
    }
  }, [isOpen, currentIndex, highlight.stories.length])

  useEffect(() => {
    if (currentStory) {
      // Mark story as viewed
      storyService.view(currentStory._id).then(res => {
        setViewerCount(res.data.viewerCount)
      }).catch(() => {})
    }
  }, [currentStory])

  // Simulate messages for highlights
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        const sampleUsers = ['Alice', 'Bob', 'Charlie', 'Diana']
        const sampleMessages = ['Amazing!', 'Love this highlight', 'So cool!', 'Beautiful memories']
        const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)]
        const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]

        setMessages(prev => [...prev.slice(-4), {
          id: Date.now().toString(),
          user: randomUser,
          message: randomMessage,
          timestamp: new Date()
        }])
      }, 8000 + Math.random() * 12000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const nextStory = () => {
    if (currentIndex < highlight.stories.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setProgress(0)
    }
  }

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setProgress(0)
    }
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50
    if (Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > 0) {
        prevStory()
      } else {
        nextStory()
      }
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: user?.username || 'You',
      message: newMessage,
      timestamp: new Date()
    }])
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    } else if (e.key === 'ArrowLeft') {
      prevStory()
    } else if (e.key === 'ArrowRight') {
      nextStory()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen || !currentStory) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
        onClick={onClose}
        onKeyDown={handleKeyPress}
        tabIndex={-1}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Highlight: ${highlight.name}`}
          className="relative w-full max-w-lg h-[85vh] glass-card rounded-2xl overflow-hidden"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 p-4 z-10">
            <div className="flex space-x-1 mb-3">
              {highlight.stories.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    animate={{
                      width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="flex items-center space-x-3">
              <Avatar src={user?.avatar} name={highlight.name} size={36} />
              <div className="flex-1">
                <span className="text-white font-semibold text-sm">{highlight.name}</span>
                <span className="text-white/70 text-xs ml-2">
                  {currentIndex + 1} of {highlight.stories.length}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <X size={20} />
              </motion.button>
            </div>
          </div>

          {/* Story content */}
          <div className="w-full h-full">
            {currentStory.image ? (
              <img
                src={currentStory.image.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${currentStory.image}` : currentStory.image}
                alt={`Highlight story ${currentIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/20 to-pink-500/20">
                <p className="text-white text-xl text-center font-medium leading-relaxed p-8">
                  {currentStory.content}
                </p>
              </div>
            )}

            {currentStory.content && currentStory.image && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                <p className="text-white text-sm">{currentStory.content}</p>
              </div>
            )}
          </div>

          {/* Story info */}
          <div className="absolute bottom-20 left-4 right-4 flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-sm">
                <Eye size={16} />
                <span>{viewerCount}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMessages(!showMessages)}
                className="flex items-center space-x-1 text-sm"
              >
                <MessageCircle size={16} />
                <span>{messages.length}</span>
              </motion.button>
            </div>
            <div className="text-xs text-white/70">
              {formatRelativeTime(currentStory.createdAt)}
            </div>
          </div>

          {/* Messages panel */}
          <AnimatePresence>
            {showMessages && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-16 right-4 w-64 glass-heavy bg-surface/90 rounded-xl border border-border/20 shadow-lg p-3 max-h-48 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">Messages</span>
                  <button onClick={() => setShowMessages(false)} className="p-1 text-white/60 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start space-x-2">
                      <Avatar name={msg.user} size={20} />
                      <div className="flex-1">
                        <span className="text-white text-xs font-medium">{msg.user}: </span>
                        <span className="text-white/80 text-xs">{msg.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2 mt-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Comment..."
                    className="flex-1 px-2 py-1 bg-white/10 rounded-lg text-white placeholder-white/50 text-xs"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-1 bg-primary rounded-lg disabled:opacity-50"
                  >
                    <Send size={12} className="text-white" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {currentIndex > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prevStory}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white z-10"
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}
          {currentIndex < highlight.stories.length - 1 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={nextStory}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white z-10"
            >
              <ChevronRight size={24} />
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default HighlightViewer