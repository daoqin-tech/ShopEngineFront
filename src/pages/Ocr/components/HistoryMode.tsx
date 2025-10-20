import { useEffect, useState } from 'react'
import { Clock, Image, Download, Eye, Copy, FileText, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OcrRecord } from '@/types/ocr'
import { ocrRecognitionApi } from '@/services/ocrService'
import { toast } from 'sonner'

export function HistoryMode() {
  const [ocrHistory, setOcrHistory] = useState<OcrRecord[]>([])
  const [loading, setLoading] = useState(false)

  // 获取OCR历史记录
  useEffect(() => {
    const fetchOcrHistory = async () => {
      setLoading(true)
      try {
        const history = await ocrRecognitionApi.getOcrHistory()
        setOcrHistory(history)
      } catch (error) {
        console.error('获取OCR历史记录失败:', error)
        toast.error('获取历史记录失败，请重试')
      } finally {
        setLoading(false)
      }
    }

    fetchOcrHistory()
  }, [])

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


  if (loading) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-foreground mb-2">正在加载历史记录</h3>
          <p className="text-muted-foreground">请稍候...</p>
        </div>
      </div>
    )
  }

  if (ocrHistory.length === 0) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">暂无识别历史</h3>
          <p className="text-muted-foreground">
            当您上传图片进行识别后，历史记录将显示在这里
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {ocrHistory
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((record) => {
              return (
                <Card key={record.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    {/* 头部信息 */}
                    <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(record.createdAt)}</span>
                    </div>

                    {/* 图片预览 */}
                    <div className="mb-2">
                      <div className="relative group">
                        <img
                          src={record.imageUrl}
                          alt="识别图片"
                          className="w-full aspect-[4/3] object-cover rounded border cursor-pointer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="w-full aspect-[4/3] bg-muted rounded border flex items-center justify-center hidden">
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                        {/* 悬浮按钮 */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-1 rounded">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePreviewImage(record.imageUrl)}
                            className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-1.5 py-0.5 h-auto"
                          >
                            <Eye className="h-3 w-3" />
                            预览
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadImage(record.imageUrl, `ocr-image-${record.id}.jpg`)}
                            className="flex items-center gap-1 bg-white/90 hover:bg-white text-black shadow-lg text-xs px-1.5 py-0.5 h-auto"
                          >
                            <Download className="h-3 w-3" />
                            下载
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 识别结果 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">识别结果</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyText(record.description)}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="bg-muted rounded p-2 text-xs text-foreground/80 line-clamp-3">
                        {record.description}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
    </div>
  )
}