import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTemplate } from '@/hooks/useTemplate'
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts'
import { PageLoading } from '@/components/LoadingSpinner'
import { ErrorDisplay } from '@/components/ErrorBoundary'
import { PSDImportDialog } from '@/components/PSDImportDialog'
import { toast } from 'sonner'
import { 
  ArrowLeft, Save, Undo2, Redo2, ZoomIn, ZoomOut,
  Move, Hand, FileUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LayerComponent } from './template/LayerComponent'
import { LayersPanel } from './template/LayersPanel'

export function TemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  
  // 使用模板Hook
  const {
    template,
    loading,
    error,
    canUndo,
    canRedo,
    updateLayer,
    deleteLayer,
    undo,
    redo,
    saveTemplate,
    loadTemplate
  } = useTemplate(templateId || null)
  
  // 画布状态
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1.0)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [activeToolType, setActiveToolType] = useState<'select' | 'pan'>('select')
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const [showPSDImportDialog, setShowPSDImportDialog] = useState(false)
  
  
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 加载模板基本信息
  useEffect(() => {
    if (templateId && loadTemplate) {
      loadTemplate()
    }
  }, [templateId, loadTemplate])



  // Zoom 函数定义 - 保持视觉中心点不变
  const zoomIn = () => {
    if (!containerRef.current || !template?.data) return
    
    const container = containerRef.current
    const currentZoom = zoom
    const newZoom = Math.min(currentZoom * 1.2, 3)
    
    if (newZoom === currentZoom) return
    
    // 获取当前滚动位置和容器中心点
    const scrollLeft = container.scrollLeft
    const scrollTop = container.scrollTop
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    // 获取滚动内容区域和画布的信息
    const scrollContentWidth = Math.max((template.data.width || 800) * currentZoom + 400, window.innerWidth)
    const scrollContentHeight = Math.max((template.data.height || 600) * currentZoom + 400, window.innerHeight)
    const canvasWidth = (template.data.width || 800) * currentZoom
    const canvasHeight = (template.data.height || 600) * currentZoom
    
    // 画布在滚动内容区域中的起始位置（由于居中）
    const canvasStartX = (scrollContentWidth - canvasWidth) / 2
    const canvasStartY = (scrollContentHeight - canvasHeight) / 2
    
    // 计算当前视觉中心点（相对于画布坐标系）
    const centerX = (scrollLeft + containerWidth / 2 - canvasStartX) / currentZoom
    const centerY = (scrollTop + containerHeight / 2 - canvasStartY) / currentZoom
    
    setZoom(newZoom)
    
    // 缩放后调整滚动位置，保持相同的视觉中心点
    requestAnimationFrame(() => {
      // 计算新的滚动内容区域信息
      const newScrollContentWidth = Math.max((template.data.width || 800) * newZoom + 400, window.innerWidth)
      const newScrollContentHeight = Math.max((template.data.height || 600) * newZoom + 400, window.innerHeight)
      const newCanvasWidth = (template.data.width || 800) * newZoom
      const newCanvasHeight = (template.data.height || 600) * newZoom
      
      // 新的画布起始位置
      const newCanvasStartX = (newScrollContentWidth - newCanvasWidth) / 2
      const newCanvasStartY = (newScrollContentHeight - newCanvasHeight) / 2
      
      // 计算新的滚动位置，保持相同的画布中心点在视觉中心
      const newScrollLeft = centerX * newZoom + newCanvasStartX - containerWidth / 2
      const newScrollTop = centerY * newZoom + newCanvasStartY - containerHeight / 2
      
      container.scrollLeft = Math.max(0, newScrollLeft)
      container.scrollTop = Math.max(0, newScrollTop)
    })
  }

  const zoomOut = () => {
    if (!containerRef.current || !template?.data) return
    
    const container = containerRef.current
    const currentZoom = zoom
    const newZoom = Math.max(currentZoom / 1.2, 0.1)
    
    if (newZoom === currentZoom) return
    
    // 获取当前滚动位置和容器中心点
    const scrollLeft = container.scrollLeft
    const scrollTop = container.scrollTop
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    // 获取滚动内容区域和画布的信息
    const scrollContentWidth = Math.max((template.data.width || 800) * currentZoom + 400, window.innerWidth)
    const scrollContentHeight = Math.max((template.data.height || 600) * currentZoom + 400, window.innerHeight)
    const canvasWidth = (template.data.width || 800) * currentZoom
    const canvasHeight = (template.data.height || 600) * currentZoom
    
    // 画布在滚动内容区域中的起始位置（由于居中）
    const canvasStartX = (scrollContentWidth - canvasWidth) / 2
    const canvasStartY = (scrollContentHeight - canvasHeight) / 2
    
    // 计算当前视觉中心点（相对于画布坐标系）
    const centerX = (scrollLeft + containerWidth / 2 - canvasStartX) / currentZoom
    const centerY = (scrollTop + containerHeight / 2 - canvasStartY) / currentZoom
    
    setZoom(newZoom)
    
    // 缩放后调整滚动位置，保持相同的视觉中心点
    requestAnimationFrame(() => {
      // 计算新的滚动内容区域信息
      const newScrollContentWidth = Math.max((template.data.width || 800) * newZoom + 400, window.innerWidth)
      const newScrollContentHeight = Math.max((template.data.height || 600) * newZoom + 400, window.innerHeight)
      const newCanvasWidth = (template.data.width || 800) * newZoom
      const newCanvasHeight = (template.data.height || 600) * newZoom
      
      // 新的画布起始位置
      const newCanvasStartX = (newScrollContentWidth - newCanvasWidth) / 2
      const newCanvasStartY = (newScrollContentHeight - newCanvasHeight) / 2
      
      // 计算新的滚动位置，保持相同的画布中心点在视觉中心
      const newScrollLeft = centerX * newZoom + newCanvasStartX - containerWidth / 2
      const newScrollTop = centerY * newZoom + newCanvasStartY - containerHeight / 2
      
      container.scrollLeft = Math.max(0, newScrollLeft)
      container.scrollTop = Math.max(0, newScrollTop)
    })
  }

  const resetZoom = () => {
    setZoom(1.0)
  }

  // 快捷键配置
  useKeyboardShortcuts({
    [SHORTCUTS.SAVE]: async () => {
      try {
        await saveTemplate()
        toast.success('模板已保存')
      } catch (error) {
        toast.error('保存失败，请稍后重试')
      }
    },
    [SHORTCUTS.UNDO]: undo,
    [SHORTCUTS.REDO]: redo,
    [SHORTCUTS.DELETE]: () => {
      if (selectedLayerId) {
        handleDeleteLayer(selectedLayerId)
      }
    },
    [SHORTCUTS.ZOOM_IN]: zoomIn,
    [SHORTCUTS.ZOOM_OUT]: zoomOut,
    [SHORTCUTS.ZOOM_RESET]: resetZoom,
    [SHORTCUTS.ESCAPE]: () => {
      setSelectedLayerId(null)
    }
  })

  // 选中图层并滚动到元素位置
  const selectLayer = (layerId: string) => {
    setSelectedLayerId(layerId)
    
    // 自动滚动到选中图层位置
    const layer = template?.data?.layers?.find(l => l.id === layerId)
    if (!layer || !containerRef.current || !template?.data) return
    
    const container = containerRef.current
    
    // 计算滚动内容区域的尺寸
    const scrollContentWidth = Math.max((template.data.width || 800) * zoom + 400, window.innerWidth)
    const scrollContentHeight = Math.max((template.data.height || 600) * zoom + 400, window.innerHeight)
    const canvasWidth = (template.data.width || 800) * zoom
    const canvasHeight = (template.data.height || 600) * zoom
    
    // 画布在滚动内容区域中的起始位置（由于居中）
    const canvasStartX = (scrollContentWidth - canvasWidth) / 2
    const canvasStartY = (scrollContentHeight - canvasHeight) / 2
    
    // 计算图层在滚动区域中的实际位置
    const layerCenterX = canvasStartX + (layer.x + layer.width / 2) * zoom
    const layerCenterY = canvasStartY + (layer.y + layer.height / 2) * zoom
    
    // 计算容器中心位置
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    // 计算目标滚动位置，使图层在视口中心
    const targetScrollLeft = layerCenterX - containerWidth / 2
    const targetScrollTop = layerCenterY - containerHeight / 2
    
    // 平滑滚动到目标位置
    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    })
  }

  // 处理删除图层
  const handleDeleteLayer = async (layerId: string) => {
    try {
      await deleteLayer(layerId)
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null)
      }
      toast.success('图层已删除')
    } catch (error) {
      toast.error('删除失败，请稍后重试')
    }
  }



  // 图层拖拽
  const handleLayerMouseDown = (e: React.MouseEvent, layerId: string) => {
    // 在手势模式下，不处理图层拖拽，让事件冒泡到画布容器
    if (activeToolType === 'pan') {
      return
    }
    
    e.stopPropagation()
    selectLayer(layerId)
    
    const layer = template?.data?.layers?.find(l => l.id === layerId)
    if (!layer) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX - layer.x * zoom,
      y: e.clientY - layer.y * zoom
    })
  }

  // 画布容器鼠标按下事件
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (activeToolType === 'pan') {
      setIsPanning(true)
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // 处理画布拖拽
    if (isPanning) {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      const targetOffsetX = panStart.offsetX + deltaX
      const targetOffsetY = panStart.offsetY + deltaY
      
      // 应用边界约束
      setCanvasOffset({ x: targetOffsetX, y: targetOffsetY })
      return
    }

    // 处理图层拖拽
    if (!isDragging || !selectedLayerId || !template) return

    const layer = template?.data?.layers?.find(l => l.id === selectedLayerId)
    if (!layer) return

    const newX = (e.clientX - dragStart.x) / zoom
    const newY = (e.clientY - dragStart.y) / zoom

    updateLayer(selectedLayerId, { x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsPanning(false)
  }

  // 获取选中的图层
  const selectedLayer = template?.data?.layers?.find(l => l.id === selectedLayerId)
  

  // 加载状态
  if (loading) {
    return <PageLoading text="加载模板中..." />
  }

  // 错误状态
  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => window.location.reload()}
        className="h-screen flex items-center justify-center"
      />
    )
  }

  // 模板不存在
  if (!template) {
    return (
      <ErrorDisplay 
        error="模板不存在或已被删除" 
        onRetry={() => navigate('/workspace/template-management')}
        className="h-screen flex items-center justify-center"
      />
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/template-management')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="font-semibold">{template.name}</h1>
            <p className="text-sm text-gray-600">{template.data?.width} × {template.data?.height}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPSDImportDialog(true)}>
            <FileUp className="w-4 h-4 mr-1" />
            导入PSD
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
            <Redo2 className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm">
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧工具栏 */}
        <div className="w-16 bg-white border-r flex-shrink-0 flex flex-col items-center py-4 space-y-2">
          {[
            { type: 'select', icon: Move, tooltip: '选择' },
            { type: 'pan', icon: Hand, tooltip: '手势拖拽' }
          ].map(({ type, icon: Icon, tooltip }) => (
            <Button
              key={type}
              variant={activeToolType === type ? 'default' : 'ghost'}
              size="sm"
              className="w-10 h-10"
              onClick={() => setActiveToolType(type as any)}
              title={tooltip}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
          
          {/* 分隔线 */}
          <div className="w-8 h-px bg-gray-300 my-2"></div>
          
          {/* 缩放控制 */}
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10"
            onClick={zoomIn}
            title="点击放大"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          {/* 缩放百分比显示 */}
          <div className="text-xs text-gray-600 font-mono py-1">
            {Math.round(zoom * 100)}%
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10"
            onClick={zoomOut}
            title="点击缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>

        {/* 中央画布区域 */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* 画布容器 */}
          <div 
            ref={containerRef}
            className="flex-1 bg-gray-100 overflow-auto"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ 
              cursor: activeToolType === 'pan' 
                ? (isPanning ? 'grabbing' : 'grab') 
                : 'default' 
            }}
          >
            {/* 滚动内容区域 - 确保有足够空间滚动 */}
            <div 
              style={{
                minWidth: '100%',
                minHeight: '100%',
                width: Math.max((template.data?.width || 800) * zoom + 400, window.innerWidth),
                height: Math.max((template.data?.height || 600) * zoom + 400, window.innerHeight),
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                ref={canvasRef}
                className="relative bg-white shadow-lg"
                style={{
                  width: (template.data?.width || 800) * zoom,
                  height: (template.data?.height || 600) * zoom,
                  transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                  overflow: 'hidden', // 裁剪超出画布边界的元素
                  transition: isPanning ? 'none' : 'transform 0.3s ease-out', // 拖拽时禁用过渡
                  cursor: activeToolType === 'pan' 
                    ? (isPanning ? 'grabbing' : 'grab') 
                    : 'default'
                }}
              >
                {/* 渲染图层 */}
                {template.data?.layers?.map(layer => (
                  <LayerComponent
                    key={layer.id}
                    layer={layer}
                    zoom={zoom}
                    isSelected={selectedLayerId === layer.id}
                    activeToolType={activeToolType}
                    onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧面板 - 图层面板 */}
        <div className="w-96 bg-white border-l flex-shrink-0 flex flex-col">
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
              <LayersPanel
                layers={template.data?.layers || []}
                selectedLayerId={selectedLayerId}
                onSelectLayer={selectLayer}
                onUpdateLayer={updateLayer}
              />
            </div>
            
            {/* 选中图层的基础信息预览 */}
            {selectedLayer && (
              <div className="border-t bg-gray-50 p-3 flex-shrink-0">
                <div className="text-sm">
                  <div className="font-medium text-gray-800 mb-1 truncate">
                    {selectedLayer.name}
                  </div>
                  <div className="text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>位置:</span>
                      <span>{Math.round(selectedLayer.x)}, {Math.round(selectedLayer.y)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>尺寸:</span>
                      <span>{Math.round(selectedLayer.width)} × {Math.round(selectedLayer.height)}</span>
                    </div>
                    {selectedLayer.type === 'image' && (
                      <div className="text-center text-xs text-green-600 mt-2">
                        {selectedLayer.replaceable ? '✓ 已标记为可替换' : '未标记为可替换'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PSD导入对话框 */}
      <PSDImportDialog
        open={showPSDImportDialog}
        onOpenChange={setShowPSDImportDialog}
        projectId={templateId}
      />
    </div>
  )
}


