import { useState, useCallback, useRef } from 'react'
import { Upload, Loader2, FileText, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ocrRecognitionApi } from '@/services/ocrService'
import { FileUploadAPI } from '@/services/fileUpload'
import type { OcrRequest } from '@/types/ocr'

interface UploadedImage {
  file: File
  localUrl: string // 本地预览URL
  cloudUrl?: string // 云端URL
  id: string
}

export function UploadMode() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0] // 只取第一个文件

    try {
      // 验证文件
      FileUploadAPI.validateFile(file)
    } catch (error) {
      toast.error((error as Error).message)
      return
    }

    // 清理之前的图片URL
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage.localUrl)
    }

    // 创建临时图片对象用于预览
    const newImage: UploadedImage = {
      file,
      localUrl: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random()}`
    }

    setUploadedImage(newImage)
    setExtractedText('') // 清空之前的识别结果
    
    // 开始上传和OCR流程
    await uploadAndRecognize(newImage)
  }, [uploadedImage])
  
  // 上传和识别函数
  const uploadAndRecognize = async (image: UploadedImage) => {
    try {
      // 第一步：上传到腾讯云
      setUploading(true)
      setExtractedText('正在上传图片...')

      const objectKey = `ocr-images/${Date.now()}-${image.file.name}`
      const cloudUrl = await FileUploadAPI.uploadFile(image.file, objectKey)

      // 更新图片对象，添加云端URL
      const updatedImage = { ...image, cloudUrl }
      setUploadedImage(updatedImage)

      // 第二步：进行OCR识别
      setUploading(false)
      setProcessing(true)
      setExtractedText('正在识别中...')

      const request: OcrRequest = {
        imageUrl: cloudUrl
      }
      
      const response = await ocrRecognitionApi.recognizeImage(request)
      setExtractedText(response.description)
      toast.success('图片识别完成')
      
    } catch (error) {
      console.error('上传或识别失败:', error)
      if (uploading) {
        toast.error('图片上传失败，请重试')
        setExtractedText('')
      } else {
        toast.error('图片识别失败，请重试')
        setExtractedText('')
      }
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  // 拖拽处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])



  // 复制文本
  const handleCopyText = async () => {
    if (!extractedText || extractedText === '正在识别中...' || extractedText === '正在上传图片...') return
    
    try {
      await navigator.clipboard.writeText(extractedText)
      toast.success('文本已复制到剪贴板')
    } catch (err) {
      toast.error('复制失败，请手动复制')
    }
  }


  // 如果没有上传任何图片，显示上传界面
  if (!uploadedImage) {
    return (
      <div className="h-full p-8">
        <div className="h-full flex items-center justify-center">
          <div
            className={`w-[600px] h-40 border-2 border-dashed rounded-xl text-center transition-all duration-300 ${
              dragActive
                ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg cursor-pointer'
                : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/20 hover:shadow-md cursor-pointer'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-muted to-muted/60 rounded-2xl flex items-center justify-center shadow-sm">
                <Upload className="w-8 h-8 text-muted-foreground/80" />
              </div>

              <div className="space-y-1">
                <p className="text-base font-medium text-foreground/90">
                  拖拽图片到此处或点击上传
                </p>
                <p className="text-xs text-muted-foreground/70">
                  支持 JPG、PNG、WebP 格式，最大 10MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full px-8 py-12 max-w-4xl mx-auto space-y-8">
        {/* 图片展示区域 */}
        <div className="text-center pt-8">
          <div className="w-full max-w-lg mx-auto">
            <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden shadow-md">
              <img
                src={uploadedImage.localUrl}
                alt="上传的图片"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {(uploading || processing) && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploading ? '正在上传图片...' : '正在识别图片中的文字...'}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* 识别结果区域 */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <h4 className="font-semibold text-slate-700 dark:text-slate-300">识别结果</h4>
            </div>
            {extractedText && extractedText !== '正在识别中...' && extractedText !== '正在上传图片...' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="bg-white/80 hover:bg-white shadow-sm border-slate-300"
              >
                <Copy className="h-4 w-4 mr-2" />
                复制
              </Button>
            )}
          </div>
          
          {extractedText ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              <Textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="识别的文字将显示在这里..."
                className="min-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 text-slate-700 dark:text-slate-300 text-sm leading-relaxed p-4"
                readOnly={uploading || processing}
              />
            </div>
          ) : (
            <div className="min-h-[120px] bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">上传图片后自动开始识别</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">支持中英文混合识别</p>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}