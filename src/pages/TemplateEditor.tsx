import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts'
import { templateService } from '@/services/templateService'
import { Template } from '@/types/template'
import { PageLoading } from '@/components/LoadingSpinner'
import { ErrorDisplay } from '@/components/ErrorBoundary'
import { PSDImportDialog } from '@/pages/PSDImportDialog'
import { AddSliceDialog } from './template/AddSliceDialog'
import { toast } from 'sonner'
import {
  ArrowLeft, ZoomIn, ZoomOut,
  Move, Hand, FileUp, Grid3X3, X, Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LayerComponent } from './template/LayerComponent'
import { LayersPanel } from './template/LayersPanel'
import { SliceRegionsOverlay } from './template/SliceRegionsOverlay'
import { SlicePanel } from './template/SlicePanel'

export function TemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  
  // 本地状态管理
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载模板
  const loadTemplate = useCallback(async () => {
    if (!templateId) return

    try {
      setLoading(true)
      setError(null)
      const templateData = await templateService.getTemplate(templateId)
      setTemplate(templateData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载模板失败')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  // 更新分区
  const updateSlicing = async (regions: import('@/types/template').SliceRegion[]) => {
    if (!templateId) return

    try {
      await templateService.updateSlicing(templateId, regions)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新分区失败')
      throw err instanceof Error ? err : new Error(String(err))
    }
  }

  // 切换图层是否需要替换
  const handleToggleLayerForReplacement = async (layerId: string) => {
    if (!template || !templateId) return

    try {
      const currentLayerIds = template.layerIds || []
      const updatedLayerIds = currentLayerIds.includes(layerId)
        ? currentLayerIds.filter(id => id !== layerId)  // 移除
        : [...currentLayerIds, layerId]  // 添加

      // 调用后端API保存
      await templateService.updateReplacementLayers(templateId, updatedLayerIds)

      // 接口调用成功后更新本地状态
      setTemplate({
        ...template,
        layerIds: updatedLayerIds
      })

      toast.success(currentLayerIds.includes(layerId) ? '已移除替换标记' : '已标记为需要替换')
    } catch (error) {
      toast.error('更新替换图层失败，请重试')
      console.error('更新替换图层失败:', error)
    }
  }
  
  // 画布状态
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [highlightedLayerId, setHighlightedLayerId] = useState<string | null>(null)  // 需要高亮显示的图层ID
  const [zoom, setZoom] = useState(1.0)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [activeToolType, setActiveToolType] = useState<'select' | 'pan' | 'slice'>('select')
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const [showPSDImportDialog, setShowPSDImportDialog] = useState(false)
  const [showAddSliceDialog, setShowAddSliceDialog] = useState(false)
  const [showPreviewTip, setShowPreviewTip] = useState(true)
  
  
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 加载模板基本信息
  useEffect(() => {
    if (templateId && loadTemplate) {
      loadTemplate()
    }
  }, [templateId, loadTemplate])

  // 模板加载完成后重置画布偏移量
  useEffect(() => {
    if (template && !loading) {
      setCanvasOffset({ x: 0, y: 0 })
    }
  }, [template, loading])



  // Zoom 函数定义 - 保持视觉中心点不变
  const zoomIn = () => {
    if (!containerRef.current || !template) return

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
    const templateWidth = template.width || template.data?.width || 800
    const templateHeight = template.height || template.data?.height || 600
    const scrollContentWidth = Math.max(templateWidth * currentZoom + 400, window.innerWidth)
    const scrollContentHeight = Math.max(templateHeight * currentZoom + 400, window.innerHeight)
    const canvasWidth = templateWidth * currentZoom
    const canvasHeight = templateHeight * currentZoom

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
      const newScrollContentWidth = Math.max(templateWidth * newZoom + 400, window.innerWidth)
      const newScrollContentHeight = Math.max(templateHeight * newZoom + 400, window.innerHeight)
      const newCanvasWidth = templateWidth * newZoom
      const newCanvasHeight = templateHeight * newZoom

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
    if (!containerRef.current || !template) return

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
    const templateWidth = template.width || template.data?.width || 800
    const templateHeight = template.height || template.data?.height || 600
    const scrollContentWidth = Math.max(templateWidth * currentZoom + 400, window.innerWidth)
    const scrollContentHeight = Math.max(templateHeight * currentZoom + 400, window.innerHeight)
    const canvasWidth = templateWidth * currentZoom
    const canvasHeight = templateHeight * currentZoom

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
      const newScrollContentWidth = Math.max(templateWidth * newZoom + 400, window.innerWidth)
      const newScrollContentHeight = Math.max(templateHeight * newZoom + 400, window.innerHeight)
      const newCanvasWidth = templateWidth * newZoom
      const newCanvasHeight = templateHeight * newZoom

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

  // 快捷键配置（移除编辑相关功能，保持预览模式）
  useKeyboardShortcuts({
    [SHORTCUTS.ZOOM_IN]: zoomIn,
    [SHORTCUTS.ZOOM_OUT]: zoomOut,
    [SHORTCUTS.ZOOM_RESET]: resetZoom,
    [SHORTCUTS.ESCAPE]: () => {
      setSelectedLayerId(null)
      setHighlightedLayerId(null)
    }
  })

  // 选中图层并滚动到元素位置
  const selectLayer = (layerId: string) => {
    setSelectedLayerId(layerId)

    // 自动滚动到选中图层位置
    const layer = template?.data?.layers?.find(l => l.id === layerId)
    if (!layer || !containerRef.current || !template) return

    const container = containerRef.current

    // 计算滚动内容区域的尺寸
    const templateWidth = template.width || template.data?.width || 800
    const templateHeight = template.height || template.data?.height || 600
    const scrollContentWidth = Math.max(templateWidth * zoom + 400, window.innerWidth)
    const scrollContentHeight = Math.max(templateHeight * zoom + 400, window.innerHeight)
    const canvasWidth = templateWidth * zoom
    const canvasHeight = templateHeight * zoom
    
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

  // 从图层面板选择图层（带高亮效果）
  const selectLayerFromPanel = (layerId: string) => {
    // 先执行原有的选择逻辑（包括滚动定位）
    selectLayer(layerId)

    // 设置高亮效果，让该图层显示在最上层
    setHighlightedLayerId(layerId)
  }

  // 处理删除图层
  // 图层选择（预览模式，不支持编辑）
  const handleLayerClick = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation()
    selectLayer(layerId)
    // 清除高亮效果
    setHighlightedLayerId(null)
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
    } else {
      // 点击画布空白区域时，清除选中状态和高亮效果
      setSelectedLayerId(null)
      setHighlightedLayerId(null)
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

    // 预览模式不支持图层拖拽
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }



  const handleDeleteSlice = async (sliceId: string) => {
    if (!template?.slicing?.regions) return

    try {
      const updatedRegions = template.slicing.regions.filter(region => region.id !== sliceId)

      if (updatedRegions.length === 0) {
        // 如果删除后没有分区了，调用后端清除分区配置
        await updateSlicing([])

        // 接口调用成功后更新本地状态
        setTemplate({
          ...template,
          slicing: { regions: [] }
        })
        setActiveToolType('select')
        toast.success('已删除分区，已切回选择模式')
      } else {
        // 重新计算分区索引，保持ID
        const reindexedRegions = updatedRegions
          .sort((a, b) => {
            if (Math.abs(a.y - b.y) < 5) { // 同一行
              return a.x - b.x
            }
            return a.y - b.y
          })
          .map((region, index) => ({
            ...region,
            index: index + 1
          }))

        // 调用后端API保存
        await updateSlicing(reindexedRegions)

        // 接口调用成功后更新本地状态
        setTemplate({
          ...template,
          slicing: { regions: reindexedRegions }
        })
        toast.success('已删除分区')
      }
    } catch (error) {
      toast.error('删除分区失败，请重试')
      console.error('删除分区失败:', error)
    }
  }

  const handleAddSlice = () => {
    if (!template) return
    setShowAddSliceDialog(true)
  }

  const handleAddSliceConfirm = async (regionData: { x: number; y: number; width: number; height: number }) => {
    if (!template) return

    try {
      const existingRegions = template.slicing?.regions || []

      // 创建新分区，使用uuid库生成ID
      const newRegion = {
        id: uuidv4(),
        x: regionData.x,
        y: regionData.y,
        width: regionData.width,
        height: regionData.height,
        index: existingRegions.length + 1
      }

      // 包含现有分区和新分区的完整列表
      const allRegions = [...existingRegions, newRegion]

      // 调用后端API保存
      await updateSlicing(allRegions)

      // 接口调用成功后更新本地状态
      setTemplate({
        ...template,
        slicing: { regions: allRegions }
      })

    } catch (error) {
      toast.error('添加分区失败，请重试')
      console.error('添加分区失败:', error)
    }
  }

  

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
            <p className="text-sm text-gray-600">{template.width || template.data?.width || 800} × {template.height || template.data?.height || 600}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPSDImportDialog(true)}
            disabled={template?.status === 'processing' || template?.status === 'success'}
          >
            <FileUp className="w-4 h-4 mr-1" />
            {template?.status === 'processing' && '处理中...'}
            {template?.status === 'success' && '已导入'}
            {template?.status === 'failed' && '重新导入PSD'}
            {template?.status === 'pending' && '导入PSD'}
            {!template?.status && '导入PSD'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧工具栏 */}
        <div className="w-16 bg-white border-r flex-shrink-0 flex flex-col items-center py-4 space-y-2">
          {[
            { type: 'select', icon: Move, tooltip: '选择' },
            { type: 'pan', icon: Hand, tooltip: '手势拖拽' },
            { type: 'slice', icon: Grid3X3, tooltip: '分区切片' }
          ].map(({ type, icon: Icon, tooltip }) => (
            <Button
              key={type}
              variant={activeToolType === type ? 'default' : 'ghost'}
              size="sm"
              className="w-10 h-10"
              onClick={() => setActiveToolType(type as 'select' | 'pan' | 'slice')}
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

          {/* 可关闭的模板提示信息 */}
          {showPreviewTip && (
            <div className="bg-muted/50 border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Info className="w-4 h-4 text-amber-500" />
                  <div className="text-sm text-foreground">
                    <span className="font-medium text-amber-600">使用提示：</span>
                    <span className="text-orange-600 font-medium">模板编辑功能包含导入模板、分区切片、标记可替换图层等复杂操作，请务必在当前界面完成这些操作</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreviewTip(false)}
                  className="h-6 w-6 p-0 hover:bg-background/80"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

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
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">加载模板中...</div>
              </div>
            ) : template ? (
              /* 滚动内容区域 - 确保有足够空间滚动 */
              <div 
                style={{
                  minWidth: '100%',
                  minHeight: '100%',
                  width: Math.max((template.width || template.data?.width || 800) * zoom + 400, window.innerWidth - 64 - 384), // 减去左侧工具栏(64px)和右侧面板(384px)
                  height: Math.max((template.height || template.data?.height || 600) * zoom + 400, window.innerHeight - 56), // 减去顶部工具栏高度
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
                    width: (template.width || template.data?.width || 800) * zoom,
                    height: (template.height || template.data?.height || 600) * zoom,
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
                      onClick={(e) => handleLayerClick(e, layer.id)}
                    />
                  ))}

                  {/* 高亮图层：在最上层渲染被高亮的图层副本 */}
                  {highlightedLayerId && template.data?.layers && (
                    (() => {
                      const highlightLayer = template.data.layers.find(layer => layer.id === highlightedLayerId);
                      return highlightLayer ? (
                        <div
                          key={`highlight-${highlightLayer.id}`}
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            zIndex: 9999,
                            filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 20px rgba(59, 130, 246, 0.4))',
                            animation: 'pulse 1.5s ease-in-out infinite'
                          }}
                        >
                          <LayerComponent
                            layer={highlightLayer}
                            zoom={zoom}
                            isSelected={true}
                            activeToolType={activeToolType}
                            onClick={() => {}}
                          />
                        </div>
                      ) : null;
                    })()
                  )}
                  
                  {/* 分区可视化覆盖层 */}
                  <SliceRegionsOverlay
                    regions={template.slicing?.regions || []}
                    zoom={zoom}
                    canvasWidth={template.width || template.data?.width || 800}
                    canvasHeight={template.height || template.data?.height || 600}
                    isActive={activeToolType === 'slice'}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">未找到模板数据</div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧面板 - 图层面板/分区面板 */}
        <div className="w-96 bg-white border-l flex-shrink-0 flex flex-col">
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
              {activeToolType === 'slice' ? (
                <SlicePanel
                  regions={template.slicing?.regions || []}
                  onDeleteSlice={handleDeleteSlice}
                  onAddSlice={handleAddSlice}
                />
              ) : (
                <LayersPanel
                  layers={template.data?.layers || []}
                  selectedLayerId={selectedLayerId}
                  selectedLayerIds={template.layerIds || []}
                  onSelectLayer={selectLayerFromPanel}
                  onToggleLayerForReplacement={handleToggleLayerForReplacement}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PSD导入对话框 */}
      <PSDImportDialog
        open={showPSDImportDialog}
        onOpenChange={setShowPSDImportDialog}
        templateId={templateId}
      />

      {/* 添加分区对话框 */}
      {template && (
        <AddSliceDialog
          open={showAddSliceDialog}
          onOpenChange={setShowAddSliceDialog}
          canvasWidth={template.width || template.data?.width || 800}
          canvasHeight={template.height || template.data?.height || 600}
          existingRegions={template.slicing?.regions || []}
          onAddSlice={handleAddSliceConfirm}
        />
      )}
    </div>
  )
}


