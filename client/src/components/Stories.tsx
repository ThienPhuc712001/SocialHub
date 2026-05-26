import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import { storyService, highlightService, Story, StoryHighlight, User } from '../services/api'
import Avatar from './Avatar'
import { Plus, X, ImagePlus, ChevronLeft, ChevronRight, Eye, BookmarkPlus, Check } from 'lucide-react'
import { formatRelativeTime } from '../utils/format'
import { compressMediaFile, shouldCompress } from '../utils/compression'
import { useFocusTrap } from '../hooks/useFocusTrap'
import HighlightViewer from './HighlightViewer'

interface StoryGroup {
  author: { _id: string; username: string; avatar?: string }
  stories: Story[]
}

const Stories: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const { socket } = useSocket()
  const { addToast } = useToast()
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null)
  const [viewingIndex, setViewingIndex] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const [viewersList, setViewersList] = useState<User[]>([])
  const [viewerCount, setViewerCount] = useState(0)
  const [highlights, setHighlights] = useState<StoryHighlight[]>([])
  const [viewingHighlight, setViewingHighlight] = useState<StoryHighlight | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [showCreateHighlight, setShowCreateHighlight] = useState(false)
  const [highlightName, setHighlightName] = useState('')
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([])
  const [ownStories, setOwnStories] = useState<Story[]>([])
  const [compressingImage, setCompressingImage] = useState(false)
  const storyViewerRef = useFocusTrap<HTMLDivElement>(!!(viewingGroup || viewingHighlight))
  const createStoryRef = useFocusTrap<HTMLDivElement>(showCreate)
  const createHighlightRef = useFocusTrap<HTMLDivElement>(showCreateHighlight)


  useEffect(() => {
    if (!isAuthenticated) return
    const fetchStories = async () => {
      try { const res = await storyService.get(); setStoryGroups(res.data.groups || []) } catch {
        // Ignore story fetch errors
      }
    }
    fetchStories()
    if (socket) {
      socket.on('newStory', () => fetchStories())
      return () => { socket.off('newStory') }
    }
  }, [isAuthenticated, socket])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const fetchHighlights = async () => {
      try { const res = await highlightService.getByUser(user._id); setHighlights(res.data) } catch {
        // Ignore highlight fetch errors
      }
    }
    fetchHighlights()
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const foundOwnGroup = storyGroups.find(g => g.author._id === user._id)
    setOwnStories(foundOwnGroup ? foundOwnGroup.stories : [])
  }, [storyGroups, user])

  const handleImageChange = async (file: File | null) => {
    if (file) {
      try {
        // Show compression indicator for large files
        if (shouldCompress(file, 200)) {
          setCompressingImage(true)
          addToast('Compressing image...', 'info')

          const compressedFile = await compressMediaFile(file, 'story')
          const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1)

          if (compressionRatio !== '0.0') {
            addToast(`Image compressed! Saved ${compressionRatio}%`, 'success')
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

  const handleCreate = async () => {
    try {
      if (image) {
        const formData = new FormData()
        if (content) formData.append('content', content)
        formData.append('image', image)
        await storyService.create(formData)
      } else if (content) {
        await storyService.create({ content })
      }
      addToast('Story created!', 'success')
      setShowCreate(false); setContent(''); setImage(null); setImagePreview(null)
      const res = await storyService.get(); setStoryGroups(res.data.groups || [])
    } catch { addToast('Failed to create story', 'error') }
  }

  const openViewer = (group: StoryGroup, index: number) => {
    setViewingGroup(group)
    setViewingIndex(index)
    setViewingHighlight(null)
    setHighlightIndex(0)
    setShowViewers(false)
    setViewersList([])
    const story = group.stories[index]
    storyService.view(story._id).then(res => {
      setViewerCount(res.data.viewerCount)
    }).catch(() => {})
  }

  const closeViewer = () => {
    setViewingGroup(null); setViewingIndex(0)
    setViewingHighlight(null); setHighlightIndex(0)
    setShowViewers(false); setViewersList([])
  }

  const openHighlightViewer = (highlight: StoryHighlight, index: number) => {
    setViewingHighlight(highlight)
    setHighlightIndex(index)
    setViewingGroup(null)
    setViewingIndex(0)
    setShowViewers(false)
    setViewersList([])
  }

  const closeHighlightViewer = () => {
    setViewingHighlight(null)
    setHighlightIndex(0)
  }

  const nextStory = () => {
    if (viewingGroup) {
      if (viewingIndex < viewingGroup.stories.length - 1) {
        const newIndex = viewingIndex + 1
        setViewingIndex(newIndex)
        setShowViewers(false)
        setViewersList([])
        const story = viewingGroup.stories[newIndex]
        storyService.view(story._id).then(res => {
          setViewerCount(res.data.viewerCount)
        }).catch(() => {})
      } else closeViewer()
    } else if (viewingHighlight) {
      if (highlightIndex < viewingHighlight.stories.length - 1) {
        setHighlightIndex(highlightIndex + 1)
        setShowViewers(false)
        setViewersList([])
      } else closeViewer()
    }
  }

  const prevStory = () => {
    if (viewingGroup && viewingIndex > 0) {
      const newIndex = viewingIndex - 1
      setViewingIndex(newIndex)
      setShowViewers(false)
      setViewersList([])
      const story = viewingGroup!.stories[newIndex]
      storyService.view(story._id).then(res => {
        setViewerCount(res.data.viewerCount)
      }).catch(() => {})
    } else if (viewingHighlight && highlightIndex > 0) {
      setHighlightIndex(highlightIndex - 1)
      setShowViewers(false)
      setViewersList([])
    }
  }

  const handleShowViewers = async () => {
    if (!currentStory) return
    try {
      const res = await storyService.getViewers(currentStory._id)
      setViewersList(res.data.viewers)
      setViewerCount(res.data.viewerCount)
      setShowViewers(true)
    } catch {
      // Ignore highlight creation errors
    }
  }

  const toggleStorySelection = (storyId: string) => {
    setSelectedStoryIds(prev =>
      prev.includes(storyId) ? prev.filter(id => id !== storyId) : [...prev, storyId]
    )
  }

  const handleCreateHighlight = async () => {
    if (!highlightName.trim() || selectedStoryIds.length === 0) return
    try {
      await highlightService.create(highlightName.trim(), selectedStoryIds)
      addToast('Highlight created!', 'success')
      setShowCreateHighlight(false)
      setHighlightName('')
      setSelectedStoryIds([])
      if (user) {
        const res = await highlightService.getByUser(user._id)
        setHighlights(res.data)
      }
    } catch { addToast('Failed to create highlight', 'error') }
  }

  const currentStory = viewingGroup
    ? viewingGroup.stories[viewingIndex]
    : viewingHighlight
      ? viewingHighlight.stories[highlightIndex]
      : null

  const progress = viewingGroup
    ? ((viewingIndex + 1) / viewingGroup.stories.length) * 100
    : viewingHighlight
      ? ((highlightIndex + 1) / viewingHighlight.stories.length) * 100
      : 0

  const isOwnStory = user && viewingGroup && user._id === viewingGroup.author._id

  const viewerAuthor = viewingGroup?.author || (viewingHighlight ? { _id: viewingHighlight.author, username: viewingHighlight.name, avatar: undefined } : null)

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50
    const velocityThreshold = 500

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      if (info.offset.x > 0) {
        // Swipe right - previous story
        prevStory()
      } else {
        // Swipe left - next story
        nextStory()
      }
    }
  }

  useEffect(() => {
    if (viewingGroup || viewingHighlight) {
      const timer = setTimeout(nextStory, 5000)
      return () => clearTimeout(timer)
    }
  }, [viewingGroup, viewingIndex, viewingHighlight, highlightIndex])

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 mb-6 hover-lift">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold gradient-text">Stories</h3>
          {isAuthenticated && (
            <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
              onClick={() => setShowCreate(true)}
              className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-all card-press">
              <Plus size={18} />
            </motion.button>
          )}
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none">
          {isAuthenticated && (
            <motion.div whileHover={{ scale: 1.05 }} onClick={() => setShowCreate(true)} className="flex-shrink-0 cursor-pointer">
              <div className="w-16 h-16 rounded-full glass-card border-2 border-dashed border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all card-press">
                <Plus size={20} className="text-text-muted" />
              </div>
              <p className="text-center text-xs text-text-muted mt-2">Your Story</p>
            </motion.div>
          )}
          {storyGroups.map((group) => (
            <motion.div key={group.author._id} whileHover={{ scale: 1.05 }} onClick={() => openViewer(group, 0)} className="flex-shrink-0 cursor-pointer card-press">
              <div className="relative">
                <Avatar src={group.author.avatar} name={group.author.username} size={64} className="ring-2 ring-primary ring-offset-2 ring-offset-card" showPulse />
              </div>
              <p className="text-center text-xs text-text-muted mt-2 truncate max-w-[64px]">{group.author.username}</p>
            </motion.div>
          ))}
          {storyGroups.length === 0 && !isAuthenticated && (
            <p className="text-text-muted text-sm py-4">No stories yet</p>
          )}
        </div>

        {isAuthenticated && user && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold gradient-text">Highlights</h4>
              {ownStories.length > 0 && (
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => setShowCreateHighlight(true)}
                  className="p-1.5 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-all card-press">
                  <BookmarkPlus size={16} />
                </motion.button>
              )}
            </div>
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none">
              {highlights.length === 0 && ownStories.length > 0 && (
                <motion.div whileHover={{ scale: 1.05 }} onClick={() => setShowCreateHighlight(true)} className="flex-shrink-0 cursor-pointer card-press">
                  <div className="w-16 h-16 rounded-full glass-card border-2 border-dashed border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <BookmarkPlus size={20} className="text-text-muted" />
                  </div>
                  <p className="text-center text-xs text-text-muted mt-2">New</p>
                </motion.div>
              )}
              {highlights.map((hl) => (
                <motion.div key={hl._id} whileHover={{ scale: 1.05 }} onClick={() => openHighlightViewer(hl, 0)} className="flex-shrink-0 cursor-pointer card-press">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-pink-500 p-0.5">
                    <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                      {hl.coverImage ? (
                        <img src={hl.coverImage.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${hl.coverImage}` : hl.coverImage} alt={`Cover image for ${hl.name} highlight`} className="w-full h-full object-cover" loading="lazy" />
                      ) : hl.stories[0]?.image ? (
                        <img src={hl.stories[0].image.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${hl.stories[0].image}` : hl.stories[0].image} alt={`Story from ${hl.name} highlight`} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-text font-semibold text-sm">{hl.name[0].toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-xs text-text-muted mt-2 truncate max-w-[64px]">{hl.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 glass-heavy flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              ref={createStoryRef}
              role="dialog" aria-modal="true" aria-label="Create story"
              className="glass-heavy bg-surface/90 rounded-2xl p-6 border border-border/20 w-full max-w-md shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
              <h3 className="text-xl font-bold gradient-text mb-4">Create Story</h3>
              <textarea placeholder="Story content..." value={content} onChange={e => setContent(e.target.value)} maxLength={500} rows={3}
                className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none mb-4" />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden mb-4">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleImageChange(null)} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70 card-press"><X size={16} /></motion.button>
                </div>
              ) : (
                <label className="flex items-center space-x-2 px-4 py-2 glass-card rounded-xl cursor-pointer hover:bg-surface/40 transition-all card-press mb-4">
                  <ImagePlus size={18} className="text-text-muted" /><span className="text-text-muted text-sm">Add Image</span>
                  <input type="file" accept="image/*" onChange={e => handleImageChange(e.target.files?.[0] || null)} className="hidden" />
                </label>
              )}
              <div className="flex justify-end space-x-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowCreate(false)} className="px-4 py-2 glass-card text-text-muted rounded-xl card-press">Cancel</motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={compressingImage}
                  className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 card-press">
                  {compressingImage ? 'Compressing...' : 'Create'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateHighlight && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 glass-heavy flex items-center justify-center z-50 p-4" onClick={() => { setShowCreateHighlight(false); setHighlightName(''); setSelectedStoryIds([]) }}>
            <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              ref={createHighlightRef}
              role="dialog" aria-modal="true" aria-label="Create highlight"
              className="glass-heavy bg-surface/90 rounded-2xl p-6 border border-border/20 w-full max-w-md shadow-[0_25px_70px_rgba(0,0,0,0.5)] max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold gradient-text mb-4">Create Highlight</h3>
              <input type="text" placeholder="Highlight name..." value={highlightName} onChange={e => setHighlightName(e.target.value)} maxLength={30}
                className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted mb-4" />
              {ownStories.length === 0 ? (
                <p className="text-text-muted text-sm mb-4">You have no stories to highlight. Create a story first!</p>
              ) : (
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-text-muted mb-2">Select stories to include:</p>
                  {ownStories.map(story => (
                    <motion.div key={story._id} whileHover={{ scale: 1.02 }}
                      onClick={() => toggleStorySelection(story._id)}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl cursor-pointer transition-all card-press ${selectedStoryIds.includes(story._id) ? 'bg-primary/10 border border-primary/30 glow-sm' : 'glass-card'}`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedStoryIds.includes(story._id) ? 'bg-primary border-primary' : 'border-border'}`}>
                        {selectedStoryIds.includes(story._id) && <Check size={14} className="text-white" />}
                      </div>
                      {story.image && (
                        <img src={story.image.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${story.image}` : story.image} alt={`Story by ${story.author.username}`} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                      )}
                      <span className="text-sm text-text truncate">{story.content || 'Image story'}</span>
                    </motion.div>
                  ))}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setShowCreateHighlight(false); setHighlightName(''); setSelectedStoryIds([]) }} className="px-4 py-2 glass-card text-text-muted rounded-xl card-press">Cancel</motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCreateHighlight}
                  disabled={!highlightName.trim() || selectedStoryIds.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed card-press">Create</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(viewingGroup || viewingHighlight) && currentStory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={closeViewer}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              onClick={e => e.stopPropagation()}
              ref={storyViewerRef}
              role="dialog" aria-modal="true" aria-label="Story viewer"
              className="relative w-full max-w-lg h-[85vh] glass-card rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing touch-none">
              <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/40 via-black/20 to-transparent">
                <div className="flex space-x-1 mb-3">
                  {((viewingGroup || viewingHighlight)?.stories || []).map((_, idx) => (
                    <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white rounded-full"
                        initial={{ width: '0%' }}
                        animate={{
                          width: viewingGroup
                            ? (idx < viewingIndex ? '100%' : idx === viewingIndex ? `${(progress % 100)}%` : '0%')
                            : viewingHighlight
                              ? (idx < highlightIndex ? '100%' : idx === highlightIndex ? `${(progress % 100)}%` : '0%')
                              : '0%'
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-3">
                  <Avatar src={viewerAuthor?.avatar} name={viewerAuthor?.username || ''} size={36} />
                  <div>
                    <span className="text-white font-semibold text-sm">{viewerAuthor?.username}</span>
                    {currentStory.createdAt && <span className="text-white/50 text-xs ml-2">{formatRelativeTime(currentStory.createdAt)}</span>}
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={closeViewer} className="ml-auto p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl card-press"><X size={20} /></motion.button>
                </div>
              </div>
              {currentStory.image && (
                <img src={currentStory.image.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${currentStory.image}` : currentStory.image}
                  alt={`Story by ${viewerAuthor?.username || 'user'}`} className="w-full h-full object-cover" />
              )}
              {currentStory.content && !currentStory.image && (
                <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-primary/10 via-surface to-accent/10">
                  <p className="text-white text-xl text-center font-medium leading-relaxed">{currentStory.content}</p>
                </div>
              )}
              {currentStory.content && currentStory.image && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                  <p className="text-white text-sm">{currentStory.content}</p>
                </div>
              )}
              {isOwnStory && (
                <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-white/70 text-sm glass-card rounded-lg px-2 py-1">
                    <Eye size={16} />
                    <span>{viewerCount}</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleShowViewers}
                    className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-white text-sm backdrop-blur-sm card-press">
                    Viewers
                  </motion.button>
                </div>
              )}
              <AnimatePresence>
                {showViewers && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-12 left-4 z-30 w-64 glass-heavy bg-surface/90 rounded-xl border border-border/20 shadow-lg p-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{viewerCount} viewers</span>
                      <button onClick={() => setShowViewers(false)} className="p-1 text-white/60 hover:text-white card-press"><X size={14} /></button>
                    </div>
                    {viewersList.length === 0 && (
                      <p className="text-text-subtle text-sm">No viewers yet</p>
                    )}
                    {viewersList.map(v => (
                      <div key={v._id} className="flex items-center space-x-2 py-1.5">
                        <Avatar src={v.avatar} name={v.username} size={24} />
                        <span className="text-white text-sm">{v.username}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {(viewingGroup && viewingIndex > 0) || (viewingHighlight && highlightIndex > 0) ? (
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prevStory} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white z-10 card-press"><ChevronLeft size={24} /></motion.button>
              ) : null}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={nextStory} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white z-10 card-press"><ChevronRight size={24} /></motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlight Viewer */}
      {viewingHighlight && (
        <HighlightViewer
          highlight={viewingHighlight}
          isOpen={!!viewingHighlight}
          onClose={closeHighlightViewer}
          onUpdate={() => {
            if (user) {
              highlightService.getByUser(user._id).then(res => setHighlights(res.data))
            }
          }}
        />
      )}
    </>
  )
}

export default Stories