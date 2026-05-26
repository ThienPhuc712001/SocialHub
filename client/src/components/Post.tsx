import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share2, Send, Trash2, Edit3, Bookmark, BookmarkCheck, Flag, Pin, ThumbsUp, MapPin } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { Post as PostType, posts, Comment, reportService, messageService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useBookmarks } from '../contexts/BookmarkContext'
import { formatRelativeTime, getErrorMessage } from '../utils/format'
import { getSocialAriaLabels } from '../utils/accessibility'
import Avatar from './Avatar'
import VideoPost from './VideoPost'
import ShareModal from './ShareModal'
import { Sparkles } from '@/components/ui/sparkles'
import { useFocusTrap } from '../hooks/useFocusTrap'

const renderMentions = (content: string): React.ReactNode => {
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1)
      return (
        <Link
          key={i}
          to={`/profile/${username}`}
          className="text-primary hover:text-accent transition-colors font-medium"
        >
          {part}
        </Link>
      )
    }
    return part
  })
}

interface PostProps {
  post: PostType
  onUpdate?: (_updatedPost: PostType) => void
  onDelete?: (_postId: string) => void
}

interface ConversationPreview {
  _id: string
  userId?: string
  username?: string
  avatar?: string
  lastMessage?: string
}

const Post: React.FC<PostProps> = ({ post, onUpdate, onDelete }) => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { bookmarkedIds, toggleBookmark } = useBookmarks()
  const navigate = useNavigate()
  const [likes, setLikes] = useState(post.likes.length)
  const [isLiked, setIsLiked] = useState(post.likes.includes(user?._id || ''))
  const isBookmarked = bookmarkedIds.has(post._id)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title || '')
  const [editContent, setEditContent] = useState(post.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [showShareChatModal, setShowShareChatModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [isPinned, setIsPinned] = useState(post.pinned)
  const [showLikeBurst, setShowLikeBurst] = useState(false)
  const isAuthor = post.author._id === user?._id
  const deleteModalRef = useFocusTrap<HTMLDivElement>(showDeleteConfirm)
  const reportModalRef = useFocusTrap<HTMLDivElement>(showReportModal)
  const shareChatModalRef = useFocusTrap<HTMLDivElement>(showShareChatModal)

  useEffect(() => {
    if (showComments) {
      setLoadingComments(true)
      posts.getComments(post._id).then(response => {
        const data = response.data
        setComments(data.comments || [])
      }).catch(() => addToast('Failed to load comments', 'error')).finally(() => setLoadingComments(false))
    }
  }, [showComments, post._id])

  const handleLike = async () => {
    if (likeLoading) return
    setLikeLoading(true)
    try {
      if (isLiked) {
        await posts.unlike(post._id)
        setLikes(prev => prev - 1)
        setIsLiked(false)
      } else {
        await posts.like(post._id)
        setLikes(prev => prev + 1)
        setIsLiked(true)
        setShowLikeBurst(true)
        setTimeout(() => setShowLikeBurst(false), 800)
      }
    } catch {
      addToast('Failed to like post', 'error')
    } finally {
      setLikeLoading(false)
    }
  }

  const handleBookmark = async () => {
    try {
      const result = await toggleBookmark(post._id)
      if (result) {
        addToast('Post bookmarked!', 'success')
      } else {
        addToast('Bookmark removed', 'info')
      }
    } catch {
      addToast('Failed to bookmark post', 'error')
    }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    try {
      const response = await posts.addComment(post._id, commentText)
      setComments(prev => [...prev, response.data])
      setCommentText('')
      if (onUpdate) {
        onUpdate({ ...post, commentCount: post.commentCount + 1 })
      }
    } catch {
      addToast('Failed to add comment', 'error')
    }
  }

  const handleReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return
    try {
      const response = await posts.addComment(post._id, replyText, parentCommentId)
      setComments(prev => prev.map(c => {
        if (c._id === parentCommentId) {
          return { ...c, replies: [...(c.replies || []), response.data] }
        }
        return c
      }))
      setReplyText('')
      setReplyingTo(null)
      if (onUpdate) {
        onUpdate({ ...post, commentCount: post.commentCount + 1 })
      }
    } catch {
      addToast('Failed to add reply', 'error')
    }
  }

  const handleLikeComment = async (commentId: string) => {
    try {
      const userId = user?._id || ''
      const comment = comments.find(c => c._id === commentId) || comments.flatMap(c => c.replies || []).find(c => c._id === commentId)
      if (!comment) return
      const isCommentLiked = comment.likes.includes(userId)
      if (isCommentLiked) {
        await posts.unlikeComment(post._id, commentId)
        setComments(prev => prev.map(c => {
          if (c._id === commentId) {
            return { ...c, likes: c.likes.filter(id => id !== userId) }
          }
          if (c.replies) {
            return { ...c, replies: c.replies.map(r => r._id === commentId ? { ...r, likes: r.likes.filter(id => id !== userId) } : r) }
          }
          return c
        }))
      } else {
        await posts.likeComment(post._id, commentId)
        setComments(prev => prev.map(c => {
          if (c._id === commentId) {
            return { ...c, likes: [...c.likes, userId] }
          }
          if (c.replies) {
            return { ...c, replies: c.replies.map(r => r._id === commentId ? { ...r, likes: [...r.likes, userId] } : r) }
          }
          return c
        }))
      }
    } catch {
      addToast('Failed to like comment', 'error')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await posts.deleteComment(post._id, commentId)
      setComments(prev => prev.filter(c => c._id !== commentId).map(c => ({
        ...c,
        replies: c.replies?.filter(r => r._id !== commentId) || []
      })))
      if (onUpdate) {
        onUpdate({ ...post, commentCount: post.commentCount - 1 })
      }
    } catch {
      addToast('Failed to delete comment', 'error')
    }
  }

  const handleDeletePost = async () => {
    try {
      await posts.delete(post._id)
      addToast('Post deleted', 'success')
      if (onDelete) onDelete(post._id)
    } catch {
      addToast('Failed to delete post', 'error')
    }
    setShowDeleteConfirm(false)
  }

  const handleEditPost = async () => {
    try {
      const res = await posts.update(post._id, editTitle, editContent)
      setEditing(false)
      addToast('Post updated', 'success')
      if (onUpdate) onUpdate(res.data)
    } catch {
      addToast('Failed to update post', 'error')
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  const shareUrl = `${window.location.origin}/profile/${post.author._id}`

  const handleShareToChat = () => {
    setShowShareChatModal(true)
    setLoadingConversations(true)
    messageService.getConversations().then(res => {
      setConversations(res.data || [])
    }).catch(() => addToast('Failed to load conversations', 'error')).finally(() => setLoadingConversations(false))
  }

  const handleSelectConversation = async (targetUserId: string) => {
    try {
      await posts.shareToChat(post._id, targetUserId)
      addToast('Post shared to chat!', 'success')
      setShowShareChatModal(false)
    } catch {
      addToast('Failed to share post to chat', 'error')
    }
  }

  const handlePin = async () => {
    try {
      if (isPinned) {
        await posts.unpin(post._id)
        setIsPinned(false)
        addToast('Post unpinned', 'info')
        if (onUpdate) onUpdate({ ...post, pinned: false })
      } else {
        await posts.pin(post._id)
        setIsPinned(true)
        addToast('Post pinned!', 'success')
        if (onUpdate) onUpdate({ ...post, pinned: true })
      }
    } catch {
      addToast('Failed to pin/unpin post', 'error')
    }
  }

  const handleReport = async () => {
    if (!reportReason.trim()) return
    try {
      await reportService.create(post._id, 'post', reportReason)
      addToast('Report submitted. Thank you!', 'success')
      setShowReportModal(false)
      setReportReason('')
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    }
  }

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const userId = user?._id || ''
    const isCommentLiked = comment.likes.includes(userId)
    return (
      <div key={comment._id} className={`flex space-x-3 p-3 rounded-xl bg-surface/40 ${isReply ? 'ml-8 border-l-2 border-primary/20 text-xs' : ''} hover:bg-surface/60 transition-all duration-200`}>
        <Avatar src={comment.author.avatar} name={comment.author.username} size={isReply ? 24 : 28} onClick={() => navigate(`/profile/${comment.author._id}`)} />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`text-text font-medium cursor-pointer hover:text-primary transition-colors ${isReply ? 'text-xs' : 'text-sm'}`} onClick={() => navigate(`/profile/${comment.author._id}`)}>{comment.author.username}</span>
            <span className="text-text-muted text-xs">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className={`text-text-secondary mt-1 ${isReply ? 'text-xs' : 'text-sm'}`}>{renderMentions(comment.content)}</p>
          <div className="flex items-center space-x-3 mt-1.5">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleLikeComment(comment._id)}
              className={`flex items-center space-x-1 transition-all duration-200 ${isCommentLiked ? 'text-primary glow-sm' : 'text-text-muted hover:text-primary'}`}>
              <ThumbsUp size={isReply ? 12 : 14} className={isCommentLiked ? 'fill-current' : ''} />
              <span className="text-xs">{comment.likes.length}</span>
            </motion.button>
            {!isReply && (
              <button onClick={() => setReplyingTo(comment._id)} className="text-text-muted text-xs hover:text-primary transition-colors duration-200">Reply</button>
            )}
          </div>
          {replyingTo === comment._id && (
            <div className="flex space-x-2 mt-2">
              <input type="text" placeholder="Write a reply..." value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReply(comment._id)}
                className="flex-1 px-3 py-1.5 input-glass rounded-lg text-text placeholder-text-muted text-xs" />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleReply(comment._id)}
                className="px-2 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs">
                <Send size={12} />
              </motion.button>
              <button onClick={() => { setReplyingTo(null); setReplyText('') }} className="px-2 py-1.5 text-text-muted text-xs hover:text-text">Cancel</button>
            </div>
          )}
        </div>
        {comment.author._id === user?._id && (
          <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleDeleteComment(comment._id)}
            className="p-1 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all duration-200">
            <Trash2 size={isReply ? 12 : 14} />
          </motion.button>
        )}
      </div>
    )
  }

  return (
    <motion.div layout className="relative glass-card rounded-2xl p-5 hover-lift group">
      {showLikeBurst && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-2xl">
          <Sparkles background="transparent" particleColor="#ec4899" particleDensity={40} minSize={0.8} maxSize={1.4} speed={3} className="w-full h-full" />
        </div>
      )}
      {showDeleteConfirm && (
        <div ref={deleteModalRef} role="dialog" aria-modal="true" aria-label="Delete post confirmation" className="absolute inset-0 bg-black/50 glass-heavy rounded-2xl z-10 flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-2xl p-6 max-w-xs text-center space-y-4 shadow-lg">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <p className="text-text font-semibold">Delete this post?</p>
            <p className="text-text-muted text-sm">This action cannot be undone.</p>
            <div className="flex space-x-3 justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDeletePost}
                className="px-5 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium shadow-glow-red card-press">Delete</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2 glass-card rounded-xl font-medium text-text-muted card-press">Cancel</motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {showReportModal && (
        <div ref={reportModalRef} role="dialog" aria-modal="true" aria-label="Report post" className="absolute inset-0 bg-black/50 glass-heavy rounded-2xl z-10 flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-2xl p-6 max-w-xs text-center space-y-4 shadow-lg">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto">
              <Flag size={24} className="text-yellow-400" />
            </div>
            <p className="text-text font-semibold">Report this post?</p>
            <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Reason for reporting..." rows={3}
              className="w-full px-3 py-2 input-glass rounded-xl text-text placeholder-text-muted resize-none text-sm" />
            <div className="flex space-x-3 justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleReport} disabled={!reportReason.trim()}
                className="px-5 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium shadow-glow-red disabled:opacity-50 card-press">Report</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowReportModal(false); setReportReason(''); }}
                className="px-5 py-2 glass-card rounded-xl font-medium text-text-muted card-press">Cancel</motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {showShareChatModal && (
        <div ref={shareChatModalRef} role="dialog" aria-modal="true" aria-label="Share to chat" className="absolute inset-0 bg-black/50 glass-heavy rounded-2xl z-10 flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-lg">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Send size={24} className="text-primary" />
            </div>
            <p className="text-text font-semibold text-center">Share to Chat</p>
            {loadingConversations ? (
              <div className="space-y-2 shimmer-skeleton">
                <div className="h-8 bg-surface rounded w-full"></div>
                <div className="h-8 bg-surface rounded w-3/4"></div>
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {conversations.length === 0 && <p className="text-text-muted text-sm text-center">No conversations found</p>}
                {conversations.map((conv: ConversationPreview) => (
                  <motion.button key={conv._id || conv.userId} whileHover={{ x: 4 }} onClick={() => handleSelectConversation(conv.userId || conv._id)}
                    className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-primary/10 transition-all duration-200 card-press">
                    <Avatar src={conv.avatar} name={conv.username || 'U'} size={32} />
                    <span className="text-text font-medium text-sm">{conv.username || 'User'}</span>
                  </motion.button>
                ))}
              </div>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowShareChatModal(false)}
              className="px-4 py-2 glass-card rounded-xl font-medium text-text-muted w-full card-press">Cancel</motion.button>
          </motion.div>
        </div>
      )}

      {isPinned && (
        <div className="flex items-center space-x-1.5 mb-3 text-primary text-xs font-medium">
          <Pin size={14} className="fill-current" />
          <span>Pinned</span>
        </div>
      )}
      {post.status === 'draft' && (
        <div className="flex items-center space-x-1.5 mb-3">
          <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-md text-xs font-medium">Draft</span>
        </div>
      )}
      {post.status === 'scheduled' && post.scheduledAt && (
        <div className="flex items-center space-x-1.5 mb-3">
          <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded-md text-xs font-medium">Scheduled: {new Date(post.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3 cursor-pointer group/author" onClick={() => navigate(`/profile/${post.author._id}`)}>
          <motion.div whileHover={{ scale: 1.08 }} className="relative">
            <Avatar src={post.author.avatar} name={post.author.username} size={44} onClick={() => navigate(`/profile/${post.author._id}`)} />
            <div className="absolute inset-0 rounded-full bg-primary/0 group-hover/author:bg-primary/10 transition-all duration-300" />
          </motion.div>
          <div>
            <h4 className="text-text font-semibold hover:text-primary transition-colors gradient-text text-sm">{post.author.username}</h4>
            <p className="text-text-subtle text-xs">
              {formatRelativeTime(post.createdAt)}
              {post.editedAt && <span className="text-text-subtle text-xs ml-1">(Edited)</span>}
            </p>
          </div>
        </div>
        {!editing && (
          <div className="flex space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isAuthor && (
              <>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={handlePin}
                  className={`p-2 sm:p-1.5 rounded-lg hover:bg-surface/60 transition-all duration-200 card-press ${isPinned ? 'text-primary glow-sm' : 'text-text-muted hover:text-primary'}`}>
                  <Pin size={18} className={`sm:w-[15px] sm:h-[15px] ${isPinned ? 'fill-current' : ''}`} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={() => { setEditing(true); setEditTitle(post.title || ''); setEditContent(post.content); }}
                  className="p-2 sm:p-1.5 rounded-lg hover:bg-surface/60 text-text-muted hover:text-primary transition-all duration-200 card-press">
                  <Edit3 size={18} className="sm:w-[15px] sm:h-[15px]" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 sm:p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all duration-200 card-press">
                  <Trash2 size={18} className="sm:w-[15px] sm:h-[15px]" />
                </motion.button>
              </>
            )}
            {!isAuthor && (
              <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={() => setShowReportModal(true)}
                className="p-2 sm:p-1.5 rounded-lg hover:bg-surface/60 text-text-muted hover:text-yellow-400 transition-all duration-200 card-press">
                <Flag size={18} className="sm:w-[15px] sm:h-[15px]" />
              </motion.button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 mb-4">
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title (optional)"
            className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" />
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
            className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none" />
          <div className="flex space-x-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleEditPost}
              className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm card-press">Save</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setEditing(false)}
              className="px-4 py-2 glass-card rounded-xl font-medium text-text-muted card-press">Cancel</motion.button>
          </div>
        </div>
      ) : (
        <>
          {post.title && <h3 className="text-lg font-bold text-text mb-2 gradient-text">{post.title}</h3>}
          <p className="text-text-secondary leading-relaxed mb-2 text-[15px]">{renderMentions(post.content)}</p>
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.hashtags.map(tag => (
                <motion.span key={tag} whileHover={{ scale: 1.05, y: -2 }} onClick={() => navigate(`/explore?tag=${tag}`)}
                  className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium cursor-pointer hover:bg-primary/20 transition-all card-press">
                  #{tag}
                </motion.span>
              ))}
            </div>
          )}
          {post.location && (
            <div className="flex items-center space-x-1.5 mb-3 text-text-muted text-xs">
              <MapPin size={14} className="text-primary" />
              <span>{post.location.name}</span>
            </div>
          )}
        </>
      )}

      {(post.image || post.video) && !editing && (
        <div className="mb-4 rounded-xl overflow-hidden relative">
          {post.video ? (
            <VideoPost
              src={post.video.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${post.video}` : post.video}
              poster={post.image ? (post.image.startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${post.image}` : post.image) : undefined}
              alt={getSocialAriaLabels.postImage(post.author.username, post.content)}
              className="w-full aspect-video"
              muted
              controls
            />
          ) : (
            <img src={(post.image || '').startsWith('/') ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}${post.image}` : post.image}
              alt={getSocialAriaLabels.postImage(post.author.username, post.content)} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}

      {!editing && (
        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <div className="flex items-center space-x-1 sm:space-x-1">
            <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={handleLike} disabled={likeLoading}
              aria-label={getSocialAriaLabels.likeButton(isLiked, likes)}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-all duration-200 card-press ${
                isLiked ? 'bg-gradient-to-r from-red-500/15 to-pink-500/15 text-red-400 glow-red' : 'hover:bg-surface/40 text-text-muted'
              }`}>
              <Heart size={20} className={`sm:w-[18px] sm:h-[18px] ${isLiked ? 'fill-current animate-heart-burst' : ''}`} />
              <span className="text-sm font-medium">{likes}</span>
            </motion.button>

            <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => setShowComments(!showComments)}
              aria-label={getSocialAriaLabels.commentButton(post.commentCount || comments.length)}
              className="flex items-center space-x-1 px-3 py-2 sm:px-2 sm:py-1.5 rounded-lg hover:bg-surface/40 text-text-muted transition-all duration-200 card-press min-h-[44px] sm:min-h-0">
              <MessageCircle size={20} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-sm font-medium">{post.commentCount || comments.length}</span>
            </motion.button>

            <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={handleShare}
              aria-label={getSocialAriaLabels.shareButton()}
              className="flex items-center space-x-1 px-3 py-2 sm:px-2 sm:py-1.5 rounded-lg hover:bg-surface/40 text-text-muted transition-all duration-200 card-press min-h-[44px] sm:min-h-0">
              <Share2 size={19} className="sm:w-[17px] sm:h-[17px]" />
            </motion.button>

            <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={handleShareToChat}
              aria-label="Share to chat"
              className="flex items-center space-x-1 px-3 py-2 sm:px-2 sm:py-1.5 rounded-lg hover:bg-surface/40 text-text-muted transition-all duration-200 card-press min-h-[44px] sm:min-h-0">
              <Send size={19} className="sm:w-[17px] sm:h-[17px]" />
            </motion.button>
          </div>

          <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={handleBookmark}
            aria-label={getSocialAriaLabels.bookmarkButton(isBookmarked)}
            className={`p-1.5 rounded-lg transition-all duration-200 card-press min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${
              isBookmarked ? 'bg-primary/15 text-primary glow-sm' : 'hover:bg-surface/40 text-text-muted'
            }`}>
            {isBookmarked ? <BookmarkCheck size={20} className="fill-current sm:w-[18px] sm:h-[18px]" /> : <Bookmark size={20} className="sm:w-[18px] sm:h-[18px]" />}
          </motion.button>
        </div>
      )}

      {showComments && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-border/20">
          {loadingComments ? (
            <div className="space-y-3 shimmer-skeleton">
              <div className="h-4 bg-surface rounded w-3/4"></div>
              <div className="h-4 bg-surface rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {comments.filter(c => !c.parentComment).map(comment => (
                <React.Fragment key={comment._id}>
                  {renderComment(comment)}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="space-y-1.5">
                      {comment.replies.map(reply => renderComment(reply, true))}
                    </div>
                  )}
                </React.Fragment>
              ))}
              {comments.filter(c => !c.parentComment).length === 0 && <p className="text-text-muted text-sm text-center py-3">No comments yet</p>}
            </div>
          )}
          <div className="flex space-x-2">
            <input type="text" placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              className="flex-1 px-4 py-2.5 input-glass rounded-xl text-text placeholder-text-muted" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleComment}
              className="px-3 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl shadow-glow-sm card-press">
              <Send size={16} />
            </motion.button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showShareModal && (
          <ShareModal url={shareUrl} text={post.content} onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default Post