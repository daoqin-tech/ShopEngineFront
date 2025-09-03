import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit3,
  PaintBucket,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { EditMode as EditModeType, ImageEditProjectDetail } from '@/types/imageEdit'
import { projectApi, editApi } from '@/services/imageEditService'
import { taskPollingService } from '@/services/taskPollingService'
import { EditMode } from './components/EditMode'
import { FillMode } from './components/FillMode'
import { HistoryMode } from './components/HistoryMode'

export function ImageEditor() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const [project, setProject] = useState<ImageEditProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [resultImageUrl, setResultImageUrl] = useState<string | undefined>()
  
  // 编辑状态
  const [editMode, setEditMode] = useState<EditModeType>('edit')
  
  // 数据加载
  useEffect(() => {
    if (!projectId) return

    const loadProjectData = async () => {
      try {
        setLoading(true)
        
        // 获取项目详情（包含图片列表）
        const projectDetail = await projectApi.getProject(projectId)
        if (!projectDetail) {
          toast.error('项目不存在')
          return
        }

        setProject(projectDetail)
      } catch (error) {
        console.error('Failed to load project data:', error)
        toast.error('加载项目数据失败')
      } finally {
        setLoading(false)
      }
    }

    loadProjectData()
  }, [projectId])

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      taskPollingService.stopAllPolling()
    }
  }, [])

  // 功能配置
  const editModes = [
    {
      id: 'edit' as EditModeType,
      label: '整体编辑',
      icon: Edit3,
      placeholder: '描述要移除的物体或修复的内容...'
    },
    {
      id: 'fill' as EditModeType,
      label: '局部编辑', 
      icon: PaintBucket,
      placeholder: '描述要填充的内容和风格...'
    },
    {
      id: 'history' as EditModeType,
      label: '编辑历史',
      icon: History,
      placeholder: ''
    },
  ]

  const handleEditGenerate = async (prompt: string, imageUrl: string) => {
    if (!prompt.trim()) {
      toast.error('请输入描述内容')
      return
    }
    
    if (!projectId) {
      toast.error('项目ID缺失')
      return
    }

    setProcessing(true)
    try {
      // 调用图片编辑API，获取taskId
      const taskResponse = await editApi.editImage({
        projectId: projectId,
        prompt: prompt,
        imageUrl: imageUrl
      })
      
      const { taskId } = taskResponse
      
      // 开始轮询任务状态
      taskPollingService.startPolling(taskId, {
        onCompleted: async (response) => {
          // 设置结果图片URL
          if (response.resultImageUrl) {
            setResultImageUrl(response.resultImageUrl)
          }
          
          // 任务完成时刷新项目数据
          if (projectId) {
            const updatedProject = await projectApi.getProject(projectId)
            if (updatedProject) {
              setProject(updatedProject)
            }
          }
          setProcessing(false)
        },
        onFailed: () => {
          setProcessing(false)
        }
      })
      
    } catch (error) {
      console.error('Edit generation failed:', error)
      toast.error(error instanceof Error ? error.message : '任务提交失败，请重试')
      setProcessing(false)
    }
  }

  const handleFillGenerate = async (prompt: string, imageUrl: string, maskData: string) => {
    if (!prompt.trim()) {
      toast.error('请输入描述内容')
      return
    }
    
    if (!projectId) {
      toast.error('项目ID缺失')
      return
    }

    if (!maskData) {
      toast.error('请先绘制需要填充的区域')
      return
    }

    setProcessing(true)
    try {
      // 调用图片填充API，获取taskId
      const taskResponse = await editApi.fillImage({
        projectId: projectId,
        prompt: prompt,
        imageUrl: imageUrl,
        maskData: maskData
      })
      
      const { taskId } = taskResponse
      
      // 开始轮询任务状态
      taskPollingService.startPolling(taskId, {
        onCompleted: async (response) => {
          // 设置结果图片URL
          if (response.resultImageUrl) {
            setResultImageUrl(response.resultImageUrl)
          }
          
          // 任务完成时刷新项目数据
          if (projectId) {
            const updatedProject = await projectApi.getProject(projectId)
            if (updatedProject) {
              setProject(updatedProject)
            }
          }
          setProcessing(false)
        },
        onFailed: () => {
          setProcessing(false)
        }
      })
      
    } catch (error) {
      console.error('Fill generation failed:', error)
      toast.error(error instanceof Error ? error.message : '填充任务提交失败，请重试')
      setProcessing(false)
    }
  }

  const handleBackToProject = () => {
    navigate(`/workspace/image-edit-projects`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
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
            <h2 className="text-lg font-semibold">AI图片编辑</h2>
          </div>

          <div className="space-y-2">
            {editModes.map((mode) => {
              const Icon = mode.icon
              return (
                <Button
                  key={mode.id}
                  variant={editMode === mode.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setEditMode(mode.id)}
                  className="w-full justify-start p-3 h-auto"
                >
                  <Icon className="h-4 w-4 mr-3" />
                  <span className="font-medium">{mode.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto">
        {editMode === 'edit' && (
          <EditMode
            processing={processing}
            handleEditGenerate={handleEditGenerate}
            resultImageUrl={resultImageUrl}
          />
        )}
        
        {editMode === 'fill' && (
          <FillMode
            processing={processing}
            handleFillGenerate={handleFillGenerate}
            resultImageUrl={resultImageUrl}
          />
        )}
        
        {editMode === 'history' && (
          <HistoryMode
            project={project}
          />
        )}
      </div>
    </div>
  )
}