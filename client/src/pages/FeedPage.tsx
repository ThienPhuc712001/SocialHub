import React from 'react'
import { motion } from 'framer-motion'
import Feed from '../components/Feed'
import Stories from '../components/Stories'
import { Sparkles } from '@/components/ui/sparkles'

interface Props {
  showCreateModal: boolean
  onCloseCreateModal: () => void
}

const FeedPage: React.FC<Props> = ({ showCreateModal, onCloseCreateModal }) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Sparkles background="transparent" particleColor="#8b5cf6" particleDensity={80} minSize={0.5} maxSize={1.2} speed={1.5} className="w-full h-full" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-6">
        <Stories />
        <Feed showCreateModal={showCreateModal} onCloseCreateModal={onCloseCreateModal} />
      </motion.div>
    </div>
  )
}

export default FeedPage