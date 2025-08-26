import React, { useState, useRef } from 'react'
import { Upload, ArrowLeft, Download, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FileUploadAPI } from '@/services/fileUpload'


interface EditModeProps {
  processing: boolean
  handleEditGenerate: (prompt: string, imageUrl: string) => void
  resultImageUrl?: string
}

export function EditMode({
  processing,
  handleEditGenerate,
  resultImageUrl
}: EditModeProps) {
  const [prompt, setPrompt] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    try {
      // 验证文件
      FileUploadAPI.validateFile(file)
      
      setUploading(true)

      // 生成objectKey
      const objectKey = `imageEdit/${Date.now()}-${file.name}`
      
      // 上传到腾讯云
      const fileURL = await FileUploadAPI.uploadFile(file, objectKey)
      
      // 设置上传成功的图片URL
      setUploadedImage(fileURL)
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }


  const handlePreviewResult = (imageUrl: string) => {
    window.open(imageUrl, '_blank')
  }

  const handleUseAsSource = (imageUrl: string) => {
    setUploadedImage(imageUrl)
    toast.success('已将此图片设为待处理图片')
  }

  // 处理新的生成请求
  const handleGenerate = () => {
    if (!uploadedImage || !prompt.trim()) return
    
    // 调用父组件的生成函数
    handleEditGenerate(prompt, uploadedImage)
  }

  // 当有新的resultImageUrl时，更新结果图片
  React.useEffect(() => {
    if (resultImageUrl) {
      setResultImage(resultImageUrl)
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
        {/* 图片预览和输入区域 */}
        <div className={`transition-all duration-500 ease-in-out ${
          processing || resultImageUrl ? 'flex-none' : 'flex-1 flex items-center justify-center'
        }`}>
          <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* 图片预览 */}
            <div className="w-full">
              <div className={`rounded-lg overflow-hidden border bg-muted transition-all duration-500 ease-in-out ${
                processing || resultImageUrl ? 'max-h-60' : ''
              }`}>
                <img
                  src={uploadedImage}
                  alt="上传的图片"
                  className={`w-full object-contain transition-all duration-500 ease-in-out ${
                    processing || resultImageUrl ? 'h-60' : 'h-auto'
                  }`}
                />
              </div>
            </div>

            {/* 输入框和生成按钮 */}
            <div className="w-full">
              <div className="flex items-center bg-background rounded-3xl border shadow-sm hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-primary/50">
                {/* 文本输入框 */}
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述要移除的物体或修复的内容..."
                  onKeyDown={(e) => e.key === 'Enter' && !processing && prompt.trim() && uploadedImage && handleEditGenerate(prompt, uploadedImage)}
                  className="flex-1 px-4 py-3 text-base bg-transparent border-0 rounded-3xl focus:outline-none focus:ring-0"
                  disabled={processing}
                />

                {/* 生成按钮 */}
                <div className="flex-shrink-0 pr-4">
                  <button
                    onClick={handleGenerate}
                    disabled={processing || !prompt.trim()}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      processing || !prompt.trim()
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
          </div>
        </div>

        {/* 结果展示区域 */}
        {(processing || resultImage) && (
          <div className={`transition-all duration-500 ease-in-out overflow-hidden flex-1 ${
            processing || resultImage ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="pt-6 h-full flex flex-col">
              <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
                <h3 className="text-lg font-semibold mb-4">处理结果</h3>
                
                <div className="flex-1 overflow-auto flex justify-center">
                  {processing && !resultImage ? (
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
                  ) : resultImage ? (
                    <div className="relative group max-w-sm rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={resultImage}
                        alt="处理结果"
                        className="w-full h-auto object-contain"
                      />
                      
                      {/* Hover 时显示的操作按钮 */}
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePreviewResult(resultImage)}
                          className="flex items-center gap-2 bg-white/90 hover:bg-white text-black shadow-lg"
                        >
                          <Eye className="h-4 w-4" />
                          预览
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUseAsSource(resultImage)}
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
                            link.href = resultImage
                            link.download = `edited_image_${Date.now()}.jpg`
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
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}