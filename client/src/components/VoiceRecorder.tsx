import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square, Send, X } from 'lucide-react'

interface VoiceRecorderProps {
  onSend: (file: File) => void
  onCancel: () => void
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch {
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const handleSend = () => {
    if (!audioBlob) return
    const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
    onSend(file)
    setAudioBlob(null)
    setRecordingTime(0)
  }

  const handleCancel = () => {
    setAudioBlob(null)
    setRecordingTime(0)
    setIsRecording(false)
    onCancel()
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="glass-card rounded-xl p-3 flex items-center space-x-3"
    >
      {!isRecording && !audioBlob && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={startRecording}
          className="p-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl shadow-glow-sm card-press"
        >
          <Mic size={18} />
        </motion.button>
      )}

      {isRecording && (
        <>
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 20 + Math.random() * 12, 8] }}
                transition={{ duration: 0.4 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 bg-primary rounded-full"
                style={{ minHeight: 8 }}
              />
            ))}
          </div>
          <span className="text-primary font-mono text-sm font-medium">{formatTime(recordingTime)}</span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={stopRecording}
            className="p-2.5 bg-red-500 text-white rounded-xl card-press"
          >
            <Square size={18} />
          </motion.button>
        </>
      )}

      {audioBlob && !isRecording && (
        <>
          <div className="flex items-center space-x-2 flex-1">
            <Mic size={16} className="text-primary" />
            <span className="text-text text-sm font-medium">{formatTime(recordingTime)}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            className="p-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl shadow-glow-sm card-press"
          >
            <Send size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCancel}
            className="p-2.5 bg-red-500/20 text-red-400 rounded-xl card-press"
          >
            <X size={18} />
          </motion.button>
        </>
      )}
    </motion.div>
  )
}

export default VoiceRecorder