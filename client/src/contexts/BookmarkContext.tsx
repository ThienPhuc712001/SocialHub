import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { posts, Post as PostType } from '../services/api'

interface BookmarkContextType {
  bookmarkedIds: Set<string>
  toggleBookmark: (postId: string) => Promise<boolean>
  loading: boolean
}

const BookmarkContext = createContext<BookmarkContextType>({
  bookmarkedIds: new Set(),
  toggleBookmark: async () => false,
  loading: true,
})

export const useBookmarks = () => useContext(BookmarkContext)

export const BookmarkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchBookmarks = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const res = await posts.getBookmarks(1, 1000)
      const ids = new Set((res.data.posts || []).map((p: PostType) => p._id))
      setBookmarkedIds(ids)
    } catch {
      // Ignore bookmark fetch errors
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchBookmarks() }, [fetchBookmarks])

  const toggleBookmark = async (postId: string): Promise<boolean> => {
    try {
      if (bookmarkedIds.has(postId)) {
        await posts.unbookmark(postId)
        setBookmarkedIds(prev => { const next = new Set(prev); next.delete(postId); return next })
        return false
      } else {
        await posts.bookmark(postId)
        setBookmarkedIds(prev => { const next = new Set(prev); next.add(postId); return next })
        return true
      }
    } catch { return bookmarkedIds.has(postId) }
  }

  return (
    <BookmarkContext.Provider value={{ bookmarkedIds, toggleBookmark, loading }}>
      {children}
    </BookmarkContext.Provider>
  )
}