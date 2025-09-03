import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Upload, X, FileImage, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { type Template } from '@/types/template'
import { toast } from 'sonner'
import { templateService } from '@/services/templateService'
import { uploadPSDToTencentCloud } from '@/lib/tencentCloud'

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function TemplateManagement() {
  const navigate = useNavigate()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)

  // 加载模板列表
  const loadTemplates = async () => {
    try {
      setLoading(true)
      const templates = await templateService.getTemplates()
      setTemplates(templates)
    } catch (err: any) {
      // 如果异常就显示空模板列表
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  // 删除模板
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('确定要删除这个模板吗？此操作无法撤销。')) {
      try {
        await templateService.deleteTemplate(templateId)
        toast.success('模板删除成功')
        // 重新加载模板列表
        loadTemplates()
      } catch (err: any) {
        toast.error(err.response?.data?.message || '删除模板失败')
      }
    }
  }

  // 创建空白模板
  const handleCreateBlankTemplate = async () => {
    try {
      const template = await templateService.createTemplate()
      toast.success('模板创建成功')
      // 跳转到模板编辑页面
      navigate(`/workspace/template/${template.id}`)
    } catch (err: any) {
      toast.error('创建模板失败')
    }
  }

  // 初始化加载模板
  useEffect(() => {
    loadTemplates()
  }, [])


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板管理</h1>
        </div>
        
        <div className="flex space-x-3">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                导入PSD
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>导入PSD模板</DialogTitle>
              </DialogHeader>
              <PSDUploadForm onClose={() => setIsUploadDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleCreateBlankTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            新建空白模板
          </Button>
        </div>
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white relative group"
            onClick={() => navigate(`/workspace/template/${template.id}`)}
          >
            {/* 删除按钮 - hover时显示 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 bg-red-50 hover:text-red-700 hover:bg-red-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteTemplate(template.id)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 缩略图区域 */}
            <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
              {template.thumbnailUrl ? (
                <img
                  src={template.thumbnailUrl}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* 模板信息 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg truncate mb-4">
                {template.name}
              </h3>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <FileImage className="w-4 h-4" />
                  <span>{template.data?.layers?.length || 0} 图层</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(template.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">加载中...</div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && templates.length === 0 && (
        <div className="text-center py-12">
          <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无模板</h3>
          <p className="text-gray-600 mb-4">开始导入您的第一个PSD模板</p>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            导入PSD模板
          </Button>
        </div>
      )}
    </div>
  )
}

// PSD上传表单组件  
function PSDUploadForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = (selectedFile: File) => {
    if (selectedFile.type !== 'application/octet-stream' && !selectedFile.name.endsWith('.psd')) {
      return
    }
    
    if (selectedFile.size > 100 * 1024 * 1024) {
      return
    }
    
    setFile(selectedFile)
    // 选择文件后自动开始上传
    handleSubmit(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileChange(files[0])
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


  const handleSubmit = async (uploadFile: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)
      
      // 上传文件到腾讯云，显示进度
      await uploadPSDToTencentCloud(uploadFile, (progress) => {
        setUploadProgress(progress)
      })
      
      // 调用后端API处理PSD文件，传递文件URL
      // 实际项目中应该将 fileUrl 传递给后端而不是 file 对象
      const templateName = uploadFile.name.replace('.psd', '')
      const response = await templateService.uploadPSD(uploadFile, templateName)
      
      // 这里可以将 fileUrl 传递给后端，例如：
      // const response = await templateService.processPSDFromUrl(fileUrl, templateName)
      
      toast.success('PSD上传成功')
      onClose()
      // 跳转到模板编辑页面
      navigate(`/workspace/template/${response.templateId}`)
    } catch (err: any) {
      // 如果上传失败，静默处理
      toast.error('上传失败')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* 拖拽上传区域 */}
      <div className="flex items-center justify-center p-8">
        <div 
          className={`w-full h-64 border-2 border-dashed rounded-2xl text-center transition-all duration-300 ${
            uploading 
              ? 'border-primary/50 bg-primary/5 cursor-wait' 
              : isDragging 
                ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl cursor-pointer' 
                : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/20 hover:shadow-lg cursor-pointer'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && document.getElementById('psd-file-input')?.click()}
        >
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl flex items-center justify-center shadow-lg">
              {uploading ? (
                <svg className="w-10 h-10 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <Upload className="w-10 h-10 text-blue-600" />
              )}
            </div>
            
            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-semibold text-foreground/90">
                {uploading ? '正在上传PSD文件' : '选择或拖拽PSD文件'}
              </h3>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {uploading 
                  ? '请稍等，正在处理您的文件...'
                  : '支持 PSD 格式文件，最大 100MB\n文件选择后将自动开始上传'
                }
              </p>
            </div>

            <input
              id="psd-file-input"
              type="file"
              accept=".psd"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* 选中的文件信息 */}
      {file && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">{file.name}</p>
              <p className="text-xs text-green-600">
                大小: {(file.size / 1024 / 1024).toFixed(2)}MB
              </p>
            </div>
            {!uploading && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFile(null)}
                className="text-green-700 hover:text-green-800"
              >
                ×
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 上传进度条 */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm">上传进度</Label>
            <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            正在上传到腾讯云并解析PSD文件...
          </p>
        </div>
      )}


    </div>
  )
}