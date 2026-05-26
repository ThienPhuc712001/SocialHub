import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import Avatar from './Avatar'

interface IncomingCallData {
  callId: string
  caller: { _id: string; username: string; avatar?: string }
  callType: 'video' | 'audio'
  offer: RTCSessionDescriptionInit
}

interface VideoCallProps {
  targetUserId?: string
  targetUsername?: string
  targetAvatar?: string
  callType?: 'video' | 'audio'
  incomingCall?: IncomingCallData
  onEnd: () => void
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    ...(import.meta.env.VITE_TURN_URL ? [{
      urls: import.meta.env.VITE_TURN_URL,
      username: 'turnuser',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
    }] : [])
  ]
}

const VideoCall: React.FC<VideoCallProps> = ({ targetUserId, targetUsername, targetAvatar, callType = 'video', incomingCall, onEnd }) => {
  const { socket } = useSocket()
  const { addToast } = useToast()
  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>(incomingCall ? 'connected' : 'connecting')
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('ended')
  }, [])

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch {
      addToast('Failed to access camera/microphone', 'error')
      cleanup()
      onEnd()
      return null
    }
  }, [callType, cleanup, onEnd, addToast])

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          to: incomingCall ? incomingCall.caller._id : targetUserId,
          candidate: event.candidate,
          callId: incomingCall?.callId
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('connected')
        timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000)
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup()
        onEnd()
      }
    }

    return pc
  }, [socket, targetUserId, incomingCall, cleanup, onEnd])

  const initiateCall = useCallback(async () => {
    const stream = await startLocalStream()
    if (!stream) return

    const pc = createPeerConnection(stream)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    if (socket) {
      socket.emit('call:offer', {
        to: targetUserId,
        offer: pc.localDescription,
        callType
      })
    }
  }, [startLocalStream, createPeerConnection, socket, targetUserId, callType])

  const answerCall = useCallback(async () => {
    if (!incomingCall) return

    const stream = await startLocalStream()
    if (!stream) return

    const pc = createPeerConnection(stream)
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    if (socket) {
      socket.emit('call:answer', {
        to: incomingCall.caller._id,
        answer: pc.localDescription,
        callId: incomingCall.callId
      })
    }
  }, [incomingCall, startLocalStream, createPeerConnection, socket])

  useEffect(() => {
    if (incomingCall) {
      answerCall()
    } else {
      initiateCall()
    }

    if (socket) {
      socket.on('call:answer', async (data: { answer: RTCSessionDescriptionInit }) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
        }
      })

      socket.on('call:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
      })

      socket.on('call:end', () => {
        cleanup()
        onEnd()
      })

      socket.on('call:reject', () => {
        addToast('Call rejected', 'info')
        cleanup()
        onEnd()
      })

      return () => {
        socket.off('call:answer')
        socket.off('call:ice-candidate')
        socket.off('call:end')
        socket.off('call:reject')
      }
    }
  }, [])

  const handleEnd = () => {
    if (socket) {
      socket.emit('call:end', { to: incomingCall ? incomingCall.caller._id : targetUserId })
    }
    cleanup()
    onEnd()
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled
      })
      setIsCameraOff(!isCameraOff)
    }
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const displayName = incomingCall ? incomingCall.caller.username : targetUsername || 'User'
  const displayAvatar = incomingCall ? incomingCall.caller.avatar : targetAvatar

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
    >
      <div className="relative w-full h-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden">
        {callType === 'video' && (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 w-28 h-28 rounded-xl border-2 border-white/20 object-cover mirror z-10"
            />
          </>
        )}

        {callType === 'audio' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface to-accent/10">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-6"
            >
              <Avatar src={displayAvatar} name={displayName} size={100} />
            </motion.div>
            <h3 className="text-white text-xl font-bold mb-2">{displayName}</h3>
            <p className="text-white/50 text-sm">
              {status === 'connecting' ? 'Connecting...' : status === 'connected' ? formatDuration(callDuration) : 'Call ended'}
            </p>
          </div>
        )}

        <div className="absolute top-4 left-4 z-10 glass-card rounded-xl px-3 py-2 flex items-center space-x-2">
          <Avatar src={displayAvatar} name={displayName} size={24} />
          <span className="text-white font-medium text-sm">{displayName}</span>
          <span className="text-white/50 text-xs">
            {status === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
          </span>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 glass-card rounded-2xl px-6 py-4 flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className={`p-3 rounded-xl transition-all card-press ${isMuted ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </motion.button>

          {callType === 'video' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleCamera}
              className={`p-3 rounded-xl transition-all card-press ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleEnd}
            className="p-3 bg-red-500 text-white rounded-xl card-press shadow-lg"
          >
            <PhoneOff size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

interface IncomingCallModalProps {
  callData: IncomingCallData
  onAccept: () => void
  onReject: () => void
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ callData, onAccept, onReject }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 z-50 glass-heavy flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="glass-card rounded-2xl p-8 text-center space-y-6 shadow-lg max-w-sm w-full"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Avatar src={callData.caller.avatar} name={callData.caller.username} size={64} />
        </motion.div>
        <h3 className="text-text font-bold text-lg">{callData.caller.username}</h3>
        <p className="text-text-muted text-sm">
          {callData.callType === 'video' ? 'Video call' : 'Audio call'}
        </p>
        <div className="flex items-center justify-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onAccept}
            className="p-4 bg-green-500 text-white rounded-full shadow-lg card-press"
          >
            <Phone size={24} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onReject}
            className="p-4 bg-red-500 text-white rounded-full shadow-lg card-press"
          >
            <PhoneOff size={24} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default VideoCall