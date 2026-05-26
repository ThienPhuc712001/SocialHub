import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { stickerService, StickerPack } from '../services/api'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface StickerPickerProps {
  onSelect: (stickerId: string, emoji: string) => void
  onClose: () => void
}

const DEFAULT_STICKERS: StickerPack[] = [
  {
    _id: 'default-emoji',
    name: 'Emoji',
    stickers: [
      { id: 'heart', name: 'Heart', url: '', emoji: '❤️' },
      { id: 'thumbsup', name: 'Thumbs Up', url: '', emoji: '👍' },
      { id: 'laugh', name: 'Laugh', url: '', emoji: '😂' },
      { id: 'fire', name: 'Fire', url: '', emoji: '🔥' },
      { id: 'party', name: 'Party', url: '', emoji: '🎉' },
      { id: 'star', name: 'Star', url: '', emoji: '⭐' },
      { id: 'wave', name: 'Wave', url: '', emoji: '👋' },
      { id: 'think', name: 'Think', url: '', emoji: '🤔' },
      { id: 'cool', name: 'Cool', url: '', emoji: '😎' },
      { id: 'sad', name: 'Sad', url: '', emoji: '😢' },
      { id: 'angry', name: 'Angry', url: '', emoji: '😡' },
      { id: '100', name: '100', url: '', emoji: '💯' },
      { id: 'clap', name: 'Clap', url: '', emoji: '👏' },
      { id: 'pray', name: 'Pray', url: '', emoji: '🙏' },
      { id: 'eyes', name: 'Eyes', url: '', emoji: '👀' },
      { id: 'rocket', name: 'Rocket', url: '', emoji: '🚀' },
      { id: 'sparkles', name: 'Sparkles', url: '', emoji: '✨' },
      { id: 'coffee', name: 'Coffee', url: '', emoji: '☕' },
      { id: 'music', name: 'Music', url: '', emoji: '🎵' },
      { id: 'sun', name: 'Sun', url: '', emoji: '☀️' },
    ],
    isDefault: true,
    createdAt: new Date().toISOString()
  }
]

const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect, onClose }) => {
  const [packs, setPacks] = useState<StickerPack[]>(DEFAULT_STICKERS)
  const [activePack, setActivePack] = useState<string>(DEFAULT_STICKERS[0]._id)
  const modalRef = useFocusTrap<HTMLDivElement>(true)

  useEffect(() => {
    stickerService.getPacks().then(res => {
      const serverPacks = res.data || []
      setPacks([...DEFAULT_STICKERS, ...serverPacks])
    }).catch(() => {
    })
  }, [])

  const currentPack = packs.find(p => p._id === activePack) || packs[0]

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Select sticker"
      className="fixed inset-0 glass-heavy flex items-end justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="glass-heavy bg-surface/90 rounded-2xl p-4 border border-border/20 w-full max-w-sm shadow-[0_25px_70px_rgba(0,0,0,0.5)] max-h-[60vh]"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold gradient-text">Stickers</h3>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-1.5 rounded-xl hover:bg-surface/60 text-text-muted card-press">
            <X size={16} />
          </motion.button>
        </div>
        <div className="flex space-x-1 mb-3 overflow-x-auto scrollbar-none">
          {packs.map(pack => (
            <motion.button
              key={pack._id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActivePack(pack._id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all card-press whitespace-nowrap ${
                activePack === pack._id ? 'bg-primary text-white' : 'glass-card text-text-muted'
              }`}
            >
              {pack.name}
            </motion.button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-[40vh]">
          {currentPack.stickers.map(sticker => (
            <motion.button
              key={sticker.id}
              whileHover={{ scale: 1.15, y: -4 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => onSelect(sticker.id, sticker.emoji)}
              className="p-2 glass-card rounded-lg text-2xl flex items-center justify-center hover:bg-primary/10 transition-all card-press"
            >
              {sticker.url ? (
                <img src={sticker.url} alt={sticker.name} className="w-8 h-8 object-contain" />
              ) : (
                <span>{sticker.emoji}</span>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default StickerPicker