import { useEffect, useRef } from 'react'

export const useFocusTrap = <T extends HTMLElement = HTMLElement>(isActive: boolean, onClose?: () => void) => {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleTabKey)
    document.addEventListener('keydown', handleEscapeKey)

    // Focus first element
    if (firstElement) {
      firstElement.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isActive, onClose])

  return containerRef
}

// Hook for mobile keyboard handling
export const useMobileKeyboard = () => {
  useEffect(() => {
    const handleViewportChange = () => {
      // Prevent zoom on input focus on iOS
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        if (isIOS) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        }
      }
    }

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }
    }

    const handleBlur = () => {
      // Reset viewport after blur
      setTimeout(() => {
        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
        }
      }, 300)
    }

    handleViewportChange()
    document.addEventListener('focus', handleFocus, true)
    document.addEventListener('blur', handleBlur, true)

    return () => {
      document.removeEventListener('focus', handleFocus, true)
      document.removeEventListener('blur', handleBlur, true)
    }
  }, [])
}