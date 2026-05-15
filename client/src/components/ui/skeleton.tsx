import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'shimmer-skeleton'

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
      default:
        return 'rounded-lg'
    }
  }

  const getSizeStyles = () => {
    const styles: React.CSSProperties = {}
    if (width) styles.width = typeof width === 'number' ? `${width}px` : width
    if (height) styles.height = typeof height === 'number' ? `${height}px` : height
    return styles
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, getVariantClasses())}
            style={{
              ...getSizeStyles(),
              width: i === lines - 1 ? '60%' : '100%' // Last line shorter
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(baseClasses, getVariantClasses(), className)}
      style={getSizeStyles()}
    />
  )
}

export const PostSkeleton: React.FC = () => (
  <div className="glass-card rounded-2xl p-5 space-y-4">
    {/* Header skeleton */}
    <div className="flex items-center space-x-3">
      <Skeleton variant="circular" width={44} height={44} />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" width="120px" />
        <Skeleton variant="text" width="80px" />
      </div>
    </div>

    {/* Content skeleton */}
    <div className="space-y-2">
      <Skeleton variant="text" lines={2} />
      <Skeleton variant="rectangular" width="100%" height={200} />
    </div>

    {/* Actions skeleton */}
    <div className="flex items-center justify-between pt-3 border-t border-border/20">
      <div className="flex items-center space-x-4">
        <Skeleton variant="rectangular" width={80} height={36} />
        <Skeleton variant="rectangular" width={80} height={36} />
        <Skeleton variant="rectangular" width={80} height={36} />
      </div>
      <Skeleton variant="rectangular" width={36} height={36} />
    </div>
  </div>
)

export const UserSkeleton: React.FC = () => (
  <div className="flex items-center space-x-4 p-4 glass-card rounded-xl">
    <Skeleton variant="circular" width={48} height={48} />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" width="140px" />
      <Skeleton variant="text" width="100px" />
    </div>
    <Skeleton variant="rectangular" width={80} height={32} />
  </div>
)