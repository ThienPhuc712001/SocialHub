import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Eye, Heart, MessageCircle, Send, ArrowLeft, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import { LiveStreamType } from '../services/api'
import Avatar from '../components/Avatar'

interface ChatMessage {
  id: string
  userId: string
  username: string
  message: string
  timestamp: Date
}

interface LiveStreamViewerProps {
  stream: LiveStreamType
  onLeave: () => void
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ stream, onLeave }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { addToast } = useToast()
const videoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const hostSocketIdRef = useRef<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [viewerCount, setViewerCount] = useState(stream.viewerCount)
  const [likeCount, setLikeCount] = useState(stream.likeCount)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnecting, setIsConnecting] = useState(true)
  const [hasLiked, setHasLiked] = useState(false)
  const [streamEnded, setStreamEnded] = useState(false)
  const [volume, setVolume] = useState(1)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    setVolume(1)
    if (videoRef.current) {
      videoRef.current.volume = 1
    }
  }, [])

  const setupPeerConnection = useCallback(() => {
    if (!socket || peerConnectionRef.current) return

    const pc = new RTCPeerConnection(ICE_SERVERS)

    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0]
        videoRef.current.play().catch(() => {})
        setIsConnecting(false)
      } else if (videoRef.current && event.track) {
        const existingStream = videoRef.current.srcObject as MediaStream | null
        if (existingStream) {
          existingStream.addTrack(event.track)
        } else {
          const newStream = new MediaStream([event.track])
          videoRef.current.srcObject = newStream
        }
        videoRef.current.play().catch(() => {})
        setIsConnecting(false)
      }
    }

pc.onicecandidate = (event) => {
      if (event.candidate && socket && hostSocketIdRef.current) {
        socket.emit('livestream:ice-candidate', {
          streamId: stream._id,
          targetSocketId: hostSocketIdRef.current,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnecting(false)
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        addToast('Connection lost', 'warning')
      }
    }

    peerConnectionRef.current = pc
  }, [socket, stream._id, addToast])

  useEffect(() => {
    if (!socket) return

    setupPeerConnection()

    socket.emit('livestream:viewer-join', { streamId: stream._id })

const handleOffer = async (data: { streamId: string; hostSocketId: string; offer: RTCSessionDescriptionInit }) => {
      if (data.streamId !== stream._id) return
      const pc = peerConnectionRef.current
      if (!pc) return

      hostSocketIdRef.current = data.hostSocketId

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('livestream:answer', {
          streamId: stream._id,
          hostSocketId: data.hostSocketId,
          answer,
        })
      } catch (err) {
        console.error('WebRTC answer error:', err)
      }
    }

    const handleIceCandidate = (data: { streamId: string; fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      if (data.streamId !== stream._id) return
      const pc = peerConnectionRef.current
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {})
      }
    }

    const handleViewerCount = (data: { streamId: string; count: number }) => {
      if (data.streamId !== stream._id) return
      setViewerCount(data.count)
    }

    const handleChat = (data: { streamId: string; userId: string; username: string; message: string; timestamp: string }) => {
      if (data.streamId !== stream._id) return
      setChatMessages(prev => [...prev.slice(-49), {
        id: `${Date.now()}-${Math.random()}`,
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: new Date(data.timestamp),
      }])
    }

    const handleLike = (data: { streamId: string; likeCount: number }) => {
      if (data.streamId !== stream._id) return
      setLikeCount(data.likeCount)
    }

    const handleEnded = () => {
      setStreamEnded(true)
      setIsConnecting(false)
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      addToast('The stream has ended', 'info')
    }

    const handleHostDisconnected = () => {
      setStreamEnded(true)
      setIsConnecting(false)
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      addToast('The host disconnected', 'warning')
    }

    socket.on('livestream:offer', handleOffer)
    socket.on('livestream:ice-candidate', handleIceCandidate)
    socket.on('livestream:viewer-count', handleViewerCount)
    socket.on('livestream:chat', handleChat)
    socket.on('livestream:like', handleLike)
    socket.on('livestream:ended', handleEnded)
    socket.on('livestream:host-disconnected', handleHostDisconnected)

    return () => {
      socket.emit('livestream:viewer-leave', { streamId: stream._id })
      socket.off('livestream:offer', handleOffer)
      socket.off('livestream:ice-candidate', handleIceCandidate)
      socket.off('livestream:viewer-count', handleViewerCount)
      socket.off('livestream:chat', handleChat)
      socket.off('livestream:like', handleLike)
      socket.off('livestream:ended', handleEnded)
      socket.off('livestream:host-disconnected', handleHostDisconnected)

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
    }
  }, [socket, stream._id, setupPeerConnection, addToast])

  const sendLike = useCallback(() => {
    if (!socket || hasLiked) return
    socket.emit('livestream:like', { streamId: stream._id })
    setHasLiked(true)
  }, [socket, stream._id, hasLiked])

  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !socket) return
    socket.emit('livestream:chat', { streamId: stream._id, message: newMessage.trim() })
    setNewMessage('')
  }, [newMessage, socket, stream._id])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) videoRef.current.volume = v
  }

  return (
    <div className="relative w-full space-y-4">
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={onLeave}
        className="flex items-center space-x-2 text-text-muted hover:text-text transition-colors card-press mb-2"
        aria-label="Back to streams">
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back to streams</span>
      </motion.button>

      <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

        {isConnecting && !streamEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-[3px] border-white/20 border-t-white rounded-full mx-auto mb-3" />
              <p className="text-white/80 text-sm font-medium">Connecting to stream...</p>
              <p className="text-white/40 text-xs mt-1">Establishing WebRTC connection</p>
            </div>
          </div>
        )}

        {streamEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="w-16 h-16 mx-auto mb-3 bg-gray-800 rounded-full flex items-center justify-center">
                <Radio className="text-white/60" size={24} />
              </motion.div>
              <p className="text-white/80 text-lg font-bold">Stream has ended</p>
              <p className="text-white/40 text-sm mt-1">The host has ended this live stream</p>
            </div>
          </div>
        )}

        {!streamEnded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute top-4 left-4 flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-red-500 text-white px-3 py-1.5 rounded-full shadow-lg">
              <Radio size={14} className="animate-pulse" />
              <span className="font-bold text-sm">LIVE</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-black/50 text-white px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Eye size={14} />
              <span className="font-medium text-sm">{viewerCount}</span>
            </div>
          </motion.div>
        )}

        {!streamEnded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute top-4 right-4">
            <div className="flex items-center space-x-1 bg-black/50 text-white px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Heart size={14} className={`${hasLiked ? 'text-red-400' : 'text-white/60'}`} />
              <span className="font-medium text-sm">{likeCount}</span>
            </div>
          </motion.div>
        )}

        {!streamEnded && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2">
              <Avatar src={stream.host.avatar} name={stream.host.username} size={28} />
              <div className="min-w-0">
                <span className="text-white font-medium text-sm block truncate">{stream.host.username}</span>
                <span className="text-white/60 text-xs block truncate">{stream.title}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={sendLike}
                disabled={hasLiked}
                className={`p-3 rounded-full backdrop-blur-sm shadow-lg card-press ${hasLiked ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-red-500/80'}`}
                aria-label="Like stream">
                <Heart size={18} />
              </motion.button>

              <div className="relative flex items-center bg-black/40 backdrop-blur-sm rounded-full px-2 py-2">
                <input type="range" min="0" max="1" step="0.1" value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 accent-white cursor-pointer"
                  aria-label="Volume control" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {!streamEnded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-2xl p-4 max-h-80 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MessageCircle size={18} className="text-primary" />
                <span className="font-semibold gradient-text">Live Chat</span>
              </div>
              <div className="flex items-center space-x-1 text-text-muted text-xs">
                <Users size={12} />
                <span>{viewerCount} watching</span>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto mb-3 scroll-smooth pr-1">
              {chatMessages.length === 0 && (
                <p className="text-text-muted text-center text-sm py-4">Chat will appear here when viewers send messages</p>
              )}
              <AnimatePresence>
                {chatMessages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start space-x-2">
                    <Avatar name={msg.username} size={24} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-text font-medium text-sm ${msg.userId === user?._id ? 'text-primary' : ''}`}>{msg.username}: </span>
                      <span className="text-text-secondary text-sm">{msg.message}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Say something..."
                className="flex-1 px-3 py-2 input-glass rounded-xl text-text placeholder-text-muted text-sm"
                maxLength={200}
                disabled={streamEnded}
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!newMessage.trim() || streamEnded}
                className="p-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl card-press disabled:opacity-50"
                aria-label="Send message">
                <Send size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {streamEnded && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-6 text-center">
          <p className="text-text font-bold text-lg mb-2">Stream ended</p>
          <p className="text-text-secondary text-sm mb-4">This live stream has ended. Thanks for watching!</p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onLeave}
            className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium card-press">
            Browse more streams
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}

export default LiveStreamViewer