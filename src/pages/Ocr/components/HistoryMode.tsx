import { Clock, Image, AlertCircle, Download, Eye, Copy, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { OcrProjectDetail } from '@/types/ocr'
import { toast } from 'sonner'

interface HistoryModeProps {
  project: OcrProjectDetail | null
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

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('文本已复制到剪贴板')
    } catch (err) {
      toast.error('复制失败，请手动复制')
    }
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

  if (!project) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-semibold">识别历史</h1>
          <p className="text-muted-foreground mt-2">
            查看项目的识别记录和历史结果
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

  const ocrHistory = project.ocrHistory || []

  if (ocrHistory.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-semibold">识别历史</h1>
          <p className="text-muted-foreground mt-2">
            查看项目的识别记录和历史结果
          </p>
        </div>
        
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">暂无识别历史</h3>
            <p className="text-muted-foreground">
              当您上传图片进行识别后，历史记录将显示在这里
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold">识别历史</h1>
        <p className="text-muted-foreground mt-2">
          查看项目的识别记录和历史结果（共 {ocrHistory.length} 条记录）
        </p>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ocrHistory
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((record) => {
              return (
                <Card key={record.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* 头部信息 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          图片识别
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(record.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 图片预览 */}
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground mb-1">原图片</div>
                      <div className="relative group">
                        <img
                          src={record.imageUrl}
                          alt="识别图片"
                          className="w-full aspect-video object-cover rounded border cursor-pointer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="w-full aspect-video bg-muted rounded border flex items-center justify-center hidden">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                        {/* 悬浮按钮 */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-1 rounded">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePreviewImage(record.imageUrl)}
                            className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-2 py-1 h-auto"
                          >
                            <Eye className="h-3 w-3" />
                            预览
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadImage(record.imageUrl, `ocr-image-${record.id}.jpg`)}
                            className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-2 py-1 h-auto"
                          >
                            <Download className="h-3 w-3" />
                            下载
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 识别结果 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">识别结果</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyText(record.extractedText)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="bg-muted rounded p-3">
                        <Textarea
                          value={record.extractedText}
                          readOnly
                          className="min-h-[100px] text-xs border-none bg-transparent p-0 resize-none focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    {/* 文字统计 */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        共识别 {record.extractedText.length} 个字符
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
}