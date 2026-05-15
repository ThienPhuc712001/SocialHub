import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { posts, Post as PostType } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import Post from './Post'
import { X, ImagePlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { PostSkeleton } from '../components/ui/skeleton'
import { getErrorMessage, getEnhancedErrorDetails } from '../utils/format'
import { compressMediaFile, formatFileSize, shouldCompress } from '../utils/compression'

interface Props {
  showCreateModal: boolean
  onCloseCreateModal: () => void
}

const Feed: React.FC<Props> = ({ showCreateModal, onCloseCreateModal }) => {
  const { isAuthenticated } = useAuth()
  const { socket } = useSocket()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [postsData, setPostsData] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [compressingImage, setCompressingImage] = useState(false)
  const [compressingVideo, setCompressingVideo] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [loadingMore, setLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const feedContainerRef = useRef<HTMLDivElement>(null)
  const modalRef = useFocusTrap(showCreateModal)

  const fetchPosts = useCallback(async (pageNum: number, sortParam: 'latest' | 'popular', append: boolean = false) => {
    try {
      if (append) setLoadingMore(true)
      const response = await posts.getTimeline(pageNum, 10, sortParam)
      const data = response.data
      const newPosts = data.posts || []
      if (append) {
        setPostsData(prev => [...prev, ...newPosts])
      } else {
        setPostsData(newPosts)
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
    setPage(1)
    fetchPosts(1, sort)
  }, [isAuthenticated, sort])

  useEffect(() => {
    if (page > 1) {
      fetchPosts(page, sort, true)
    }
  }, [page])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loadingMore && !loading) {
          setPage(prev => prev + 1)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [page, totalPages, loadingMore, loading])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      setPage(1)
      await fetchPosts(1, sort)
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [sort])

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const pullThreshold = 80
    if (info.offset.y > pullThreshold && window.scrollY === 0) {
      handleRefresh()
    }
    setPullDistance(0)
  }

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (window.scrollY === 0 && info.offset.y > 0) {
      setPullDistance(Math.min(info.offset.y, 120))
    }
  }

  useEffect(() => {
    if (socket) {
      socket.on('newPost', (newPost: PostType) => {
        setPostsData(prev => {
          if (prev.find(p => p._id === newPost._id)) return prev
          if (sort === 'latest') return [newPost, ...prev]
          return [...prev, newPost]
        })
      })
      socket.on('postDeleted', (postId: string) => {
        setPostsData(prev => prev.filter(p => p._id !== postId))
      })
      return () => {
        socket.off('newPost')
        socket.off('postDeleted')
      }
    }
  }, [socket, sort])

  useEffect(() => {
    if (showCreateModal) {
      setTitle('')
      setContent('')
      setImage(null)
      setVideo(null)
      setImagePreview(null)
      setVideoPreview(null)
      setCompressingImage(false)
      setCompressingVideo(false)
    }
  }, [showCreateModal])

  const handleImageChange = async (file: File | null) => {
    if (file) {
      try {
        // Clear video if image is selected
        setVideo(null)
        setVideoPreview(null)

        // Show compression indicator for large files
        if (shouldCompress(file, 300)) {
          setCompressingImage(true)
          addToast('Compressing image...', 'info')

          const compressedFile = await compressMediaFile(file, 'post')
          const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1)

          if (compressionRatio !== '0.0') {
            addToast(`Image compressed! Saved ${compressionRatio}%`, 'success')
  }

  const handleVideoChange = async (file: File | null) => {
    if (file) {
      try {
        // Clear image if video is selected
        setImage(null)
        setImagePreview(null)

        // Show compression indicator for large files
        if (shouldCompress(file, 2000)) { // Lower threshold for videos
          setCompressingVideo(true)
          addToast('Processing video...', 'info')

          const compressedFile = await compressMediaFile(file, 'post')
          if (compressedFile.size !== file.size) {
            addToast('Video processed for upload', 'success')
          }

          setVideo(compressedFile)
        } else {
          setVideo(file)
        }

        const reader = new FileReader()
        reader.onload = (e) => setVideoPreview(e.target?.result as string)
        reader.readAsDataURL(file)
      } catch (error) {
        addToast('Failed to process video', 'error')
        console.error('Video processing error:', error)
      } finally {
        setCompressingVideo(false)
      }
    } else {
      setVideo(null)
      setVideoPreview(null)
      setCompressingVideo(false)
    }
  }

          setImage(compressedFile)
        } else {
          setImage(file)
        }

        const reader = new FileReader()
        reader.onload = (e) => setImagePreview(e.target?.result as string)
        reader.readAsDataURL(file)
      } catch (error) {
        addToast('Failed to process image', 'error')
        console.error('Image compression error:', error)
      } finally {
        setCompressingImage(false)
      }
    } else {
      setImage(null)
      setImagePreview(null)
      setCompressingImage(false)
    }
  }

  const handleCreatePost = async () => {
    try {
      let data: FormData | { title?: string; content: string } = { title, content }

      if (image || video) {
        const formData = new FormData()
        if (title) formData.append('title', title)
        formData.append('content', content)
        if (image) formData.append('image', image)
        if (video) formData.append('video', video)
        data = formData
      }

      await posts.create(data)
      addToast(video ? 'Reel created!' : 'Post created!', 'success')
      onCloseCreateModal()
      setPage(1)
      fetchPosts(1, sort)
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const handleUpdatePost = (updatedPost: PostType) => {
    setPostsData(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p))
  }

  const handleDeletePost = (postId: string) => {
    setPostsData(prev => prev.filter(p => p._id !== postId))
  }

  if (loading) return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <PostSkeleton />
        </motion.div>
      ))}
    </div>
  )

  if (error) {
    const errorDetails = getEnhancedErrorDetails(error, () => {
      setError(null)
      setPage(1)
      fetchPosts(1, sort)
    })

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-6 text-center border border-red-500/25">
        <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
          <X size={24} className="text-red-400" />
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
    <motion.div
      ref={feedContainerRef}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className="space-y-6 relative"
      style={{ y: pullDistance * 0.3 }}
    >
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 flex items-center space-x-2 glass-card rounded-full px-4 py-2 shadow-lg"
          >
            <motion.div
              animate={{ rotate: isRefreshing ? 360 : pullDistance > 80 ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full"
            />
            <span className="text-sm text-text-muted">
              {isRefreshing ? 'Refreshing...' : pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 glass-heavy flex items-center justify-center z-50 p-4" onClick={onCloseCreateModal}>
            <motion.div initial={{ scale: 0.85, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              ref={modalRef}
              onClick={(e) => e.stopPropagation()}
              role="dialog" aria-modal="true" aria-label="Create post"
              className="glass-heavy bg-white/[0.04] rounded-2xl p-6 border border-white/[0.08] w-full max-w-lg shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold gradient-text">Create Post</h3>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onCloseCreateModal} className="p-2 rounded-xl hover:bg-surface/60 text-text-muted card-press"><X size={18} /></motion.button>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Post title (optional)" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" />
                <textarea placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} rows={4} required
                  className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none" />
                {imagePreview && (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={imagePreview} alt="Image preview" className="w-full h-48 object-cover" />
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleImageChange(null)} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70 card-press" aria-label="Remove image"><X size={16} /></motion.button>
                  </div>
                )}
                {videoPreview && (
                  <div className="relative rounded-xl overflow-hidden">
                    <video src={videoPreview} className="w-full h-48 object-cover" muted />
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleVideoChange(null)} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70 card-press" aria-label="Remove video"><X size={16} /></motion.button>
                  </div>
                )}
                {!imagePreview && !videoPreview && (
                  <div className="flex space-x-2">
                    <label className="flex items-center space-x-2 px-4 py-2 glass-card rounded-xl cursor-pointer hover:bg-surface/40 transition-all card-press flex-1">
                      <ImagePlus size={18} className="text-text-muted" />
                      <span className="text-text-muted text-sm">Add Image</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                    <label className="flex items-center space-x-2 px-4 py-2 glass-card rounded-xl cursor-pointer hover:bg-surface/40 transition-all card-press flex-1">
                      <motion.div animate={{ rotate: 90 }} className="text-text-muted">
                        <ImagePlus size={18} />
                      </motion.div>
                      <span className="text-text-muted text-sm">Add Video</span>
                      <input type="file" accept="video/*" onChange={(e) => handleVideoChange(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCloseCreateModal}
                  className="px-5 py-2.5 text-text-muted rounded-xl font-medium card-press">Cancel</motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCreatePost} disabled={!content.trim() || compressingImage || compressingVideo}
                  className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 card-press">
                  {compressingImage ? 'Compressing image...' : compressingVideo ? 'Processing video...' : video ? 'Create Reel' : 'Post'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex space-x-1.5">
        {(['latest', 'popular'] as const).map(s => (
          <motion.button key={s} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setSort(s)}
            className={`px-4 py-2 rounded-xl font-medium transition-all card-press ${
              sort === s ? 'bg-gradient-to-r from-primary to-accent text-white shadow-glow-sm' : 'glass-card text-text-muted hover:text-text'
            }`}>{s.charAt(0).toUpperCase() + s.slice(1)}</motion.button>
        ))}
      </div>

      {postsData.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 glass-card rounded-2xl">
          <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
            <Users size={32} className="text-text-muted" />
          </div>
          <p className="text-text-muted text-lg mb-2 font-medium">Your feed is empty</p>
          <p className="text-text-subtle text-sm mb-6">Follow people to see their posts here</p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-gradient-to-r from-primary to-accent hover:bg-primary/80 text-white rounded-xl font-medium shadow-glow-sm card-press">Explore Users</motion.button>
        </motion.div>
      )}

      <div className="space-y-6">
        {postsData.map((post, index) => (
          <motion.div key={post._id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.5 }}>
            <Post post={post} onUpdate={handleUpdatePost} onDelete={handleDeletePost} />
          </motion.div>
        ))}
      </div>

      {loadingMore && (
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <motion.div key={`more-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PostSkeleton />
            </motion.div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
    </motion.div>
  )
}

export default Feed