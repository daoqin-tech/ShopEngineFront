import { useState, useEffect, useCallback } from 'react'
import { Package, Eye, Image, Check, Search, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { type GeneratedCover } from '@/types/template'
import { coverProjectService, type SimpleImageInfo, type TemplateSelectionItem } from '@/services/coverProjectService'

// AI项目接口
interface AIProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  imageCount: number
  thumbnail?: string
}

interface GenerationResultStepProps {
  generatedCovers: GeneratedCover[]
  isGenerating: boolean
  generationStatus: {
    completedTasks: number
    totalTasks: number
  } | null
  selectedProjects: Set<string>
  onProjectsSelect: (projects: Set<string>) => void
  selectedTemplate: TemplateSelectionItem | null
}

export function GenerationResultStep({
  generatedCovers,
  isGenerating,
  generationStatus,
  selectedProjects,
  onProjectsSelect,
  selectedTemplate
}: GenerationResultStepProps) {
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  const [projectImages, setProjectImages] = useState<Record<string, SimpleImageInfo[]>>({})
  const [loadingImages, setLoadingImages] = useState(false)
  
  // 项目选择相关状态
  const [aiProjects, setAiProjects] = useState<AIProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMaterialPanel, setShowMaterialPanel] = useState(false)

  // 加载项目图片
  const loadProjectImages = useCallback(async () => {
    if (selectedProjects.size === 0) return
    
    try {
      setLoadingImages(true)
      const projectIds = Array.from(selectedProjects)
      const images = await coverProjectService.batchGetImages(projectIds)
      setProjectImages(images)
    } catch (err) {
      console.error('加载项目图片失败:', err)
      toast.error('加载项目图片失败')
    } finally {
      setLoadingImages(false)
    }
  }, [selectedProjects])

  // 加载AI项目列表
  const loadAIProjects = useCallback(async () => {
    try {
      setLoadingProjects(true)
      const params = {
        page: 1,
        limit: 50,
        ...(searchQuery && { name: searchQuery })
      }
      const response = await coverProjectService.getAIProjects(params)
      setAiProjects(response.data || [])
    } catch (err) {
      console.error('加载AI项目失败:', err)
      toast.error('加载AI项目失败')
    } finally {
      setLoadingProjects(false)
    }
  }, [searchQuery])

  // 当选中的项目改变时，重新加载图片
  useEffect(() => {
    loadProjectImages()
  }, [selectedProjects, loadProjectImages])

  // 加载AI项目列表
  useEffect(() => {
    loadAIProjects()
  }, [loadAIProjects])


  // 处理项目选择
  const handleProjectSelect = (projectId: string) => {
    const newSelected = new Set(selectedProjects)
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId)
    } else {
      newSelected.add(projectId)
    }
    onProjectsSelect(newSelected)
  }

  // 查看项目素材
  const handleViewMaterials = () => {
    setShowMaterialPanel(true)
  }


  return (
    <>
      <div className="h-full flex flex-col">
        {/* 生成进度条 */}
        {isGenerating && generationStatus && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">正在生成套图...</span>
              <span className="text-sm text-gray-600">
                {generationStatus.completedTasks}/{generationStatus.totalTasks}
              </span>
            </div>
            <Progress 
              value={(generationStatus.completedTasks / generationStatus.totalTasks) * 100} 
              className="h-2" 
            />
          </div>
        )}

        {/* 主要内容区域：左右分栏 */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* 左侧：项目素材区域 */}
          <div className="flex-1 bg-white rounded-lg border p-6 flex flex-col relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium">项目素材</h3>
                <Badge variant="secondary">{selectedProjects.size} 个项目</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewMaterials}
                className="flex items-center gap-1"
              >
                查看素材
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            
            {/* 项目选择界面 */}
            <div className="flex-1 flex flex-col">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索项目..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loadingProjects ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-gray-500">加载项目中...</div>
                    </div>
                  </div>
                ) : aiProjects.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 mb-1">暂无项目</p>
                      <p className="text-sm text-gray-400">
                        {searchQuery ? '没有找到匹配的项目' : '还没有可用的项目'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {aiProjects.map(project => (
                      <div
                        key={project.id}
                        className={`relative cursor-pointer border rounded-lg p-2 transition-all hover:shadow-md ${
                          selectedProjects.has(project.id)
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleProjectSelect(project.id)}
                      >
                        <div className="aspect-[4/3] bg-gray-100 rounded overflow-hidden mb-2">
                          {project.thumbnail ? (
                            <img
                              src={project.thumbnail}
                              alt={project.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-medium text-xs text-center mb-1 truncate" title={project.name}>
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 text-center">
                          {project.imageCount}张
                        </p>
                        
                        {selectedProjects.has(project.id) && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* 素材面板滑动覆盖层 */}
            <div 
              className={`absolute inset-0 bg-white rounded-lg border flex flex-col transition-transform duration-300 ease-in-out ${
                showMaterialPanel ? 'transform translate-x-0' : 'transform -translate-x-full'
              }`}
              style={{ zIndex: showMaterialPanel ? 10 : -1 }}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-medium">项目图片</h3>
                  <Badge variant="secondary">{selectedProjects.size} 个项目</Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMaterialPanel(false)}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" />
                  返回
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {loadingImages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-gray-500">加载项目图片中...</div>
                    </div>
                  </div>
                ) : Object.keys(projectImages).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(projectImages).map(([projectId, images]) => (
                      <div key={projectId}>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          项目 {projectId} ({images.length} 张图片)
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          {images.map((image, index) => (
                            <div key={image.id}>
                              <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                                <img
                                  src={image.imageUrl}
                                  alt={`项目图片 ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1 text-center truncate">
                                {image.width}×{image.height}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Image className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 mb-1">选中项目暂无图片</p>
                      <p className="text-sm text-gray-400">已选择 {selectedProjects.size} 个项目</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：生成结果区域 */}
          <div className="flex-1 bg-white rounded-lg border p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium">生成结果</h3>
              {generatedCovers.length > 0 && (
                <Badge variant="secondary">{generatedCovers.length} 张套图</Badge>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {generatedCovers.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {generatedCovers.map((cover, index) => (
                    <div key={cover.id} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                        <img
                          src={cover.thumbnailUrl}
                          alt={`生成结果 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setPreviewImageIndex(index)
                              setShowPreviewDialog(true)
                            }}
                            className="p-1 h-auto"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        结果 {index + 1}
                      </p>
                    </div>
                  ))}
                </div>
              ) : selectedProjects.size === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-1">请先选择项目</p>
                    <p className="text-sm text-gray-400">从左侧选择AI项目作为素材</p>
                  </div>
                </div>
              ) : !selectedTemplate ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Image className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-1">请先选择模板</p>
                    <p className="text-sm text-gray-400">点击上方按钮选择模板并开始生成</p>
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 mb-1">生成中...</p>
                    <p className="text-sm text-gray-400">请耐心等待套图生成完成</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Image className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-1">暂无生成结果</p>
                    <p className="text-sm text-gray-400">点击开始生成按钮创建套图</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 预览对话框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              预览套图 {previewImageIndex + 1} / {generatedCovers.length}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {generatedCovers[previewImageIndex] && (
              <img
                src={generatedCovers[previewImageIndex].imageUrl}
                alt={`预览 ${previewImageIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              onClick={() => setPreviewImageIndex(prev => Math.max(0, prev - 1))}
              disabled={previewImageIndex === 0}
            >
              上一张
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
            >
              关闭
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewImageIndex(prev => Math.min(generatedCovers.length - 1, prev + 1))}
              disabled={previewImageIndex === generatedCovers.length - 1}
            >
              下一张
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}