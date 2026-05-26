import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { profiles, User } from '../services/api'
import { FileText, Upload, Shield, Eye, EyeOff, Trash2, Lock, Bell, Globe, Moon, Sun, DollarSign, Crown, Megaphone, X } from 'lucide-react'
import { getAvatarSrc, getErrorMessage } from '../utils/format'
import { isPushSupported, getNotificationPermission, requestNotificationPermission } from '../utils/pushNotifications'
import Avatar from '../components/Avatar'
import { Sparkles } from '@/components/ui/sparkles'
import { MovingBorder } from '@/components/ui/moving-border'

const SettingsPage: React.FC = () => {
  const { user, logout, theme, toggleTheme, updateUser } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [bio, setBio] = useState(user?.bio || '')
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<User[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const coverFileRef = useRef<HTMLInputElement>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    likes: user?.notificationPreferences?.likes ?? true,
    comments: user?.notificationPreferences?.comments ?? true,
    follows: user?.notificationPreferences?.follows ?? true,
    messages: user?.notificationPreferences?.messages ?? true,
    bookmarks: user?.notificationPreferences?.bookmarks ?? true,
  })
  const [savingNotif, setSavingNotif] = useState(false)
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [privacySettings, setPrivacySettings] = useState<{
    postsVisibility: string
    messagesFrom: string
    storiesVisibility: string
    profileVisibility: string
    activityStatus: string
    dataSharing: boolean
  }>({
    postsVisibility: user?.privacySettings?.postsVisibility || 'public', // public, friends, private
    messagesFrom: user?.privacySettings?.messagesFrom || 'everyone', // everyone, friends, nobody
    storiesVisibility: user?.privacySettings?.storiesVisibility || 'public', // public, friends, close_friends
    profileVisibility: user?.privacySettings?.profileVisibility || 'public', // public, private
    activityStatus: String(user?.privacySettings?.activityStatus ?? 'true'), // public, friends, private
    dataSharing: user?.privacySettings?.dataSharing || false
  })
  const [savingGranularPrivacy, setSavingGranularPrivacy] = useState(false)
  const [closeFriends, setCloseFriends] = useState<User[]>([])
  const [loadingCloseFriends, setLoadingCloseFriends] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushPermission, setPushPermission] = useState<string>('default')
  const [monetizationSettings, setMonetizationSettings] = useState({
    allowAds: user?.monetizationSettings?.allowAds ?? false,
    creatorSubscriptions: user?.monetizationSettings?.creatorSubscriptions ?? false,
    subscriptionPrice: user?.monetizationSettings?.subscriptionPrice ?? 4.99,
    adsFrequency: user?.monetizationSettings?.adsFrequency ?? 'medium' // low, medium, high
  })
  const [savingMonetization, setSavingMonetization] = useState(false)

  useEffect(() => {
    profiles.getBlocked().then(res => {
      setBlockedUsers(res.data)
      setLoadingBlocked(false)
    }).catch(() => setLoadingBlocked(false))

    // Fetch close friends
    profiles.getCloseFriends().then(res => {
      setCloseFriends(res.data)
      setLoadingCloseFriends(false)
    }).catch(() => setLoadingCloseFriends(false))

    // Initialize push notification state
    if (isPushSupported()) {
      setPushPermission(getNotificationPermission())
      setPushEnabled(localStorage.getItem('pushEnabled') === 'true')
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await profiles.update(bio, avatar)
      addToast('Settings saved!', 'success')
      updateUser()
    } catch { addToast('Failed to save settings', 'error') }
    finally { setSaving(false) }
  }

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleAvatarUpload = async () => {
    const file = avatarFileRef.current?.files?.[0]
    if (!file) return addToast('Please select a file first', 'error')
    setAvatarUploading(true)
    try {
      const res = await profiles.uploadAvatar(file)
      setAvatar(res.data.avatar || '')
      setAvatarPreview(null)
      addToast('Avatar uploaded!', 'success')
      updateUser()
    } catch { addToast('Failed to upload avatar', 'error') }
    finally { setAvatarUploading(false) }
  }

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCoverPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCoverUpload = async () => {
    const file = coverFileRef.current?.files?.[0]
    if (!file) return addToast('Please select a file first', 'error')
    setCoverUploading(true)
    try {
      await profiles.uploadCoverPhoto(file)
      setCoverPreview(null)
      addToast('Cover photo uploaded!', 'success')
      updateUser()
    } catch { addToast('Failed to upload cover photo', 'error') }
    finally { setCoverUploading(false) }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) return addToast('Please enter your password', 'error')
    setDeletingAccount(true)
    try {
      await profiles.deleteAccount(deletePassword)
      addToast('Account deleted', 'success')
      logout()
      navigate('/login')
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    } finally { setDeletingAccount(false) }
  }

  const handleNotifToggle = async (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    setSavingNotif(true)
    try {
      await profiles.updateNotificationPreferences(updated)
      addToast('Notification preferences updated', 'success')
      updateUser()
    } catch {
      setNotifPrefs(notifPrefs)
      addToast('Failed to update notification preferences', 'error')
    } finally { setSavingNotif(false) }
  }

  const handlePrivacyToggle = async () => {
    setSavingPrivacy(true)
    try {
      await profiles.updatePrivacy(!isPrivate)
      setIsPrivate(!isPrivate)
      await updateUser()
      addToast(`Profile is now ${!isPrivate ? 'private' : 'public'}`, 'success')
    } catch {
      addToast('Failed to update privacy settings', 'error')
    } finally {
      setSavingPrivacy(false)
    }
  }

  const handleGranularPrivacyUpdate = async () => {
    setSavingGranularPrivacy(true)
    try {
      const payload = {
        ...privacySettings,
        activityStatus: privacySettings.activityStatus === 'true',
      }
      await profiles.updatePrivacySettings(payload)
      await updateUser()
      addToast('Privacy settings updated', 'success')
    } catch {
      addToast('Failed to update privacy settings', 'error')
    } finally {
      setSavingGranularPrivacy(false)
    }
  }

  const handleRemoveCloseFriend = async (userId: string) => {
    try {
      await profiles.removeCloseFriend(userId)
      setCloseFriends(prev => prev.filter(f => f._id !== userId))
      addToast('Removed from close friends', 'success')
    } catch {
      addToast('Failed to remove close friend', 'error')
    }
  }

  const handleMonetizationUpdate = async () => {
    setSavingMonetization(true)
    try {
      await profiles.updateMonetizationSettings(monetizationSettings)
      await updateUser()
      addToast('Monetization settings updated', 'success')
    } catch {
      addToast('Failed to update monetization settings', 'error')
    } finally {
      setSavingMonetization(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return addToast('Please fill all fields', 'error')
    setChangingPassword(true)
    try {
      await profiles.changePassword(currentPassword, newPassword)
      addToast('Password changed successfully!', 'success')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: unknown) {
      addToast(getErrorMessage(err), 'error')
    } finally { setChangingPassword(false) }
  }

  const handleUnblock = async (userId: string) => {
    try {
      await profiles.unblock(userId)
      setBlockedUsers(prev => prev.filter(u => u._id !== userId))
      addToast('User unblocked', 'success')
    } catch { addToast('Failed to unblock user', 'error') }
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none">
        <Sparkles background="transparent" particleColor="#8b5cf6" particleDensity={60} minSize={0.4} maxSize={1.2} speed={1.5} className="w-full h-full" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-5">
        <h2 className="text-2xl font-bold gradient-text">Settings</h2>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <h3 className="text-lg font-semibold gradient-text flex items-center space-x-2">
            <div className="p-1.5 bg-primary/15 rounded-lg"><Moon size={16} className="text-primary" />{theme === 'dark' && <Sun size={16} className="text-primary ml-0" />}</div>
            <span>Appearance</span>
          </h3>
          <div className="flex items-center justify-between mt-4">
            <span className="text-text-muted">Theme</span>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={toggleTheme}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary/15 text-primary font-medium border border-primary/25 hover:bg-primary/25 transition-all glow-sm card-press">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </motion.button>
          </div>
        </div>

        <MovingBorder containerClassName="rounded-2xl w-full" className="glass-card rounded-2xl p-5 overflow-hidden" duration={3000} rx="20" ry="20">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-primary/15 rounded-lg"><FileText size={16} className="text-primary" /></div>
            <h3 className="text-lg font-semibold gradient-text">Profile</h3>
          </div>
          <div className="space-y-4">
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4} placeholder="Bio"
              className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted resize-none" />
            <input type="url" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="Avatar URL"
              className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" />
            <div className="flex items-center space-x-3">
              <motion.div whileHover={{ scale: 1.05 }}>
                <Avatar src={avatarPreview || avatar} name={user?.username || ''} size={48} />
              </motion.div>
              <div className="flex items-center space-x-2">
                <input type="file" ref={avatarFileRef} accept="image/*" onChange={handleAvatarFileSelect} className="hidden" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => avatarFileRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-primary/15 text-primary font-medium border border-primary/25 hover:bg-primary/25 transition-all card-press">
                  <Upload size={16} /><span>Select File</span>
                </motion.button>
                {avatarPreview && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleAvatarUpload} disabled={avatarUploading}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-glow-sm disabled:opacity-50 card-press">
                    {avatarUploading ? 'Uploading...' : 'Upload Avatar'}
                  </motion.button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {coverPreview && <img src={coverPreview} alt="Cover preview" className="w-32 h-16 rounded-xl object-cover border border-border/30" />}
              {!coverPreview && user?.coverPhoto && <img src={getAvatarSrc(user.coverPhoto) || ''} alt="Current cover" className="w-32 h-16 rounded-xl object-cover border border-border/30" />}
              <div className="flex items-center space-x-2">
                <input type="file" ref={coverFileRef} accept="image/*" onChange={handleCoverFileSelect} className="hidden" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => coverFileRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-primary/15 text-primary font-medium border border-primary/25 hover:bg-primary/25 transition-all card-press">
                  <Upload size={16} /><span>Select Cover</span>
                </motion.button>
                {coverPreview && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleCoverUpload} disabled={coverUploading}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-glow-sm disabled:opacity-50 card-press">
                    {coverUploading ? 'Uploading...' : 'Upload Cover'}
                  </motion.button>
                )}
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 card-press">
              {saving ? 'Saving...' : 'Save'}
            </motion.button>
          </div>
        </MovingBorder>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-primary/15 rounded-lg"><Lock size={16} className="text-primary" /></div>
            <h3 className="text-lg font-semibold gradient-text">Change Password</h3>
          </div>
          <div className="space-y-4">
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password"
              className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 characters)" minLength={6}
              className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted" />
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword}
              className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50 card-press">
              {changingPassword ? 'Changing...' : 'Change Password'}
            </motion.button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-primary/15 rounded-lg"><Bell size={16} className="text-primary" /></div>
            <h3 className="text-lg font-semibold gradient-text">Notification Preferences</h3>
          </div>
          <div className="space-y-3 mt-4">
            {(['likes', 'comments', 'follows', 'messages', 'bookmarks'] as const).map(key => (
              <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface/30 transition-all">
                <span className="text-text-secondary capitalize text-sm">{key}</span>
                <motion.button onClick={() => handleNotifToggle(key)} disabled={savingNotif}
                  className={`relative w-11 h-5.5 rounded-full transition-all duration-300 card-press ${notifPrefs[key] ? 'bg-gradient-to-r from-primary to-accent shadow-glow-sm' : 'bg-border/50'}`}
                  whileTap={{ scale: 0.9 }}>
                  <motion.span
                    className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                    animate={{ x: notifPrefs[key] ? 22 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                </motion.button>
              </div>
            ))}

            {/* Push Notifications */}
            {isPushSupported() && (
              <div className="border-t border-border/20 pt-3 mt-3">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface/30 transition-all">
                  <div className="flex items-center space-x-2">
                    <span className="text-text-secondary text-sm">Push Notifications</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pushPermission === 'granted' ? 'bg-green-500/20 text-green-400' :
                      pushPermission === 'denied' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {pushPermission === 'granted' ? 'Enabled' :
                       pushPermission === 'denied' ? 'Blocked' :
                       'Request'}
                    </span>
                  </div>
                  <motion.button
                    onClick={async () => {
                      if (pushPermission === 'default') {
                        const permission = await requestNotificationPermission()
                        setPushPermission(permission)
                        if (permission === 'granted') {
                          setPushEnabled(true)
                          localStorage.setItem('pushEnabled', 'true')
                          addToast('Push notifications enabled!', 'success')
                        }
                      } else if (pushPermission === 'granted') {
                        setPushEnabled(!pushEnabled)
                        localStorage.setItem('pushEnabled', pushEnabled ? 'false' : 'true')
                        addToast(pushEnabled ? 'Push notifications disabled' : 'Push notifications enabled!', pushEnabled ? 'info' : 'success')
                      } else {
                        addToast('Please enable notifications in your browser settings', 'warning')
                      }
                    }}
                    disabled={pushPermission === 'denied'}
                    className={`relative w-11 h-5.5 rounded-full transition-all duration-300 card-press ${
                      pushEnabled && pushPermission === 'granted' ? 'bg-gradient-to-r from-primary to-accent shadow-glow-sm' : 'bg-border/50'
                    } ${pushPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    whileTap={{ scale: 0.9 }}>
                    <motion.span
                      className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                      animate={{ x: (pushEnabled && pushPermission === 'granted') ? 22 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-primary/15 rounded-lg"><Globe size={16} className="text-primary" /></div>
            <h3 className="text-lg font-semibold gradient-text">Privacy Settings</h3>
          </div>
          <div className="flex items-center justify-between mt-4 p-2 rounded-lg hover:bg-surface/30 transition-all">
            <div className="flex items-center space-x-2">
              {isPrivate ? <Lock size={16} className="text-primary glow-sm" /> : <Globe size={16} className="text-text-muted" />}
              <span className="text-text-secondary">{isPrivate ? 'Private Profile' : 'Public Profile'}</span>
            </div>
            <motion.button onClick={handlePrivacyToggle} disabled={savingPrivacy}
              className={`relative w-11 h-5.5 rounded-full transition-all duration-300 card-press ${isPrivate ? 'bg-gradient-to-r from-primary to-accent shadow-glow-sm' : 'bg-border/50'}`}
              whileTap={{ scale: 0.9 }}>
              <motion.span
                className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                animate={{ x: isPrivate ? 22 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </motion.button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-purple-500/15 rounded-lg"><Shield size={16} className="text-purple-500" /></div>
            <h3 className="text-lg font-semibold gradient-text">Granular Privacy</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-2">Who can see my posts</label>
              <select
                value={privacySettings.postsVisibility}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, postsVisibility: e.target.value as 'public' | 'friends' | 'private' }))}
                className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
              >
                <option value="public">Everyone</option>
                <option value="friends">Friends only</option>
                <option value="private">Only me</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Who can message me</label>
              <select
                value={privacySettings.messagesFrom}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, messagesFrom: e.target.value as 'everyone' | 'friends' | 'none' }))}
                className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Who can see my stories</label>
              <select
                value={privacySettings.storiesVisibility}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, storiesVisibility: e.target.value as 'public' | 'friends' | 'private' }))}
                className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
              >
                <option value="public">Everyone</option>
                <option value="friends">Friends only</option>
                <option value="close_friends">Close friends only</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Profile visibility</label>
              <select
                value={privacySettings.profileVisibility}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value as 'public' | 'friends' | 'private' }))}
                className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Activity status</label>
              <select
                value={String(privacySettings.activityStatus)}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, activityStatus: e.target.value }))}
                className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
              >
                <option value="public">Show to everyone</option>
                <option value="friends">Show to friends only</option>
                <option value="private">Don't show</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 glass-card rounded-lg">
              <div>
                <span className="text-text-secondary text-sm">Allow data sharing for personalization</span>
                <p className="text-text-subtle text-xs mt-1">Help us improve your experience with anonymized data</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setPrivacySettings(prev => ({ ...prev, dataSharing: !prev.dataSharing }))}
                className={`relative w-11 h-5.5 rounded-full transition-all duration-300 ${
                  privacySettings.dataSharing ? 'bg-primary' : 'bg-border/50'
                }`}
              >
                <motion.span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                  animate={{ x: privacySettings.dataSharing ? 22 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            {/* Close Friends Management */}
            {privacySettings.storiesVisibility === 'close_friends' && (
              <div className="border-t border-border/20 pt-4 mt-4">
                <h4 className="text-text font-medium text-sm mb-3">Close Friends</h4>
                {loadingCloseFriends ? (
                  <div className="text-text-muted text-sm">Loading...</div>
                ) : (
                  <div className="space-y-2">
                    {closeFriends.length === 0 ? (
                      <p className="text-text-muted text-sm">No close friends yet</p>
                    ) : (
                      closeFriends.map(friend => (
                        <div key={friend._id} className="flex items-center justify-between p-2 glass-card rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Avatar src={friend.avatar} name={friend.username} size={32} />
                            <span className="text-text text-sm">{friend.username}</span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRemoveCloseFriend(friend._id)}
                            className="p-1 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400"
                          >
                            <X size={16} />
                          </motion.button>
                        </div>
                      ))
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {/* TODO: Open friend selector modal */}}
                      className="w-full py-2 glass-card rounded-lg text-text-muted hover:text-text text-sm"
                    >
                      + Add Close Friend
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGranularPrivacyUpdate}
                disabled={savingGranularPrivacy}
                className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50"
              >
                {savingGranularPrivacy ? 'Saving...' : 'Save Privacy Settings'}
              </motion.button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-primary/15 rounded-lg"><Shield size={16} className="text-primary" /></div>
            <h3 className="text-lg font-semibold gradient-text">Blocked Users</h3>
          </div>
          <div className="mt-4">
            {loadingBlocked ? (
              <div className="text-text-muted text-sm shimmer-skeleton py-3">Loading...</div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-text-muted text-sm py-3">No blocked users</div>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((blockedUser: User) => (
                  <div key={blockedUser._id} className="flex items-center justify-between p-2.5 rounded-xl glass-card">
                    <div className="flex items-center space-x-3">
                      <Avatar src={blockedUser.avatar} name={blockedUser.username} size={32} />
                      <span className="text-text font-medium text-sm">{blockedUser.username}</span>
                    </div>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleUnblock(blockedUser._id)}
                      className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-xl font-medium border border-red-500/25 hover:bg-red-500/25 text-sm transition-all glow-red card-press">
                      Unblock
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-green-500/15 rounded-lg"><DollarSign size={16} className="text-green-500" /></div>
            <h3 className="text-lg font-semibold gradient-text">Monetization</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 glass-card rounded-lg">
              <div className="flex items-center space-x-2">
                <Megaphone size={18} className="text-blue-400" />
                <div>
                  <span className="text-text-secondary text-sm">Allow ads on my content</span>
                  <p className="text-text-subtle text-xs">Earn money from sponsored posts</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMonetizationSettings(prev => ({ ...prev, allowAds: !prev.allowAds }))}
                className={`relative w-11 h-5.5 rounded-full transition-all duration-300 ${
                  monetizationSettings.allowAds ? 'bg-primary' : 'bg-border/50'
                }`}
              >
                <motion.span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                  animate={{ x: monetizationSettings.allowAds ? 22 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            {monetizationSettings.allowAds && (
              <div>
                <label className="block text-text-secondary text-sm mb-2">Ad frequency</label>
                <select
                  value={monetizationSettings.adsFrequency}
                  onChange={(e) => setMonetizationSettings(prev => ({ ...prev, adsFrequency: e.target.value as 'low' | 'medium' | 'high' }))}
                  className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
                >
                  <option value="low">Low (1-2 ads per day)</option>
                  <option value="medium">Medium (3-5 ads per day)</option>
                  <option value="high">High (5+ ads per day)</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-between p-3 glass-card rounded-lg">
              <div className="flex items-center space-x-2">
                <Crown size={18} className="text-yellow-400" />
                <div>
                  <span className="text-text-secondary text-sm">Creator subscriptions</span>
                  <p className="text-text-subtle text-xs">Let fans subscribe for exclusive content</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMonetizationSettings(prev => ({ ...prev, creatorSubscriptions: !prev.creatorSubscriptions }))}
                className={`relative w-11 h-5.5 rounded-full transition-all duration-300 ${
                  monetizationSettings.creatorSubscriptions ? 'bg-primary' : 'bg-border/50'
                }`}
              >
                <motion.span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                  animate={{ x: monetizationSettings.creatorSubscriptions ? 22 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>

            {monetizationSettings.creatorSubscriptions && (
              <div>
                <label className="block text-text-secondary text-sm mb-2">Monthly subscription price ($)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={monetizationSettings.subscriptionPrice}
                  onChange={(e) => setMonetizationSettings(prev => ({ ...prev, subscriptionPrice: parseFloat(e.target.value) || 4.99 }))}
                  className="w-full px-3 py-2 input-glass rounded-lg text-text text-sm"
                />
                <p className="text-text-subtle text-xs mt-1">Fans will pay this amount monthly for exclusive content</p>
              </div>
            )}

            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign size={16} className="text-green-400" />
                <span className="text-green-400 font-medium text-sm">Earnings Summary</span>
              </div>
              <p className="text-text-muted text-sm">Earnings data will be available once monetization is enabled.</p>
            </div>

            <div className="flex justify-end pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMonetizationUpdate}
                disabled={savingMonetization}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-medium shadow-glow-sm disabled:opacity-50"
              >
                {savingMonetization ? 'Saving...' : 'Save Monetization Settings'}
              </motion.button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 hover-lift">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-primary/15 rounded-lg"><Trash2 size={16} className="text-primary" /></div>
            <h3 className="text-lg font-semibold gradient-text">Account</h3>
          </div>
          <div className="mt-4">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { logout(); addToast('Logged out', 'success'); }}
              className="flex items-center space-x-2 px-5 py-2.5 bg-red-500/15 text-red-400 rounded-xl font-medium border border-red-500/25 hover:bg-red-500/25 transition-all glow-red card-press">
              <Trash2 size={18} /><span>Delete Session</span>
            </motion.button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-red-500/25">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 bg-red-500/15 rounded-lg"><Trash2 size={16} className="text-red-400" /></div>
            <h3 className="text-lg font-semibold text-red-400">Delete Account</h3>
          </div>
          <div className="mt-4 space-y-4">
            <p className="text-text-muted text-sm">This action is irreversible. All your data will be permanently deleted.</p>
            <div className="relative">
              <input type={showDeletePassword ? 'text' : 'password'} value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Enter your password to confirm"
                className="w-full px-4 py-3 input-glass rounded-xl text-text placeholder-text-muted pr-10 border-red-500/30 focus:ring-red-500/50" />
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowDeletePassword(!showDeletePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted card-press">
                {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </motion.button>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDeleteAccount} disabled={deletingAccount || !deletePassword}
              className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 shadow-glow-red card-press">
              {deletingAccount ? 'Deleting...' : 'Delete Account Permanently'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default SettingsPage