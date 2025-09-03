import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ArrowLeft, Upload, Download, Trash2, ZoomIn, ZoomOut,
  Play, Pause, FileImage, Package, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  type Template, 
  type ReplacementImage, 
  type GeneratedCover,
  LayerType 
} from '@/types/template'

export function CoverEditor() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('templateId')
  const navigate = useNavigate()
  
  // 基础状态
  const [template, setTemplate] = useState<Template | null>(null)
  const [replacementImages, setReplacementImages] = useState<ReplacementImage[]>([])
  const [generatedCovers, setGeneratedCovers] = useState<GeneratedCover[]>([])
  
  // 替换映射：图层ID -> 替换内容
  const [replacements, setReplacements] = useState<Record<string, { type: 'image' | 'text', content: string }>>({})
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  
  // 预览状态
  const [zoom, setZoom] = useState(0.5)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  
  // 设置状态
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png'>('jpg')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 模拟加载数据
  useEffect(() => {
    if (!templateId) return
    
    // 模拟模板数据
    const mockTemplate: Template = {
      id: templateId,
      name: '电商产品海报模板',
      thumbnailUrl: '/api/placeholder/400/300',
      data: {
        width: 1920,
        height: 1080,
        layers: [
        {
          id: 'bg',
          name: '背景',
          type: LayerType.ARTBOARD,
          x: 0, y: 0, width: 1920, height: 1080,
          zIndex: 0,
          visible: true, locked: false, replaceable: false,
          content: '#f0f9ff'
        },
        {
          id: 'product',
          name: '产品图',
          type: LayerType.IMAGE,
          x: 100, y: 100, width: 600, height: 600,
          zIndex: 1,
          visible: true, locked: false, replaceable: true,
          content: '/api/placeholder/600/600'
        },
        {
          id: 'title',
          name: '主标题',
          type: LayerType.TEXT,
          x: 800, y: 200, width: 900, height: 100,
          zIndex: 2,
          visible: true, locked: false, replaceable: true,
          content: '产品标题'
        },
        {
          id: 'subtitle',
          name: '副标题',
          type: LayerType.TEXT,
          x: 800, y: 320, width: 900, height: 60,
          zIndex: 3,
          visible: true, locked: false, replaceable: true,
          content: '产品描述'
        }
        ]
      },
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15'
    }
    
    setTemplate(mockTemplate)
    
    // 初始化替换内容
    const initialReplacements: Record<string, { type: 'image' | 'text', content: string }> = {}
    mockTemplate.data.layers.filter((layer: any) => layer.replaceable).forEach((layer: any) => {
      if (layer.type === LayerType.IMAGE) {
        initialReplacements[layer.id] = { type: 'image', content: layer.content as string }
      } else if (layer.type === LayerType.TEXT) {
        initialReplacements[layer.id] = { type: 'text', content: layer.content as string }
      }
    })
    setReplacements(initialReplacements)
  }, [templateId])

  // 上传图片
  const handleImageUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        const newImage: ReplacementImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalName: file.name,
          url,
          width: 0, // 实际使用时需要获取图片尺寸
          height: 0,
          fileSize: file.size
        }
        setReplacementImages(prev => [...prev, newImage])
      }
    })
  }

  // 删除上传的图片
  const removeReplacementImage = (imageId: string) => {
    const image = replacementImages.find(img => img.id === imageId)
    if (image) {
      URL.revokeObjectURL(image.url)
      setReplacementImages(prev => prev.filter(img => img.id !== imageId))
      
      // 清除相关替换
      Object.keys(replacements).forEach(layerId => {
        if (replacements[layerId].content === image.url) {
          const layer = template?.data.layers.find((l: any) => l.id === layerId)
          if (layer) {
            setReplacements(prev => ({
              ...prev,
              [layerId]: { type: 'image', content: layer.content as string }
            }))
          }
        }
      })
    }
  }

  // 应用图片到图层
  const applyImageToLayer = (imageId: string, layerId: string) => {
    const image = replacementImages.find(img => img.id === imageId)
    const layer = template?.data.layers.find((l: any) => l.id === layerId)
    
    if (image && layer && layer.type === LayerType.IMAGE) {
      setReplacements(prev => ({
        ...prev,
        [layerId]: { type: 'image', content: image.url }
      }))
    }
  }

  // 更新文本内容
  const updateTextContent = (layerId: string, content: string) => {
    setReplacements(prev => ({
      ...prev,
      [layerId]: { type: 'text', content }
    }))
  }


  // 批量生成套图
  const startGeneration = () => {
    if (!template || replacementImages.length === 0) return
    
    setIsGenerating(true)
    setGenerationProgress(0)
    
    // 模拟批量生成过程
    const totalImages = replacementImages.length
    let completed = 0
    
    const generateNext = () => {
      if (completed >= totalImages) {
        setIsGenerating(false)
        setGenerationProgress(100)
        return
      }
      
      const currentImage = replacementImages[completed]
      
      // 模拟生成单张图片
      setTimeout(() => {
        const newCover: GeneratedCover = {
          id: `cover_${Date.now()}_${completed}`,
          projectId: projectId || '',
          templateId: template.id,
          imageUrl: `/api/placeholder/${template.data.width}/${template.data.height}?${completed}`,
          thumbnailUrl: `/api/placeholder/300/200?${completed}`,
          width: template.data.width,
          height: template.data.height,
          status: 'completed',
          createdAt: new Date().toISOString(),
          replacements: [
            { layerId: 'product', content: currentImage.url },
            { layerId: 'title', content: replacements.title?.content || '产品标题' },
            { layerId: 'subtitle', content: replacements.subtitle?.content || '产品描述' }
          ]
        }
        
        setGeneratedCovers(prev => [...prev, newCover])
        completed++
        setGenerationProgress((completed / totalImages) * 100)
        generateNext()
      }, 1000 + Math.random() * 2000) // 模拟1-3秒的生成时间
    }
    
    generateNext()
  }

  // 下载单张图片
  const downloadSingleImage = (cover: GeneratedCover) => {
    const link = document.createElement('a')
    link.href = cover.imageUrl
    link.download = `cover_${cover.id}.${outputFormat}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 打包下载所有图片
  const downloadAllImages = () => {
    // TODO: 实现ZIP打包下载
    console.log('打包下载所有图片')
  }

  // 获取可替换的图层
  const replaceableLayers = template?.data.layers.filter((layer: any) => layer.replaceable) || []
  const imageLayer = replaceableLayers.find((layer: any) => layer.type === LayerType.IMAGE)
  const textLayers = replaceableLayers.filter((layer: any) => layer.type === LayerType.TEXT)

  if (!template) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/cover-projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回项目
          </Button>
          <div>
            <h1 className="font-semibold">套图制作 - {template.name}</h1>
            <p className="text-sm text-gray-600">
              已上传 {replacementImages.length} 张图片 | 已生成 {generatedCovers.length} 张套图
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={startGeneration}
            disabled={isGenerating || replacementImages.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                生成中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                批量生成
              </>
            )}
          </Button>
          
          {generatedCovers.length > 0 && (
            <Button variant="outline" onClick={downloadAllImages}>
              <Package className="w-4 h-4 mr-2" />
              打包下载
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 左侧：素材上传区 */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-medium mb-3">替换素材</h2>
            
            {/* 图片上传区域 */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">产品图片</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">点击上传图片</p>
                  <p className="text-xs text-gray-500">支持 JPG、PNG 格式</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                />
              </CardContent>
            </Card>

            {/* 文本设置 */}
            {textLayers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">文本内容</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {textLayers.map(layer => (
                    <div key={layer.id}>
                      <Label htmlFor={`text-${layer.id}`} className="text-xs">
                        {layer.name}
                      </Label>
                      <Input
                        id={`text-${layer.id}`}
                        value={replacements[layer.id]?.content || ''}
                        onChange={(e) => updateTextContent(layer.id, e.target.value)}
                        className="h-8 text-sm"
                        placeholder={`输入${layer.name}`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 已上传的图片列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">已上传图片</h3>
              <Badge variant="outline">{replacementImages.length}</Badge>
            </div>
            
            <div className="space-y-2">
              {replacementImages.map(image => (
                <div key={image.id} className="relative group">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.originalName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {imageLayer && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => applyImageToLayer(image.id, imageLayer.id)}
                          className="mr-2"
                        >
                          应用
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeReplacementImage(image.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate" title={image.originalName}>
                    {image.originalName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间：预览区 */}
        <div className="flex-1 flex flex-col">
          {/* 预览工具栏 */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label className="text-sm">输出格式:</Label>
              <Select value={outputFormat} onValueChange={(value: 'jpg' | 'png') => setOutputFormat(value)}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 预览画布 */}
          <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-8">
            <div
              className="relative bg-white shadow-lg"
              style={{
                width: template.data.width * zoom,
                height: template.data.height * zoom
              }}
            >
              {template.data.layers.map(layer => {
                const replacement = replacements[layer.id]
                const content = replacement?.content || layer.content
                
                if (!layer.visible) return null

                const layerStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: layer.x * zoom,
                  top: layer.y * zoom,
                  width: layer.width * zoom,
                  height: layer.height * zoom,
                  opacity: layer.style?.opacity || 1
                }

                switch (layer.type) {
                  case LayerType.ARTBOARD:
                    return (
                      <div
                        key={layer.id}
                        style={{
                          ...layerStyle,
                          backgroundColor: content as string
                        }}
                      />
                    )
                  
                  case LayerType.IMAGE:
                    return (
                      <img
                        key={layer.id}
                        src={content as string}
                        alt={layer.name}
                        className="object-cover"
                        style={layerStyle}
                        draggable={false}
                      />
                    )
                  
                  case LayerType.TEXT:
                    return (
                      <div
                        key={layer.id}
                        className="flex items-center justify-start"
                        style={{
                          ...layerStyle,
                          fontSize: (layer.style?.fontSize || 16) * zoom,
                          fontFamily: layer.style?.fontFamily || 'Arial, sans-serif',
                          color: layer.style?.color || '#000000',
                          padding: 4 * zoom
                        }}
                      >
                        {content as string}
                      </div>
                    )
                  
                  default:
                    return null
                }
              })}
            </div>
          </div>

          {/* 生成进度 */}
          {isGenerating && (
            <div className="bg-white border-t p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">批量生成进度</span>
                <span className="text-sm text-gray-600">
                  {Math.round(generationProgress)}%
                </span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* 右侧：生成结果 */}
        <div className="w-80 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">生成结果</h2>
              <Badge variant="outline">{generatedCovers.length}</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {generatedCovers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileImage className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">暂无生成结果</p>
                <p className="text-xs">上传图片后点击"批量生成"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedCovers.map((cover, index) => (
                  <div key={cover.id} className="group relative">
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={cover.thumbnailUrl}
                        alt={`生成结果 ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          setPreviewImageIndex(index)
                          setShowPreviewDialog(true)
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPreviewImageIndex(index)
                            setShowPreviewDialog(true)
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadSingleImage(cover)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        套图 {index + 1}
                      </span>
                      <Badge 
                        variant={cover.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {cover.status === 'completed' ? '已完成' : '处理中'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 预览对话框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
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
              onClick={() => downloadSingleImage(generatedCovers[previewImageIndex])}
            >
              <Download className="w-4 h-4 mr-2" />
              下载
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
    </div>
  )
}