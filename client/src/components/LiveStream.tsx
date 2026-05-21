import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, Mic, MicOff, Radio, Eye, Heart, MessageCircle, Send, X, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import { livestreamService } from '../services/api'
import { getErrorMessage } from '../utils/format'
import Avatar from '../components/Avatar'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ChatMessage {
  id: string
  userId: string
  username: string
  message: string
  timestamp: Date
}

interface LiveStreamProps {
  onStreamStart?: (streamId: string) => void
  onStreamEnd?: () => void
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

const LiveStream: React.FC<LiveStreamProps> = ({ onStreamStart, onStreamEnd }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { addToast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const streamIdRef = useRef<string | null>(null)
  const startModalRef = useFocusTrap(false) as any

  const [isLive, setIsLive] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [duration, setDuration] = useState(0)
  const [hasPreview, setHasPreview] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')

  useEffect(() => {
    if (isLive) {
      const timer = setInterval(() => setDuration(d => d + 1), 1000)
      return () => clearInterval(timer)
    }
  }, [isLive])

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const filtered = allDevices.filter(d => d.kind === 'videoinput' || d.kind === 'audioinput')
      setDevices(filtered)
      const videoDevices = filtered.filter(d => d.kind === 'videoinput')
      const audioDevices = filtered.filter(d => d.kind === 'audioinput')
      if (videoDevices.length > 0 && !selectedCamera) setSelectedCamera(videoDevices[0].deviceId)
      if (audioDevices.length > 0 && !selectedMic) setSelectedMic(audioDevices[0].deviceId)
    } catch (err) {
      console.error('Failed to enumerate devices:', err)
    }
  }, [selectedCamera, selectedMic])

  useEffect(() => {
    enumerateDevices()
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
  }, [enumerateDevices])

  const acquireStream = useCallback(async (cam: boolean, mic: boolean, camId: string, micId: string): Promise<MediaStream | null> => {
    if (!cam && !mic) {
      addToast('Enable camera or microphone', 'warning')
      return null
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: cam ? { deviceId: camId ? { exact: camId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: mic ? { deviceId: micId ? { exact: micId } : undefined } : false,
      }
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      addToast(getErrorMessage(err) || 'Failed to access camera/microphone', 'error')
      return null
    }
  }, [addToast])

  const stopTracks = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  const assignVideoSrc = useCallback((videoEl: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!videoEl) return
    if (stream) {
      videoEl.srcObject = stream
      const playPromise = videoEl.play()
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn('Autoplay blocked, retrying:', err.name)
          videoEl.muted = true
          videoEl.play().catch(() => {})
        })
      }
    } else {
      videoEl.pause()
      videoEl.srcObject = null
    }
  }, [])

  useEffect(() => {
    if (!showStartModal || isLive) return

    const startPreview = async () => {
      stopTracks(previewStreamRef.current)
      previewStreamRef.current = null
      setHasPreview(false)

      const stream = await acquireStream(cameraEnabled, micEnabled, selectedCamera, selectedMic)
      if (!stream) return

      previewStreamRef.current = stream
      setHasPreview(true)
      assignVideoSrc(previewVideoRef.current, stream)
    }

    startPreview()
  }, [showStartModal, isLive, cameraEnabled, micEnabled, selectedCamera, selectedMic, acquireStream, stopTracks, assignVideoSrc])

  useEffect(() => {
    if (!showStartModal && !isLive) {
      stopTracks(previewStreamRef.current)
      previewStreamRef.current = null
      setHasPreview(false)
      assignVideoSrc(previewVideoRef.current, null)
    }
  }, [showStartModal, isLive, stopTracks, assignVideoSrc])

  const startStream = async () => {
    if (!streamTitle.trim()) {
      addToast('Please enter a stream title', 'warning')
      return
    }
    if (!socket) {
      addToast('Socket connection not available', 'error')
      return
    }

    setIsStarting(true)
    try {
      let stream: MediaStream | null = previewStreamRef.current

      if (stream) {
        previewStreamRef.current = null
        setHasPreview(false)
        if (previewVideoRef.current) {
          previewVideoRef.current.pause()
          previewVideoRef.current.srcObject = null
        }
      } else {
        stream = await acquireStream(cameraEnabled, micEnabled, selectedCamera, selectedMic)
      }

      if (!stream) {
        setIsStarting(false)
        return
      }

      streamRef.current = stream

      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.muted = true
        try {
          await video.play()
        } catch {
          video.muted = true
          try { await video.play() } catch {}
        }
      }

      const thumbnailFile = await captureThumbnail()

      const res = await livestreamService.create(streamTitle, thumbnailFile)
      const streamData = res.data
      streamIdRef.current = streamData._id

      socket.emit('livestream:host-join', { streamId: streamData._id })

      setIsLive(true)
      setViewerCount(0)
      setLikeCount(0)
      setChatMessages([])
      setDuration(0)
      setShowStartModal(false)
      onStreamStart?.(streamData._id)
      addToast('Stream started! You are now live.', 'success')
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    } finally {
      setIsStarting(false)
    }
  }

  const captureThumbnail = async (): Promise<File | undefined> => {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      await new Promise<void>(resolve => setTimeout(resolve, 2000))
    }
    if (!video || video.readyState < 2) return undefined
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 180
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      const blob = await fetch(dataUrl).then(r => r.blob())
      return new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
    } catch {
      return undefined
    }
  }

  const stopStream = useCallback(async () => {
    if (!socket || !streamIdRef.current) return

    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()

    stopTracks(streamRef.current)
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    socket.emit('livestream:end', { streamId: streamIdRef.current })

    try {
      await livestreamService.end(streamIdRef.current)
    } catch {}

    setIsLive(false)
    setViewerCount(0)
    setLikeCount(0)
    setChatMessages([])
    setDuration(0)
    streamIdRef.current = null
    onStreamEnd?.()
    addToast('Stream ended', 'info')
  }, [socket, onStreamEnd, addToast, stopTracks, assignVideoSrc])

  const createPeerConnection = useCallback((viewerSocketId: string) => {
    if (!socket || !streamRef.current || !streamIdRef.current) return

    const pc = new RTCPeerConnection(ICE_SERVERS)

    streamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, streamRef.current!)
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('livestream:ice-candidate', {
          streamId: streamIdRef.current!,
          targetSocketId: viewerSocketId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('livestream:offer', {
          streamId: streamIdRef.current!,
          targetSocketId: viewerSocketId,
          offer,
        })
      } catch (err) {
        console.error('Negotiation error:', err)
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close()
        peerConnectionsRef.current.delete(viewerSocketId)
      }
    }

    peerConnectionsRef.current.set(viewerSocketId, pc)
  }, [socket])

  useEffect(() => {
    if (!socket || !isLive) return

    const handleViewerJoined = (data: { streamId: string; viewerSocketId: string }) => {
      if (data.streamId !== streamIdRef.current) return
      createPeerConnection(data.viewerSocketId)
    }

    const handleAnswer = (data: { streamId: string; viewerSocketId: string; answer: RTCSessionDescriptionInit }) => {
      if (data.streamId !== streamIdRef.current) return
      const pc = peerConnectionsRef.current.get(data.viewerSocketId)
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    }

    const handleIceCandidate = (data: { streamId: string; fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      if (data.streamId !== streamIdRef.current) return
      const pc = peerConnectionsRef.current.get(data.fromSocketId)
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    }

    const handleViewerLeft = (data: { streamId: string; viewerSocketId: string }) => {
      if (data.streamId !== streamIdRef.current) return
      const pc = peerConnectionsRef.current.get(data.viewerSocketId)
      if (pc) {
        pc.close()
        peerConnectionsRef.current.delete(data.viewerSocketId)
      }
    }

    const handleViewerCount = (data: { streamId: string; count: number }) => {
      if (data.streamId !== streamIdRef.current) return
      setViewerCount(data.count)
    }

    const handleChat = (data: { streamId: string; userId: string; username: string; message: string; timestamp: string }) => {
      if (data.streamId !== streamIdRef.current) return
      setChatMessages(prev => [...prev.slice(-49), {
        id: `${Date.now()}-${Math.random()}`,
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: new Date(data.timestamp),
      }])
    }

    const handleLike = (data: { streamId: string; likeCount: number }) => {
      if (data.streamId !== streamIdRef.current) return
      setLikeCount(data.likeCount)
    }

    const handleHostDisconnected = () => {
      stopStream()
    }

    socket.on('livestream:viewer-joined', handleViewerJoined)
    socket.on('livestream:answer', handleAnswer)
    socket.on('livestream:ice-candidate', handleIceCandidate)
    socket.on('livestream:viewer-left', handleViewerLeft)
    socket.on('livestream:viewer-count', handleViewerCount)
    socket.on('livestream:chat', handleChat)
    socket.on('livestream:like', handleLike)
    socket.on('livestream:host-disconnected', handleHostDisconnected)

    return () => {
      socket.off('livestream:viewer-joined', handleViewerJoined)
      socket.off('livestream:answer', handleAnswer)
      socket.off('livestream:ice-candidate', handleIceCandidate)
      socket.off('livestream:viewer-left', handleViewerLeft)
      socket.off('livestream:viewer-count', handleViewerCount)
      socket.off('livestream:chat', handleChat)
      socket.off('livestream:like', handleLike)
      socket.off('livestream:host-disconnected', handleHostDisconnected)
    }
  }, [socket, isLive, createPeerConnection, stopStream])

  const toggleCamera = useCallback(async () => {
    const newState = !cameraEnabled
    setCameraEnabled(newState)

    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks()
      if (newState) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedCamera ? { exact: selectedCamera } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } },
          })
          const newVideoTrack = newStream.getVideoTracks()[0]
          videoTracks.forEach(track => track.stop())
          streamRef.current.removeTrack(videoTracks[0])
          streamRef.current.addTrack(newVideoTrack)
          peerConnectionsRef.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) sender.replaceTrack(newVideoTrack)
          })
          assignVideoSrc(videoRef.current, streamRef.current)
        } catch {}
      } else {
        videoTracks.forEach(track => { track.enabled = false })
      }
    } else if (previewStreamRef.current) {
      const videoTracks = previewStreamRef.current.getVideoTracks()
      if (!newState) {
        videoTracks.forEach(track => { track.enabled = false })
      }
    }
  }, [cameraEnabled, selectedCamera, assignVideoSrc])

  const toggleMic = useCallback(() => {
    const newState = !micEnabled
    setMicEnabled(newState)

    const currentStream = streamRef.current || previewStreamRef.current
    if (currentStream) {
      currentStream.getAudioTracks().forEach(track => { track.enabled = newState })
    }
  }, [micEnabled])

  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !socket || !streamIdRef.current) return
    socket.emit('livestream:chat', { streamId: streamIdRef.current, message: newMessage.trim() })
    setNewMessage('')
  }, [newMessage, socket])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const cameraDevices = devices.filter(d => d.kind === 'videoinput')
  const micDevices = devices.filter(d => d.kind === 'audioinput')

  const handleDeviceChange = useCallback(() => {
    if (showStartModal && !isLive) {
      stopTracks(previewStreamRef.current)
      previewStreamRef.current = null
      setHasPreview(false)
      assignVideoSrc(previewVideoRef.current, null)

      acquireStream(cameraEnabled, micEnabled, selectedCamera, selectedMic).then(stream => {
        if (stream) {
          previewStreamRef.current = stream
          setHasPreview(true)
          assignVideoSrc(previewVideoRef.current, stream)
        }
      })
    }
  }, [showStartModal, isLive, cameraEnabled, micEnabled, selectedCamera, selectedMic, acquireStream, stopTracks, assignVideoSrc])

  return (
    <div className="relative w-full">
      <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {!isLive && !showStartModal && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Radio className="text-white" size={32} />
              </motion.div>
              <p className="text-white/60 text-sm mb-1">Ready to go live?</p>
              <p className="text-white/40 text-xs">Select your camera and microphone, then start streaming</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {isLive && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 left-4 flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-red-500 text-white px-3 py-1.5 rounded-full shadow-lg">
                <Radio size={14} className="animate-pulse" />
                <span className="font-bold text-sm">LIVE</span>
              </div>
              <div className="bg-black/50 text-white px-3 py-1.5 rounded-full backdrop-blur-sm text-sm font-medium">
                {formatDuration(duration)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLive && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-black/50 text-white px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Eye size={14} />
                <span className="font-medium text-sm">{viewerCount}</span>
              </div>
              <div className="flex items-center space-x-1 bg-black/50 text-white px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Heart size={14} className="text-red-400" />
                <span className="font-medium text-sm">{likeCount}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLive && streamTitle && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-16 left-4 right-4">
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2">
                <Avatar src={user?.avatar} name={user?.username || ''} size={28} />
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm block truncate">{user?.username}</span>
                  <span className="text-white/60 text-xs block truncate">{streamTitle}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLive && !showStartModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowStartModal(true)}
              className="flex items-center space-x-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg card-press text-lg">
              <Radio size={22} />
              <span>Go Live</span>
            </motion.button>
          </motion.div>
        )}

        <AnimatePresence>
          {isLive && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex space-x-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={toggleCamera}
                  className={`p-3 rounded-full backdrop-blur-sm shadow-lg card-press ${cameraEnabled ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'}`}
                  aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
                  {cameraEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  className={`p-3 rounded-full backdrop-blur-sm shadow-lg card-press ${micEnabled ? 'bg-white/20 text-white' : 'bg-red-500/80 text-white'}`}
                  aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}>
                  {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                </motion.button>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={stopStream}
                className="flex items-center space-x-2 px-5 py-3 bg-red-500 text-white rounded-xl backdrop-blur-sm shadow-lg card-press font-bold"
                aria-label="End stream">
                <X size={18} />
                <span>End Stream</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isLive && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mt-4 glass-card rounded-2xl p-4 max-h-96 overflow-hidden">
            <div className="flex items-center space-x-2 mb-3">
              <MessageCircle size={18} className="text-primary" />
              <span className="font-semibold gradient-text">Live Chat</span>
              <span className="text-text-muted text-xs ml-auto">{chatMessages.length} messages</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto mb-3 scroll-smooth">
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
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl card-press disabled:opacity-50"
                aria-label="Send message">
                <Send size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStartModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowStartModal(false); stopTracks(previewStreamRef.current); previewStreamRef.current = null; setHasPreview(false); assignVideoSrc(previewVideoRef.current, null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              ref={startModalRef}
              role="dialog"
              aria-modal="true"
              aria-label="Start live stream"
              className="relative w-full max-w-lg glass-heavy bg-surface/95 rounded-2xl p-6 shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => { setShowStartModal(false); stopTracks(previewStreamRef.current); previewStreamRef.current = null; setHasPreview(false); assignVideoSrc(previewVideoRef.current, null); }}
                className="absolute top-4 right-4 p-2 rounded-xl glass-card text-text-muted hover:text-text card-press"
                aria-label="Close">
                <X size={18} />
              </motion.button>

              <div className="flex items-center space-x-3 mb-5">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Radio className="text-white" size={20} />
                </motion.div>
                <h3 className="text-xl font-bold gradient-text">Go Live</h3>
              </div>

              <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                <video ref={previewVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                {!hasPreview && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 border-[3px] border-white/20 border-t-white rounded-full" />
                    <p className="text-white/40 text-sm absolute mt-12">Starting camera...</p>
                  </div>
                )}
                {hasPreview && (
                  <div className="absolute top-2 left-2 flex items-center space-x-1 bg-red-500/80 text-white px-2 py-1 rounded-full text-xs">
                    <Radio size={10} className="animate-pulse" />
                    <span>Preview</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-2 font-medium">Stream Title</label>
                  <input type="text" value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="What's your stream about?"
                    className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" maxLength={100} />
                </div>

                <div>
                  <label className="block text-text-secondary text-sm mb-2 font-medium flex items-center space-x-1">
                    <Camera size={14} />
                    <span>Camera</span>
                  </label>
                  <div className="relative">
                    <select value={selectedCamera} onChange={(e) => { setSelectedCamera(e.target.value); handleDeviceChange(); }}
                      className="w-full px-4 py-3 input-glass rounded-xl text-text appearance-none cursor-pointer text-sm"
                      disabled={cameraDevices.length === 0}>
                      {cameraDevices.length === 0 && <option value="">No camera found</option>}
                      {cameraDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${cameraDevices.indexOf(d) + 1}`}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-text-secondary text-sm mb-2 font-medium flex items-center space-x-1">
                    <Mic size={14} />
                    <span>Microphone</span>
                  </label>
                  <div className="relative">
                    <select value={selectedMic} onChange={(e) => { setSelectedMic(e.target.value); handleDeviceChange(); }}
                      className="w-full px-4 py-3 input-glass rounded-xl text-text appearance-none cursor-pointer text-sm"
                      disabled={micDevices.length === 0}>
                      {micDevices.length === 0 && <option value="">No microphone found</option>}
                      {micDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${micDevices.indexOf(d) + 1}`}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 glass-card rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Camera size={18} className="text-text-muted" />
                    <span className="text-text-secondary text-sm">Camera</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }}
                    onClick={() => { setCameraEnabled(!cameraEnabled); handleDeviceChange(); }}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${cameraEnabled ? 'bg-primary' : 'bg-border/50'}`}>
                    <motion.span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      animate={{ x: cameraEnabled ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </motion.button>
                </div>

                <div className="flex items-center justify-between p-3 glass-card rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Mic size={18} className="text-text-muted" />
                    <span className="text-text-secondary text-sm">Microphone</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }}
                    onClick={() => { setMicEnabled(!micEnabled); handleDeviceChange(); }}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${micEnabled ? 'bg-primary' : 'bg-border/50'}`}>
                    <motion.span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      animate={{ x: micEnabled ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </motion.button>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowStartModal(false); stopTracks(previewStreamRef.current); previewStreamRef.current = null; setHasPreview(false); assignVideoSrc(previewVideoRef.current, null); }}
                  className="flex-1 px-4 py-3 glass-card rounded-xl font-medium text-text-muted card-press">
                  Cancel
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={startStream}
                  disabled={isStarting || !streamTitle.trim() || (!selectedCamera && !selectedMic)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium shadow-glow-sm card-press disabled:opacity-50">
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