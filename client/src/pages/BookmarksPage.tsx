import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { posts, Post as PostType } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Post from '../components/Post'
import { Bookmark } from 'lucide-react'
import { Sparkles } from '@/components/ui/sparkles'
import { MovingBorder } from '@/components/ui/moving-border'
import { NumberTicker } from '@/components/ui/number-ticker'

const BookmarksPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [bookmarkedPosts, setBookmarkedPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalBookmarks, setTotalBookmarks] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchBookmarks = async () => {
      try {
        const response = await posts.getBookmarks(page)
        const data = response.data
        setBookmarkedPosts(data.posts || [])
        if (data.total) setTotalBookmarks(data.total)
        if (data.pages) setTotalPages(data.pages)
      } catch {
        addToast('Failed to load bookmarks', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchBookmarks()
  }, [isAuthenticated, page])

  const handleRemoveBookmark = (postId: string) => {
    setBookmarkedPosts(prev => prev.filter(p => p._id !== postId))
  }

  if (loading) return (
    <div className="space-y-4 shimmer-skeleton">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 h-24"></div>
      ))}
    </div>
  )

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none">
        <Sparkles background="transparent" particleColor="#8b5cf6" particleDensity={80} minSize={0.5} maxSize={1.2} speed={1.5} className="w-full h-full" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold gradient-text flex items-center space-x-2 text-shadow-glow">
            <Bookmark size={24} className="text-primary glow-sm" />
            <span>Bookmarks</span>
          </h2>
          <span className="text-text-subtle text-sm">
            <NumberTicker value={totalBookmarks} className="text-2xl font-bold gradient-text" /> saved
          </span>
        </div>

        {bookmarkedPosts.length === 0 && !loading && (
          <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card p-12 rounded-2xl text-center" duration={3000} rx="20" ry="20">
            <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
              <Bookmark size={32} className="text-text-muted" />
            </div>
            <p className="text-text-muted text-lg mb-2 font-medium">No bookmarks yet</p>
            <p className="text-text-subtle text-sm">Save posts to read them later</p>
          </MovingBorder>
        )}

        <div className="space-y-6">
          {bookmarkedPosts.map((post, index) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
            >
              <Post post={post} onDelete={() => handleRemoveBookmark(post._id)} />
            </motion.div>
          ))}
        </div>

        {page < totalPages && (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setPage(page + 1)}
            className="w-full py-3 glass-card text-text-muted rounded-xl font-medium card-press hover-lift">Load More</motion.button>
        )}
      </motion.div>
    </div>
  )
}

export default BookmarksPage