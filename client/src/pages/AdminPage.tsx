import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useToast } from '../contexts/ToastContext'
import { adminService, User, profiles } from '../services/api'
import { Shield, CheckCircle, XCircle, BarChart3, Users, FileText, AlertTriangle } from 'lucide-react'
import Avatar from '../components/Avatar'
import { NumberTicker } from '@/components/ui/number-ticker'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Card3D } from '@/components/ui/3d-card'
import { MovingBorder } from '@/components/ui/moving-border'

interface Report {
  _id: string
  targetId: string
  targetType: 'post' | 'comment' | 'user' | 'story'
  reason: string
  reporter: { _id: string; username: string; avatar?: string }
  status: 'pending' | 'reviewed' | 'resolved'
  createdAt: string
}

interface Stats {
  users: number
  posts: number
  comments: number
  reports: number
  conversations: number
}

const AdminPage: React.FC = () => {
  const { addToast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingReports, setLoadingReports] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const response = await adminService.getStats()
      setStats(response.data)
    } catch {
      addToast('Failed to load stats', 'error')
    } finally {
      setLoadingStats(false)
    }
  }, [addToast])

  const fetchReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const response = await adminService.getReports()
      setReports(response.data.reports || response.data || [])
    } catch {
      addToast('Failed to load reports', 'error')
    } finally {
      setLoadingReports(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchStats()
    fetchReports()
  }, [fetchStats, fetchReports])

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    try {
      const response = await profiles.search(query)
      setSearchResults(response.data.users || [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleVerifyUser = async (userId: string) => {
    setVerifying(userId)
    try {
      await adminService.verifyUser(userId)
      addToast('User verification updated', 'success')
      setSearchResults(prev => prev.map(u => u._id === userId ? { ...u, isVerified: !u.isVerified } : u))
    } catch {
      addToast('Failed to update verification', 'error')
    } finally {
      setVerifying(null)
    }
  }

  const handleReviewReport = async (reportId: string) => {
    try {
      await adminService.reviewReport(reportId)
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, status: 'reviewed' } : r))
      addToast('Report marked as reviewed', 'success')
    } catch {
      addToast('Failed to review report', 'error')
    }
  }

  const handleResolveReport = async (reportId: string, action: string) => {
    setResolving(reportId)
    try {
      await adminService.resolveReport(reportId, action)
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, status: 'resolved' } : r))
      addToast(`Report resolved with action: ${action}`, 'success')
    } catch {
      addToast('Failed to resolve report', 'error')
    } finally {
      setResolving(null)
    }
  }

  const pendingReports = reports.filter(r => r.status === 'pending')
  const reviewedReports = reports.filter(r => r.status === 'reviewed')
  const resolvedReports = reports.filter(r => r.status === 'resolved')

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-5">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-primary/15 rounded-xl"><Shield size={24} className="text-primary glow-sm" /></div>
        <h2 className="text-2xl font-bold gradient-text text-shadow-glow">Admin Dashboard</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {loadingStats ? (
          <div className="col-span-full text-center text-text-muted py-8 shimmer-skeleton">Loading stats...</div>
        ) : stats ? (
          <>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-br from-primary/15 to-primary/5 glass-card rounded-2xl p-4 glow-sm card-press">
              <div className="flex items-center space-x-2 mb-2">
                <Users size={18} className="text-primary" />
                <span className="text-text-muted text-sm">Users</span>
              </div>
              <NumberTicker value={stats.users} className="text-3xl font-bold gradient-text" />
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-br from-accent/15 to-accent/5 glass-card rounded-2xl p-4 glow-accent card-press">
              <div className="flex items-center space-x-2 mb-2">
                <FileText size={18} className="text-accent" />
                <span className="text-text-muted text-sm">Posts</span>
              </div>
              <NumberTicker value={stats.posts} className="text-3xl font-bold gradient-text" />
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-br from-green-500/15 to-green-500/5 glass-card rounded-2xl p-4 glow-green card-press">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 size={18} className="text-green-400" />
                <span className="text-text-muted text-sm">Comments</span>
              </div>
              <NumberTicker value={stats.comments} className="text-3xl font-bold gradient-text" />
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 glass-card rounded-2xl p-4 card-press">
              <div className="flex items-center space-x-2 mb-2">
                <FileText size={18} className="text-yellow-400" />
                <span className="text-text-muted text-sm">Conversations</span>
              </div>
              <NumberTicker value={stats.conversations} className="text-3xl font-bold gradient-text" />
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="bg-gradient-to-br from-red-500/15 to-red-500/5 glass-card rounded-2xl p-4 glow-red card-press">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle size={18} className="text-red-400" />
                <span className="text-text-muted text-sm">Pending</span>
              </div>
              <NumberTicker value={stats.reports} className="text-3xl font-bold gradient-text" />
            </motion.div>
          </>
        ) : null}
      </div>

      <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card rounded-2xl overflow-hidden p-5" duration={3000} rx="20" ry="20">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-red-500/15 rounded-lg"><AlertTriangle size={18} className="text-red-400 glow-red" /></div>
          <h3 className="text-lg font-semibold gradient-text">Pending Reports</h3>
        </div>
        {loadingReports ? (
          <div className="text-text-muted text-sm shimmer-skeleton py-3">Loading reports...</div>
        ) : pendingReports.length === 0 ? (
          <div className="text-text-muted text-sm py-3">No pending reports</div>
        ) : (
          <div className="space-y-2">
            {pendingReports.map(report => (
              <Card3D key={report._id} containerClassName="w-full" className="w-full">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl glass-card space-y-3 card-press">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar src={report.reporter.avatar} name={report.reporter.username} size={32} />
                    <div>
                      <p className="text-text font-medium text-sm">{report.reporter.username}</p>
                      <p className="text-text-subtle text-xs">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    report.targetType === 'user' ? 'bg-red-500/15 text-red-400 border border-red-500/25 glow-red' :
                    report.targetType === 'post' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                    report.targetType === 'comment' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25' :
                    'bg-purple-500/15 text-purple-400 border border-purple-500/25 glow-sm'
                  }`}>{report.targetType}</span>
                </div>
                <p className="text-text-secondary text-sm">{report.reason}</p>
                <p className="text-text-subtle text-xs">Target ID: {report.targetId}</p>
                <div className="flex items-center space-x-1.5">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleReviewReport(report._id)}
                    className="px-3 py-1.5 bg-yellow-500/15 text-yellow-400 rounded-xl font-medium border border-yellow-500/25 hover:bg-yellow-500/25 text-sm transition-all card-press">
                    Review
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleResolveReport(report._id, 'dismiss')} disabled={resolving === report._id}
                    className="px-3 py-1.5 bg-green-500/15 text-green-400 rounded-xl font-medium border border-green-500/25 hover:bg-green-500/25 text-sm transition-all disabled:opacity-50 card-press">
                    <CheckCircle size={14} className="inline mr-1" />Dismiss
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleResolveReport(report._id, 'remove')} disabled={resolving === report._id}
                    className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-xl font-medium border border-red-500/25 hover:bg-red-500/25 text-sm transition-all disabled:opacity-50 card-press glow-red">
                    <XCircle size={14} className="inline mr-1" />Remove
                  </motion.button>
                </div>
              </motion.div>
              </Card3D>
            ))}
          </div>
        )}
      </MovingBorder>

      <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card rounded-2xl overflow-hidden p-5" duration={3000} rx="20" ry="20">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-yellow-500/15 rounded-lg"><CheckCircle size={18} className="text-yellow-400" /></div>
          <h3 className="text-lg font-semibold gradient-text">Reviewed Reports</h3>
        </div>
        {reviewedReports.length === 0 ? (
          <div className="text-text-muted text-sm py-3">No reviewed reports</div>
        ) : (
          <div className="space-y-2">
            {reviewedReports.map(report => (
              <motion.div key={report._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 rounded-xl glass-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar src={report.reporter.avatar} name={report.reporter.username} size={32} />
                    <div>
                      <p className="text-text font-medium text-sm">{report.reporter.username}</p>
                      <p className="text-text-subtle text-xs">{report.targetType} - {report.reason}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">Reviewed</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleResolveReport(report._id, 'dismiss')} disabled={resolving === report._id}
                    className="px-3 py-1.5 bg-green-500/15 text-green-400 rounded-xl font-medium border border-green-500/25 hover:bg-green-500/25 text-sm transition-all disabled:opacity-50 card-press">
                    <CheckCircle size={14} className="inline mr-1" />Dismiss
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleResolveReport(report._id, 'remove')} disabled={resolving === report._id}
                    className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-xl font-medium border border-red-500/25 hover:bg-red-500/25 text-sm transition-all disabled:opacity-50 card-press glow-red">
                    <XCircle size={14} className="inline mr-1" />Remove
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </MovingBorder>

      <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card rounded-2xl overflow-hidden p-5" duration={3000} rx="20" ry="20">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-green-500/15 rounded-lg"><XCircle size={18} className="text-green-400" /></div>
          <h3 className="text-lg font-semibold gradient-text">Resolved Reports</h3>
        </div>
        {resolvedReports.length === 0 ? (
          <div className="text-text-muted text-sm py-3">No resolved reports</div>
        ) : (
          <div className="space-y-2">
            {resolvedReports.map(report => (
              <div key={report._id} className="p-4 rounded-xl glass-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar src={report.reporter.avatar} name={report.reporter.username} size={32} />
                    <div>
                      <p className="text-text font-medium text-sm">{report.reporter.username}</p>
                      <p className="text-text-subtle text-xs">{report.targetType} - {report.reason}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25 glow-green">Resolved</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </MovingBorder>

      <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card rounded-2xl overflow-hidden p-5" duration={3000} rx="20" ry="20">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-primary/15 rounded-lg"><Shield size={18} className="text-primary glow-sm" /></div>
          <h3 className="text-lg font-semibold gradient-text">User Verification</h3>
        </div>
        <input type="text" placeholder="Search users by username..." value={searchQuery}
          onChange={(e) => handleSearchUsers(e.target.value)}
          className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" />
        {isSearching && <div className="text-text-muted text-sm py-2 shimmer-skeleton">Searching...</div>}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map(searchUser => (
              <div key={searchUser._id} className="flex items-center justify-between p-3 rounded-xl glass-card">
                <div className="flex items-center space-x-3">
                  <Avatar src={searchUser.avatar} name={searchUser.username} size={32} />
                  <div>
                    <div className="flex items-center space-x-1">
                      <span className="text-text font-medium text-sm">{searchUser.username}</span>
                      {searchUser.isVerified && <CheckCircle size={14} className="text-primary glow-sm" />}
                    </div>
                    <span className="text-text-subtle text-xs">{searchUser.email}</span>
                  </div>
                </div>
                <ShimmerButton
                  onClick={() => handleVerifyUser(searchUser._id)}
                  className={`px-3 py-1.5 font-medium text-sm ${verifying === searchUser._id ? 'opacity-50 pointer-events-none' : ''}`}
                  background={searchUser.isVerified ? "rgba(220, 38, 38, 0.8)" : "rgba(139, 92, 246, 0.8)"}
                  shimmerColor={searchUser.isVerified ? "#f87171" : "#c4b5fd"}
                >
                  {verifying === searchUser._id ? 'Updating...' : searchUser.isVerified ? 'Unverify' : 'Verify'}
                </ShimmerButton>
              </div>
            ))}
          </div>
        )}
        {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
          <div className="text-text-muted text-sm py-2">No users found</div>
        )}
      </MovingBorder>
    </motion.div>
  )
}

export default AdminPage