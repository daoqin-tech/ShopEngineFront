import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Upload, FileImage, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DateTimePicker } from '@/components/ui/date-picker'
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

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // 筛选状态
  const [nameFilter, setNameFilter] = useState('')
  const [startTime, setStartTime] = useState<Date | undefined>()
  const [endTime, setEndTime] = useState<Date | undefined>()

  // 加载模板列表
  const loadTemplates = async (page: number = currentPage) => {
    try {
      setLoading(true)

      // 转换时间为秒级时间戳
      const params: any = {
        page,
        limit: pageSize,
      }

      if (nameFilter.trim()) {
        params.name = nameFilter.trim()
      }

      if (startTime) {
        params.startTime = Math.floor(startTime.getTime() / 1000)
      }

      if (endTime) {
        params.endTime = Math.floor(endTime.getTime() / 1000)
      }

      const response = await templateService.getTemplates(params)
      setTemplates(response.data || [])
      setTotal(response.total || 0)
      setCurrentPage(response.page || page)
    } catch (err: any) {
      // 如果异常就显示空模板列表
      setTemplates([])
      setTotal(0)
      toast.error('加载模板列表失败', {
        description: '请检查网络连接或稍后再试'
      })
      console.error('Error loading templates:', err)
    } finally {
      setLoading(false)
    }
  }

  // 应用筛选
  const handleApplyFilters = () => {
    setCurrentPage(1)
    loadTemplates(1)
  }

  // 重置筛选
  const handleResetFilters = () => {
    setNameFilter('')
    setStartTime(undefined)
    setEndTime(undefined)
    setCurrentPage(1)
    loadTemplates(1)
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
      
      // 重新加载模板列表以确保数据同步
      loadTemplates(currentPage)
      
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
        loadTemplates(currentPage)
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
    loadTemplates(1)
  }, [])


  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">模板管理</h1>
        <Button onClick={handleCreateBlankTemplate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建空白模板
        </Button>
      </div>

      {/* 筛选器 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">模板名称:</label>
            <div className="relative">
              <Input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="搜索模板名称"
                className="w-48 pl-8"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">开始时间:</label>
            <DateTimePicker
              date={startTime}
              onDateChange={setStartTime}
              placeholder="选择开始时间"
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">结束时间:</label>
            <DateTimePicker
              date={endTime}
              onDateChange={setEndTime}
              placeholder="选择结束时间"
              className="w-48"
            />
          </div>
          <Button onClick={handleApplyFilters} className="px-6">
            搜索
          </Button>
          <Button variant="outline" onClick={handleResetFilters}>
            重置
          </Button>
        </div>
      </div>

      {/* 模板列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileImage className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">还没有模板</h2>
          <p className="text-gray-500 mb-6">点击上方按钮创建您的第一个模板</p>
          <Button onClick={handleCreateBlankTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            新建空白模板
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700">
            <div className="col-span-1">缩略图</div>
            <div className="col-span-2">模板名称</div>
            <div className="col-span-2">尺寸(W×H)</div>
            <div className="col-span-2">可生成图片数</div>
            <div className="col-span-2">需替换图片数</div>
            <div className="col-span-2">创建时间</div>
            <div className="col-span-1">操作</div>
          </div>

          {/* 模板列表 */}
          {templates.map((template) => (
            <div
              key={template.id}
              className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 group"
            >
              {/* 缩略图 */}
              <div className="col-span-1 flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* 模板名称 */}
              <div className="col-span-2 flex items-center">
                {editingTemplateId === template.id ? (
                  <div className="flex items-center gap-2 w-full">
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
                      className="text-sm"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <div
                    className="font-medium hover:text-blue-600 cursor-text"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditingName(template)
                    }}
                    title="点击编辑名称"
                  >
                    {template.name}
                  </div>
                )}
              </div>

              {/* 尺寸信息 */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-600">
                  {template.width || template.data?.width || '-'} × {template.height || template.data?.height || '-'}
                </span>
              </div>

              {/* 生成图片数 */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-600">
                  {template.regionsCount || template.slicing?.regions?.length || 0} 张
                </span>
              </div>

              {/* 可替换图层数 */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-600">
                  {template.layerIdsCount || template.layerIds?.length || 0} 个
                </span>
              </div>

              {/* 创建时间 */}
              <div className="col-span-2 flex items-center text-sm text-gray-500">
                {formatDate(template.createdAt)}
              </div>

              {/* 操作 */}
              <div className="col-span-1 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/workspace/template/${template.id}`)
                  }}
                >
                  查看
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-red-500 hover:text-red-700 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTemplate(template.id)
                  }}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页控件 */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTemplates(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
          >
            上一页
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => loadTemplates(page)}
                disabled={loading}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTemplates(currentPage + 1)}
            disabled={currentPage >= Math.ceil(total / pageSize) || loading}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 页面信息 */}
      {total > 0 && (
        <div className="text-center text-sm text-gray-500">
          共 {total} 个模板，第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
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

