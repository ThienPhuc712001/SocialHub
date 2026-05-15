export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string; errors?: { msg: string }[]; error?: string }; status?: number } }).response

    // Handle specific HTTP status codes
    if (response?.status) {
      switch (response.status) {
        case 400:
          return response.data?.message || 'Invalid request. Please check your input.'
        case 401:
          return 'Your session has expired. Please log in again.'
        case 403:
          return 'You don\'t have permission to perform this action.'
        case 404:
          return 'The requested resource was not found.'
        case 409:
          return 'This action conflicts with existing data.'
        case 422:
          return 'Please check your input and try again.'
        case 429:
          return 'Too many requests. Please wait a moment and try again.'
        case 500:
          return 'Server error. Please try again later.'
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.'
        default:
          if (response.status >= 500) {
            return 'Server error. Please try again later.'
          }
      }
    }

    // Handle specific error messages
    if (response?.data?.message) {
      const message = response.data.message.toLowerCase()
      if (message.includes('network') || message.includes('connection')) {
        return 'Connection error. Please check your internet and try again.'
      }
      if (message.includes('timeout')) {
        return 'Request timed out. Please try again.'
      }
      if (message.includes('unauthorized') || message.includes('invalid token')) {
        return 'Your session has expired. Please log in again.'
      }
      if (message.includes('forbidden') || message.includes('permission')) {
        return 'You don\'t have permission to perform this action.'
      }
      return response.data.message
    }

    if (response?.data?.error) return response.data.error
    if (response?.data?.errors?.[0]?.msg) return response.data.errors[0].msg
  }

  if (err instanceof Error) {
    const message = err.message.toLowerCase()
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection error. Please check your internet and try again.'
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
    if (message.includes('cors') || message.includes('cross-origin')) {
      return 'Connection error. Please try again later.'
    }
    return err.message
  }

  // Handle common error types
  if (typeof err === 'string') {
    const message = err.toLowerCase()
    if (message.includes('network') || message.includes('offline')) {
      return 'You appear to be offline. Please check your connection.'
    }
  }

  return 'Something went wrong. Please try again.'
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getAvatarSrc(avatar?: string): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('/uploads/')) {
    const base = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${base}${avatar}`;
  }
  return avatar;
}

export function getAvatarImgSrc(avatar?: string): string {
  return getAvatarSrc(avatar) || ''
}

// Enhanced error handling with retry suggestions
export interface ErrorDetails {
  message: string
  canRetry: boolean
  retryAction?: () => void | Promise<void>
  actionText?: string
}

export function getEnhancedErrorDetails(err: unknown, retryAction?: () => void | Promise<void>): ErrorDetails {
  const message = getErrorMessage(err)

  // Determine if error is retryable
  const isRetryable =
    message.includes('Connection error') ||
    message.includes('timeout') ||
    message.includes('Server error') ||
    message.includes('Service temporarily unavailable') ||
    message.includes('Too many requests')

  return {
    message,
    canRetry: isRetryable,
    retryAction: retryAction,
    actionText: isRetryable ? 'Try Again' : undefined
  }
}

// Network status checker
export function isOnline(): boolean {
  return navigator.onLine
}

// Check if error is due to network issues
export function isNetworkError(err: unknown): boolean {
  if (!isOnline()) return true

  const message = getErrorMessage(err).toLowerCase()
  return message.includes('connection') ||
         message.includes('network') ||
         message.includes('offline') ||
         message.includes('timeout') ||
         message.includes('cors')
}