import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DateTimePicker } from '@/components/ui/date-picker'
import { Search, ArrowLeft, Image, FileImage, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { coverProjectService, type TemplateSelectionItem, type SimpleImageInfo } from '@/services/coverProjectService'
import { toast } from 'sonner'

export function CoverTaskCreator() {
  const navigate = useNavigate()

  // AI项目相关状态
  const [aiProjects, setAiProjects] = useState<any[]>([])
  const [selectedAiProjects, setSelectedAiProjects] = useState<Set<string>>(new Set())
  const [aiProjectImages, setAiProjectImages] = useState<Record<string, SimpleImageInfo[]>>({})

  // AI项目筛选状态
  const [nameFilter, setNameFilter] = useState('')
  const [startTime, setStartTime] = useState<Date | undefined>()
  const [endTime, setEndTime] = useState<Date | undefined>()

  // AI项目分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(100)

  // 模板相关状态
  const [templates, setTemplates] = useState<TemplateSelectionItem[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [templateSearch, setTemplateSearch] = useState('')

  // 加载状态
  const [loadingAiProjects, setLoadingAiProjects] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [generating, setGenerating] = useState(false)

  // 项目详情状态
  const [viewingProject, setViewingProject] = useState<any | null>(null)
  const [projectImages, setProjectImages] = useState<SimpleImageInfo[]>([])
  const [loadingProjectImages, setLoadingProjectImages] = useState(false)

  // 模板详情状态
  const [viewingTemplate, setViewingTemplate] = useState<TemplateSelectionItem | null>(null)
  const [templateZoom, setTemplateZoom] = useState(0.5)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  // 获取AI项目列表
  const fetchAiProjects = async (page: number = currentPage) => {
    try {
      setLoadingAiProjects(true)

      // 确保 pageSize 是有效数字
      const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100

      const params: any = {
        page,
        limit: validPageSize,
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

      const response = await coverProjectService.getAIProjects(params)
      setAiProjects(response.data || [])
      setTotal(response.total || 0)
      setCurrentPage(response.page || page)
    } catch (err) {
      toast.error('加载AI项目失败')
      console.error('Error fetching AI projects:', err)
    } finally {
      setLoadingAiProjects(false)
    }
  }

  // 获取模板列表
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const params: any = {}
      if (templateSearch.trim()) {
        params.name = templateSearch.trim()
      }

      const response = await coverProjectService.getTemplates(params)
      setTemplates(response || [])
    } catch (err) {
      toast.error('加载模板失败')
      console.error('Error fetching templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  // 获取项目缩略图
  const fetchProjectImages = async (projectIds: string[]) => {
    if (projectIds.length === 0) return

    try {
      // 为每个项目获取前几张图片作为缩略图
      const promises = projectIds.map(async (projectId) => {
        try {
          const images = await coverProjectService.getProjectImages(projectId)
          return { projectId, images: images.slice(0, 4) } // 只取前4张作为缩略图
        } catch (err) {
          console.error(`Error fetching images for project ${projectId}:`, err)
          return { projectId, images: [] }
        }
      })

      const results = await Promise.all(promises)
      const imageMap: Record<string, SimpleImageInfo[]> = {}
      results.forEach(({ projectId, images }) => {
        imageMap[projectId] = images
      })

      setAiProjectImages(prev => ({ ...prev, ...imageMap }))
    } catch (err) {
      console.error('Error fetching project images:', err)
    }
  }

  useEffect(() => {
    fetchAiProjects(1)
    fetchTemplates()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates()
    }, 300)
    return () => clearTimeout(timer)
  }, [templateSearch])

  // 应用筛选 - 重置到第一页
  const handleApplyFilters = () => {
    fetchAiProjects(1)
  }

  // 重置筛选
  const handleResetFilters = () => {
    setNameFilter('')
    setStartTime(undefined)
    setEndTime(undefined)
    setCurrentPage(1)
    fetchAiProjects(1)
  }

  // 当选择的AI项目改变时，获取图片
  useEffect(() => {
    const newProjectIds = Array.from(selectedAiProjects).filter(
      id => !aiProjectImages[id]
    )
    if (newProjectIds.length > 0) {
      fetchProjectImages(newProjectIds)
    }
  }, [selectedAiProjects])

  // AI项目选择
  const toggleAiProject = (projectId: string) => {
    setSelectedAiProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  // 模板选择
  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(templateId)) {
        newSet.delete(templateId)
      } else {
        newSet.add(templateId)
      }
      return newSet
    })
  }

  // 查看项目详情
  const handleViewProject = async (project: any) => {
    try {
      setLoadingProjectImages(true)
      setViewingProject(project)
      const images = await coverProjectService.getProjectImages(project.id)
      setProjectImages(images)
    } catch (err) {
      toast.error('加载项目图片失败')
      console.error('Error loading project images:', err)
    } finally {
      setLoadingProjectImages(false)
    }
  }

  // 关闭项目详情
  const handleCloseProjectView = () => {
    setViewingProject(null)
    setProjectImages([])
  }

  // 查看模板详情
  const handleViewTemplate = (template: TemplateSelectionItem) => {
    setViewingTemplate(template)
    setTemplateZoom(0.5)
    setCanvasOffset({ x: 0, y: 0 })
    setIsPanning(false)
  }

  // 关闭模板详情
  const handleCloseTemplateView = () => {
    setViewingTemplate(null)
    setCanvasOffset({ x: 0, y: 0 })
    setIsPanning(false)
  }

  // 缩放控制
  const handleZoomIn = () => {
    setTemplateZoom(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setTemplateZoom(prev => Math.max(prev - 0.1, 0.1))
  }

  // 画布拖拽事件处理
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // 左键
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y

      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))

      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCanvasMouseUp = () => {
    setIsPanning(false)
  }

  // 开始生成
  const handleStartGeneration = async () => {
    if (selectedAiProjects.size === 0) {
      toast.error('请选择至少一个AI项目')
      return
    }

    if (selectedTemplates.size === 0) {
      toast.error('请选择至少一个模板')
      return
    }

    try {
      setGenerating(true)

      // 为每个模板创建任务
      const promises = Array.from(selectedTemplates).map(templateId =>
        coverProjectService.startCoverGeneration({
          templateId,
          aiProjectIds: Array.from(selectedAiProjects)
        })
      )

      await Promise.all(promises)

      toast.success(`成功创建 ${selectedAiProjects.size * selectedTemplates.size} 个套图任务`)
      navigate('/workspace/cover-generation')
    } catch (err) {
      toast.error('创建套图任务失败')
      console.error('Error starting generation:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/workspace/cover-generation')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-bold">创建套图任务</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              已选择 {selectedAiProjects.size} 个项目 × {selectedTemplates.size} 个模板 = {selectedAiProjects.size * selectedTemplates.size} 个任务
            </div>
            <Button
              onClick={handleStartGeneration}
              disabled={selectedAiProjects.size === 0 || selectedTemplates.size === 0 || generating}
              className="min-w-24"
            >
              {generating ? '创建中...' : '开始生成'}
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：AI项目选择 */}
        <div className="w-1/2 flex flex-col border-r bg-white relative">
          {/* 项目详情覆盖层 */}
          {viewingProject && (
            <div className="absolute inset-0 bg-white z-50 flex flex-col">
              {/* 顶部导航 */}
              <div className="p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseProjectView}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
              </div>

              {/* 图片展示区域 */}
              <div className="flex-1 overflow-auto p-4">
                {loadingProjectImages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">加载中...</div>
                  </div>
                ) : projectImages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-600 mb-2">该项目暂无图片</h3>
                      <p className="text-sm text-gray-500">等待AI生成完成后显示</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {projectImages.map((image, index) => (
                      <div key={image.id} className="aspect-square bg-gray-100 rounded overflow-hidden group hover:opacity-80 transition-opacity">
                        <img
                          src={image.imageUrl}
                          alt={`图片 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-b">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">选择图片项目</h2>
                <Badge variant="outline" className="text-blue-600">
                  已选择 {selectedAiProjects.size} 个
                </Badge>
              </div>
            </div>

            {/* 筛选器 */}
            <div className="bg-gray-50 px-4 py-3 border-t">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">项目名称:</label>
                  <div className="relative">
                    <Input
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                      placeholder="搜索项目名称"
                      className="w-40 pl-8"
                    />
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">开始时间:</label>
                  <DateTimePicker
                    date={startTime}
                    onDateChange={setStartTime}
                    placeholder="选择开始时间"
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">结束时间:</label>
                  <DateTimePicker
                    date={endTime}
                    onDateChange={setEndTime}
                    placeholder="选择结束时间"
                    className="w-40"
                  />
                </div>
                <Button onClick={handleApplyFilters} size="sm">
                  搜索
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  重置
                </Button>
              </div>
            </div>
          </div>

          {/* 项目列表和分页容器 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {loadingAiProjects ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : aiProjects.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Image className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  没有找到AI项目
                </div>
              </div>
            ) : (
              <>
                {/* 项目列表 - 可滚动区域 */}
                <div className="flex-1 overflow-auto">
                  <div className="bg-white border-l border-r border-t">
                  {/* 表头 */}
                  <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-5">
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        checked={aiProjects.length > 0 && aiProjects.every(p => selectedAiProjects.has(p.id))}
                        onChange={() => {
                          if (aiProjects.every(p => selectedAiProjects.has(p.id))) {
                            setSelectedAiProjects(new Set())
                          } else {
                            setSelectedAiProjects(new Set(aiProjects.map(p => p.id)))
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-1">缩略图</div>
                    <div className="col-span-4">项目名称</div>
                    <div className="col-span-2">任务统计</div>
                    <div className="col-span-2">创建时间</div>
                    <div className="col-span-2">操作</div>
                  </div>

                  {/* 项目列表 */}
                  {aiProjects.map((project) => {
                    const isSelected = selectedAiProjects.has(project.id)
                    const images = aiProjectImages[project.id] || []

                    return (
                      <div
                        key={project.id}
                        className={`grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleAiProject(project.id)}
                      >
                        {/* 选择框 */}
                        <div className="col-span-1 flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={() => toggleAiProject(project.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* 缩略图 */}
                        <div className="col-span-1 flex items-center">
                          <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                            {project.thumbnail ? (
                              <img
                                src={project.thumbnail}
                                alt={project.name}
                                className="w-full h-full object-cover"
                              />
                            ) : images.length > 0 ? (
                              <img
                                src={images[0].imageUrl}
                                alt={project.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 项目名称 */}
                        <div className="col-span-4 flex items-center">
                          <div className="font-medium text-gray-900 truncate">{project.name}</div>
                        </div>

                        {/* 任务统计 */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-sm text-gray-600">
                            总数:{project.totalTasks} 完成:{project.completedTasks}
                          </div>
                        </div>

                        {/* 创建时间 */}
                        <div className="col-span-2 flex items-center text-sm text-gray-500">
                          {new Date(project.createdAt).toLocaleString('zh-CN')}
                        </div>

                        {/* 操作 */}
                        <div className="col-span-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewProject(project)
                            }}
                          >
                            查看
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 分页控件 - 固定在底部 */}
              {total > 0 && (
                <div className="border-t border-l border-r bg-white p-4 flex-shrink-0">
                  <div className="flex items-center gap-4">
                    {/* 统计信息 */}
                    <div className="text-sm text-gray-500">
                      共 {total} 个项目
                    </div>

                    {/* 每页显示 */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">每页</label>
                      <Input
                        type="text"
                        value={pageSize}
                        onChange={(e) => {
                          const input = e.target.value
                          if (!/^\d*$/.test(input)) return
                          if (input === '') {
                            setPageSize('' as any)
                            return
                          }
                          const value = parseInt(input)
                          if (value >= 1 && value <= 200) {
                            setPageSize(value)
                          }
                        }}
                        onBlur={(e) => {
                          const input = e.target.value
                          const value = parseInt(input)
                          if (!input || !value || value < 1) {
                            setPageSize(100)
                          } else if (value > 200) {
                            setPageSize(200)
                          }
                        }}
                        className="w-16 h-8 text-sm text-center"
                      />
                      <span className="text-sm text-gray-600">条</span>
                    </div>

                    {/* 分隔线 */}
                    <div className="h-6 w-px bg-gray-300"></div>

                    {/* 上一页按钮 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAiProjects(currentPage - 1)}
                      disabled={currentPage <= 1 || loadingAiProjects}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一页
                    </Button>

                    {/* 页码按钮 */}
                    <div className="flex items-center gap-1">
                      {(() => {
                        const totalPages = Math.ceil(total / pageSize)
                        const maxVisiblePages = 7

                        if (totalPages <= maxVisiblePages) {
                          return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchAiProjects(page)}
                              disabled={loadingAiProjects}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))
                        }

                        const pages: (number | string)[] = []
                        if (currentPage <= 4) {
                          for (let i = 1; i <= 5; i++) pages.push(i)
                          pages.push('...')
                          pages.push(totalPages)
                        } else if (currentPage >= totalPages - 3) {
                          pages.push(1)
                          pages.push('...')
                          for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
                        } else {
                          pages.push(1)
                          pages.push('...')
                          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
                          pages.push('...')
                          pages.push(totalPages)
                        }

                        return pages.map((page, index) =>
                          typeof page === 'number' ? (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchAiProjects(page)}
                              disabled={loadingAiProjects}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ) : (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                          )
                        )
                      })()}
                    </div>

                    {/* 下一页按钮 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAiProjects(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(total / pageSize) || loadingAiProjects}
                    >
                      下一页
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    {/* 分隔线 */}
                    <div className="h-6 w-px bg-gray-300"></div>

                    {/* 跳转输入框 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">跳至</span>
                      <Input
                        type="text"
                        placeholder="页码"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget.value
                            const value = parseInt(input)
                            const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100
                            const maxPage = Math.ceil(total / validPageSize)

                            if (value >= 1 && value <= maxPage) {
                              fetchAiProjects(value)
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                        onChange={(e) => {
                          const input = e.target.value
                          if (!/^\d*$/.test(input)) {
                            e.target.value = input.replace(/\D/g, '')
                          }
                        }}
                        className="w-16 h-8 text-sm text-center"
                      />
                      <span className="text-sm text-gray-600">页</span>
                    </div>

                    {/* 总页数信息 */}
                    <span className="text-sm text-gray-500">
                      共 {Math.ceil(total / pageSize)} 页
                    </span>
                  </div>
                </div>
              )}
            </>
            )}
          </div>
        </div>

        {/* 右侧：模板选择 */}
        <div className="w-1/2 flex flex-col bg-white relative">
          {/* 模板详情覆盖层 */}
          {viewingTemplate && (
            <div className="absolute inset-0 bg-white z-50 flex flex-col">
              {/* 顶部导航和缩放控制 */}
              <div className="p-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseTemplateView}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={templateZoom <= 0.1}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-16 text-center">
                    {Math.round(templateZoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={templateZoom >= 2}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 模板画布区域 */}
              <div
                className="flex-1 overflow-hidden bg-gray-100"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{
                  cursor: isPanning ? 'grabbing' : 'grab'
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center p-4"
                  style={{
                    minWidth: Math.max(viewingTemplate.width * templateZoom + 200, 800),
                    minHeight: Math.max(viewingTemplate.height * templateZoom + 200, 600)
                  }}
                >
                  <div
                    className="bg-white shadow-lg rounded-lg overflow-hidden"
                    style={{
                      width: viewingTemplate.width * templateZoom,
                      height: viewingTemplate.height * templateZoom,
                      minWidth: '200px',
                      minHeight: '150px',
                      transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                      transition: isPanning ? 'none' : 'transform 0.3s ease-out'
                    }}
                  >
                    {viewingTemplate.thumbnailUrl ? (
                      <img
                        src={viewingTemplate.thumbnailUrl}
                        alt={viewingTemplate.name}
                        className="w-full h-full object-contain"
                        style={{
                          imageRendering: templateZoom > 1 ? 'crisp-edges' : 'auto'
                        }}
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <FileImage className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">选择模板</h2>
              <Badge variant="outline" className="text-green-600">
                已选择 {selectedTemplates.size} 个
              </Badge>
            </div>
            <div className="relative">
              <Input
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="搜索模板..."
                className="pl-8"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {loadingTemplates ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  没有找到模板
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <div className="bg-white">
                  {/* 表头 */}
                  <div className="grid grid-cols-16 gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-5">
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-green-600 focus:ring-green-500"
                        checked={templates.length > 0 && templates.every(t => selectedTemplates.has(t.id))}
                        onChange={() => {
                          if (templates.every(t => selectedTemplates.has(t.id))) {
                            setSelectedTemplates(new Set())
                          } else {
                            setSelectedTemplates(new Set(templates.map(t => t.id)))
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-1">缩略图</div>
                    <div className="col-span-4">模板名称</div>
                    <div className="col-span-2">尺寸</div>
                    <div className="col-span-2">可替换图片</div>
                    <div className="col-span-2">生成商品图</div>
                    <div className="col-span-2">创建时间</div>
                    <div className="col-span-2">操作</div>
                  </div>

                  {/* 模板列表 */}
                  {templates.map((template) => {
                    const isSelected = selectedTemplates.has(template.id)

                    return (
                      <div
                        key={template.id}
                        className={`grid grid-cols-16 gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-green-50' : ''
                        }`}
                        onClick={() => toggleTemplate(template.id)}
                      >
                        {/* 选择框 */}
                        <div className="col-span-1 flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                            checked={isSelected}
                            onChange={() => toggleTemplate(template.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

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
                        <div className="col-span-4 flex items-center">
                          <div className="font-medium text-gray-900 truncate">{template.name}</div>
                        </div>

                        {/* 尺寸 */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-sm text-gray-600">
                            {template.width} × {template.height}
                          </div>
                        </div>

                        {/* 可替换图片 */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-sm text-gray-600">
                            {template.layerCount || 0} 张
                          </div>
                        </div>

                        {/* 生成商品图 */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-sm text-gray-600">
                            {template.slicing?.regions?.length || 0} 张
                          </div>
                        </div>

                        {/* 创建时间 */}
                        <div className="col-span-2 flex items-center text-sm text-gray-500">
                          {new Date(template.createdAt).toLocaleString('zh-CN')}
                        </div>

                        {/* 操作 */}
                        <div className="col-span-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewTemplate(template)
                            }}
                          >
                            查看
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}