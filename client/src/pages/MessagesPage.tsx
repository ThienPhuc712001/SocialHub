import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useToast } from '../contexts/ToastContext'
import { messageService, conversationService, Message, ConversationUser, Conversation } from '../services/api'
import { Send, MessageCircle, Trash2, Search, X, Users, Plus } from 'lucide-react'
import Avatar from '../components/Avatar'
import { ShimmerButton } from '@/components/ui/shimmer-button'

const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <span key={i} className="bg-yellow-400/80 text-black rounded px-0.5">{part}</span> : part
  )
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { addToast } = useToast()
  const [conversations, setConversations] = useState<ConversationUser[]>([])
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<ConversationUser | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Conversation | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingFrom, setTypingFrom] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<ConversationUser[]>([])
  const [isGroupChat, setIsGroupChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const [individualResponse, groupResponse] = await Promise.all([
        messageService.getConversations(),
        conversationService.list()
      ])
      setConversations(individualResponse.data)
      setGroupConversations(groupResponse.data)

      // Get available users for group creation (excluding current user)
      const allUsers = individualResponse.data.map(conv => conv)
      setAvailableUsers(allUsers.filter(u => u._id !== user?._id))
    } catch { addToast('Failed to load conversations', 'error') }
  }, [user?._id])

  const createGroup = useCallback(async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      addToast('Please enter a group name and select members', 'warning')
      return
    }

    try {
      await conversationService.create(groupName, selectedMembers)
      addToast('Group created successfully!', 'success')
      fetchConversations()
      setShowCreateGroup(false)
      setGroupName('')
      setSelectedMembers([])
    } catch { addToast('Failed to create group', 'error') }
  }, [groupName, selectedMembers, fetchConversations, addToast])

  const fetchGroupMessages = useCallback(async (groupId: string) => {
    try {
      const response = await conversationService.getMessages(groupId)
      setChatMessages(response.data.messages.reverse())
    } catch { addToast('Failed to load messages', 'error') }
  }, [addToast])

  const sendGroupMessage = useCallback(async (groupId: string, content: string) => {
    try {
      await conversationService.sendMessage(groupId, content)
      setNewMessage('')
    } catch { addToast('Failed to send message', 'error') }
  }, [addToast])

  useEffect(() => {
    fetchConversations()

    if (socket) {
      socket.on('newMessage', (msg: Message) => {
        if (selectedUser && (msg.sender._id === selectedUser._id || msg.receiver._id === selectedUser._id)) {
          setChatMessages(prev => [...prev, msg])
        } else {
          addToast(`New message from ${msg.sender.username}`, 'info')
          fetchConversations()
        }
      })
      socket.on('onlineUsers', (users: string[]) => setOnlineUsers(users))
      socket.on('messagesRead', () => setChatMessages(prev => prev.map(m => ({ ...m, read: true }))))
      socket.on('typing', (data: { from: string }) => {
        if (selectedUser && data.from === selectedUser._id) {
          setTypingFrom(data.from)
        }
      })
      socket.on('stopTyping', (data: { from: string }) => {
        if (data.from === typingFrom) {
          setTypingFrom(null)
        }
      })
      socket.on('messageDeleted', (data: { messageId: string }) => {
        setChatMessages(prev => prev.filter(m => m._id !== data.messageId))
      })
      return () => {
        socket.off('newMessage')
        socket.off('onlineUsers')
        socket.off('messagesRead')
        socket.off('typing')
        socket.off('stopTyping')
        socket.off('messageDeleted')
      }
    }
  }, [socket, selectedUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!query.trim() || !selectedUser) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await messageService.searchMessages(selectedUser._id, query)
        setSearchResults(response.data.messages || [])
      } catch {
        setSearchResults([])
      }
      setIsSearching(false)
    }, 300)
  }, [selectedUser])

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
  }

  const handleTyping = () => {
    if (socket && selectedUser) {
      socket.emit('typing', { to: selectedUser._id })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { to: selectedUser._id })
      }, 2000)
    }
  }

  const selectConversation = async (convUser: ConversationUser) => {
    setSelectedUser(convUser)
    setSelectedGroup(null)
    setIsGroupChat(false)
    clearSearch()
    try {
      const response = await messageService.getConversation(convUser._id)
      setChatMessages(response.data.messages || [])
    } catch {
      addToast('Failed to load messages', 'error')
    }
  }

  const selectGroupConversation = async (group: Conversation) => {
    setSelectedGroup(group)
    setSelectedUser(null)
    setIsGroupChat(true)
    clearSearch()
    fetchGroupMessages(group._id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      if (isGroupChat && selectedGroup) {
        await sendGroupMessage(selectedGroup._id, newMessage)
        // Refresh group messages
        fetchGroupMessages(selectedGroup._id)
      } else if (selectedUser) {
        const response = await messageService.sendMessage(selectedUser._id, newMessage)
        setChatMessages(prev => [...prev, response.data])
        if (socket) socket.emit('stopTyping', { to: selectedUser._id })
      }
      setNewMessage('')
      fetchConversations()
    } catch {
      addToast('Failed to send message', 'error')
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedUser) return
    try {
      await messageService.deleteMessage(selectedUser._id, messageId)
      setChatMessages(prev => prev.filter(m => m._id !== messageId))
      addToast('Message deleted', 'success')
    } catch {
      addToast('Failed to delete message', 'error')
    }
    setShowDeleteConfirm(null)
  }

  const displayMessages = searchQuery.trim() && searchResults.length > 0 ? searchResults : chatMessages
  const isSearchActive = searchQuery.trim().length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex h-[calc(100vh-140px)] space-x-4">
      <div className="w-72 lg:w-80 glass-card rounded-2xl flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-border/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold gradient-text">Conversations</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateGroup(true)}
              className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              aria-label="Create new group"
            >
              <Plus size={18} />
            </motion.button>
          </div>
          <div className="flex space-x-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateGroup(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !isGroupChat ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface/40'
              }`}
            >
              Direct
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateGroup(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isGroupChat ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface/40'
              }`}
            >
              Groups
            </motion.button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-text-muted">
              <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={28} className="text-text-muted opacity-50" />
              </div>
              <p className="text-sm">No conversations yet</p>
            </div>
          )}
          {/* Group Conversations */}
          {groupConversations.map((group, index) => (
            <motion.button key={`group-${group._id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectGroupConversation(group)}
              className={`w-full flex items-center space-x-3 p-3 transition-all duration-200 card-press ${
                selectedGroup?._id === group._id ? 'bg-gradient-to-r from-primary/10 to-accent/10 border-l-2 border-primary glow-sm' : 'hover:bg-surface/40'
              }`}>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-pink-500 rounded-full flex items-center justify-center">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{group.participants?.length || 0}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text font-medium text-sm truncate">{group.name}</p>
                {group.lastMessage && (
                  <p className="text-text-subtle text-xs truncate">{group.lastMessage.content}</p>
                )}
              </div>
            </motion.button>
          ))}

          {/* Individual Conversations */}
          {conversations.map((conv, index) => (
            <motion.button key={conv._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (groupConversations.length + index) * 0.06, duration: 0.4 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectConversation(conv)}
              className={`w-full flex items-center space-x-3 p-3 transition-all duration-200 card-press ${
                selectedUser?._id === conv._id ? 'bg-gradient-to-r from-primary/10 to-accent/10 border-l-2 border-primary glow-sm' : 'hover:bg-surface/40'
              }`}>
              <div className="relative">
                <Avatar src={conv.avatar} name={conv.username} size={38} />
                {onlineUsers.includes(conv._id) && (
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-card shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text font-medium text-sm truncate">{conv.username}</p>
                {conv.lastMessage && (
                  <p className="text-text-subtle text-xs truncate">{conv.lastMessage}</p>
                )}
                {(conv.unreadCount ?? 0) > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-xs bg-gradient-to-r from-accent to-pink-500 text-white rounded-full px-1.5 py-0.5 font-bold shadow-glow-sm mt-0.5 inline-block">
                    {conv.unreadCount}
                  </motion.span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex-1 glass-card rounded-2xl flex flex-col overflow-hidden">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-border/20 flex items-center space-x-3">
              <div className="relative">
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Avatar src={selectedUser.avatar} name={selectedUser.username} size={38} />
                </motion.div>
                {onlineUsers.includes(selectedUser._id) && (
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-card shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="gradient-text font-semibold">{selectedUser.username}</h3>
                <p className="text-xs text-text-subtle">
                  {typingFrom === selectedUser._id ? (
                    <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-primary">typing...</motion.span>
                  ) : onlineUsers.includes(selectedUser._id) ? (
                    <span className="text-green-400 glow-green">Online</span>
                  ) : 'Offline'}
                </p>
              </div>
              <div className="flex items-center space-x-1.5">
                {showSearch && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 180, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex items-center space-x-1">
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full px-3 py-1.5 input-glass rounded-lg text-text text-sm placeholder-text-muted"
                      autoFocus
                    />
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={clearSearch} className="p-1.5 text-text-muted hover:text-text transition-colors card-press">
                      <X size={16} />
                    </motion.button>
                  </motion.div>
                )}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setShowSearch(!showSearch); if (showSearch) clearSearch(); }}
                  className={`p-2 rounded-lg transition-all card-press ${showSearch ? 'bg-primary/15 text-primary glow-sm' : 'text-text-muted hover:text-text hover:bg-surface/40'}`}>
                  <Search size={18} />
                </motion.button>
              </div>
            </div>

            {isSearchActive && (
              <div className="px-4 py-2 bg-primary/10 border-b border-border/20 text-xs text-text-muted">
                {isSearching ? 'Searching...' : `${searchResults.length} result(s) found`}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {displayMessages.map(msg => (
                <motion.div key={msg._id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.sender._id === user?._id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-3.5 py-2.5 group relative ${
                    msg.sender._id === user?._id
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-[0_4px_20px_rgba(139,92,246,0.25)] rounded-2xl rounded-br-md'
                      : 'glass-card rounded-2xl rounded-bl-md text-text'
                  }`}>
                    <p className="text-sm leading-relaxed">{isSearchActive ? highlightText(msg.content, searchQuery) : msg.content}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`text-xs ${msg.sender._id === user?._id ? 'text-white/50' : 'text-text-subtle'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.sender._id === user?._id && (
                        <span className={`text-xs ${msg.read ? 'text-green-300 glow-green' : 'text-white/30'}`}>
                          {msg.read ? 'Read' : 'Sent'}
                        </span>
                      )}
                    </div>
                    {!isSearchActive && msg.sender._id === user?._id && (
                      <motion.button
                        onClick={() => setShowDeleteConfirm(msg._id)}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity card-press"
                        whileHover={{ scale: 1.1 }}>
                        <Trash2 size={11} />
                      </motion.button>
                    )}
                    {!isSearchActive && showDeleteConfirm === msg._id && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute -top-8 right-0 glass-card rounded-xl p-2 shadow-lg z-10">
                        <p className="text-text text-xs mb-2">Delete message?</p>
                        <div className="flex space-x-1.5">
                          <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleDeleteMessage(msg._id)} className="px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-xs shadow-glow-sm">Yes</motion.button>
                          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowDeleteConfirm(null)} className="px-2 py-1 glass-card text-text-muted rounded-lg text-xs">No</motion.button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
              {!isSearchActive && typingFrom === selectedUser._id && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-start">
                  <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex space-x-1.5">
                      {[0, 150, 300].map((delay, i) => (
                        <motion.span key={i}
                          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: delay / 1000 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {!isSearchActive && <div ref={messagesEndRef} />}
            </div>

            {!isSearchActive && (
              <div className="p-3 border-t border-border/20 flex space-x-2">
                <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                  className="flex-1 px-4 py-2.5 input-glass rounded-xl text-text placeholder-text-muted" />
                <ShimmerButton onClick={sendMessage}
                  className="px-4 py-2.5"
                  background="rgba(139, 92, 246, 1)"
                  shimmerColor="#a78bfa"
                  shimmerDuration="2s">
                  <Send size={18} />
                </ShimmerButton>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="w-20 h-20 glass-card rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={36} className="text-text-muted opacity-50" />
              </div>
              <p className="text-text-muted text-lg font-medium">Select a conversation</p>
              <p className="text-text-subtle text-sm mt-1">to start chatting</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateGroup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Create group chat"
              className="glass-heavy bg-surface/95 rounded-2xl p-6 border border-border/20 w-full max-w-md shadow-[0_25px_70px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
                  <Users className="text-accent" size={20} />
                </div>
                <h3 className="text-xl font-bold gradient-text">Create Group Chat</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-2">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-sm mb-2">Add Members</label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {availableUsers.length === 0 ? (
                      <p className="text-text-muted text-sm py-4 text-center">No users available</p>
                    ) : (
                      availableUsers.map((user) => (
                        <motion.div
                          key={user._id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => {
                            setSelectedMembers(prev =>
                              prev.includes(user._id)
                                ? prev.filter(id => id !== user._id)
                                : [...prev, user._id]
                            )
                          }}
                          className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                            selectedMembers.includes(user._id)
                              ? 'bg-primary/10 border border-primary/30'
                              : 'glass-card hover:bg-surface/40'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedMembers.includes(user._id) ? 'bg-primary border-primary' : 'border-border'
                          }`}>
                            {selectedMembers.includes(user._id) && <span className="text-white text-xs">✓</span>}
                          </div>
                          <Avatar src={user.avatar} name={user.username} size={36} />
                          <span className="text-text font-medium">{user.username}</span>
                        </motion.div>
                      ))
                    )}
                  </div>
                  {selectedMembers.length > 0 && (
                    <p className="text-text-secondary text-sm mt-2">
                      {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setShowCreateGroup(false)
                    setGroupName('')
                    setSelectedMembers([])
                  }}
                  className="flex-1 px-4 py-3 glass-card rounded-xl font-medium text-text-muted card-press"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={createGroup}
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 card-press"
                >
                  Create Group
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default MessagesPage