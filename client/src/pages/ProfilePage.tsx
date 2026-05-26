import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { profiles, posts, User, Post as PostType } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { getAvatarSrc } from '../utils/format'
import Avatar from '../components/Avatar'
import { NumberTicker } from '@/components/ui/number-ticker'
import { MovingBorder } from '@/components/ui/moving-border'
import { Card3D } from '@/components/ui/3d-card'
import { Camera, Loader2 } from 'lucide-react'

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, updateUser } = useAuth()
  const { addToast } = useToast()
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [postCount, setPostCount] = useState(0)
  const [userPosts, setUserPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) { setLoading(false); return }
    const fetchProfile = async () => {
      try {
        const response = await profiles.get(user._id)
        setProfileUser(response.data)
        setBio(response.data.bio || '')
        setAvatar(response.data.avatar || '')
        const postRes = await posts.getByUser(user._id, 1, 12)
        setPostCount(postRes.data.total || 0)
        setUserPosts(postRes.data.posts || [])
      } catch {
        // Ignore profile errors
      } finally { setLoading(false) }
    }
    fetchProfile()
  }, [isAuthenticated, user])

  const handleUpdate = async () => {
    try {
      // Only send avatar via legacy update if it's a full URL (not a relative upload path)
      const avatarToSend = avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:'))
        ? avatar
        : undefined;
      const response = await profiles.update(bio, avatarToSend)
      setProfileUser(response.data)
      setEditing(false)
      addToast('Profile updated!', 'success')
      updateUser()
    } catch { addToast('Failed to update profile', 'error') }
  }

  const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

  const handleAvatarUpload = async (file: File) => {
    if (!file) return
    if (file.size > MAX_AVATAR_SIZE) {
      addToast('Image too large (max 5MB)', 'error')
      return
    }
    setUploadingAvatar(true)
    try {
      const res = await profiles.uploadAvatar(file)
      setProfileUser(res.data)
      setAvatar(res.data.avatar || '')
      addToast('Avatar updated', 'success')
      updateUser()
    } catch {
      addToast('Failed to upload avatar', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const MAX_COVER_SIZE = 5 * 1024 * 1024 // 5MB

  const handleCoverUpload = async (file: File) => {
    if (!file) return
    if (file.size > MAX_COVER_SIZE) {
      addToast('Image too large (max 5MB)', 'error')
      return
    }
    setUploadingCover(true)
    try {
      const res = await profiles.uploadCoverPhoto(file)
      setProfileUser(res.data)
      addToast('Cover photo updated', 'success')
      updateUser()
    } catch {
      addToast('Failed to upload cover photo', 'error')
    } finally {
      setUploadingCover(false)
    }
  }

  const triggerAvatarUpload = () => avatarInputRef.current?.click()
  const triggerCoverUpload = () => coverInputRef.current?.click()

  if (!isAuthenticated) return <div className="text-center text-text-muted py-12">Please login to view your profile.</div>
  if (loading) return (
    <div className="space-y-4 shimmer-skeleton">
      <div className="glass-card rounded-2xl p-8 h-48"></div>
    </div>
  )

  const coverSrc = getAvatarSrc(profileUser?.coverPhoto)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
      <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card overflow-hidden rounded-2xl" duration={3000} rx="20" ry="20">
        {/* Cover Photo - Facebook style editable */}
        <div className="relative group" onClick={triggerCoverUpload}>
          {coverSrc ? (
            <img src={coverSrc} alt="Profile cover photo" className="w-full h-48 object-cover rounded-t-2xl cursor-pointer" />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-primary/30 via-accent/20 to-pink-500/20 rounded-t-2xl cursor-pointer" />
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 rounded-xl text-white text-sm cursor-pointer">
              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera size={16} />}
              <span>Edit cover</span>
            </div>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleCoverUpload(file)
              e.target.value = ''
            }}
          />
        </div>

        {/* Avatar with edit button - Facebook style */}
        <div className="px-8 pt-0 -mt-12 relative z-10 flex items-end">
          <div className="relative inline-block group">
            <Avatar
              src={profileUser?.avatar}
              name={profileUser?.username || ''}
              size={96}
              className="border-4 border-card shadow-lg glow cursor-pointer"
              onClick={triggerAvatarUpload}
            />
            <button
              onClick={(e) => { e.stopPropagation(); triggerAvatarUpload() }}
              className="absolute bottom-1 right-1 p-2 bg-card border border-border rounded-full shadow hover:bg-surface transition-all"
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleAvatarUpload(file)
                e.target.value = ''
              }}
            />
          </div>
        </div>
        <div className="px-8 pt-5 pb-8">
          <div className="flex-1">
            {editing ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <textarea placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4}
                  className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none" />
                <div className="text-xs text-text-muted">Tip: Use the camera icon on your avatar/cover above for photo uploads (recommended over URL)</div>
                <div className="flex space-x-3">
                  <Card3D>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleUpdate}
                      className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press">Save</motion.button>
                  </Card3D>
                  <Card3D>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditing(false)}
                      className="px-6 py-2.5 glass-card rounded-xl font-medium text-text-muted card-press">Cancel</motion.button>
                  </Card3D>
                </div>
              </motion.div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold gradient-text">{profileUser?.username}</h2>
                <p className="text-text-secondary mt-2 text-[15px] leading-relaxed">{profileUser?.bio || 'No bio'}</p>
                <div className="flex space-x-8 mt-5">
                  <div className="text-center">
                    <NumberTicker value={postCount} className="text-3xl font-bold gradient-text" />
                    <span className="text-text-subtle text-xs mt-1 block">posts</span>
                  </div>
                  <div className="text-center">
                    <NumberTicker value={profileUser?.followers?.length || 0} className="text-3xl font-bold gradient-text" />
                    <span className="text-text-subtle text-xs mt-1 block">followers</span>
                  </div>
                  <div className="text-center">
                    <NumberTicker value={profileUser?.following?.length || 0} className="text-3xl font-bold gradient-text" />
                    <span className="text-text-subtle text-xs mt-1 block">following</span>
                  </div>
                </div>
                <Card3D containerClassName="mt-5">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setEditing(true)}
                    className="px-6 py-2.5 bg-primary/15 text-primary rounded-xl font-medium border border-primary/25 hover:bg-primary/25 transition-all glow-sm card-press">Edit Profile</motion.button>
                </Card3D>
              </div>
            )}
          </div>
        </div>
      </MovingBorder>

      {/* Posts Grid - Facebook style */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold gradient-text">Posts</h3>
          <span className="text-text-muted text-sm">{postCount} posts</span>
        </div>

        {userPosts.length === 0 ? (
          <div className="text-center py-10 text-text-muted">
            <p>No posts yet. Share your first moment!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {userPosts.map((post) => {
              const apiBase = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'
              const mediaSrc = post.video
                ? (post.video.startsWith('/') ? `${apiBase}${post.video}` : post.video)
                : post.image
                ? (post.image.startsWith('/') ? `${apiBase}${post.image}` : post.image)
                : null

              return (
                <div
                  key={post._id}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface border border-white/5 group cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
                  onClick={() => navigate(`/post/${post._id}`)}
                >
                  {mediaSrc ? (
                    post.video ? (
                      <video src={mediaSrc} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={mediaSrc} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" loading="lazy" />
                    )
                  ) : (
                    <div className="p-3 h-full flex items-center text-sm text-text-secondary line-clamp-6">
                      {post.content || post.title}
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="text-[11px] text-white/90 line-clamp-1">{post.title || post.content?.slice(0, 70)}</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 text-[10px] px-1.5 py-0.5 rounded text-white/80">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ProfilePage