import { useState, useCallback, useRef } from 'react'

interface DragAndDropOptions {
  onFilesDropped?: (files: FileList) => void
  acceptedTypes?: string[]
  maxFiles?: number
  maxSize?: number // in bytes
}

export function useDragAndDrop(options: DragAndDropOptions = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragCountRef = useRef(0)

  const {
    onFilesDropped,
    acceptedTypes = ['image/*'],
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024 // 10MB
  } = options

  const validateFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files)
    
    // 检查文件数量
    if (fileArray.length > maxFiles) {
      return `最多只能上传 ${maxFiles} 个文件`
    }

    // 检查文件类型和大小
    for (const file of fileArray) {
      // 检查文件类型
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1))
        }
        return file.type === type
      })

      if (!isAccepted) {
        return `不支持的文件类型: ${file.type}`
      }

      // 检查文件大小
      if (file.size > maxSize) {
        return `文件 "${file.name}" 超过大小限制 (${Math.round(maxSize / 1024 / 1024)}MB)`
      }
    }

    return null
  }, [acceptedTypes, maxFiles, maxSize])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCountRef.current += 1
    if (dragCountRef.current === 1) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCountRef.current -= 1
    if (dragCountRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCountRef.current = 0
    setIsDragging(false)
    setError(null)

    const { files } = e.dataTransfer
    
    if (files.length === 0) return

    // 验证文件
    const validationError = validateFiles(files)
    if (validationError) {
      setError(validationError)
      return
    }

    // 调用回调函数
    onFilesDropped?.(files)
  }, [validateFiles, onFilesDropped])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isDragging,
    error,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    },
    resetError
  }
}

// 用于图片上传的预设配置
export function useImageDragAndDrop(onImagesDropped: (files: File[]) => void) {
  return useDragAndDrop({
    onFilesDropped: (files) => {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      )
      onImagesDropped(imageFiles)
    },
    acceptedTypes: ['image/*'],
    maxFiles: 20,
    maxSize: 10 * 1024 * 1024 // 10MB per image
  })
}

// 用于PSD文件上传的预设配置
export function usePSDDragAndDrop(onPSDDropped: (file: File) => void) {
  return useDragAndDrop({
    onFilesDropped: (files) => {
      if (files.length > 0) {
        onPSDDropped(files[0])
      }
    },
    acceptedTypes: ['application/octet-stream', '.psd'],
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 // 100MB
  })
}