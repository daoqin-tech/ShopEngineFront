import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Package, Eye, X, ZoomIn, ZoomOut, RotateCcw, Check, Grid3X3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { coverProjectService, type TemplateSelectionItem } from '@/services/coverProjectService'
import { toast } from 'sonner'

interface TemplateSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTemplate: TemplateSelectionItem | null
  onTemplateSelect: (template: TemplateSelectionItem) => void
  onConfirm: () => void
}

export function TemplateSelectionDialog({
  open,
  onOpenChange,
  selectedTemplate,
  onTemplateSelect,
  onConfirm
}: TemplateSelectionDialogProps) {
  const [templates, setTemplates] = useState<TemplateSelectionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<TemplateSelectionItem | null>(null)
  
  // 预览功能状态
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const [showSlices, setShowSlices] = useState(true)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const params = searchQuery ? { name: searchQuery } : undefined
      const response = await coverProjectService.getTemplates(params)
      setTemplates(response || [])
    } catch (err) {
      console.error('加载模板失败:', err)
      toast.error('加载模板失败')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const handleConfirm = () => {
    if (!selectedTemplate) {
      toast.error('请先选择模板')
      return
    }
    onConfirm()
    onOpenChange(false)
  }

  // 预览功能处理函数
  const resetPreviewView = () => {
    setPreviewZoom(1)
    setPreviewOffset({ x: 0, y: 0 })
  }

  const handlePreviewZoomIn = () => {
    setPreviewZoom(prev => Math.min(prev * 1.2, 5))
  }

  const handlePreviewZoomOut = () => {
    setPreviewZoom(prev => Math.max(prev / 1.2, 0.1))
  }

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: previewOffset.x,
      offsetY: previewOffset.y
    })
    e.preventDefault()
  }

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    
    setPreviewOffset({
      x: dragStart.offsetX + deltaX,
      y: dragStart.offsetY + deltaY
    })
  }

  const handlePreviewMouseUp = () => {
    setIsDragging(false)
  }

  const handlePreviewWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setPreviewZoom(prev => Math.min(Math.max(prev * delta, 0.1), 5))
  }

  // 当预览模板改变时重置视图
  useEffect(() => {
    if (previewTemplate) {
      resetPreviewView()
    }
  }, [previewTemplate])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 - 磨砂效果 */}
      <div 
        className="fixed inset-0" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
        onClick={() => onOpenChange(false)}
      />
      
      {/* 对话框内容 */}
      <div className="relative bg-white rounded-lg w-[75vw] h-[80vh] flex flex-col shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">选择模板</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 模板展示区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-500">加载模板中...</div>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Package className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-xl text-gray-500 mb-2">暂无模板</p>
                <p className="text-sm text-gray-400">
                  {searchQuery ? '没有找到匹配的模板' : '还没有可用的模板'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`relative cursor-pointer border rounded-lg p-4 transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onTemplateSelect(template)}
                >
                  <div className="aspect-[4/3] bg-gray-100 rounded overflow-hidden mb-3">
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="p-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewTemplate(template)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-medium text-sm mb-2 text-center" title={template.name}>
                    {template.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <span>{template.width}×{template.height}</span>
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {template.slicing?.regions?.length || 0}张
                    </Badge>
                  </div>
                  
                  {selectedTemplate?.id === template.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedTemplate ? `已选择: ${selectedTemplate.name}` : '请选择一个模板'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedTemplate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              确认并开始生成
            </Button>
          </div>
        </div>
      </div>

      {/* 模板预览对话框 */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setPreviewTemplate(null)}
          />
          <div className="relative bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col">
            {/* 标题栏和控制按钮 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{previewTemplate.name}</h3>
              <div className="flex items-center gap-2">
                {/* 缩放控制按钮 */}
                <div className="flex items-center gap-1 mr-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviewZoomOut}
                    className="h-8 w-8 p-0"
                    title="缩小"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviewZoomIn}
                    className="h-8 w-8 p-0"
                    title="放大"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetPreviewView}
                    className="h-8 w-8 p-0"
                    title="重置视图"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={showSlices ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setShowSlices(!showSlices)}
                    className="h-8 w-8 p-0"
                    title={showSlices ? "隐藏切片" : "显示切片"}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* 图片预览区域 */}
            <div 
              ref={previewContainerRef}
              className="flex-1 overflow-hidden bg-gray-100 relative"
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
              onWheel={handlePreviewWheel}
              style={{ 
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            >
              <div 
                className="flex items-center justify-center w-full h-full"
                style={{
                  transform: `translate(${previewOffset.x}px, ${previewOffset.y}px)`
                }}
              >
                <div className="relative">
                  <img
                    src={previewTemplate.thumbnailUrl}
                    alt={previewTemplate.name}
                    className="max-w-none"
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'center center'
                    }}
                    draggable={false}
                  />
                  {/* 切片边界覆盖层 */}
                  {showSlices && previewTemplate.slicing?.regions && previewTemplate.slicing.regions.length > 0 && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        transform: `scale(${previewZoom})`,
                        transformOrigin: 'center center'
                      }}
                    >
                      {previewTemplate.slicing.regions.map((region) => (
                        <div
                          key={region.id}
                          className="absolute border-2 border-red-500 border-dashed bg-red-500/10"
                          style={{
                            left: `${(region.x / previewTemplate.width) * 100}%`,
                            top: `${(region.y / previewTemplate.height) * 100}%`,
                            width: `${(region.width / previewTemplate.width) * 100}%`,
                            height: `${(region.height / previewTemplate.height) * 100}%`
                          }}
                        >
                          <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded font-bold">
                            {region.index}
                          </div>
                          {previewZoom > 0.5 && (
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                              {region.width}×{region.height}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 底部信息栏 */}
            <div className="p-4 border-t bg-gray-50">
              <div className="text-center text-sm text-gray-600 mb-3">
                尺寸: {previewTemplate.width} × {previewTemplate.height} | {previewTemplate.slicing?.regions?.length || 0} 个切片
                <span className="ml-4 text-blue-600 font-medium">
                  {previewTemplate.slicing?.regions?.length ? 
                    `替换图片后，将生成 ${previewTemplate.slicing.regions.length} 张照片` : 
                    '未配置切片，将生成 1 张完整照片'
                  }
                </span>
              </div>
              
              {/* 切片详细信息 */}
              {previewTemplate.slicing?.regions && previewTemplate.slicing.regions.length > 0 && (
                <div className="max-h-20 overflow-y-auto">
                  <div className="text-xs text-gray-500 mb-1">切片详情:</div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {previewTemplate.slicing.regions
                      .sort((a, b) => a.index - b.index)
                      .map((region) => (
                        <div key={region.id} className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 border border-red-600 rounded-sm flex items-center justify-center text-white font-bold" style={{ fontSize: '8px' }}>
                            {region.index}
                          </div>
                          <span className="text-gray-600">
                            {region.width}×{region.height}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}