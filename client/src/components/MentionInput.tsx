import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { profiles, User } from '../services/api'
import Avatar from './Avatar'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

const MentionInput: React.FC<MentionInputProps> = ({ value, onChange, placeholder, rows = 4, className = '' }) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setMentionUsers([])
      setShowDropdown(false)
      return
    }
    try {
      const res = await profiles.searchMention(q)
      setMentionUsers(res.data || [])
      setShowDropdown(true)
    } catch {
      setMentionUsers([])
      setShowDropdown(false)
    }
  }, [])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1)
      const hasSpace = textAfterAt.includes(' ')
      if (!hasSpace) {
        setMentionStartIndex(atIndex)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => searchUsers(textAfterAt), 300)
      } else {
        setShowDropdown(false)
      }
    } else {
      setShowDropdown(false)
    }
  }

  const selectUser = (user: User) => {
    if (mentionStartIndex === -1) return
    const before = value.substring(0, mentionStartIndex)
    const afterCursor = value.substring(textareaRef.current?.selectionStart || value.length)
    const newText = `${before}@${user.username} ${afterCursor}`
    onChange(newText)
    setShowDropdown(false)
    setMentionStartIndex(-1)
    if (textareaRef.current) {
      const newCursorPos = before.length + user.username.length + 2
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none ${className}`}
      />
      <AnimatePresence>
        {showDropdown && mentionUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 bottom-full mb-2 z-50 glass-card rounded-xl p-2 shadow-lg max-h-48 overflow-y-auto w-full"
          >
            {mentionUsers.map(u => (
              <motion.button
                key={u._id}
                whileHover={{ x: 4 }}
                onClick={() => selectUser(u)}
                className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-primary/10 transition-all w-full card-press"
              >
                <Avatar src={u.avatar} name={u.username} size={28} />
                <span className="text-text text-sm font-medium">{u.username}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MentionInput