import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Users as UsersIcon, Hash, TrendingUp, UserPlus, X } from 'lucide-react'
import { profiles, posts, hashtagService, User, Post as PostType, HashtagFollow } from '../services/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/Avatar'
import Post from '../components/Post'
import { getErrorMessage, getEnhancedErrorDetails } from '../utils/format'
import { Marquee } from '@/components/ui/marquee'
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { Sparkles } from '@/components/ui/sparkles'
import { Skeleton, UserSkeleton } from '@/components/ui/skeleton'

interface TrendingHashtag {
  tag: string
  count: number
}

const ExplorePage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'users' | 'posts' | 'hashtags'>('users')
  const [userResults, setUserResults] = useState<User[]>([])
  const [postResults, setPostResults] = useState<PostType[]>([])
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<User[] | PostType[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([])
  const [followedHashtags, setFollowedHashtags] = useState<string[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [recommendedPosts, setRecommendedPosts] = useState<PostType[]>([])
  const [trendingTopics, setTrendingTopics] = useState<Array<{ topic: string; posts: number; trend: 'up' | 'down' | 'stable' }>>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(true)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: 'all',
    location: '',
    sortBy: 'relevance'
  })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addToast } = useToast()
  const { user: currentUser } = useAuth()
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await hashtagService.getTrending()
        setTrendingHashtags(res.data || [])
      } catch {
        setTrendingHashtags([])
      } finally {
        setLoadingTrending(false)
      }
    }
    const fetchFollowed = async () => {
      try {
        const res = await hashtagService.getFollowed()
        setFollowedHashtags((res.data || []).map((f: HashtagFollow) => f.hashtag))
      } catch {
        setFollowedHashtags([])
      }
    }
    const fetchSuggestions = async () => {
      try {
        const res = await posts.getSuggestions()
        setSuggestedUsers(res.data?.users || [])
      } catch {
        setSuggestedUsers([])
      } finally {
        setLoadingSuggestions(false)
      }
    }

    const fetchRecommendations = async () => {
      try {
        // Simulate algorithmic recommendations based on user interests
        const res = await posts.getTimeline(1, 6) // Get recent posts as recommendations
        setRecommendedPosts(res.data.posts?.slice(0, 6) || [])

        // Simulate trending topics with trend indicators
        setTrendingTopics([
          { topic: 'Technology', posts: 1250, trend: 'up' },
          { topic: 'Photography', posts: 890, trend: 'up' },
          { topic: 'Travel', posts: 654, trend: 'stable' },
          { topic: 'Food', posts: 432, trend: 'down' },
          { topic: 'Fitness', posts: 321, trend: 'up' }
        ])
      } catch {
        setRecommendedPosts([])
        setTrendingTopics([])
      } finally {
        setLoadingRecommendations(false)
      }
    }

    fetchTrending()
    fetchFollowed()
    fetchSuggestions()
    fetchRecommendations()
  }, [])

  const searchParamsTag = searchParams.get('tag')

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        if (searchType === 'users') {
          const res = await profiles.search(query, 1, 5)
          setSuggestions(res.data.users || [])
        } else if (searchType === 'posts') {
          const res = await posts.search(query, 1, 5)
          setSuggestions(res.data.posts || [])
        } else {
          const tag = query.startsWith('#') ? query.substring(1) : query
          const res = await posts.getByHashtag(tag, 1, 5)
          setSuggestions(res.data.posts || [])
        }
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, searchType])

  const handleHashtagSearch = useCallback(async (tag: string) => {
    setSearching(true)
    try {
      const res = await posts.getByHashtag(tag)
      const data = res.data
      setPostResults(data.posts || [])
      setUserResults([])
    } catch (err: unknown) {
      const errorDetails = getEnhancedErrorDetails(err)
      addToast(errorDetails.message, 'error')
    }
    finally { setSearching(false) }
  }, [addToast])

  useEffect(() => {
    if (searchParamsTag) {
      setQuery(`#${searchParamsTag}`)
      setSearchType('hashtags')
      handleHashtagSearch(searchParamsTag)
    }
  }, [searchParamsTag, handleHashtagSearch])

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return
    setShowSuggestions(false)
    setSearching(true)
    try {
      if (searchType === 'users') {
        const res = await profiles.search(query)
        const data = res.data
        setUserResults(data.users || [])
        setPostResults([])
      } else if (searchType === 'posts') {
        const res = await posts.search(query)
        const data = res.data
        setPostResults(data.posts || [])
        setUserResults([])
      } else if (searchType === 'hashtags') {
        const tag = query.startsWith('#') ? query.substring(1) : query
        handleHashtagSearch(tag)
      }
    } catch (err: unknown) {
      const errorDetails = getEnhancedErrorDetails(err)
      addToast(errorDetails.message, 'error')
    }
    finally { setSearching(false) }
  }, [query, searchType, handleHashtagSearch, addToast])

  const handleFollow = async (userId: string) => {
    try {
      await profiles.sendRequest(userId)
      addToast('Request sent!', 'success')
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const handleFollowHashtag = async (tag: string) => {
    try {
      await hashtagService.follow(tag)
      setFollowedHashtags(prev => [...prev, tag])
      addToast(`Following #${tag}`, 'success')
    } catch {
      addToast('Failed to follow hashtag', 'error')
    }
  }

  const handleUnfollowHashtag = async (tag: string) => {
    try {
      await hashtagService.unfollow(tag)
      setFollowedHashtags(prev => prev.filter(t => t !== tag))
      addToast(`Unfollowed #${tag}`, 'success')
    } catch {
      addToast('Failed to unfollow hashtag', 'error')
    }
  }

  const isFollowing = (targetUser: User): boolean => {
    return targetUser.followers?.includes(currentUser?._id || '') || false
  }

  const getMutualFriendsCount = (targetUser: User): number => {
    if (!currentUser?.following || !targetUser.following) return 0
    return currentUser.following.filter(id => targetUser.following.includes(id)).length
  }

  const handleTrendingClick = (tag: string) => {
    setQuery(`#${tag}`)
    setSearchType('hashtags')
    handleHashtagSearch(tag)
  }

  const handleSuggestionClick = useCallback((suggestion: User | PostType) => {
    if (searchType === 'users') {
      const u = suggestion as User
      setQuery(u.username)
      setShowSuggestions(false)
      handleSearch()
    } else if (searchType === 'posts') {
      const p = suggestion as PostType
      setQuery(p.content.substring(0, 50))
      setShowSuggestions(false)
      handleSearch()
    } else {
      const p = suggestion as PostType
      if (p.hashtags && p.hashtags.length > 0) {
        setQuery(`#${p.hashtags[0]}`)
      }
      setShowSuggestions(false)
      handleSearch()
    }
  }, [searchType, handleSearch])

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null
    return (
      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 right-12 mt-2 glass-card rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
        {searchType === 'users' && (suggestions as User[]).map(u => (
          <div key={u._id} onClick={() => handleSuggestionClick(u)}
            className="flex items-center space-x-3 px-4 py-4 hover:bg-primary/10 cursor-pointer transition-all border-b border-border/10 last:border-b-0 card-press min-h-[60px] touch-manipulation">
            <Avatar src={u.avatar} name={u.username} size={36} />
            <div className="flex-1">
              <span className="text-text font-medium text-sm">{u.username}</span>
              {u.bio && <span className="text-text-subtle text-xs ml-2 block mt-1">{u.bio.substring(0, 30)}</span>}
            </div>
          </div>
        ))}
        {searchType === 'posts' && (suggestions as PostType[]).map(p => (
          <div key={p._id} onClick={() => handleSuggestionClick(p)}
            className="flex items-center space-x-3 px-4 py-4 hover:bg-primary/10 cursor-pointer transition-all border-b border-border/10 last:border-b-0 card-press min-h-[60px] touch-manipulation">
            <FileText size={18} className="text-text-muted flex-shrink-0" />
            <div className="flex-1">
              <span className="text-text font-medium text-sm">{p.title || p.content.substring(0, 40)}</span>
              <span className="text-text-subtle text-xs ml-2 block mt-1">by {p.author.username}</span>
            </div>
          </div>
        ))}
        {searchType === 'hashtags' && (suggestions as PostType[]).map(p => (
          <div key={p._id} onClick={() => handleSuggestionClick(p)}
            className="flex items-center space-x-3 px-4 py-4 hover:bg-primary/10 cursor-pointer transition-all border-b border-border/10 last:border-b-0 card-press min-h-[60px] touch-manipulation">
            <Hash size={18} className="text-primary flex-shrink-0" />
            <div className="flex-1">
              {p.hashtags && p.hashtags.length > 0 && (
                <span className="text-primary font-medium text-sm block">{p.hashtags.map(h => `#${h}`).join(' ')}</span>
              )}
              <span className="text-text-subtle text-xs block mt-1">{p.content.substring(0, 30)}</span>
            </div>
          </div>
        ))}
      </motion.div>
    )
  }

  const renderTrending = () => {
    if (loadingTrending) return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={100} />
        </div>
        <div className="flex space-x-4 overflow-x-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" width={120} height={48} className="rounded-2xl flex-shrink-0" />
          ))}
        </div>
      </div>
    )
    if (trendingHashtags.length === 0) return null
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-primary/15 rounded-lg"><TrendingUp size={18} className="text-primary" /></div>
          <h3 className="text-lg font-semibold text-text">Trending</h3>
        </div>
        <Marquee pauseOnHover className="[--duration:15s]">
          {trendingHashtags.map(({ tag, count }) => (
            <motion.button
              key={tag}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTrendingClick(tag)}
              className="group relative px-5 py-3 bg-gradient-to-br from-primary/8 to-accent/8 glass-card rounded-2xl hover:from-primary/15 hover:to-accent/15 transition-all cursor-pointer card-press"
            >
              <div className="flex items-center space-x-2">
                <Hash size={16} className="text-primary" />
                <span className="text-primary font-semibold">{tag}</span>
                <span className="text-text-subtle text-xs">{count} posts</span>
              </div>
              {followedHashtags.includes(tag) ? (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={(e) => { e.stopPropagation(); handleUnfollowHashtag(tag) }}
                  className="absolute -top-1 -right-1 w-5 h-5 glass-card rounded-full flex items-center justify-center hover:bg-red-500/15 card-press"
                >
                  <X size={12} className="text-text-muted" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={(e) => { e.stopPropagation(); handleFollowHashtag(tag) }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center shadow-glow-sm card-press"
                >
                  <UserPlus size={10} className="text-white" />
                </motion.button>
              )}
            </motion.button>
          ))}
        </Marquee>
      </div>
    )
  }

  const renderFriendSuggestions = () => {
    if (loadingSuggestions) return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={140} />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <UserSkeleton key={i} />
          ))}
        </div>
      </div>
    )
    if (suggestedUsers.length === 0) return null
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-accent/15 rounded-lg"><UsersIcon size={18} className="text-accent" /></div>
          <h3 className="text-lg font-semibold text-text">People You May Know</h3>
        </div>
        <div className="space-y-2">
          {suggestedUsers.map(u => {
            const mutualCount = getMutualFriendsCount(u)
            return (
              <motion.div
                key={u._id}
                whileHover={{ scale: 1.01 }}
                className="flex items-center space-x-3 p-3 glass-card rounded-xl hover-lift card-press"
              >
                <Avatar
                  src={u.avatar}
                  name={u.username}
                  size={44}
                  onClick={() => navigate(`/profile/${u._id}`)}
                />
                <div className="flex-1 min-w-0">
                  <h4
                    className="text-text font-semibold cursor-pointer hover:text-primary transition-colors truncate text-sm"
                    onClick={() => navigate(`/profile/${u._id}`)}
                  >
                    {u.username}
                  </h4>
                  {u.bio && (
                    <p className="text-text-subtle text-xs truncate">{u.bio.substring(0, 40)}</p>
                  )}
                  {mutualCount > 0 && (
                    <span className="text-primary text-xs font-medium glow-sm">{mutualCount} mutual friends</span>
                  )}
                </div>
                {currentUser && u._id !== currentUser._id && !isFollowing(u) && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFollow(u._id)}
                    className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium text-sm shadow-glow-sm card-press"
                  >
                    Follow
                  </motion.button>
                )}
                {currentUser && u._id !== currentUser._id && isFollowing(u) && (
                  <span className="px-3 py-1.5 glass-card text-text-muted rounded-xl font-medium text-sm">Following</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  const isHashtagFollowed = (tag: string): boolean => {
    return followedHashtags.includes(tag.toLowerCase())
  }

  const renderRecommendations = () => {
    if (loadingRecommendations) return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={160} />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" width="100%" height={200} className="rounded-2xl" />
          ))}
        </div>
      </div>
    )

    if (recommendedPosts.length === 0) return null

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-pink-500/15 rounded-lg">
            <Sparkles size={18} className="text-pink-500" />
          </div>
          <h3 className="text-lg font-semibold gradient-text">Recommended for You</h3>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedPosts.map((post, index) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => navigate(`/profile/${post.author._id}`)}
              className="glass-card rounded-2xl overflow-hidden cursor-pointer hover-lift"
            >
              {post.image && (
                <div className="aspect-square overflow-hidden">
                  <img
                    src={post.image.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${post.image}` : post.image}
                    alt={`Post by ${post.author.username}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
                <p className="text-text font-medium text-sm line-clamp-2 mb-2">
                  {post.content || post.title}
                </p>
                <div className="flex items-center space-x-2">
                  <Avatar src={post.author.avatar} name={post.author.username} size={24} />
                  <span className="text-text-secondary text-xs">{post.author.username}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-3 text-text-secondary text-xs">
                    <span>❤️ {post.likes?.length || 0}</span>
                    <span>💬 {post.commentCount || 0}</span>
                  </div>
                  <span className="text-text-subtle text-xs">Recommended</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const renderTrendingTopics = () => {
    if (loadingTrending) return null

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-500/15 rounded-lg">
            <TrendingUp size={18} className="text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold gradient-text">Trending Topics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {trendingTopics.map((topic, index) => (
            <motion.div
              key={topic.topic}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                setQuery(`#${topic.topic}`)
                setSearchType('hashtags')
                handleHashtagSearch(topic.topic)
              }}
              className="glass-card rounded-xl p-4 text-center cursor-pointer hover-lift"
            >
              <div className="flex items-center justify-center mb-2">
                <span className={`text-lg ${topic.trend === 'up' ? 'text-green-400' : topic.trend === 'down' ? 'text-red-400' : 'text-blue-400'}`}>
                  {topic.trend === 'up' ? '📈' : topic.trend === 'down' ? '📉' : '➡️'}
                </span>
              </div>
              <h4 className="text-text font-semibold text-sm mb-1">{topic.topic}</h4>
              <p className="text-text-secondary text-xs">{topic.posts.toLocaleString()} posts</p>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0">
        <Sparkles background="transparent" particleColor="#8b5cf6" particleDensity={80} minSize={0.5} maxSize={1.2} speed={1.5} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-6">
        <h2 className="text-2xl font-bold gradient-text text-shadow-glow">Explore</h2>

      <div className="flex items-center space-x-1.5 mb-2">
        {(['users', 'posts', 'hashtags'] as const).map(type => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSearchType(type)}
            className={`px-4 py-2 rounded-xl font-medium transition-all card-press ${
              searchType === type ? 'bg-gradient-to-r from-primary to-accent text-white shadow-glow-sm' : 'glass-card text-text-muted hover:text-text'
            }`}
          >
            {type === 'users' && <UsersIcon size={14} className="inline mr-1" />}
            {type === 'posts' && <FileText size={14} className="inline mr-1" />}
            {type === 'hashtags' && <Hash size={14} className="inline mr-1" />}
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </motion.button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex space-x-3">
        <div ref={searchRef} className="flex-1 relative">
          <input type="text" placeholder={searchType === 'hashtags' ? 'Search hashtags (e.g. tech)...' : searchType === 'posts' ? 'Search posts...' : 'Search users...'}
            value={query} onChange={e => setQuery(e.target.value)}
            className="w-full px-5 py-4 input-glass rounded-xl text-text placeholder-text-muted" />
          {renderSuggestions()}
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit"
          className="px-6 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press">
          <Search size={20} />
        </motion.button>
      </form>

      {/* Advanced Filters Toggle */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="flex items-center space-x-2 px-4 py-2 glass-card rounded-xl text-text-muted hover:text-text transition-colors"
      >
        <span className="text-sm">Advanced Filters</span>
        <motion.div
          animate={{ rotate: showAdvancedFilters ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.div>
      </motion.button>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-2xl p-4 space-y-4"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">Location</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country..."
                  className="w-full px-3 py-2 input-glass rounded-lg text-text placeholder-text-muted text-sm"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
                >
                  <option value="relevance">Relevance</option>
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="likes">Most Liked</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setFilters({ dateRange: 'all', location: '', sortBy: 'relevance' })
                  addToast('Filters reset', 'info')
                }}
                className="px-4 py-2 glass-card rounded-lg text-text-muted text-sm hover:text-text transition-colors"
              >
                Reset
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  handleSearch()
                  addToast('Applied advanced filters', 'success')
                }}
                className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg text-sm font-medium shadow-glow-sm"
              >
                Apply Filters
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!query && !searching && !loadingSuggestions && suggestedUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold gradient-text">Featured People</h3>
          <InfiniteMovingCards
            items={suggestedUsers.slice(0, 6).map(u => ({
              quote: u.bio || `Discover ${u.username}'s content`,
              name: u.username,
              title: `${u.followers?.length || 0} followers`
            }))}
            speed="slow"
          />
        </div>
      )}
      {!query && !searching && (
        <>
          {renderRecommendations()}
          {renderTrendingTopics()}
          {renderTrending()}
        </>
      )}

      {searching && (
        <div className="flex items-center justify-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full" />
        </div>
      )}

      {!searching && searchType === 'users' && userResults.length > 0 && (
        <div className="space-y-2">
          {userResults.map(u => {
            const mutualCount = getMutualFriendsCount(u)
            return (
              <motion.div key={u._id} whileHover={{ scale: 1.01 }} onClick={() => navigate(`/profile/${u._id}`)}
                className="flex items-center space-x-4 p-4 glass-card rounded-xl cursor-pointer hover-lift card-press">
                <motion.div whileHover={{ scale: 1.08 }}>
                  <Avatar src={u.avatar} name={u.username} size={48} />
                </motion.div>
                <div className="flex-1">
                  <h4 className="text-text font-semibold text-sm">{u.username}</h4>
                  <p className="text-text-subtle text-xs">{u.bio || 'No bio'}</p>
                  {mutualCount > 0 && (
                    <span className="text-primary text-xs font-medium glow-sm">{mutualCount} mutual friends</span>
                  )}
                </div>
                {currentUser && u._id !== currentUser._id && !isFollowing(u) && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={async (e) => {
                    e.stopPropagation()
                    handleFollow(u._id)
                  }} className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium text-sm shadow-glow-sm card-press">Follow</motion.button>
                )}
                {currentUser && u._id !== currentUser._id && isFollowing(u) && (
                  <span className="px-4 py-2 glass-card text-text-muted rounded-xl font-medium text-sm">Following</span>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {!searching && searchType === 'hashtags' && postResults.length > 0 && (
        <div className="space-y-6">
          {query && (
            <div className="flex items-center justify-between p-4 glass-card rounded-xl hover-lift">
              <div className="flex items-center space-x-3">
                <Hash size={24} className="text-primary glow-sm" />
                <span className="text-lg font-semibold text-primary">
                  #{query.startsWith('#') ? query.substring(1) : query}
                </span>
                <span className="text-text-subtle text-sm">{postResults.length} posts</span>
              </div>
              {isHashtagFollowed(query.startsWith('#') ? query.substring(1) : query) ? (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => handleUnfollowHashtag(query.startsWith('#') ? query.substring(1) : query)}
                  className="px-4 py-2 glass-card text-text-muted rounded-xl font-medium text-sm hover:text-red-400 hover:border-red-500/25 transition-all card-press">
                  Unfollow
                </motion.button>
              ) : (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => handleFollowHashtag(query.startsWith('#') ? query.substring(1) : query)}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium text-sm shadow-glow-sm card-press">
                  Follow
                </motion.button>
              )}
            </div>
          )}
          {postResults.map(post => <Post key={post._id} post={post} />)}
        </div>
      )}

      {!searching && searchType === 'posts' && postResults.length > 0 && (
        <div className="space-y-6">
          {postResults.map(post => <Post key={post._id} post={post} />)}
        </div>
      )}

      {!searching && userResults.length === 0 && postResults.length === 0 && query && (
        <div className="text-center text-text-muted py-12 glass-card rounded-2xl">No results found</div>
      )}
      {!searching && !query && renderFriendSuggestions()}
    </motion.div>
    </>
  )
}

export default ExplorePage