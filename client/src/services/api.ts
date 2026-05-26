import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  _id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  coverPhoto?: string;
  followers: string[];
  following: string[];
  followingHashtags?: string[];
  blockedUsers?: string[];
  isBlocked?: boolean;
  blockedByMe?: boolean;
  isPrivate?: boolean;
  isVerified?: boolean;
  role?: 'user' | 'admin';
  notificationPreferences?: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    messages: boolean;
    bookmarks: boolean;
  };
  privacySettings?: {
    postsVisibility: 'public' | 'friends' | 'private';
    messagesFrom: 'everyone' | 'friends' | 'none';
    storiesVisibility: 'public' | 'friends' | 'private' | 'close_friends';
    profileVisibility: 'public' | 'friends' | 'private';
    activityStatus: boolean;
    dataSharing: boolean;
  };
  monetizationSettings?: {
    allowAds: boolean;
    creatorSubscriptions: boolean;
    subscriptionPrice: number;
    adsFrequency: 'low' | 'medium' | 'high';
  };
  createdAt: string;
}

export interface Post {
  _id: string;
  title?: string;
  content: string;
  image?: string;
  images?: string[];
  video?: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  likes: string[];
  reactions?: Record<string, string[]>;
  reactionCounts?: Record<string, number>;
  viewCount?: number;
  commentCount: number;
  hashtags: string[];
  mentions?: string[];
  visibility?: 'public' | 'friends' | 'private';
  isRepost?: boolean;
  originalPost?: {
    _id: string;
    title?: string;
    content: string;
    author: {
      _id: string;
      username: string;
      avatar?: string;
      isVerified?: boolean;
    };
  };
  repostComment?: string;
  poll?: {
    question: string;
    options: {
      text: string;
      votes: string[];
      _id?: string;
    }[];
    expiresAt?: string;
    totalVotes?: number;
  };
  location?: { name: string; coordinates: [number, number] };
  status?: 'draft' | 'published' | 'scheduled';
  scheduledAt?: string;
  verified?: boolean;
  editedAt?: string;
  pinned: boolean;
  createdAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
  };
  post: string;
  parentComment?: string;
  likes: string[];
  replies?: Comment[];
  createdAt: string;
}

export interface ConversationUser {
  _id: string
  username: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
  isGroup?: boolean
  groupName?: string
  groupDescription?: string
  members?: User[]
  admin?: string
}

export interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  receiver: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  messageType?: 'text' | 'voice' | 'sticker' | 'file' | 'image' | 'post_share';
  audioUrl?: string;
  stickerId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  imageUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface FriendRequest {
  _id: string;
  from: User;
  to: User;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  type: 'like' | 'comment' | 'follow' | 'message' | 'bookmark' | 'repost' | 'mention';
  post?: {
    _id: string;
    title?: string;
    content: string;
  };
  content?: string;
  read: boolean;
  createdAt: string;
}

export interface Story {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
  };
  image?: string;
  content?: string;
  viewers: string[];
  replies?: { _id: string; sender: { _id: string; username: string; avatar?: string }; content: string; createdAt: string }[];
  createdAt: string;
  expiresAt: string;
}

export interface StoryHighlight {
  _id: string;
  author: string;
  name: string;
  stories: Story[];
  coverImage?: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  name?: string;
  participants: User[];
  isGroup: boolean;
  creator?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  createdAt: string;
}

export interface HashtagFollow {
  _id: string;
  user: string;
  hashtag: string;
  createdAt: string;
}

export interface Album {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  images: string[];
  author: { _id: string; username: string; avatar?: string };
  createdAt: string;
}

export interface VideoCall {
  _id: string;
  caller: User;
  receiver: User;
  callType: 'video' | 'audio';
  status: 'missed' | 'completed' | 'rejected';
  duration?: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface StickerPack {
  _id: string;
  name: string;
  description?: string;
  stickers: { id: string; name: string; url: string; emoji: string }[];
  author?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  posts?: T[];
  messages?: T[];
  comments?: T[];
  users?: T[];
  notifications?: T[];
  total: number;
  page: number;
  pages: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
}

export const auth = {
  register: (username: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, email, password }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    api.post<{ token: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) =>
    api.post<{ message: string; resetToken?: string; userId?: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, userId: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, userId, newPassword }),
};

export const posts = {
  getTimeline: (page = 1, limit = 10, sort?: string) =>
    api.get<PaginatedResponse<Post>>('/posts', { params: { page, limit, sort } }),
  getByUser: (userId: string, page = 1, limit = 10) =>
    api.get<PaginatedResponse<Post>>(`/posts/user/${userId}`, { params: { page, limit } }),
  create: (data: FormData | { title: string; content: string }) => {
    if (data instanceof FormData) {
      return api.post<Post>('/posts', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      return api.post<Post>('/posts', data);
    }
  },
  update: (id: string, title: string, content: string) =>
    api.put<Post>(`/posts/${id}`, { title, content }),
  delete: (id: string) => api.delete(`/posts/${id}`),
  like: (id: string) => api.post(`/posts/${id}/like`),
  unlike: (id: string) => api.delete(`/posts/${id}/like`),
  repost: (id: string, repostComment?: string) =>
    api.post<Post>(`/posts/${id}/repost`, { repostComment }),
  addReaction: (id: string, type: string) =>
    api.post(`/posts/${id}/reactions`, { type }),
  removeReaction: (id: string) =>
    api.delete(`/posts/${id}/reactions`),
  viewPost: (id: string) => api.post(`/posts/${id}/view`),
  votePoll: (id: string, optionIndex: number) =>
    api.post(`/posts/${id}/poll/vote`, { optionIndex }),
  getSuggestions: () => api.get<{ users: User[]; posts: Post[] }>('/posts/suggestions'),
  getComments: (id: string, page = 1, limit = 20) =>
    api.get<PaginatedResponse<Comment>>(`/posts/${id}/comments`, { params: { page, limit } }),
  addComment: (id: string, content: string, parentCommentId?: string) =>
    api.post<Comment>(`/posts/${id}/comments`, { content, parentCommentId }),
  deleteComment: (id: string, commentId: string) =>
    api.delete(`/posts/${id}/comments/${commentId}`),
  likeComment: (id: string, commentId: string) =>
    api.post(`/posts/${id}/comments/${commentId}/like`),
  unlikeComment: (id: string, commentId: string) =>
    api.delete(`/posts/${id}/comments/${commentId}/like`),
  bookmark: (id: string) => api.post(`/posts/${id}/bookmark`),
  unbookmark: (id: string) => api.delete(`/posts/${id}/bookmark`),
  getBookmarks: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<Post>>('/posts/bookmarks', { params: { page, limit } }),
  search: (query: string, page = 1, limit = 10) =>
    api.get<PaginatedResponse<Post>>('/posts/search', { params: { q: query, page, limit } }),
  getByHashtag: (tag: string, page = 1, limit = 10) =>
    api.get<PaginatedResponse<Post>>(`/posts/hashtags/${tag}`, { params: { page, limit } }),
  pin: (id: string) => api.post(`/posts/${id}/pin`),
  unpin: (id: string) => api.delete(`/posts/${id}/pin`),
  shareToChat: (id: string, targetUserId: string) =>
    api.post(`/posts/${id}/share-to-chat`, { targetUserId }),
  getReels: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<Post>>('/posts/reels', { params: { page, limit } }),
  getDrafts: (page = 1, limit = 10) => api.get<PaginatedResponse<Post>>('/posts/drafts', { params: { page, limit } }),
  publishDraft: (id: string) => api.put(`/posts/${id}/publish`),
  schedulePost: (id: string, scheduledAt: string) => api.put(`/posts/${id}/schedule`, { scheduledAt }),
  getNearby: (latitude: number, longitude: number, radius?: number) =>
    api.get<PaginatedResponse<Post>>('/posts/nearby', { params: { latitude, longitude, radius } }),
};

export const profiles = {
  get: (id: string) => api.get<User>(`/profile/${id}`),
  update: (bio?: string, avatar?: string) =>
    api.put<User>('/profile', { bio, avatar }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ message: string }>('/profile/change-password', { currentPassword, newPassword }),
  sendRequest: (id: string) => api.post(`/profile/follow/${id}`),
  unfollow: (id: string) => api.post(`/profile/unfollow/${id}`),
  block: (id: string) => api.post(`/profile/block/${id}`),
  unblock: (id: string) => api.post(`/profile/unblock/${id}`),
  getBlocked: () => api.get<User[]>('/profile/blocked'),
  getBlockStatus: (id: string) => api.get<{ isBlocked: boolean; blockedByMe: boolean }>(`/profile/block-status/${id}`),
  search: (query: string, page = 1, limit = 10) =>
    api.get<PaginatedResponse<User>>('/profile/search', { params: { q: query, page, limit } }),
  getRequests: () => api.get<FriendRequest[]>('/profile/requests'),
  getRequestCount: () => api.get<{ count: number }>('/profile/requests/count'),
  acceptRequest: (id: string) => api.post(`/profile/accept/${id}`),
  declineRequest: (id: string) => api.post(`/profile/decline/${id}`),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post<User>('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadCoverPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('coverPhoto', file);
    return api.post<User>('/profile/cover-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updatePrivacy: (isPrivate: boolean) =>
    api.put<User>('/profile/privacy', { isPrivate }),
  updateNotificationPreferences: (prefs: { likes?: boolean; comments?: boolean; follows?: boolean; messages?: boolean; bookmarks?: boolean }) =>
    api.put<User>('/profile/notification-preferences', prefs),
  deleteAccount: (password: string) =>
    api.delete<{ message: string }>('/profile/account', { data: { password } }),
  getCloseFriends: () => api.get<User[]>('/profile/close-friends'),
  addCloseFriend: (userId: string) => api.post(`/profile/close-friends/${userId}`),
  removeCloseFriend: (userId: string) => api.delete(`/profile/close-friends/${userId}`),
  updatePrivacySettings: (settings: any) => api.put<User>('/profile/privacy-settings', settings),
  updateMonetizationSettings: (settings: any) => api.put<User>('/profile/monetization-settings', settings),
  getAnalytics: (timeRange: string) => api.get(`/profile/analytics?timeRange=${timeRange}`),
  searchMention: (q: string) => api.get<User[]>('/profile/search-mention', { params: { q } }),
  updateFormData: (formData: FormData) => api.put<User>('/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const messageService = {
  getConversations: () => api.get<ConversationUser[]>('/messages/conversations'),
  getConversation: (userId: string, page = 1, limit = 50) =>
    api.get<PaginatedResponse<Message>>(`/messages/${userId}`, { params: { page, limit } }),
  sendMessage: (userId: string, content: string) =>
    api.post<Message>(`/messages/${userId}`, { content }),
  deleteMessage: (userId: string, messageId: string) =>
    api.delete(`/messages/${userId}/messages/${messageId}`),
  searchMessages: (userId: string, query: string) =>
    api.get<{ messages: Message[] }>(`/messages/search/${userId}`, { params: { q: query } }),
  sendVoice: (userId: string, file: File) => {
    const fd = new FormData();
    fd.append('audio', file);
    fd.append('messageType', 'voice');
    return api.post(`/messages/${userId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  sendSticker: (userId: string, stickerId: string) =>
    api.post(`/messages/${userId}`, { messageType: 'sticker', stickerId }),
  sendFile: (userId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('messageType', 'file');
    return api.post(`/messages/${userId}/file`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  sendImage: (userId: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('messageType', 'image');
    return api.post(`/messages/${userId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const notificationService = {
  get: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Notification>>('/notifications', { params: { page, limit } }),
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const storyService = {
  get: (page = 1, limit = 20) =>
    api.get<{ groups: { author: { _id: string; username: string; avatar?: string }; stories: Story[] }[]; total: number; page: number; pages: number }>('/stories', { params: { page, limit } }),
  create: (data: FormData | { content: string }) => {
    if (data instanceof FormData) {
      return api.post<Story>('/stories', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      return api.post<Story>('/stories', data);
    }
  },
  delete: (id: string) => api.delete(`/stories/${id}`),
  view: (id: string) => api.post<{ viewerCount: number; viewers: User[] }>(`/stories/${id}/view`),
  getViewers: (id: string) => api.get<{ viewerCount: number; viewers: User[] }>(`/stories/${id}/viewers`),
  reply: (id: string, content: string) => api.post(`/stories/${id}/reply`, { content }),
  getReplies: (id: string) => api.get(`/stories/${id}/replies`),
};

export const conversationService = {
  list: () => api.get<Conversation[]>('/conversations'),
  create: (name: string, participantIds: string[]) =>
    api.post<Conversation>('/conversations', { name, participantIds }),
  update: (id: string, name: string) =>
    api.put<Conversation>(`/conversations/${id}`, { name }),
  addMember: (id: string, userId: string) =>
    api.post(`/conversations/${id}/add-member`, { userId }),
  removeMember: (id: string, userId: string) =>
    api.post(`/conversations/${id}/remove-member`, { userId }),
  delete: (id: string) => api.delete(`/conversations/${id}`),
  getMessages: (id: string, page = 1, limit = 50) =>
    api.get<PaginatedResponse<Message>>(`/conversations/${id}/messages`, { params: { page, limit } }),
  sendMessage: (id: string, content: string) =>
    api.post<Message>(`/conversations/${id}/messages`, { content }),
  sendVoice: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('audio', file);
    fd.append('messageType', 'voice');
    return api.post(`/conversations/${id}/messages`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  sendSticker: (id: string, stickerId: string) =>
    api.post(`/conversations/${id}/messages`, { messageType: 'sticker', stickerId }),
  sendFile: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('messageType', 'file');
    return api.post(`/conversations/${id}/messages/file`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  sendImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('messageType', 'image');
    return api.post(`/conversations/${id}/messages/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const hashtagService = {
  getTrending: () => api.get<{ tag: string; count: number }[]>('/hashtags/trending'),
  getFollowed: () => api.get<HashtagFollow[]>('/hashtags/followed'),
  follow: (tag: string) => api.post<HashtagFollow>(`/hashtags/${tag}/follow`),
  unfollow: (tag: string) => api.delete(`/hashtags/${tag}/follow`),
  getPosts: (tag: string, page = 1, limit = 10) =>
    api.get<PaginatedResponse<Post>>(`/hashtags/${tag}/posts`, { params: { page, limit } }),
};

export const highlightService = {
  getByUser: (userId: string) => api.get<StoryHighlight[]>(`/highlights/${userId}`),
  create: (name: string, storyIds: string[], coverImage?: string) =>
    api.post<StoryHighlight>('/highlights', { name, storyIds, coverImage }),
  update: (id: string, name: string, coverImage?: string) =>
    api.put<StoryHighlight>(`/highlights/${id}`, { name, coverImage }),
  delete: (id: string) => api.delete(`/highlights/${id}`),
  addStory: (id: string, storyId: string) =>
    api.post(`/highlights/${id}/add-story`, { storyId }),
  removeStory: (id: string, storyId: string) =>
    api.delete(`/highlights/${id}/remove-story/${storyId}`),
};

interface AdminStats {
  users: number
  posts: number
  comments: number
  reports: number
  conversations: number
}

interface AdminReport {
  _id: string
  reporter: { _id: string; username: string; avatar?: string }
  targetId: string
  targetType: 'post' | 'comment' | 'user' | 'story'
  reason: string
  status: 'pending' | 'reviewed' | 'resolved'
  createdAt: string
}

export const adminService = {
  getReports: (page = 1, limit = 20) =>
    api.get<{ reports: AdminReport[]; total: number; page: number; pages: number }>('/admin/reports', { params: { page, limit } }),
  reviewReport: (id: string) => api.put(`/admin/reports/${id}/review`),
  resolveReport: (id: string, action: string) =>
    api.put(`/admin/reports/${id}/resolve`, { action }),
  getStats: () => api.get<AdminStats>('/admin/stats'),
  verifyUser: (userId: string) => api.put(`/admin/verify/${userId}`),
};

export const reportService = {
  create: (targetId: string, targetType: 'post' | 'comment' | 'user' | 'story', reason: string) =>
    api.post<{ message: string }>('/reports', { targetId, targetType, reason }),
};

export interface LiveStreamType {
  _id: string;
  title: string;
  host: {
    _id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  status: 'live' | 'ended';
  viewerCount: number;
  peakViewerCount: number;
  likeCount: number;
  thumbnail?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
}

export const livestreamService = {
  create: (title: string, thumbnail?: File) => {
    const formData = new FormData();
    formData.append('title', title);
    if (thumbnail) formData.append('thumbnail', thumbnail);
    return api.post<LiveStreamType>('/livestreams', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getActive: () => api.get<LiveStreamType[]>('/livestreams/active'),
  get: (id: string) => api.get<LiveStreamType>(`/livestreams/${id}`),
  end: (id: string) => api.put<LiveStreamType>(`/livestreams/${id}/end`),
  like: (id: string) => api.put<{ likeCount: number }>(`/livestreams/${id}/like`),
  getHistory: () => api.get<LiveStreamType[]>('/livestreams/history'),
};

export const albumService = {
  list: (userId?: string) => api.get<{ albums: Album[]; total: number; page: number; pages: number }>('/albums', { params: userId ? { userId } : {} }),
  create: (data: { title: string; description?: string; coverImage?: string; images?: string[] }) => api.post<Album>('/albums', data),
  get: (id: string) => api.get<Album>(`/albums/${id}`),
  update: (id: string, data: { title?: string; description?: string; coverImage?: string }) => api.put<Album>(`/albums/${id}`, data),
  delete: (id: string) => api.delete(`/albums/${id}`),
  addImages: (id: string, images: string[]) => api.post<Album>(`/albums/${id}/images`, { images }),
  removeImage: (id: string, imageIndex: number) => api.delete(`/albums/${id}/images/${imageIndex}`),
};

export const videocallService = {
  getHistory: (page = 1, limit = 20) => api.get<{ calls: VideoCall[]; total: number; page: number; pages: number }>('/videocalls/history', { params: { page, limit } }),
};

export const chatbotService = {
  sendMessage: (message: string) => api.post<{ message: string; timestamp: string }>('/chatbot/message', { message }),
  clearHistory: () => api.post<{ message: string }>('/chatbot/clear'),
};

export const stickerService = {
  getPacks: () => api.get<StickerPack[]>('/stickers/packs'),
  getPack: (id: string) => api.get<StickerPack>(`/stickers/packs/${id}`),
  createPack: (name: string, description?: string, stickers?: any[]) => api.post<StickerPack>('/stickers/packs', { name, description, stickers }),
};

export default api;