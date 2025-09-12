import React, { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { FileUploadAPI } from '@/services/fileUpload'
import { templateService } from '@/services/templateService'
import { toast } from 'sonner'

interface PSDImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId?: string
}

type ImportStatus = 'idle' | 'uploading' | 'parsing' | 'success' | 'error'

export function PSDImportDialog({ open, onOpenChange, templateId }: PSDImportDialogProps) {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetDialog = () => {
    setStatus('idle')
    setSelectedFile(null)
    setUploadProgress(0)
    setErrorMessage('')
    setIsDragOver(false)
    setCountdown(5)
  }

  const handleClose = () => {
    if (status === 'uploading') {
      toast.error('正在上传中，请稍后再关闭')
      return
    }
    resetDialog()
    onOpenChange(false)
  }

  const handleFileSelect = useCallback((file: File) => {
    try {
      FileUploadAPI.validatePSDFile(file)
      setSelectedFile(file)
      setErrorMessage('')
      // 自动开始上传
      startImport(file)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '文件验证失败')
      setStatus('error')
    }
  }, [])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const psdFile = files.find(file => file.name.toLowerCase().endsWith('.psd'))
    
    if (psdFile) {
      handleFileSelect(psdFile)
    } else {
      setErrorMessage('请选择PSD文件')
      setStatus('error')
    }
  }, [handleFileSelect])

  const startImport = async (file: File) => {
    setStatus('uploading')
    setErrorMessage('')
    setUploadProgress(0)

    try {
      // 上传文件
      const fileUrl = await FileUploadAPI.uploadFileWithProgress(
        file,
        (progress) => setUploadProgress(progress)
      )

      // 提交解析请求
      setStatus('parsing')
      await templateService.parsePSDFile(fileUrl, file.name, templateId)

      // 解析提交成功
      setStatus('success')
      setCountdown(20)
      
      // 开始倒计时
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            handleClose()
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : '导入失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导入PSD文件</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 空闲状态 - 文件上传区域 */}
          {status === 'idle' && (
            <div className="space-y-4">
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".psd"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <div className="space-y-2">
                  <div className="text-lg font-medium">
                    拖拽PSD文件到此处，或点击选择
                  </div>
                  <div className="text-sm text-muted-foreground">
                    支持最大500MB的PSD文件
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 上传中状态 */}
          {status === 'uploading' && selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{selectedFile.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>上传进度</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </div>
          )}

          {/* 解析中状态 */}
          {status === 'parsing' && selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">文件上传完成</div>
                  <div className="text-sm text-muted-foreground">
                    正在提交解析请求...
                  </div>
                </div>
              </div>

              <div className="text-center py-4">
                <div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="font-medium">正在提交到后端解析</div>
                <div className="text-sm text-muted-foreground mt-1">
                  解析需要一定时间，您可以关闭此对话框
                </div>
              </div>
            </div>
          )}

          {/* 成功状态 */}
          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <div className="text-xl font-medium text-green-600 mb-2">
                提交成功！
              </div>
              <div className="text-muted-foreground mb-4">
                解析过程较耗时，约需几分钟，请耐心等待。您可关闭对话框或退出当前界面，解析完成后刷新页面查看模板。
              </div>
              <div className="text-sm text-muted-foreground">
                对话框将在 <span className="font-medium text-blue-600">{countdown}</span> 秒后自动关闭
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <div className="text-xl font-medium text-red-600 mb-2">
                  导入失败
                </div>
                <div className="text-muted-foreground">
                  {errorMessage}
                </div>
              </div>
              
              <div className="flex justify-center space-x-3">
                <Button variant="outline" onClick={handleClose}>
                  关闭
                </Button>
                <Button onClick={() => resetDialog()}>
                  重试
                </Button>
              </div>
            </div>
          )}

          {/* 底部按钮 */}
          {status === 'parsing' && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleClose}>
                关闭对话框
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleClose}>
                立即关闭
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}