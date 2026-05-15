// Push notification utilities and service worker integration

interface NotificationAction {
  action: string
  title: string
  icon?: string
}

interface NotificationOptions {
  body?: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  requireInteraction?: boolean
  actions?: NotificationAction[]
  data?: any
  silent?: boolean
  vibrate?: number[]
}

interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  requireInteraction?: boolean
  actions?: NotificationAction[]
  data?: any
}

class PushNotificationManager {
  private swRegistration: ServiceWorkerRegistration | null = null
  private vapidPublicKey = 'BKxQzBJC5znH5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5Q9Z5n5' // This should come from server

  async init(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered')

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('Notification permission granted')
        await this.subscribeToPush()
      } else {
        console.log('Notification permission denied')
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  async subscribeToPush(): Promise<void> {
    if (!this.swRegistration) return

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)
      console.log('Push subscription created')
    } catch (error) {
      console.error('Push subscription failed:', error)
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    // This would send the subscription to your backend
    // await fetch('/api/push/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // })
    console.log('Subscription would be sent to server:', subscription)
  }

  async showNotification(payload: PushNotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') return

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      image: payload.image,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions,
      data: payload.data,
      silent: false
    }

    if (this.swRegistration) {
      // Use service worker to show notification
      await this.swRegistration.showNotification(payload.title, options)
    } else {
      // Fallback to direct notification
      new Notification(payload.title, options)
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) return null
    return await this.swRegistration.pushManager.getSubscription()
  }

  async unsubscribe(): Promise<void> {
    const subscription = await this.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      console.log('Push subscription unsubscribed')
    }
  }
}

// Create singleton instance
export const pushNotificationManager = new PushNotificationManager()

// Notification helper functions
export const showNewPostNotification = async (post: any, author: any): Promise<void> => {
  await pushNotificationManager.showNotification({
    title: 'New Post',
    body: `${author.username}: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`,
    icon: author.avatar || '/default-avatar.png',
    image: post.image,
    tag: 'new-post',
    data: { postId: post._id, type: 'post' }
  })
}

export const showNewMessageNotification = async (message: any, sender: any): Promise<void> => {
  await pushNotificationManager.showNotification({
    title: 'New Message',
    body: `${sender.username}: ${message.content}`,
    icon: sender.avatar || '/default-avatar.png',
    tag: `message-${sender._id}`,
    data: { messageId: message._id, senderId: sender._id, type: 'message' }
  })
}

export const showLikeNotification = async (liker: any, postId: string): Promise<void> => {
  await pushNotificationManager.showNotification({
    title: 'New Like',
    body: `${liker.username} liked your post`,
    icon: liker.avatar || '/default-avatar.png',
    tag: `like-${postId}`,
    data: { postId, likerId: liker._id, type: 'like' }
  })
}

export const showFollowNotification = async (follower: any): Promise<void> => {
  await pushNotificationManager.showNotification({
    title: 'New Follower',
    body: `${follower.username} started following you`,
    icon: follower.avatar || '/default-avatar.png',
    tag: `follow-${follower._id}`,
    data: { followerId: follower._id, type: 'follow' }
  })
}

export const showCommentNotification = async (comment: any, commenter: any, postId: string): Promise<void> => {
  await pushNotificationManager.showNotification({
    title: 'New Comment',
    body: `${commenter.username}: ${comment.content}`,
    icon: commenter.avatar || '/default-avatar.png',
    tag: `comment-${postId}`,
    data: { commentId: comment._id, postId, commenterId: commenter._id, type: 'comment' }
  })
}

// Initialize push notifications when app loads
export const initPushNotifications = async (): Promise<void> => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    await pushNotificationManager.init()
  }
}

// Check if notifications are supported
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Get current notification permission status
export const getNotificationPermission = (): string => {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

// Request notification permission
export const requestNotificationPermission = async (): Promise<string> => {
  if (!('Notification' in window)) {
    return 'denied'
  }

  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    await pushNotificationManager.init()
  }
  return permission
}