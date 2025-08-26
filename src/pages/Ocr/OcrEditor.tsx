import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Upload,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OcrMode as OcrModeType, OcrProjectDetail } from '@/types/ocr'
import { UploadMode } from './components/UploadMode'
import { HistoryMode } from './components/HistoryMode'

export function OcrEditor() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const [project, setProject] = useState<OcrProjectDetail | null>(null)
  
  // OCR状态
  const [ocrMode, setOcrMode] = useState<OcrModeType>('upload')

  // 功能配置
  const ocrModes = [
    {
      id: 'upload' as OcrModeType,
      label: '图片识别',
      icon: Upload,
      placeholder: ''
    },
    {
      id: 'history' as OcrModeType,
      label: '识别历史',
      icon: History,
      placeholder: ''
    },
  ]


  const handleBackToProject = () => {
    navigate(`/workspace/ocr-projects`)
  }

  return (
    <div className="h-screen flex">
      {/* 左侧工具栏 */}
      <div className="w-64 bg-card border-r flex flex-col flex-shrink-0 overflow-hidden">
        {/* 顶部返回按钮 */}
        <div className="p-4 border-b flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToProject}
            className="flex items-center gap-2 w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4" />
            返回项目
          </Button>
        </div>

        {/* 功能模式选择 */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">以图识文</h2>
            <p className="text-sm text-muted-foreground mt-1">{project?.name}</p>
          </div>

          <div className="space-y-2">
            {ocrModes.map((mode) => {
              const Icon = mode.icon
              return (
                <Button
                  key={mode.id}
                  variant={ocrMode === mode.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setOcrMode(mode.id)}
                  className="w-full justify-start p-3 h-auto"
                >
                  <Icon className="h-4 w-4 mr-3" />
                  <span className="font-medium">{mode.label}</span>
                </Button>
              )
            })}
          </div>

          {/* 项目统计信息 */}
          {project && (
            <div className="mt-6 p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">项目统计</div>
              <div className="text-xs text-muted-foreground mt-1">
                {project.ocrHistory.length} 条识别记录
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        {ocrMode === 'upload' && projectId && (
          <UploadMode
            projectId={projectId}
          />
        )}
        
        {ocrMode === 'history' && (
          <HistoryMode
            project={project}
          />
        )}
      </div>
    </div>
  )
}