// Image and video compression utilities for faster uploads

interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeKB?: number
}

interface VideoCompressionOptions {
  maxWidth?: number
  maxHeight?: number
  maxSizeMB?: number
  quality?: number
}

// Compress image file
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxSizeKB = 1024
  } = options

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'))
            return
          }

          // Check if file size is still too large, reduce quality further
          if (blob.size > maxSizeKB * 1024) {
            const newQuality = Math.max(0.1, quality * (maxSizeKB * 1024) / blob.size)
            canvas.toBlob(
              (compressedBlob) => {
                if (!compressedBlob) {
                  reject(new Error('Compression failed'))
                  return
                }
                const compressedFile = new File([compressedBlob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              },
              file.type,
              newQuality
            )
          } else {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          }
        },
        file.type,
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

// Compress video file
export const compressVideo = async (
  file: File,
  options: VideoCompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    maxSizeMB = 50
  } = options

  // For now, we'll do basic size checking and return original if under limit
  // Full video compression would require more complex processing
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file
  }

  // Create a simple video element to check dimensions
  return new Promise((resolve, _reject) => {
    const video = document.createElement('video')

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas')
      canvas.getContext('2d')

      let { videoWidth, videoHeight } = video

      // Scale down if needed
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const aspectRatio = videoWidth / videoHeight
        if (videoWidth > videoHeight) {
          videoWidth = maxWidth
          videoHeight = maxWidth / aspectRatio
        } else {
          videoHeight = maxHeight
          videoWidth = maxHeight * aspectRatio
        }
      }

      canvas.width = videoWidth
      canvas.height = videoHeight

      // For basic compression, we'll just return the original file for now
      // Full video compression requires WebCodecs API or external libraries
      // This is a placeholder for future implementation
      resolve(file)
    }

    video.onerror = () => resolve(file) // Return original on error
    video.src = URL.createObjectURL(file)
  })
}

// Utility to get file size in human readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Check if file needs compression
export const shouldCompress = (file: File, maxSizeKB: number = 500): boolean => {
  return file.size > maxSizeKB * 1024
}

// Get compression options based on file type and use case
export const getCompressionOptions = (file: File, useCase: 'post' | 'story' | 'profile' = 'post') => {
  const isVideo = file.type.startsWith('video/')

  if (isVideo) {
    return {
      maxWidth: useCase === 'story' ? 720 : 1280,
      maxHeight: useCase === 'story' ? 1280 : 720,
      maxSizeMB: useCase === 'story' ? 25 : 100
    }
  }

  // Image compression options
  return {
    maxWidth: useCase === 'profile' ? 400 : useCase === 'story' ? 1080 : 1920,
    maxHeight: useCase === 'profile' ? 400 : useCase === 'story' ? 1920 : 1080,
    quality: useCase === 'profile' ? 0.9 : 0.8,
    maxSizeKB: useCase === 'profile' ? 200 : 1024
  }
}

// Main compression function that handles both images and videos
export const compressMediaFile = async (
  file: File,
  useCase: 'post' | 'story' | 'profile' = 'post'
): Promise<File> => {
  const isVideo = file.type.startsWith('video/')

  if (isVideo) {
    return compressVideo(file, getCompressionOptions(file, useCase) as VideoCompressionOptions)
  } else {
    return compressImage(file, getCompressionOptions(file, useCase) as CompressionOptions)
  }
}