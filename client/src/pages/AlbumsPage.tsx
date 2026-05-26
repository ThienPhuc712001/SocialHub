import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { albumService, Album } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Images, Plus, X, Trash2, ImagePlus } from 'lucide-react'
import { Sparkles } from '@/components/ui/sparkles'
import { MovingBorder } from '@/components/ui/moving-border'
import { NumberTicker } from '@/components/ui/number-ticker'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getErrorMessage } from '../utils/format'

const AlbumsPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [showAddImages, setShowAddImages] = useState(false)
  const createRef = useFocusTrap<HTMLDivElement>(showCreate)

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchAlbums = async () => {
      try {
        const res = await albumService.list()
        setAlbums(res.data.albums || [])
      } catch (err) {
        addToast(getErrorMessage(err), 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchAlbums()
  }, [isAuthenticated])

  const handleCreate = async () => {
    if (!albumTitle.trim()) return
    try {
      await albumService.create({ title: albumTitle.trim(), description: albumDescription.trim() })
      addToast('Album created!', 'success')
      setShowCreate(false)
      setAlbumTitle('')
      setAlbumDescription('')
      const res = await albumService.list()
      setAlbums(res.data.albums || [])
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const handleDeleteAlbum = async (id: string) => {
    try {
      await albumService.delete(id)
      addToast('Album deleted', 'success')
      setAlbums(prev => prev.filter(a => a._id !== id))
      if (selectedAlbum?._id === id) setSelectedAlbum(null)
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const handleAddImages = async (files: FileList) => {
    if (!selectedAlbum) return
    const imageUrls: string[] = []
    for (const file of Array.from(files)) {
      imageUrls.push(file.name)
    }
    try {
      await albumService.addImages(selectedAlbum._id, imageUrls)
      addToast('Images added!', 'success')
      setShowAddImages(false)
      const res = await albumService.get(selectedAlbum._id)
      setSelectedAlbum(res.data)
      const listRes = await albumService.list()
      setAlbums(listRes.data.albums || [])
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const handleRemoveImage = async (index: number) => {
    if (!selectedAlbum) return
    try {
      await albumService.removeImage(selectedAlbum._id, index)
      const res = await albumService.get(selectedAlbum._id)
      setSelectedAlbum(res.data)
    } catch (err) {
      addToast(getErrorMessage(err), 'error')
    }
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
          <h2 className="text-2xl font-bold gradient-text flex items-center space-x-2">
            <Images size={24} className="text-primary glow-sm" />
            <span>Albums</span>
          </h2>
          <span className="text-text-subtle text-sm">
            <NumberTicker value={albums.length} className="text-2xl font-bold gradient-text" /> albums
          </span>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowCreate(true)}
            className="p-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl shadow-glow-sm card-press">
            <Plus size={18} />
          </motion.button>
        </div>

        {albums.length === 0 && !loading && (
          <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card p-12 rounded-2xl text-center" duration={3000} rx="20" ry="20">
            <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
              <Images size={32} className="text-text-muted" />
            </div>
            <p className="text-text-muted text-lg mb-2 font-medium">No albums yet</p>
            <p className="text-text-subtle text-sm">Create an album to organize your photos</p>
          </MovingBorder>
        )}

        {!selectedAlbum ? (
          <div className="grid grid-cols-2 gap-4">
            {albums.map((album, index) => (
              <motion.div
                key={album._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  albumService.get(album._id).then(res => setSelectedAlbum(res.data)).catch(() => addToast('Failed to load album', 'error'))
                }}
                className="glass-card rounded-2xl overflow-hidden cursor-pointer hover-lift card-press group"
              >
                <div className="h-32 bg-gradient-to-br from-primary/20 via-surface to-accent/20 flex items-center justify-center">
                  {album.coverImage ? (
                    <img src={album.coverImage} alt={album.title} className="w-full h-full object-cover" />
                  ) : album.images[0] ? (
                    <img src={album.images[0]} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <Images size={32} className="text-text-muted opacity-50" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-text font-semibold text-sm truncate">{album.title}</h3>
                  <p className="text-text-subtle text-xs">{album.images.length} photos</p>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album._id) }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity card-press"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedAlbum(null)}
                className="px-3 py-1.5 glass-card text-text-muted rounded-xl text-sm card-press">Back to Albums</motion.button>
              <h3 className="text-lg font-bold gradient-text">{selectedAlbum.title}</h3>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowAddImages(true)}
                className="p-2 bg-primary/15 text-primary rounded-xl card-press">
                <ImagePlus size={16} />
              </motion.button>
            </div>
            {selectedAlbum.description && (
              <p className="text-text-muted text-sm">{selectedAlbum.description}</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              {selectedAlbum.images.map((img, idx) => (
                <motion.div
                  key={`${img}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative glass-card rounded-xl overflow-hidden group"
                >
                  <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-32 object-cover" loading="lazy" />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity card-press"
                  >
                    <X size={12} />
                  </motion.button>
                </motion.div>
              ))}
              {selectedAlbum.images.length === 0 && (
                <div className="col-span-3 text-center py-12">
                  <Images size={32} className="text-text-muted opacity-50 mx-auto mb-3" />
                  <p className="text-text-muted">No photos in this album</p>
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 glass-heavy flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
              <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 30, opacity: 0 }}
                ref={createRef}
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label="Create album"
                className="glass-heavy bg-surface/90 rounded-2xl p-6 border border-border/20 w-full max-w-md shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
                <h3 className="text-xl font-bold gradient-text mb-4">Create Album</h3>
                <input type="text" placeholder="Album title" value={albumTitle} onChange={e => setAlbumTitle(e.target.value)}
                  className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted mb-3" />
                <textarea placeholder="Description (optional)" value={albumDescription} onChange={e => setAlbumDescription(e.target.value)} rows={3}
                  className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none mb-4" />
                <div className="flex justify-end space-x-3">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setShowCreate(false); setAlbumTitle(''); setAlbumDescription('') }}
                    className="px-4 py-2 glass-card text-text-muted rounded-xl card-press">Cancel</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={!albumTitle.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 card-press">Create</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAddImages && selectedAlbum && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 glass-heavy flex items-center justify-center z-50 p-4" onClick={() => setShowAddImages(false)}>
              <motion.div initial={{ scale: 0.85, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, y: 30, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="glass-heavy bg-surface/90 rounded-2xl p-6 border border-border/20 w-full max-w-md shadow-[0_25px_70px_rgba(0,0,0,0.5)]">
                <h3 className="text-xl font-bold gradient-text mb-4">Add Photos</h3>
                <label className="flex items-center space-x-2 px-4 py-3 glass-card rounded-xl cursor-pointer hover:bg-surface/40 transition-all card-press">
                  <ImagePlus size={18} className="text-text-muted" />
                  <span className="text-text-muted text-sm">Select images</span>
                  <input type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) handleAddImages(e.target.files) }} className="hidden" />
                </label>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddImages(false)}
                  className="px-4 py-2 glass-card text-text-muted rounded-xl card-press mt-4 w-full">Cancel</motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default AlbumsPage