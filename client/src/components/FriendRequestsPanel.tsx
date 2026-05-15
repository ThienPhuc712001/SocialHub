import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Check, XCircle } from 'lucide-react'
import { profiles, FriendRequest } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { formatRelativeTime } from '../utils/format'
import Avatar from './Avatar'

interface Props {
  onClose: () => void
  onUpdate: () => void
}

const FriendRequestsPanel: React.FC<Props> = ({ onClose, onUpdate }) => {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await profiles.getRequests()
        setRequests(res.data)
      } catch {
        // Ignore request errors
      }
      setLoading(false)
    }
    fetchRequests()
  }, [])

  const handleAccept = async (requestId: string) => {
    try {
      await profiles.acceptRequest(requestId)
      setRequests(prev => prev.filter(r => r._id !== requestId))
      addToast('Friend request accepted!', 'success')
      onUpdate()
    } catch {
      addToast('Failed to accept request', 'error')
    }
  }

  const handleDecline = async (requestId: string) => {
    try {
      await profiles.declineRequest(requestId)
      setRequests(prev => prev.filter(r => r._id !== requestId))
      addToast('Request declined', 'info')
    } catch {
      addToast('Failed to decline request', 'error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      role="dialog" aria-modal="true" aria-label="Friend Requests"
      className="absolute right-4 lg:right-6 top-full mt-2 w-80 glass-heavy bg-surface/90 rounded-2xl border border-border/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
    >
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <h3 className="text-lg font-semibold gradient-text">Friend Requests</h3>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-1 rounded-lg hover:bg-surface/60 text-text-muted card-press"><X size={18} /></motion.button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center shimmer-skeleton">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 glass-card rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
              <span>👋</span>
            </div>
            <p className="text-text-muted text-sm">No friend requests</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req._id} className="flex items-center space-x-3 p-4 border-b border-border/10 hover:bg-primary/[0.06] transition-all card-press">
              <Avatar src={req.from.avatar} name={req.from.username} size={40} onClick={() => { navigate(`/profile/${req.from._id}`); onClose(); }} />
              <div className="flex-1 min-w-0">
                <p className="text-text font-medium text-sm truncate">{req.from.username}</p>
                <p className="text-text-subtle text-xs">{formatRelativeTime(req.createdAt)}</p>
              </div>
              <div className="flex space-x-1.5">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleAccept(req._id)}
                  className="p-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all border border-green-500/25 glow-green card-press">
                  <Check size={16} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleDecline(req._id)}
                  className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all border border-red-500/25 glow-red card-press">
                  <XCircle size={16} />
                </motion.button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default FriendRequestsPanel