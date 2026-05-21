import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  MessageCircle,
  User,
  Settings,
  Bell,
  Plus,
  Moon,
  Sun,
  Sparkles,
  Menu,
  Bookmark,
  Shield,
  Compass,
  ArrowUp,
  Play,
  Radio,
  BarChart3,
  UserPlus,
  LogOut,
} from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import { useSocket } from './contexts/SocketContext'
import { useToast } from './contexts/ToastContext'
import { notificationService, profiles } from './services/api'
const FeedPage = lazy(() => import('./pages/FeedPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ReelsPage = lazy(() => import('./pages/ReelsPage'))
const LivePage = lazy(() => import('./pages/LivePage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
import Avatar from './components/Avatar'
import NotificationsPanel from './components/NotificationsPanel'
import FriendRequestsPanel from './components/FriendRequestsPanel'
import OnboardingModal from './components/OnboardingModal'
import { Dock } from '@/components/ui/dock'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Aurora } from '@/components/ui/aurora'
import { useMobileKeyboard } from './hooks/useFocusTrap'
import { initPushNotifications, showNewPostNotification, showNewMessageNotification, showLikeNotification, showFollowNotification, showCommentNotification } from './utils/pushNotifications'

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="relative">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-14 h-14 border-[3px] border-primary/20 border-t-primary rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 w-14 h-14 rounded-full bg-primary/10"
      />
    </div>
  </div>
)

const PageSuspense = () => (
  <div className="flex items-center justify-center py-20">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full" />
  </div>
)

function App() {
  const { isAuthenticated, user, logout, theme, toggleTheme, loading, showOnboarding, completeOnboarding } = useAuth()
  const socketContext = useSocket()
  const socket = socketContext.socket
  const { addToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  // Mobile keyboard handling
  useMobileKeyboard()

  // Initialize push notifications
  useEffect(() => {
    initPushNotifications()
  }, [])

  // Handle real-time notifications with push notifications
  useEffect(() => {
    if (!socket) return

    const handleNewPost = async (newPost: any) => {
      // Don't show notification for own posts
      if (newPost.author._id === user?._id) return

      // Show push notification if user is not currently viewing feed
      const currentPath = location.pathname
      if (currentPath !== '/' && document.hidden) {
        try {
          await showNewPostNotification(newPost, newPost.author)
        } catch (error) {
          console.error('Failed to show push notification:', error)
        }
      }
    }

    const handleNewMessage = async (messageData: any) => {
      // Don't show notification for own messages
      if (messageData.sender._id === user?._id) return

      // Show push notification if user is not in messages page
      const currentPath = location.pathname
      if (!currentPath.includes('/messages') && document.hidden) {
        try {
          await showNewMessageNotification(messageData, messageData.sender)
        } catch (error) {
          console.error('Failed to show push notification:', error)
        }
      }
    }

    const handleLike = async (likeData: any) => {
      // Show notification for likes on user's posts
      if (likeData.postAuthor._id === user?._id && likeData.liker._id !== user?._id) {
        try {
          await showLikeNotification(likeData.liker, likeData.postId)
        } catch (error) {
          console.error('Failed to show push notification:', error)
        }
      }
    }

    const handleFollow = async (followData: any) => {
      // Show notification for new followers
      if (followData.followed._id === user?._id) {
        try {
          await showFollowNotification(followData.follower)
        } catch (error) {
          console.error('Failed to show push notification:', error)
        }
      }
    }

    const handleComment = async (commentData: any) => {
      // Show notification for comments on user's posts
      if (commentData.postAuthor._id === user?._id && commentData.commenter._id !== user?._id) {
        try {
          await showCommentNotification(commentData.comment, commentData.commenter, commentData.postId)
        } catch (error) {
          console.error('Failed to show push notification:', error)
        }
      }
    }

    socket.on('newPost', handleNewPost)
    socket.on('newMessage', handleNewMessage)
    socket.on('like', handleLike)
    socket.on('follow', handleFollow)
    socket.on('comment', handleComment)

    return () => {
      socket.off('newPost', handleNewPost)
      socket.off('newMessage', handleNewMessage)
      socket.off('like', handleLike)
      socket.off('follow', handleFollow)
      socket.off('comment', handleComment)
    }
  }, [socket, user, location.pathname])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showFriendRequests, setShowFriendRequests] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [requestCount, setRequestCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const notifRes = await notificationService.getUnreadCount()
      setUnreadCount(notifRes.data.count)
      const reqRes = await profiles.getRequestCount()
      setRequestCount(reqRes.data.count)
    } catch (err) {
      // Ignore fetch errors - counts will stay at 0
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchCounts()
  }, [isAuthenticated, fetchCounts])

  useEffect(() => {
    if (!socket) return
    socket.on('notification', () => {
      fetchCounts()
    })
    return () => {
      socket.off('notification')
    }
  }, [socket, fetchCounts])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    addToast('Logged out successfully', 'success')
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Routes><Route path="*" element={<LoginPage />} /></Routes>
      </Suspense>
    )
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: Play, label: 'Reels', path: '/reels' },
    { icon: Radio, label: 'Live', path: '/live' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    ...(user?.role === 'admin' ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ]

  const dockItems = [
    { icon: <Home size={20} />, label: 'Home', onClick: () => navigate('/') },
    { icon: <Compass size={20} />, label: 'Explore', onClick: () => navigate('/explore') },
    { icon: <motion.div animate={{ rotate: 90 }}><Play size={20} /></motion.div>, label: 'Reels', onClick: () => navigate('/reels') },
    { icon: <Radio size={20} />, label: 'Live', onClick: () => navigate('/live') },
    { icon: <MessageCircle size={20} />, label: 'Messages', onClick: () => navigate('/messages') },
    { icon: <Bell size={20} />, label: 'Notifications', onClick: () => setShowNotifications(!showNotifications) },
    { icon: <User size={20} />, label: 'Profile', onClick: () => navigate('/profile') },
  ]

  const currentPath = location.pathname

  const SidebarContent = () => (
    <div className="p-5 h-full flex flex-col">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-9 h-9 bg-gradient-to-br from-primary via-accent to-pink-500 rounded-xl flex items-center justify-center shadow-lg glow pulse-glow">
            <Sparkles className="text-white" size={18} />
          </div>
          <h1 className="text-xl font-black bg-gradient-to-r from-primary via-accent to-pink-500 bg-clip-text text-transparent tracking-tight">SocialHub</h1>
        </div>
        <p className="text-text-subtle text-xs ml-12">Connect & Share</p>
      </div>

      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path || (item.path === '/' && currentPath === '/')
          return (
            <motion.button
              key={item.path}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              className={`group w-full flex items-center space-x-3 p-2.5 rounded-xl transition-all duration-300 card-press ${
                isActive
                  ? 'bg-gradient-to-r from-primary/15 to-accent/15 text-primary border border-primary/20 shadow-[inset_0_0_30px_rgba(139,92,246,0.08),0_0_15px_rgba(139,92,246,0.12)]'
                  : 'text-text-muted hover:bg-white/[0.04] hover:text-text'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all duration-300 ${isActive ? 'bg-primary/20' : 'group-hover:bg-surface/60'}`}>
                <Icon size={18} className={isActive ? 'text-primary' : ''} />
              </div>
              <span className={`font-medium text-sm ${isActive ? 'text-primary' : ''}`}>{item.label}</span>
              {item.path === '/messages' && unreadCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="ml-auto text-xs bg-gradient-to-r from-accent to-pink-500 text-white rounded-full px-2 py-0.5 font-bold shadow-glow-sm">
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </nav>

      <div className="border-t border-border/30 pt-5 space-y-0.5 mt-4">
        <ShimmerButton
          onClick={() => setShowCreateModal(true)}
          className="w-full py-2.5 mb-2 font-semibold text-sm"
          background="rgba(139, 92, 246, 1)"
          shimmerColor="#c4b5fd"
          shimmerDuration="2s"
          borderRadius="12px">
          <Plus size={16} />
          <span>Create Post</span>
        </ShimmerButton>
        <motion.button
          whileHover={{ x: 6 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowFriendRequests(!showFriendRequests)}
          className="group w-full flex items-center space-x-3 p-2.5 rounded-xl text-text-muted hover:bg-white/[0.04] hover:text-text transition-all duration-300 card-press"
        >
          <div className="p-1 rounded-lg group-hover:bg-surface/60 transition-all duration-300">
            <UserPlus size={18} />
          </div>
          <span className="font-medium text-sm">Friend Requests</span>
          {requestCount > 0 && (
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="ml-auto text-xs bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-full px-2 py-0.5 font-bold shadow-glow-sm">
              {requestCount}
            </motion.span>
          )}
        </motion.button>
        <motion.button
          whileHover={{ x: 6 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="group w-full flex items-center space-x-3 p-2.5 rounded-xl text-text-muted hover:bg-red-500/[0.08] hover:text-red-400 transition-all duration-300 card-press"
        >
          <div className="p-1 rounded-lg group-hover:bg-red-500/10 transition-all duration-300">
            <LogOut size={18} />
          </div>
          <span className="font-medium text-sm">Sign Out</span>
        </motion.button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-text font-sans relative overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50">Skip to content</a>

      <div className="fixed inset-0 pointer-events-none">
        <Aurora className="absolute inset-0" colors={["#8b5cf6", "#06b6d4", "#ec4899"]} speed={0.4} />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.1, 0.04], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl floating-orb"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03], x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-accent/5 rounded-full blur-3xl floating-orb-slow"
        />
      </div>

      <div className="relative z-10 flex">
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="hidden lg:block fixed left-0 top-0 h-full w-72 glass-heavy bg-surface/70 border-r border-border/20 z-40"
          role="navigation"
          aria-label="Main navigation"
        >
          <SidebarContent />
        </motion.div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 lg:hidden"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className="relative w-72 h-full glass-heavy bg-surface/90 border-r border-border/20"
              >
                <SidebarContent />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="lg:ml-72 flex-1 min-h-screen">
          <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="sticky top-0 z-30 glass bg-surface/70 border-b border-border/20"
          >
            <div className="flex items-center justify-between px-4 lg:px-6 py-3">
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-xl hover:bg-surface/60 text-text-muted transition-all"
                >
                  <Menu size={22} />
                </motion.button>
                {user && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center space-x-2 cursor-pointer hover-lift"
                    onClick={() => navigate('/profile')}
                  >
                    <Avatar src={user.avatar} name={user.username} size={36} />
                    <span className="text-text-muted font-medium hidden sm:inline text-sm">{user?.username}</span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  className="p-2.5 rounded-xl glass-card glass-card-hover transition-all duration-300 card-press">
                  {theme === 'dark' ? <Sun size={17} className="text-text-muted" /> : <Moon size={17} className="text-gray-500" />}
                </motion.button>

                <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  className="relative p-2.5 rounded-xl glass-card glass-card-hover transition-all duration-300 card-press">
                  <Bell size={17} className="text-text-muted" />
                  {unreadCount > 0 && (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1 bg-gradient-to-r from-accent to-pink-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-glow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </motion.button>

                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                  onClick={() => setShowCreateModal(true)}
                  aria-label="Create new post"
                  className="p-2.5 rounded-xl bg-gradient-to-r from-primary via-accent to-pink-500 text-white shadow-glow pulse-glow card-press">
                  <Plus size={18} />
                </motion.button>
              </div>
            </div>

            <div className="relative">
              <AnimatePresence>
                {showNotifications && (
                  <NotificationsPanel onClose={() => setShowNotifications(false)} onRead={fetchCounts} />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {showFriendRequests && (
                  <FriendRequestsPanel onClose={() => setShowFriendRequests(false)} onUpdate={() => { fetchCounts(); setShowFriendRequests(false); }} />
                )}
              </AnimatePresence>
            </div>
          </motion.header>

          <main id="main-content" className="max-w-2xl mx-auto px-4 lg:px-6 py-6" role="main" aria-label="Main content">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <Suspense fallback={<PageSuspense />}>
                  <Routes location={location}>
                  <Route path="/" element={<FeedPage showCreateModal={showCreateModal} onCloseCreateModal={() => setShowCreateModal(false)} />} />
                  <Route path="/reels" element={<ReelsPage />} />
                  <Route path="/live" element={<LivePage />} />
                  <Route path="/live/:streamId" element={<LivePage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:id" element={<UserProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" replace />} />
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden">
        <Dock
          items={dockItems}
          magnification={0.6}
          distance={120}
          className="border-primary/20"
        />
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            whileHover={{ scale: 1.15, y: -3 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="fixed bottom-24 right-6 z-50 p-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-glow pulse-glow card-press"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={completeOnboarding}
      />
    </div>
  )
}

export default App