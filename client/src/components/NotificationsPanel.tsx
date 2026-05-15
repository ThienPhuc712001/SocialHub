import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { notificationService, Notification } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { formatRelativeTime } from '../utils/format'
import Avatar from './Avatar'

interface Props {
  onClose: () => void
  onRead: () => void
}

const NotificationsPanel: React.FC<Props> = ({ onClose, onRead }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { addToast } = useToast()

  React.useEffect(() => {
    const fetch = async () => {
      try {
        const res = await notificationService.get()
        const data = res.data
        setNotifications(Array.isArray(data) ? data : (data.notifications || []))
      } catch { addToast('Failed to load notifications', 'error') }
      setLoading(false)
    }
    fetch()
  }, [])

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      onRead()
    } catch { addToast('Failed to mark as read', 'error') }
  }

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await notificationService.markRead(n._id)
        setNotifications(prev => prev.map(notif => notif._id === n._id ? { ...notif, read: true } : notif))
        onRead()
      } catch {
        // Ignore mark read errors
      }
    }

    if ((n.type === 'like' || n.type === 'comment' || n.type === 'bookmark') && n.post) {
      navigate('/')
    } else if (n.type === 'follow') {
      navigate(`/profile/${n.sender._id}`)
    } else if (n.type === 'message') {
      navigate('/messages')
    }
    onClose()
  }

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'like': return '❤️'
      case 'comment': return '💬'
      case 'follow': return '👋'
      case 'message': return '✉️'
      case 'bookmark': return '🔖'
      default: return '🔔'
    }
  }

 return (
    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      role="dialog" aria-modal="true" aria-label="Notifications"
      className="absolute right-4 lg:right-6 top-full mt-2 w-80 glass-heavy bg-surface/90 rounded-2xl border border-border/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <h3 className="text-lg font-semibold gradient-text">Notifications</h3>
        <div className="flex space-x-2 items-center">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={markAllRead} className="text-sm text-primary hover:text-primary/80 font-medium card-press">Mark all read</motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-1 rounded-lg hover:bg-surface/60 text-text-muted card-press"><X size={18} /></motion.button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center shimmer-skeleton">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 glass-card rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
              <span>🔔</span>
            </div>
            <p className="text-text-muted text-sm">No notifications</p>
          </div>
        ) : notifications.map(n => (
          <motion.div key={n._id} whileHover={{ x: 4 }}
            onClick={() => handleClick(n)}
            className={`flex items-center space-x-3 p-3 hover:bg-primary/[0.06] cursor-pointer transition-all card-press ${!n.read ? 'bg-primary/[0.04]' : ''}`}>
            <Avatar src={n.sender.avatar} name={n.sender.username} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-text text-sm truncate leading-snug">
                <span className="mr-1">{getNotifIcon(n.type)}</span>
                {n.type === 'like' && `${n.sender.username} liked your post`}
                {n.type === 'comment' && `${n.sender.username} commented: "${n.content || ''}"`}
                {n.type === 'follow' && `${n.sender.username} sent you a follow request`}
                {n.type === 'message' && `${n.sender.username}: "${n.content || ''}"`}
                {n.type === 'bookmark' && `${n.sender.username} bookmarked your post`}
              </p>
              <p className="text-text-subtle text-xs mt-0.5">{formatRelativeTime(n.createdAt)}</p>
            </div>
            {!n.read && (
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full glow-sm" />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default NotificationsPanel