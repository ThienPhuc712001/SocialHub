import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, Mic, MicOff, Radio, Eye, Heart, MessageCircle, Send, X, Play, Pause } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getErrorMessage } from '../utils/format'
import Avatar from '../components/Avatar'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface LiveStreamProps {
  isStreaming?: boolean
  onStartStream?: () => void
  onStopStream?: () => void
}

const LiveStream: React.FC<LiveStreamProps> = ({
  isStreaming = false,
  onStartStream,
  onStopStream
}) => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isLive, setIsLive] = useState(isStreaming)
  const [viewerCount, setViewerCount] = useState(0)
  const [messages, setMessages] = useState<Array<{ id: string; user: string; message: string; timestamp: Date }>>([])
  const [newMessage, setNewMessage] = useState('')
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')
  const [showStartModal, setShowStartModal] = useState(false)
  const startModalRef = useFocusTrap(showStartModal)

  // Simulate viewer count changes
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [isLive])

  // Simulate incoming messages
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        const sampleUsers = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
        const sampleMessages = ['Great stream!', 'Love this!', 'Keep it up!', 'Amazing!', 'So cool!']
        const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)]
        const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]

        setMessages(prev => [...prev.slice(-9), {
          id: Date.now().toString(),
          user: randomUser,
          message: randomMessage,
          timestamp: new Date()
        }])
      }, 3000 + Math.random() * 7000)
      return () => clearInterval(interval)
    }
  }, [isLive])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled ? { width: 1280, height: 720 } : false,
        audio: micEnabled
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      addToast('Failed to access camera/microphone', 'error')
      console.error('Media access error:', error)
    }
  }, [cameraEnabled, micEnabled, addToast])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const toggleCamera = useCallback(async () => {
    if (!cameraEnabled) {
      // Turn camera on
      setCameraEnabled(true)
      if (isLive) {
        await startCamera()
      }
    } else {
      // Turn camera off
      setCameraEnabled(false)
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.stop()
          // Replace with black video track
          const canvas = document.createElement('canvas')
          canvas.width = 1280
          canvas.height = 720
          const ctx = canvas.getContext('2d')
          ctx!.fillStyle = 'black'
          ctx!.fillRect(0, 0, canvas.width, canvas.height)
          const blackStream = canvas.captureStream()
          const newStream = new MediaStream([...streamRef.current.getAudioTracks(), ...blackStream.getVideoTracks()])
          streamRef.current = newStream
          if (videoRef.current) {
            videoRef.current.srcObject = newStream
          }
        }
      }
    }
  }, [cameraEnabled, isLive, startCamera])

  const toggleMic = useCallback(() => {
    if (!micEnabled) {
      setMicEnabled(true)
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => track.enabled = true)
      }
    } else {
      setMicEnabled(false)
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => track.enabled = false)
      }
    }
  }, [micEnabled])

  const startStream = async () => {
    if (!streamTitle.trim()) {
      addToast('Please enter a stream title', 'warning')
      return
    }

    setIsStarting(true)
    try {
      await startCamera()
      setIsLive(true)
      setViewerCount(Math.floor(Math.random() * 50) + 10)
      setShowStartModal(false)
      onStartStream?.()
      addToast('Stream started! You are now live.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error), 'error')
    } finally {
      setIsStarting(false)
    }
  }

  const stopStream = () => {
    setIsLive(false)
    setViewerCount(0)
    stopCamera()
    onStopStream?.()
    addToast('Stream ended', 'info')
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
    }
  }

  return (
    <div className="relative w-full">
      {/* Stream Container */}
      <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Live Badge */}
        <AnimatePresence>
          {isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full shadow-lg"
            >
              <Radio size={14} className="animate-pulse" />
              <span className="font-semibold text-sm">LIVE</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewer Count */}
        <AnimatePresence>
          {isLive && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 flex items-center space-x-1 bg-black/50 text-white px-3 py-1 rounded-full backdrop-blur-sm"
            >
              <Eye size={14} />
              <span className="font-medium text-sm">{viewerCount}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stream Title */}
        <AnimatePresence>
          {isLive && streamTitle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-xl backdrop-blur-sm"
            >
              <h3 className="font-semibold">{streamTitle}</h3>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <AnimatePresence>
          {!isLive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowStartModal(true)}
                className="flex items-center space-x-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg card-press"
              >
                <Radio size={20} />
                <span>Go Live</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streaming Controls */}
        <AnimatePresence>
          {isLive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 right-4 flex space-x-2"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleCamera}
                className={`p-3 rounded-full backdrop-blur-sm shadow-lg card-press ${
                  cameraEnabled ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'
                }`}
                aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {cameraEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMic}
                className={`p-3 rounded-full backdrop-blur-sm shadow-lg card-press ${
                  micEnabled ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'
                }`}
                aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={stopStream}
                className="p-3 rounded-full bg-red-500/80 text-white backdrop-blur-sm shadow-lg card-press"
                aria-label="End stream"
              >
                <X size={18} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Section */}
      <AnimatePresence>
        {isLive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 glass-card rounded-2xl p-4 max-h-96 overflow-hidden"
          >
            <div className="flex items-center space-x-2 mb-3">
              <MessageCircle size={18} className="text-primary" />
              <span className="font-semibold gradient-text">Live Chat</span>
            </div>

            {/* Messages */}
            <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-start space-x-2"
                  >
                    <Avatar name={msg.user} size={24} />
                    <div className="flex-1">
                      <span className="text-text font-medium text-sm">{msg.user}: </span>
                      <span className="text-text-secondary text-sm">{msg.message}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Say something..."
                className="flex-1 px-3 py-2 input-glass rounded-xl text-text placeholder-text-muted text-sm"
                maxLength={200}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl card-press disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Stream Modal */}
      <AnimatePresence>
        {showStartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              ref={startModalRef}
              role="dialog"
              aria-modal="true"
              aria-label="Start live stream"
              className="relative w-full max-w-md glass-heavy bg-surface/95 rounded-2xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center space-x-3 mb-6">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center"
                >
                  <Radio className="text-white" size={20} />
                </motion.div>
                <h3 className="text-xl font-bold gradient-text">Go Live</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-2">Stream Title</label>
                  <input
                    type="text"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="What's your stream about?"
                    className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted"
                    maxLength={100}
                  />
                </div>

                <div className="flex items-center justify-between p-3 glass-card rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Camera size={18} className="text-text-muted" />
                    <span className="text-text-secondary text-sm">Camera</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                      cameraEnabled ? 'bg-primary' : 'bg-border/50'
                    }`}
                  >
                    <motion.span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      animate={{ x: cameraEnabled ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>

                <div className="flex items-center justify-between p-3 glass-card rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Mic size={18} className="text-text-muted" />
                    <span className="text-text-secondary text-sm">Microphone</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                      micEnabled ? 'bg-primary' : 'bg-border/50'
                    }`}
                  >
                    <motion.span
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      animate={{ x: micEnabled ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 px-4 py-3 glass-card rounded-xl font-medium text-text-muted card-press"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startStream}
                  disabled={isStarting || !streamTitle.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium shadow-glow-sm card-press disabled:opacity-50"
                >
                  {isStarting ? 'Starting...' : 'Start Stream'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiveStream