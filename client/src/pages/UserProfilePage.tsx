import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { profiles, posts, User, Post as PostType, FriendRequest } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import Post from '../components/Post'
import Avatar from '../components/Avatar'
import { Shield, ShieldOff, BadgeCheck } from 'lucide-react'
import { NumberTicker } from '@/components/ui/number-ticker'
import { MovingBorder } from '@/components/ui/moving-border'
import { Card3D } from '@/components/ui/3d-card'
import { getErrorMessage } from '../utils/format'

const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser, isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [userPosts, setUserPosts] = useState<PostType[]>([])
  const [postCount, setPostCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedByMe, setBlockedByMe] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!id) return
    const fetchProfile = async () => {
      try {
        const res = await profiles.get(id)
        setProfileUser(res.data)
        setIsBlocked(res.data.isBlocked || false)
        setBlockedByMe(res.data.blockedByMe || false)
        if (currentUser) {
          setIsFollowing(res.data.followers.includes(currentUser._id))
          const existingRequest = await checkPendingRequest(id)
          setRequestSent(existingRequest)
        }
      } catch { addToast('Failed to load profile', 'error') } finally { setLoading(false) }
    }
    fetchProfile()
  }, [id, currentUser])

  const checkPendingRequest = async (targetId: string): Promise<boolean> => {
    try {
      const res = await profiles.getRequests()
      const requests = res.data
      return requests.some((r: FriendRequest) => r.from._id === currentUser?._id && r.to._id === targetId)
    } catch { return false }
  }

  const refreshPosts = async () => {
    if (!id || !isAuthenticated || isBlocked) return
    setPage(1)
    try {
      const res = await posts.getByUser(id, 1)
      const data = res.data
      setUserPosts(data.posts || [])
      setPostCount(data.total || 0)
    } catch { addToast('Failed to refresh posts', 'error') }
  }

  useEffect(() => {
    if (!id || !isAuthenticated || isBlocked) return
    const fetchPosts = async () => {
      try {
        const res = await posts.getByUser(id, page)
        const data = res.data
        if (page === 1) {
          setUserPosts(data.posts || [])
          setPostCount(data.total || 0)
        }
        else setUserPosts(prev => [...prev, ...(data.posts || [])])
      } catch { addToast('Failed to load posts', 'error') }
    }
    fetchPosts()
  }, [id, isAuthenticated, page, isBlocked])

  const handleFollow = async () => {
    if (!id) return
    try {
      await profiles.sendRequest(id)
      setRequestSent(true)
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      if (msg === 'Request already exists') setRequestSent(true)
      else addToast(msg, 'error')
    }
  }

  const handleUnfollow = async () => {
    if (!id) return
    try {
      await profiles.unfollow(id)
      setIsFollowing(false)
      if (profileUser) setProfileUser({ ...profileUser, followers: profileUser.followers.filter(f => f !== currentUser?._id) })
    } catch { addToast('Failed to unfollow', 'error') }
  }

  const handleBlock = async () => {
    if (!id) return
    try {
      await profiles.block(id)
      setIsBlocked(true)
      setBlockedByMe(true)
      setIsFollowing(false)
      setRequestSent(false)
      setUserPosts([])
      setPostCount(0)
      if (profileUser) setProfileUser({ ...profileUser, followers: profileUser.followers.filter(f => f !== currentUser?._id) })
    } catch { addToast('Failed to block user', 'error') }
  }

  const handleUnblock = async () => {
    if (!id) return
    try {
      await profiles.unblock(id)
      setIsBlocked(false)
      setBlockedByMe(false)
    } catch { addToast('Failed to unblock user', 'error') }
  }

  const handlePostUpdate = (updatedPost: PostType) => {
    setUserPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p))
    if (updatedPost.pinned !== undefined) {
      refreshPosts()
    }
  }

  const handlePostDelete = (postId: string) => {
    setUserPosts(prev => prev.filter(p => p._id !== postId))
    setPostCount(prev => prev - 1)
  }

  if (loading) return (
    <div className="space-y-4 shimmer-skeleton">
      <div className="glass-card rounded-2xl p-8 h-32"></div>
    </div>
  )

  if (!profileUser) return <div className="text-center text-text-muted py-12">User not found</div>

  if (isBlocked && !blockedByMe) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
      <div className="w-20 h-20 glass-card rounded-full flex items-center justify-center mx-auto mb-4">
        <Shield size={36} className="text-text-muted" />
      </div>
      <p className="text-text-muted text-lg font-medium">This user has blocked you</p>
      <p className="text-text-subtle text-sm mt-2">You cannot view their profile or interact with them</p>
    </motion.div>
  )

  const isSelf = currentUser?._id === id

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
      <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card overflow-hidden rounded-2xl p-8" duration={3000} rx="20" ry="20">
        <div className="flex items-start space-x-6">
          <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
            <Avatar src={profileUser.avatar} name={profileUser.username} size={80} className="glow" />
          </motion.div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold gradient-text">
              {profileUser.username}
              {profileUser.isVerified && <BadgeCheck size={18} className="text-blue-500 inline ml-1.5" />}
            </h2>
            <p className="text-text-secondary mt-2 text-[15px] leading-relaxed">{profileUser.bio || 'No bio'}</p>
            <div className="flex space-x-8 mt-5">
              <div className="text-center">
                <NumberTicker value={postCount} className="text-3xl font-bold gradient-text" />
                <span className="text-text-subtle text-xs mt-1 block">posts</span>
              </div>
              <div className="text-center">
                <NumberTicker value={profileUser.followers.length} className="text-3xl font-bold gradient-text" />
                <span className="text-text-subtle text-xs mt-1 block">followers</span>
              </div>
              <div className="text-center">
                <NumberTicker value={profileUser.following.length} className="text-3xl font-bold gradient-text" />
                <span className="text-text-subtle text-xs mt-1 block">following</span>
              </div>
            </div>
            {!isSelf && (
              <div className="flex items-center space-x-3 mt-5">
                {blockedByMe ? (
                  <Card3D>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleUnblock}
                      className="flex items-center space-x-2 px-6 py-2.5 bg-yellow-500/15 text-yellow-400 rounded-xl font-medium border border-yellow-500/25 hover:bg-yellow-500/25 transition-all glow-sm card-press">
                      <ShieldOff size={18} /><span>Unblock</span>
                    </motion.button>
                  </Card3D>
                ) : (
                  <>
                    {isFollowing ? (
                      <Card3D>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleUnfollow}
                          className="px-6 py-2.5 bg-red-500/15 text-red-400 rounded-xl font-medium border border-red-500/25 hover:bg-red-500/25 transition-all glow-red card-press">Unfollow</motion.button>
                      </Card3D>
                    ) : requestSent ? (
                      <span className="px-6 py-2.5 glass-card text-text-muted rounded-xl font-medium text-sm">Request Sent</span>
                    ) : (
                      <Card3D>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleFollow}
                          className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent hover:bg-primary/80 text-white rounded-xl font-medium shadow-glow-sm card-press transition-all">Follow</motion.button>
                      </Card3D>
                    )}
                    <Card3D>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleBlock}
                        className="flex items-center space-x-2 px-4 py-2.5 glass-card text-text-muted rounded-xl font-medium hover:bg-red-500/[0.08] hover:text-red-400 hover:border-red-500/25 transition-all card-press">
                        <Shield size={16} /><span>Block</span>
                      </motion.button>
                    </Card3D>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </MovingBorder>

      {!isBlocked && (
        <>
          <h3 className="text-xl font-bold gradient-text">Posts</h3>
          {userPosts.length > 0 ? (
            <div className="space-y-6">
              {userPosts.map((post, index) => (
                <motion.div key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.5 }}>
                  {post.pinned && (
                    <div className="flex items-center space-x-1 mb-1 px-1 text-primary text-xs font-medium">
                      <Shield size={12} className="fill-current" />
                      <span>Pinned</span>
                    </div>
                  )}
                  <Post post={post} onUpdate={handlePostUpdate} onDelete={handlePostDelete} />
                </motion.div>
              ))}
              {userPosts.length >= 10 * page && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setPage(page + 1)}
                  className="w-full py-3 glass-card text-text-muted rounded-xl font-medium card-press">Load More</motion.button>
              )}
            </div>
          ) : (
            <div className="text-center text-text-muted py-8 glass-card rounded-2xl">No posts yet</div>
          )}
        </>
      )}
    </motion.div>
  )
}

export default UserProfilePage