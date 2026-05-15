import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { posts, Post as PostType } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getErrorMessage, getEnhancedErrorDetails } from '../utils/format'
import Post from '../components/Post'
import { Sparkles } from '@/components/ui/sparkles'

const ReelsPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [reels, setReels] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchReels = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true)
      const response = await posts.getReels(pageNum, 10)
      const data = response.data
      const newReels = data.posts || []

      if (append) {
        setReels(prev => [...prev, ...newReels])
      } else {
        setReels(newReels)
      }

      if (data.pages) setTotalPages(data.pages)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchReels(1)
    }
  }, [isAuthenticated, fetchReels])

  useEffect(() => {
    if (page > 1) {
      fetchReels(page, true)
    }
  }, [page, fetchReels])

  const handleUpdateReel = (updatedReel: PostType) => {
    setReels(prev => prev.map(r => r._id === updatedReel._id ? updatedReel : r))
  }

  const handleDeleteReel = (reelId: string) => {
    setReels(prev => prev.filter(r => r._id !== reelId))
  }

  if (loading) return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-surface rounded-full shimmer-skeleton"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-surface rounded w-24 shimmer-skeleton"></div>
                <div className="h-3 bg-surface rounded w-16 shimmer-skeleton"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-32 bg-surface rounded shimmer-skeleton"></div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )

  if (error) {
    const errorDetails = getEnhancedErrorDetails(error, () => {
      setError(null)
      fetchReels(1)
    })

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-6 text-center border border-red-500/25">
        <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <p className="text-red-400 font-medium mb-4">{errorDetails.message}</p>
        {errorDetails.canRetry && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={errorDetails.retryAction}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press"
          >
            {errorDetails.actionText || 'Retry'}
          </motion.button>
        )}
      </motion.div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0">
        <Sparkles background="transparent" particleColor="#8b5cf6" particleDensity={60} minSize={0.5} maxSize={1.2} speed={1.2} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 rounded-xl flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-6 bg-white rounded-lg"
            />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">Reels</h2>
            <p className="text-text-secondary text-sm">Short-form videos from creators</p>
          </div>
        </div>

        {reels.length === 0 && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 glass-card rounded-2xl">
            <div className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center mx-auto mb-4">
              <motion.div
                animate={{ rotate: 90 }}
                className="text-text-muted"
              >
                <span className="text-2xl">📹</span>
              </motion.div>
            </div>
            <p className="text-text-muted text-lg mb-2 font-medium">No reels yet</p>
            <p className="text-text-subtle text-sm mb-6">Be the first to create a reel!</p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white rounded-xl font-medium shadow-glow pulse-glow card-press"
            >
              Create Your First Reel
            </motion.button>
          </motion.div>
        )}

        <div className="space-y-6">
          {reels.map((reel, index) => (
            <motion.div key={reel._id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}>
              <Post post={reel} onUpdate={handleUpdateReel} onDelete={handleDeleteReel} />
            </motion.div>
          ))}
        </div>

        {loadingMore && (
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <motion.div key={`more-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="glass-card rounded-2xl p-5 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-surface rounded-full shimmer-skeleton"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-surface rounded w-24 shimmer-skeleton"></div>
                      <div className="h-3 bg-surface rounded w-16 shimmer-skeleton"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-32 bg-surface rounded shimmer-skeleton"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Load more trigger */}
        {page < totalPages && !loadingMore && (
          <div className="flex justify-center py-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPage(prev => prev + 1)}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press"
            >
              Load More Reels
            </motion.button>
          </div>
        )}
      </motion.div>
    </>
  )
}

export default ReelsPage