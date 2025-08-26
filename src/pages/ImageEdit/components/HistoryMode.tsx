import { Clock, Image, ArrowRight, AlertCircle, Download, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImageEditProjectDetail } from '@/types/imageEdit'

interface HistoryModeProps {
  project: ImageEditProjectDetail | null
}

export function HistoryMode({ project }: HistoryModeProps) {
  const handleDownloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePreviewImage = (imageUrl: string) => {
    window.open(imageUrl, '_blank')
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOperationTypeLabel = (type: 'edit' | 'fill') => {
    return type === 'edit' ? '整体编辑' : '局部编辑'
  }

  const getOperationTypeVariant = (type: 'edit' | 'fill'): "default" | "secondary" | "destructive" | "outline" => {
    return type === 'edit' ? 'default' : 'secondary'
  }

  if (!project) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-semibold">编辑历史</h1>
          <p className="text-muted-foreground mt-2">
            查看项目的编辑记录和历史版本
          </p>
        </div>
        
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">项目加载中</h3>
            <p className="text-muted-foreground">请等待项目数据加载完成</p>
          </div>
        </div>
      </div>
    )
  }

  const editHistory = project.editHistory || []

  if (editHistory.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-semibold">编辑历史</h1>
          <p className="text-muted-foreground mt-2">
            查看项目的编辑记录和历史版本
          </p>
        </div>
        
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">暂无编辑历史</h3>
            <p className="text-muted-foreground">
              当您对图片进行编辑操作后，历史记录将显示在这里
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold">编辑历史</h1>
        <p className="text-muted-foreground mt-2">
          查看项目的编辑记录和历史版本（共 {editHistory.length} 条记录）
        </p>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {editHistory
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((operation) => {
              return (
                <Card key={operation.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* 头部信息 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={getOperationTypeVariant(operation.type)} className="text-xs">
                          {getOperationTypeLabel(operation.type)}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(operation.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 提示词 */}
                    <div className="mb-3">
                      <p className="text-xs font-medium line-clamp-2 mb-1">
                        {operation.prompt}
                      </p>
                    </div>

                    {/* 图片对比 */}
                    <div className="flex items-center gap-2 mb-3">
                      {/* 源图片 */}
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1 text-center">原图</div>
                        <div className="relative group">
                          <img
                            src={operation.sourceImageUrl}
                            alt="原图"
                            className="w-full aspect-square object-cover rounded border cursor-pointer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                          <div className="w-full aspect-square bg-muted rounded border flex items-center justify-center hidden">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                          {/* 悬浮按钮 */}
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-1 rounded">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePreviewImage(operation.sourceImageUrl)}
                              className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-2 py-1 h-auto"
                            >
                              <Eye className="h-3 w-3" />
                              预览
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadImage(operation.sourceImageUrl, `source-${operation.id}.jpg`)}
                              className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-2 py-1 h-auto"
                            >
                              <Download className="h-3 w-3" />
                              下载
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 箭头 */}
                      <div className="flex-shrink-0 self-center">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>

                      {/* 结果图片 */}
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1 text-center">结果</div>
                        <div className="relative group">
                          <img
                            src={operation.resultImageUrl}
                            alt="编辑结果"
                            className="w-full aspect-square object-cover rounded border cursor-pointer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                          <div className="w-full aspect-square bg-muted rounded border flex items-center justify-center hidden">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                          {/* 悬浮按钮 */}
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-1 rounded">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePreviewImage(operation.resultImageUrl)}
                              className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-2 py-1 h-auto"
                            >
                              <Eye className="h-3 w-3" />
                              预览
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadImage(operation.resultImageUrl, `result-${operation.id}.jpg`)}
                              className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-2 py-1 h-auto"
                            >
                              <Download className="h-3 w-3" />
                              下载
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 参考图片 */}
                    {operation.referenceImages && operation.referenceImages.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">参考图片</div>
                        <div className="flex gap-1 overflow-x-auto">
                          {operation.referenceImages.map((refImageUrl, index) => (
                            <div key={index} className="flex-shrink-0 relative group">
                              <img
                                src={refImageUrl}
                                alt={`参考图片 ${index + 1}`}
                                className="h-8 w-8 object-cover rounded border cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                              <div className="h-8 w-8 bg-muted rounded border flex items-center justify-center hidden">
                                <Image className="h-2 w-2 text-muted-foreground" />
                              </div>
                              {/* 悬浮按钮 - 参考图片较小，保持图标按钮 */}
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-0.5 rounded">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handlePreviewImage(refImageUrl)}
                                  className="h-5 w-5 p-0 bg-white/90 hover:bg-white text-black shadow-lg"
                                >
                                  <Eye className="h-2 w-2" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadImage(refImageUrl, `ref-${operation.id}-${index + 1}.jpg`)}
                                  className="h-5 w-5 p-0 bg-white/90 hover:bg-white text-black shadow-lg"
                                >
                                  <Download className="h-2 w-2" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
}