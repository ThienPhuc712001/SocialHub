import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { profiles, posts } from '../services/api'
import {
  BarChart3,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Eye,
  Calendar,
  Award,
  Target,
  Activity,
  Sparkles
} from 'lucide-react'
import { formatRelativeTime } from '../utils/format'

interface AnalyticsData {
  totalPosts: number
  totalLikes: number
  totalComments: number
  totalViews: number
  followersCount: number
  followingCount: number
  engagementRate: number
  topPosts: Array<{
    _id: string
    content: string
    likes: number
    comments: number
    views: number
    createdAt: string
  }>
  monthlyStats: Array<{
    month: string
    posts: number
    likes: number
    comments: number
  }>
  recentActivity: Array<{
    type: 'post' | 'like' | 'comment' | 'follow'
    description: string
    timestamp: string
  }>
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await profiles.getAnalytics(timeRange)
      setAnalytics(response.data)
    } catch (error) {
      // Mock data for demonstration
      setAnalytics({
        totalPosts: 42,
        totalLikes: 1289,
        totalComments: 367,
        totalViews: 5421,
        followersCount: 284,
        followingCount: 156,
        engagementRate: 8.7,
        topPosts: [
          {
            _id: '1',
            content: 'Beautiful sunset at the beach 🌅',
            likes: 89,
            comments: 23,
            views: 456,
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            _id: '2',
            content: 'My new recipe is ready! 🍝',
            likes: 67,
            comments: 18,
            views: 389,
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ],
        monthlyStats: [
          { month: 'Jan', posts: 8, likes: 245, comments: 67 },
          { month: 'Feb', posts: 12, likes: 312, comments: 89 },
          { month: 'Mar', posts: 15, likes: 378, comments: 102 },
          { month: 'Apr', posts: 7, likes: 354, comments: 109 }
        ],
        recentActivity: [
          { type: 'like', description: 'Someone liked your post', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { type: 'comment', description: 'New comment on your photo', timestamp: new Date(Date.now() - 7200000).toISOString() },
          { type: 'follow', description: 'New follower: @johndoe', timestamp: new Date(Date.now() - 10800000).toISOString() }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const StatCard: React.FC<{
    title: string
    value: string | number
    change?: number
    icon: React.ReactNode
    color: string
  }> = ({ title, value, change, icon, color }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-card rounded-2xl p-6 hover-lift"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${
            change >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            <TrendingUp size={14} className={change < 0 ? 'rotate-180' : ''} />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-text-secondary text-sm">{title}</p>
        <p className="text-2xl font-bold gradient-text">{value}</p>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 shimmer-skeleton">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-surface rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-surface rounded w-20"></div>
                  <div className="h-6 bg-surface rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-0">
        <Sparkles background="transparent" particleColor="#8b5cf6" particleDensity={50} minSize={0.5} maxSize={1.2} speed={1.0} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <BarChart3 className="text-white" size={24} />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold gradient-text">Analytics Dashboard</h2>
              <p className="text-text-secondary text-sm">Track your social media performance</p>
            </div>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-4 py-2 input-glass rounded-xl text-text text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Posts"
            value={analytics.totalPosts}
            change={12}
            icon={<Target className="text-blue-400" size={20} />}
            color="bg-blue-500/15"
          />
          <StatCard
            title="Total Likes"
            value={analytics.totalLikes.toLocaleString()}
            change={8}
            icon={<Heart className="text-red-400" size={20} />}
            color="bg-red-500/15"
          />
          <StatCard
            title="Total Comments"
            value={analytics.totalComments}
            change={15}
            icon={<MessageCircle className="text-green-400" size={20} />}
            color="bg-green-500/15"
          />
          <StatCard
            title="Profile Views"
            value={analytics.totalViews.toLocaleString()}
            change={-3}
            icon={<Eye className="text-purple-400" size={20} />}
            color="bg-purple-500/15"
          />
          <StatCard
            title="Followers"
            value={analytics.followersCount}
            change={22}
            icon={<Users className="text-cyan-400" size={20} />}
            color="bg-cyan-500/15"
          />
          <StatCard
            title="Following"
            value={analytics.followingCount}
            icon={<Activity className="text-orange-400" size={20} />}
            color="bg-orange-500/15"
          />
          <StatCard
            title="Engagement Rate"
            value={`${analytics.engagementRate}%`}
            change={5}
            icon={<TrendingUp className="text-emerald-400" size={20} />}
            color="bg-emerald-500/15"
          />
          <StatCard
            title="Avg. Daily Posts"
            value={(analytics.totalPosts / 30).toFixed(1)}
            icon={<Calendar className="text-indigo-400" size={20} />}
            color="bg-indigo-500/15"
          />
        </div>

        {/* Charts and Details */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Monthly Stats */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold gradient-text mb-4">Monthly Performance</h3>
            <div className="space-y-4">
              {analytics.monthlyStats.map((stat, index) => (
                <div key={stat.month} className="flex items-center justify-between p-3 glass-card rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">{stat.month}</span>
                    </div>
                    <div>
                      <p className="text-text font-medium">{stat.posts} posts</p>
                      <p className="text-text-secondary text-sm">
                        {stat.likes} likes • {stat.comments} comments
                      </p>
                    </div>
                  </div>
                  <Award className={`w-5 h-5 ${index < 2 ? 'text-yellow-400' : 'text-text-muted'}`} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Posts */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold gradient-text mb-4">Top Performing Posts</h3>
            <div className="space-y-4">
              {analytics.topPosts.map((post, index) => (
                <div key={post._id} className="p-4 glass-card rounded-xl">
                  <p className="text-text mb-3 line-clamp-2">{post.content}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Heart size={14} className="text-red-400" />
                        <span>{post.likes}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageCircle size={14} className="text-blue-400" />
                        <span>{post.comments}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Eye size={14} className="text-purple-400" />
                        <span>{post.views}</span>
                      </span>
                    </div>
                    <span className="text-text-secondary">{formatRelativeTime(post.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold gradient-text mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {analytics.recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3 p-3 glass-card rounded-xl"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.type === 'like' ? 'bg-red-500/15' :
                  activity.type === 'comment' ? 'bg-blue-500/15' :
                  activity.type === 'follow' ? 'bg-green-500/15' : 'bg-purple-500/15'
                }`}>
                  {activity.type === 'like' && <Heart size={16} className="text-red-400" />}
                  {activity.type === 'comment' && <MessageCircle size={16} className="text-blue-400" />}
                  {activity.type === 'follow' && <Users size={16} className="text-green-400" />}
                  {activity.type === 'post' && <Target size={16} className="text-purple-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-text text-sm">{activity.description}</p>
                  <p className="text-text-secondary text-xs">{formatRelativeTime(activity.timestamp)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}

export default AnalyticsPage