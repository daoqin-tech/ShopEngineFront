import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, ArrowLeft, Download, Eye, Edit, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FileUploadAPI } from '@/services/fileUpload'

interface ResultImage {
  id: string
  url: string
  status: 'loading' | 'completed'
}

interface FillModeProps {
  processing: boolean
  handleFillGenerate: (prompt: string, imageUrl: string, maskData: string) => void
  resultImageUrl?: string
}

export function FillMode({
  processing,
  handleFillGenerate,
  resultImageUrl
}: FillModeProps) {
  const [prompt, setPrompt] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resultImages, setResultImages] = useState<ResultImage[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [lassoPath, setLassoPath] = useState<{x: number, y: number}[]>([])
  const [maskData, setMaskData] = useState<string | null>(null)
  const [hasMask, setHasMask] = useState(false)
  const [animationOffset, setAnimationOffset] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFileUpload = async (file: File) => {
    try {
      FileUploadAPI.validateFile(file)
      setUploading(true)
      const objectKey = `imageEdit/${Date.now()}-${file.name}`
      const fileURL = await FileUploadAPI.uploadFile(file, objectKey)
      setUploadedImage(fileURL)
      setHasMask(false)
      setMaskData(null)
    } catch (error) {
      console.error('上传失败:', error)
      toast.error(error instanceof Error ? error.message : '上传失败，请重试', { id: 'upload' })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleBackToUpload = () => {
    setUploadedImage(null)
    setPrompt('')
    setHasMask(false)
    setMaskData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    const container = containerRef.current
    
    if (!canvas || !image || !container) return
    
    const containerRect = container.getBoundingClientRect()
    const imageRect = image.getBoundingClientRect()
    
    // 计算图片在容器中的实际显示尺寸
    const displayWidth = imageRect.width
    const displayHeight = imageRect.height
    const offsetX = imageRect.left - containerRect.left
    const offsetY = imageRect.top - containerRect.top
    
    canvas.width = displayWidth
    canvas.height = displayHeight
    canvas.style.left = `${offsetX}px`
    canvas.style.top = `${offsetY}px`
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`
  }, [uploadedImage])

  useEffect(() => {
    if (uploadedImage && imageRef.current) {
      const img = imageRef.current
      if (img.complete) {
        setupCanvas()
      } else {
        img.onload = setupCanvas
      }
    }
  }, [uploadedImage, setupCanvas])

  useEffect(() => {
    const handleResize = () => {
      if (uploadedImage) {
        setTimeout(setupCanvas, 100)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [uploadedImage, setupCanvas])

  const startLassoSelect = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 自动清除之前的选区，开始新的选择
    setIsSelecting(true)
    setLassoPath([{ x, y }])
    setHasMask(false)
    setMaskData(null)
    
    // 清除画布
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const continueLassoSelect = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 优化：只有当距离足够远时才添加新点，减少路径点数量
    if (lassoPath.length > 0) {
      const lastPoint = lassoPath[lassoPath.length - 1]
      const distance = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2)
      if (distance < 3) return // 距离小于3像素不添加
    }
    
    const newPath = [...lassoPath, { x, y }]
    setLassoPath(newPath)
    drawLassoPath(newPath)
  }

  const endLassoSelect = () => {
    if (!isSelecting || lassoPath.length < 3) return
    
    setIsSelecting(false)
    setHasMask(true)
    generateMaskFromLasso()
  }

  const drawLassoPath = useCallback((path: {x: number, y: number}[]) => {
    const canvas = canvasRef.current
    if (!canvas || path.length < 2) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (hasMask && !isSelecting) {
      // 绘制选中区域的半透明覆盖层
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)' // 偏白色半透明
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y)
      }
      ctx.closePath()
      ctx.fill()
      
      // 绘制动画虚线边框
      drawAnimatedDashedPath(path)
    } else {
      // 正在选择时，绘制实线
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y)
      }
      ctx.stroke()
    }
  }, [hasMask, isSelecting, animationOffset])

  const drawAnimatedDashedPath = (path: {x: number, y: number}[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 绘制黑白交替的虚线动画效果
    const dashLength = 8
    const gapLength = 6
    
    // 先绘制黑色虚线
    ctx.setLineDash([dashLength, gapLength])
    ctx.lineDashOffset = -animationOffset * 0.5
    ctx.lineWidth = 2
    ctx.strokeStyle = '#000000'
    
    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y)
    }
    ctx.closePath()
    ctx.stroke()
    
    // 再绘制白色虚线（偏移半个周期实现交替效果）
    ctx.setLineDash([dashLength, gapLength])
    ctx.lineDashOffset = -animationOffset * 0.5 - (dashLength + gapLength) / 2
    ctx.strokeStyle = '#ffffff'
    
    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y)
    }
    ctx.closePath()
    ctx.stroke()
    
    // 重置虚线设置
    ctx.setLineDash([])
  }

  const generateMaskFromLasso = () => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || lassoPath.length < 3) return
    
    // 获取原始图片尺寸
    const originalWidth = image.naturalWidth
    const originalHeight = image.naturalHeight
    
    // 获取显示尺寸
    const displayWidth = canvas.width
    const displayHeight = canvas.height
    
    // 计算缩放比例
    const scaleX = originalWidth / displayWidth
    const scaleY = originalHeight / displayHeight
    
    // 创建与原始图片同尺寸的mask canvas
    const maskCanvas = document.createElement('canvas')
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) return
    
    maskCanvas.width = originalWidth
    maskCanvas.height = originalHeight
    
    // 填充黑色背景
    maskCtx.fillStyle = 'black'
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
    
    // 将显示坐标转换为原始图片坐标并绘制白色选区
    maskCtx.fillStyle = 'white'
    maskCtx.beginPath()
    maskCtx.moveTo(lassoPath[0].x * scaleX, lassoPath[0].y * scaleY)
    for (let i = 1; i < lassoPath.length; i++) {
      maskCtx.lineTo(lassoPath[i].x * scaleX, lassoPath[i].y * scaleY)
    }
    maskCtx.closePath()
    maskCtx.fill()
    
    try {
      const dataUrl = maskCanvas.toDataURL('image/png')
      const base64Data = dataUrl.split(',')[1]
      setMaskData(base64Data)
    } catch (error) {
      console.error('生成mask数据失败:', error)
      toast.error('生成mask数据失败')
    }
  }


  const handleGenerate = () => {
    if (!uploadedImage || !prompt.trim() || !maskData) {
      toast.error('请上传图片、绘制区域并输入描述内容')
      return
    }
    
    const newImageId = Date.now().toString()
    setResultImages(prev => [...prev, {
      id: newImageId,
      url: '',
      status: 'loading'
    }])
    
    handleFillGenerate(prompt, uploadedImage, maskData)
  }

  const handlePreviewResult = (imageUrl: string) => {
    window.open(imageUrl, '_blank')
  }

  const handleUseAsSource = (imageUrl: string) => {
    setUploadedImage(imageUrl)
    setHasMask(false)
    setMaskData(null)
    toast.success('已将此图片设为待处理图片')
  }

  // 动画效果 - 使用requestAnimationFrame优化性能
  useEffect(() => {
    if (!hasMask || isSelecting) return
    
    let animationId: number
    
    const animate = () => {
      setAnimationOffset(prev => (prev + 1) % 24) // 每帧递增1
      drawLassoPath(lassoPath)
      animationId = requestAnimationFrame(animate)
    }
    
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [hasMask, isSelecting, lassoPath, drawLassoPath])

  React.useEffect(() => {
    if (resultImageUrl) {
      setResultImages(prev => {
        const newImages = [...prev]
        for (let i = newImages.length - 1; i >= 0; i--) {
          if (newImages[i].status === 'loading') {
            newImages[i] = {
              ...newImages[i],
              url: resultImageUrl,
              status: 'completed'
            }
            break
          }
        }
        return newImages
      })
    }
  }, [resultImageUrl])

  // 上传状态界面
  if (!uploadedImage) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div 
          className={`w-[600px] h-40 border-2 border-dashed rounded-xl text-center transition-all duration-300 ${
            uploading 
              ? 'border-primary/50 bg-primary/5 cursor-wait' 
              : isDragging 
                ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg cursor-pointer' 
                : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/20 hover:shadow-md cursor-pointer'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/60 rounded-2xl flex items-center justify-center shadow-sm">
              {uploading ? (
                <svg className="w-8 h-8 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground/80" />
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-base font-medium text-foreground/90">
                {uploading ? '正在上传图片...' : '拖拽图片到此处或点击上传'}
              </p>
              <p className="text-xs text-muted-foreground/70">
                支持 JPG、PNG、WebP 格式，最大 10MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </div>
      </div>
    )
  }

  // 编辑状态界面
  return (
    <div className="h-full flex flex-col p-6">
      {/* 返回按钮 */}
      <div className="mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackToUpload}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          重新上传
        </Button>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 图片预览和编辑区域 */}
        <div className={`transition-all duration-500 ease-in-out ${
          processing || (resultImages.length > 0) ? 'flex-none' : 'flex-1 flex items-center justify-center'
        }`}>
          <div className="w-full max-w-2xl mx-auto space-y-6">

            {/* 图片编辑区域 */}
            <div className="w-full">
              <div 
                ref={containerRef}
                className={`relative rounded-lg overflow-hidden border bg-muted transition-all duration-500 ease-in-out ${
                  processing || (resultImages.length > 0) ? 'max-h-60' : ''
                }`}
              >
                <img
                  ref={imageRef}
                  src={uploadedImage}
                  alt="上传的图片"
                  className={`w-full object-contain transition-all duration-500 ease-in-out ${
                    processing || (resultImages.length > 0) ? 'h-60' : 'h-auto'
                  }`}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute ${isSelecting ? 'cursor-crosshair' : hasMask ? 'cursor-default' : 'cursor-crosshair'}`}
                  style={{ backgroundColor: 'transparent' }}
                  onMouseDown={startLassoSelect}
                  onMouseMove={continueLassoSelect}
                  onMouseUp={endLassoSelect}
                  onMouseLeave={endLassoSelect}
                />
              </div>
            </div>

            {/* 条件性显示输入框或提示文字 */}
            {hasMask ? (
              <div className="w-full">
                <div className="flex items-center bg-background rounded-3xl border shadow-sm hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-primary/50">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述要填充的内容和样式..."
                    onKeyDown={(e) => e.key === 'Enter' && !processing && prompt.trim() && maskData && handleGenerate()}
                    className="flex-1 px-4 py-3 text-base bg-transparent border-0 rounded-3xl focus:outline-none focus:ring-0"
                    disabled={processing}
                  />
                  <div className="flex-shrink-0 pr-4">
                    <button
                      onClick={handleGenerate}
                      disabled={processing || !prompt.trim() || !maskData}
                      className={`p-3 rounded-full transition-all duration-200 ${
                        processing || !prompt.trim() || !maskData
                          ? 'text-muted-foreground cursor-not-allowed bg-muted'
                          : 'text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {processing ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full text-center py-8">
                <p className="text-muted-foreground">请在图片上绘制需要修改的区域</p>
              </div>
            )}
          </div>
        </div>

        {/* 结果展示区域 */}
        {(processing || resultImages.length > 0) && (
          <div className={`transition-all duration-500 ease-in-out overflow-hidden flex-1 ${
            processing || resultImages.length > 0 ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="pt-6 h-full flex flex-col">
              <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
                <h3 className="text-lg font-semibold mb-4">处理结果</h3>
                
                <div className="flex-1 overflow-auto">
                  <div className="space-y-4">
                    {resultImages.map((image) => (
                      <div key={image.id} className="flex justify-center">
                        {image.status === 'loading' ? (
                          <div className="w-80 h-40 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/20">
                            <div className="text-center space-y-3">
                              <div className="w-12 h-12 mx-auto">
                                <svg className="w-12 h-12 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </div>
                              <p className="text-muted-foreground">正在处理图片...</p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group max-w-sm rounded-lg overflow-hidden border bg-muted">
                            <img
                              src={image.url}
                              alt="处理结果"
                              className="w-full h-auto object-contain"
                            />
                            
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePreviewResult(image.url)}
                                className="flex items-center gap-2 bg-white/90 hover:bg-white text-black shadow-lg"
                              >
                                <Eye className="h-4 w-4" />
                                预览
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleUseAsSource(image.url)}
                                className="flex items-center gap-2 shadow-lg"
                              >
                                <Edit className="h-4 w-4" />
                                编辑
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = image.url
                                  link.download = `filled_image_${Date.now()}.jpg`
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                                className="flex items-center gap-2 bg-white/90 hover:bg-white text-black shadow-lg"
                              >
                                <Download className="h-4 w-4" />
                                下载
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}