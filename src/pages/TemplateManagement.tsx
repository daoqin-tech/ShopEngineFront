import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Upload, X, FileImage, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type Template } from '@/types/template'
import { toast } from 'sonner'
import { templateService } from '@/services/templateService'

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
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

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

  // 开始编辑模板名称
  const startEditingName = (template: Template) => {
    setEditingTemplateId(template.id)
    setEditingName(template.name)
  }

  // 取消编辑
  const cancelEditing = () => {
    setEditingTemplateId(null)
    setEditingName('')
  }

  // 保存模板名称
  const saveTemplateName = async (templateId: string) => {
    if (!editingName.trim()) {
      toast.error('模板名称不能为空')
      return
    }

    try {
      await templateService.updateTemplateName(templateId, editingName.trim())
      
      // 更新本地状态
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId 
            ? { ...template, name: editingName.trim() }
            : template
        )
      )
      
      setEditingTemplateId(null)
      setEditingName('')
      toast.success('模板名称更新成功')
    } catch (error) {
      console.error('更新模板名称失败:', error)
      toast.error('更新模板名称失败')
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
          <Button onClick={handleCreateBlankTemplate}>
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
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* 模板信息 */}
            <div className="space-y-2">
              {editingTemplateId === template.id ? (
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveTemplateName(template.id)
                      } else if (e.key === 'Escape') {
                        cancelEditing()
                      }
                    }}
                    onBlur={() => saveTemplateName(template.id)}
                    className="flex-1 font-semibold text-lg"
                    autoFocus
                  />
                </div>
              ) : (
                <h3 
                  className="font-semibold text-lg truncate mb-4 cursor-text hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditingName(template)
                  }}
                >
                  {template.name}
                </h3>
              )}

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
          <p className="text-gray-600 mb-4">创建您的第一个空白模板</p>
          <Button onClick={handleCreateBlankTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            新建空白模板
          </Button>
        </div>
      )}

      {/* PSD上传对话框 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入PSD模板</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>PSD导入功能开发中...</p>
            <Button 
              className="mt-4" 
              onClick={() => setIsUploadDialogOpen(false)}
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

