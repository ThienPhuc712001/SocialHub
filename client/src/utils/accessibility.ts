// Accessibility utilities for keyboard navigation and ARIA support

// Handle keyboard navigation for custom components
export const handleKeyboardNavigation = (
  event: React.KeyboardEvent,
  actions: {
    onEnter?: () => void
    onSpace?: () => void
    onEscape?: () => void
    onArrowUp?: () => void
    onArrowDown?: () => void
    onArrowLeft?: () => void
    onArrowRight?: () => void
    onTab?: () => void
  }
) => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      actions.onEnter?.()
      break
    case ' ':
      event.preventDefault()
      actions.onSpace?.()
      break
    case 'Escape':
      event.preventDefault()
      actions.onEscape?.()
      break
    case 'ArrowUp':
      event.preventDefault()
      actions.onArrowUp?.()
      break
    case 'ArrowDown':
      event.preventDefault()
      actions.onArrowDown?.()
      break
    case 'ArrowLeft':
      event.preventDefault()
      actions.onArrowLeft?.()
      break
    case 'ArrowRight':
      event.preventDefault()
      actions.onArrowRight?.()
      break
    case 'Tab':
      actions.onTab?.()
      break
  }
}

// Generate unique IDs for ARIA relationships
let idCounter = 0
export const generateId = (prefix = 'id') => `${prefix}-${++idCounter}`

// ARIA live region announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.style.position = 'absolute'
  announcement.style.left = '-10000px'
  announcement.style.width = '1px'
  announcement.style.height = '1px'
  announcement.style.overflow = 'hidden'

  document.body.appendChild(announcement)
  announcement.textContent = message

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Focus trap for modals and dialogs
export const trapFocus = (container: HTMLElement, event: KeyboardEvent) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        event.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        event.preventDefault()
      }
    }
  }
}

// Skip to content link functionality
export const handleSkipToContent = (targetId: string) => {
  const target = document.getElementById(targetId)
  if (target) {
    target.focus()
    target.scrollIntoView({ behavior: 'smooth' })
  }
}

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Get appropriate animation duration based on user preferences
export const getAnimationDuration = (defaultDuration: number): number => {
  return prefersReducedMotion() ? 0 : defaultDuration
}

// ARIA label helpers
export const getAriaLabel = (action: string, context?: string): string => {
  const baseLabel = `${action}${context ? ` ${context}` : ''}`
  return baseLabel.charAt(0).toUpperCase() + baseLabel.slice(1)
}

// Social media specific ARIA labels
export const getSocialAriaLabels = {
  likeButton: (isLiked: boolean, count: number) =>
    `${isLiked ? 'Unlike' : 'Like'} this post${count > 0 ? ` (${count} ${count === 1 ? 'like' : 'likes'})` : ''}`,

  commentButton: (count: number) =>
    `View comments${count > 0 ? ` (${count})` : ''}`,

  shareButton: () => 'Share this post',

  bookmarkButton: (isBookmarked: boolean) =>
    `${isBookmarked ? 'Remove from' : 'Add to'} bookmarks`,

  followButton: (isFollowing: boolean, username: string) =>
    `${isFollowing ? 'Unfollow' : 'Follow'} ${username}`,

  postImage: (author: string, content?: string) =>
    `Post by ${author}${content ? `: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}` : ''}`,

  avatar: (username: string) => `Profile picture of ${username}`,

  storyRing: (username: string, hasUnseen: boolean) =>
    `${hasUnseen ? 'Unread' : 'Viewed'} story by ${username}`,
}