import React from 'react'
import { motion } from 'framer-motion'
import { X, MessageCircle, Send, Copy } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ShareModalProps {
  url: string
  text?: string
  onClose: () => void
}

const ShareModal: React.FC<ShareModalProps> = ({ url, text, onClose }) => {
  const { addToast } = useToast()
  const modalRef = useFocusTrap<HTMLDivElement>(true)
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text || '')

  const shareLinks = [
    { icon: <span className="text-lg font-bold">f</span>, label: 'Facebook', color: 'bg-blue-600', url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { icon: <span className="text-lg font-bold">X</span>, label: 'Twitter', color: 'bg-sky-500', url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}` },
    { icon: <MessageCircle size={20} />, label: 'WhatsApp', color: 'bg-green-500', url: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
    { icon: <Send size={20} />, label: 'Telegram', color: 'bg-blue-400', url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { icon: <span className="text-lg font-bold">in</span>, label: 'LinkedIn', color: 'bg-blue-700', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      addToast('Link copied to clipboard!', 'success')
    } catch {
      addToast('Failed to copy link', 'error')
    }
  }

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Share"
      className="fixed inset-0 glass-heavy flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 30, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="glass-heavy bg-surface/90 rounded-2xl p-6 border border-border/20 w-full max-w-sm shadow-[0_25px_70px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold gradient-text">Share</h3>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-xl hover:bg-surface/60 text-text-muted card-press">
            <X size={18} />
          </motion.button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {shareLinks.map(link => (
            <motion.a
              key={link.label}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link.color} text-white rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5 shadow-md hover-lift card-press`}
            >
              {link.icon}
              <span className="text-xs font-medium">{link.label}</span>
            </motion.a>
          ))}
          <motion.button
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyLink}
            className="bg-gradient-to-r from-primary to-accent text-white rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5 shadow-md hover-lift card-press"
          >
            <Copy size={20} />
            <span className="text-xs font-medium">Copy Link</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default ShareModal