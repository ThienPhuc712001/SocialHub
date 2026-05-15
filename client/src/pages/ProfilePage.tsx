import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { profiles, posts, User } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { getAvatarSrc } from '../utils/format'
import Avatar from '../components/Avatar'
import { NumberTicker } from '@/components/ui/number-ticker'
import { MovingBorder } from '@/components/ui/moving-border'
import { Card3D } from '@/components/ui/3d-card'

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateUser } = useAuth()
  const { addToast } = useToast()
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [postCount, setPostCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) { setLoading(false); return }
    const fetchProfile = async () => {
      try {
        const response = await profiles.get(user._id)
        setProfileUser(response.data)
        setBio(response.data.bio || '')
        setAvatar(response.data.avatar || '')
        const postRes = await posts.getByUser(user._id, 1, 1)
        setPostCount(postRes.data.total || 0)
      } catch {
        // Ignore profile errors
      } finally { setLoading(false) }
    }
    fetchProfile()
  }, [isAuthenticated, user])

  const handleUpdate = async () => {
    try {
      const response = await profiles.update(bio, avatar)
      setProfileUser(response.data)
      setEditing(false)
      addToast('Profile updated!', 'success')
      updateUser()
    } catch { addToast('Failed to update profile', 'error') }
  }

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
        {coverSrc ? (
          <div className="relative">
            <img src={coverSrc} alt="Profile cover photo" className="w-full h-40 object-cover rounded-t-2xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-card/80 rounded-t-2xl" />
          </div>
        ) : (
          <div className="relative w-full h-40 bg-gradient-to-br from-primary/30 via-accent/20 to-pink-500/20 rounded-t-2xl overflow-hidden">
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/3 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 right-1/4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
          </div>
        )}
        <div className="px-8 pt-0 -mt-12 relative z-10">
          <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
            <Avatar
              src={profileUser?.avatar}
              name={profileUser?.username || ''}
              size={80}
              className="border-4 border-card shadow-lg glow"
            />
          </motion.div>
        </div>
        <div className="px-8 pt-5 pb-8">
          <div className="flex-1">
            {editing ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <textarea placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4}
                  className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none" />
                <input type="url" placeholder="Avatar URL" value={avatar} onChange={e => setAvatar(e.target.value)}
                  className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" />
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
    </motion.div>
  )
}

export default ProfilePage