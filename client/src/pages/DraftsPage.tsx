import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { posts, Post as PostType } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { FileEdit, Clock, Send, Trash2, X } from 'lucide-react'
import { Sparkles } from '@/components/ui/sparkles'
import { MovingBorder } from '@/components/ui/moving-border'
import { NumberTicker } from '@/components/ui/number-ticker'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getErrorMessage } from '../utils/format'

const DraftsPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [drafts, setDrafts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const scheduleRef = useFocusTrap<HTMLDivElement>(!!showSchedule)

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchDrafts = async () => {
      try {
        const response = await posts.getDrafts()
        setDrafts(response.data.posts || [])
      } catch (err) {
        addToast(getErrorMessage(err), 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchDrafts()
  }, [isAuthenticated])

  const handlePublish = async (id: string) => {
    try {
      await posts.publishDraft(id)
      addToast('Draft published!', 'success')
      setDrafts(prev => prev.filter(d => d._id !== id))
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const handleSchedule = async () => {
    if (!showSchedule || !scheduledDate || !scheduledTime) return
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
    try {
      await posts.schedulePost(showSchedule, scheduledAt)
      addToast('Post scheduled!', 'success')
      setDrafts(prev => prev.filter(d => d._id !== showSchedule))
      setShowSchedule(null)
      setScheduledDate('')
      setScheduledTime('')
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const handleDeleteDraft = async (id: string) => {
    try {
      await posts.delete(id)
      addToast('Draft deleted', 'success')
      setDrafts(prev => prev.filter(d => d._id !== id))
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  if (loading) return (
    <div className="space-y-4 shimmer-skeleton">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 h-24"></div>
      ))}
    </div>
  )

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none">
        <Sparkles background="transparent" particleColor="#8b5cf6" particleDensity={80} minSize={0.5} maxSize={1.2} speed={1.5} className="w-full h-full" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold gradient-text flex items-center space-x-2">
            <FileEdit size={24} className="text-primary glow-sm" />
            <span>Drafts</span>
          </h2>
          <span className="text-text-subtle text-sm">
            <NumberTicker value={drafts.length} className="text-2xl font-bold gradient-text" /> drafts
          </span>
        </div>

        {drafts.length === 0 && !loading && (
          <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card p-12 rounded-2xl text-center" duration={3000} rx="20" ry="20">
            <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
              <FileEdit size={32} className="text-text-muted" />
            </div>
            <p className="text-text-muted text-lg mb-2 font-medium">No drafts yet</p>
            <p className="text-text-subtle text-sm">Save posts as drafts to publish later</p>
          </MovingBorder>
        )}

        <div className="space-y-4">
          {drafts.map((draft, index) => (
            <motion.div
              key={draft._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="glass-card rounded-2xl p-5 hover-lift"
            >
              <div className="flex items-center space-x-2 mb-2 text-text-subtle text-xs">
                <FileEdit size={14} className="text-primary" />
                <span>Draft</span>
              </div>
              {draft.title && <h3 className="text-lg font-bold gradient-text mb-2">{draft.title}</h3>}
              <p className="text-text-secondary text-sm mb-4">{draft.content}</p>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePublish(draft._id)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-sm font-medium shadow-glow-sm card-press"
                >
                  <Send size={14} />
                  <span>Publish</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSchedule(draft._id)}
                  className="flex items-center space-x-1.5 px-3 py-2 glass-card text-primary rounded-xl text-sm font-medium card-press"
                >
                  <Clock size={14} />
                  <span>Schedule</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeleteDraft(draft._id)}
                  className="flex items-center space-x-1.5 px-3 py-2 glass-card text-red-400 rounded-xl text-sm font-medium card-press"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showSchedule && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 glass-heavy flex items-center justify-center z-50 p-4" onClick={() => setShowSchedule(null)}>
              <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 30, opacity: 0 }}
                ref={scheduleRef}
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label="Schedule post"
                className="glass-heavy bg-surface/90 rounded-2xl p-6 border border-border/20 w-full max-w-md shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold gradient-text">Schedule Post</h3>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSchedule(null)} className="p-2 rounded-xl hover:bg-surface/60 text-text-muted card-press">
                    <X size={18} />
                  </motion.button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-text-muted text-sm mb-1 block">Date</label>
                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                      className="w-full px-4 py-3 input-glass rounded-xl text-text" />
                  </div>
                  <div>
                    <label className="text-text-muted text-sm mb-1 block">Time</label>
                    <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 input-glass rounded-xl text-text" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowSchedule(null)}
                    className="px-4 py-2 glass-card text-text-muted rounded-xl card-press">Cancel</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSchedule} disabled={!scheduledDate || !scheduledTime}
                    className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 card-press">
                    <Clock size={14} className="inline mr-1" />Schedule
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default DraftsPage