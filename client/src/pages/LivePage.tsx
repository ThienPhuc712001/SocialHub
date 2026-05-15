import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Users, Heart, Share2 } from 'lucide-react'
import LiveStream from '../components/LiveStream'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Sparkles } from '@/components/ui/sparkles'

const LivePage: React.FC = () => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')

  const handleStartStream = () => {
    setIsStreaming(true)
    addToast('Your stream is now live!', 'success')
  }

  const handleStopStream = () => {
    setIsStreaming(false)
    addToast('Stream ended successfully', 'info')
  }

  const handleShareStream = () => {
    const streamUrl = `${window.location.origin}/live/${user?._id}`
    navigator.clipboard.writeText(streamUrl)
    addToast('Stream link copied to clipboard!', 'success')
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0">
        <Sparkles background="transparent" particleColor="#dc2626" particleDensity={40} minSize={0.5} maxSize={1.2} speed={1.5} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Radio className="text-white" size={24} />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Live Streaming</h2>
              <p className="text-text-secondary text-sm">
                {isStreaming ? 'You are currently live!' : 'Share your moments in real-time'}
              </p>
            </div>
          </div>

          {isStreaming && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShareStream}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press"
            >
              <Share2 size={16} />
              <span>Share Stream</span>
            </motion.button>
          )}
        </div>

        {/* Stream Component */}
        <LiveStream
          isStreaming={isStreaming}
          onStartStream={handleStartStream}
          onStopStream={handleStopStream}
        />

        {/* Stream Stats */}
        <AnimatePresence>
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold gradient-text">127</div>
                <div className="text-text-secondary text-sm">Viewers</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold gradient-text">89</div>
                <div className="text-text-secondary text-sm">Likes</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <Share2 className="w-8 h-8 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold gradient-text">23</div>
                <div className="text-text-secondary text-sm">Shares</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card rounded-2xl p-4 text-center"
              >
                <Radio className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                <div className="text-2xl font-bold gradient-text">2h 15m</div>
                <div className="text-text-secondary text-sm">Duration</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Cards */}
        {!isStreaming && (
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
                  <Radio className="text-primary" size={20} />
                </div>
                <h3 className="text-lg font-semibold gradient-text">Go Live</h3>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                Start streaming to share your moments with followers in real-time.
                Interact with viewers through live chat and receive instant feedback.
              </p>
              <ul className="text-text-secondary text-sm space-y-1">
                <li>• High-quality video streaming</li>
                <li>• Real-time chat with viewers</li>
                <li>• Live viewer count and engagement</li>
                <li>• Easy stream management</li>
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
                  <Users className="text-accent" size={20} />
                </div>
                <h3 className="text-lg font-semibold gradient-text">Tips for Streaming</h3>
              </div>
              <ul className="text-text-secondary text-sm space-y-2">
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Choose an engaging title that tells viewers what to expect</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Interact with your audience through chat</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Test your camera and microphone before going live</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Keep streams engaging and on-topic</span>
                </li>
              </ul>
            </motion.div>
          </div>
        )}

        {/* Recent Streams */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold gradient-text mb-4">Recent Live Streams</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 glass-card rounded-xl hover-lift">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Radio className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-text font-medium">Morning Coffee Chat ☕</h4>
                <p className="text-text-secondary text-sm">2 hours ago • 156 viewers</p>
              </div>
              <div className="text-right">
                <div className="text-text-secondary text-sm">2.3K likes</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 glass-card rounded-xl hover-lift">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Radio className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-text font-medium">Tech Talk: AI Updates 🤖</h4>
                <p className="text-text-secondary text-sm">1 day ago • 89 viewers</p>
              </div>
              <div className="text-right">
                <div className="text-text-secondary text-sm">1.8K likes</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 glass-card rounded-xl hover-lift">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Radio className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-text font-medium">Cooking Live: Pasta Night 🍝</h4>
                <p className="text-text-secondary text-sm">3 days ago • 234 viewers</p>
              </div>
              <div className="text-right">
                <div className="text-text-secondary text-sm">3.1K likes</div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

export default LivePage