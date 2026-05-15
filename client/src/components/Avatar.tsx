import React from 'react'
import { motion } from 'framer-motion'
import { getAvatarSrc } from '../utils/format'
import { getSocialAriaLabels } from '../utils/accessibility'

interface AvatarProps {
  src?: string
  name: string
  size?: number
  className?: string
  onClick?: () => void
  isOnline?: boolean
  showPulse?: boolean
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 40, className = '', onClick, isOnline, showPulse }) => {
  const initial = name?.[0]?.toUpperCase() || '?'
  const avatarSrc = getAvatarSrc(src)
  const fontSize = size <= 24 ? 'text-xs' : size <= 32 ? 'text-sm' : 'text-lg'

  return (
    <div className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      <div
        style={{ width: size, height: size }}
        className={`rounded-full overflow-hidden bg-gradient-to-br from-primary via-accent to-pink-500 flex items-center justify-center text-white font-bold ${fontSize} border-2 border-card/80 ${onClick ? 'cursor-pointer hover-lift' : ''} ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? `View ${name}'s profile` : getSocialAriaLabels.avatar(name)}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        } : undefined}
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt={getSocialAriaLabels.avatar(name)} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="drop-shadow-sm">{initial}</span>
        )}
      </div>
      {showPulse && (
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-1 rounded-full bg-primary/20 -z-10"
        />
      )}
      {isOnline !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-[30%] h-[30%] rounded-full border-2 border-card ${
            isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-zinc-500'
          }`}
        />
      )}
    </div>
  )
}

export default Avatar