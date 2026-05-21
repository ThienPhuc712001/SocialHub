import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Users, Heart, Share2, Eye, Play } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import LiveStream from '../components/LiveStream'
import LiveStreamViewer from '../components/LiveStreamViewer'
import { useToast } from '../contexts/ToastContext'
import { livestreamService, LiveStreamType } from '../services/api'
import Avatar from '../components/Avatar'
import { Sparkles } from '@/components/ui/sparkles'

const LivePage: React.FC = () => {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const { streamId } = useParams<{ streamId?: string }>()

  const [activeStreams, setActiveStreams] = useState<LiveStreamType[]>([])
  const [currentStream, setCurrentStream] = useState<LiveStreamType | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [myStreamId, setMyStreamId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [streamHistory, setStreamHistory] = useState<LiveStreamType[]>([])

  const fetchActiveStreams = useCallback(async () => {
    try {
      const res = await livestreamService.getActive()
      setActiveStreams(res.data)
    } catch {}
    setIsLoading(false)
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await livestreamService.getHistory()
      setStreamHistory(res.data)
    } catch {}
  }, [])

  const fetchStream = useCallback(async (id: string) => {
    try {
      const res = await livestreamService.get(id)
      if (res.data.status === 'live') {
        setCurrentStream(res.data)
      } else {
        addToast('This stream has ended', 'info')
        navigate('/live')
      }
    } catch {
      addToast('Stream not found', 'error')
      navigate('/live')
    }
  }, [addToast, navigate])

  useEffect(() => {
    fetchActiveStreams()
    fetchHistory()
  }, [fetchActiveStreams, fetchHistory])

  useEffect(() => {
    if (streamId && streamId !== myStreamId) {
      fetchStream(streamId)
    } else {
      setCurrentStream(null)
    }
  }, [streamId, myStreamId, fetchStream])

  const handleStreamStart = (id: string) => {
    setIsStreaming(true)
    setMyStreamId(id)
  }

  const handleStreamEnd = () => {
    setIsStreaming(false)
    setMyStreamId(null)
    fetchActiveStreams()
    fetchHistory()
  }

  const handleLeaveViewer = () => {
    setCurrentStream(null)
    navigate('/live')
    fetchActiveStreams()
  }

  const handleShareStream = () => {
    const id = myStreamId || streamId
    if (!id) return
    const url = `${window.location.origin}/live/${id}`
    navigator.clipboard.writeText(url)
    addToast('Stream link copied to clipboard!', 'success')
  }

  const handleJoinStream = (stream: LiveStreamType) => {
    navigate(`/live/${stream._id}`)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const isViewerMode = streamId && streamId !== myStreamId && currentStream

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0">
        <Sparkles background="transparent" particleColor="#dc2626" particleDensity={40} minSize={0.5} maxSize={1.2} speed={1.5} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Radio className="text-white" size={24} />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">
                {isStreaming ? 'You are Live!' : isViewerMode ? 'Watching Stream' : 'Live Streaming'}
              </h2>
              <p className="text-text-secondary text-sm">
                {isStreaming ? 'Your stream is active' : isViewerMode ? currentStream?.title : 'Share your moments in real-time'}
              </p>
            </div>
          </div>

          {(isStreaming || isViewerMode) && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleShareStream}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press">
              <Share2 size={16} />
              <span>Share</span>
            </motion.button>
          )}
        </div>

        {isStreaming && !isViewerMode && (
          <LiveStream onStreamStart={handleStreamStart} onStreamEnd={handleStreamEnd} />
        )}

        {isViewerMode && currentStream && (
          <LiveStreamViewer stream={currentStream} onLeave={handleLeaveViewer} />
        )}

        {!isStreaming && !isViewerMode && (
          <>
            <LiveStream onStreamStart={handleStreamStart} onStreamEnd={handleStreamEnd} />

            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Radio size={18} className="text-red-500" />
                <h3 className="text-lg font-bold gradient-text">Live Now</h3>
                {activeStreams.length > 0 && (
                  <span className="text-text-muted text-sm">{activeStreams.length} streams active</span>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full" />
                </div>
              ) : activeStreams.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {activeStreams.map((stream) => (
                      <motion.div key={stream._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleJoinStream(stream)}
                        className="glass-card rounded-2xl cursor-pointer card-press overflow-hidden">
                        <div className="relative bg-gradient-to-br from-gray-900 to-black" style={{ aspectRatio: '16/9' }}>
                          {stream.thumbnail ? (
                            <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play size={32} className="text-white/30" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex items-center space-x-1.5 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            <Radio size={10} className="animate-pulse" />
                            <span>LIVE</span>
                          </div>
                          <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/50 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                            <Eye size={10} />
                            <span>{stream.viewerCount}</span>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center space-x-2">
                            <Avatar src={stream.host.avatar} name={stream.host.username} size={32} />
                            <div className="min-w-0 flex-1">
                              <span className="text-text font-medium text-sm block truncate">{stream.host.username}</span>
                              <span className="text-text-secondary text-xs block truncate">{stream.title}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 mt-2 text-text-muted text-xs">
                            <div className="flex items-center space-x-1">
                              <Eye size={12} />
                              <span>{stream.viewerCount} watching</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart size={12} />
                              <span>{stream.likeCount} likes</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div whileHover={{ scale: 1.01 }} className="glass-card rounded-2xl p-6 text-center">
                  <Radio size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No active streams right now</p>
                  <p className="text-text-muted text-xs mt-1">Start your own stream or check back later!</p>
                </motion.div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users size={18} className="text-accent" />
                <h3 className="text-lg font-bold gradient-text">Tips for Streaming</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div whileHover={{ scale: 1.02 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center">
                      <Radio className="text-primary" size={18} />
                    </div>
                    <h3 className="text-base font-semibold gradient-text">Go Live</h3>
                  </div>
                  <ul className="text-text-secondary text-sm space-y-1.5">
                    <li className="flex items-start space-x-2"><span className="text-primary mt-0.5">•</span><span>Select your camera and microphone before starting</span></li>
                    <li className="flex items-start space-x-2"><span className="text-primary mt-0.5">•</span><span>Preview your stream before going live</span></li>
                    <li className="flex items-start space-x-2"><span className="text-primary mt-0.5">•</span><span>Interact with viewers through live chat</span></li>
                    <li className="flex items-start space-x-2"><span className="text-primary mt-0.5">•</span><span>Toggle camera and mic during the stream</span></li>
                  </ul>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-9 h-9 bg-accent/15 rounded-xl flex items-center justify-center">
                      <Users className="text-accent" size={18} />
                    </div>
                    <h3 className="text-base font-semibold gradient-text">Best Practices</h3>
                  </div>
                  <ul className="text-text-secondary text-sm space-y-1.5">
                    <li className="flex items-start space-x-2"><span className="text-accent mt-0.5">•</span><span>Choose an engaging title for your stream</span></li>
                    <li className="flex items-start space-x-2"><span className="text-accent mt-0.5">•</span><span>Ensure good lighting and stable internet</span></li>
                    <li className="flex items-start space-x-2"><span className="text-accent mt-0.5">•</span><span>Respond to chat messages to keep engagement</span></li>
                    <li className="flex items-start space-x-2"><span className="text-accent mt-0.5">•</span><span>Share your stream link to reach more viewers</span></li>
                  </ul>
                </motion.div>
              </div>
            </div>

            {streamHistory.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Radio size={18} className="text-text-muted" />
                  <h3 className="text-lg font-bold gradient-text">Your Past Streams</h3>
                </div>
                <div className="space-y-3">
                  {streamHistory.map((stream) => (
                    <motion.div key={stream._id} whileHover={{ scale: 1.01 }}
                      className="glass-card rounded-2xl p-4 flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                        <Radio size={16} className="text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-text font-medium text-sm block truncate">{stream.title}</span>
                        <div className="flex items-center space-x-3 text-text-muted text-xs mt-1">
                          <span>{formatDuration(stream.duration || 0)}</span>
                          <span>•</span>
                          <span>{stream.peakViewerCount} peak viewers</span>
                          <span>•</span>
                          <span>{stream.likeCount} likes</span>
                        </div>
                      </div>
                      <span className="text-text-muted text-xs">{new Date(stream.endedAt!).toLocaleDateString()}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  )
}

export default LivePage