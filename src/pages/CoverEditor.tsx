import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenerationResultStep } from './CoverEditor/GenerationResultStep'
import { TemplateSelectionDialog } from './CoverEditor/TemplateSelectionDialog'
import {
  coverProjectService,
  coverPollingService,
  type TemplateSelectionItem,
  type TaskInfo
} from '@/services/coverProjectService'
import { type CoverProject, type GeneratedCover, type BatchGenerationStatus } from '@/types/template'
import { toast } from 'sonner'

export function CoverEditor() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  // 项目数据状态
  const [project, setProject] = useState<CoverProject | null>(null)
  const [generatedCovers, setGeneratedCovers] = useState<GeneratedCover[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<BatchGenerationStatus | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<TaskInfo[]>([])
  
  // 项目选择状态
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  
  // 模板选择状态
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSelectionItem | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  // 加载项目数据
  const loadProject = async () => {
    if (!projectId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const projectData = await coverProjectService.getProject(projectId)
      setProject(projectData)
      
      // TODO: 加载已生成的套图
      // const coversResponse = await coverGenerationService.getGeneratedCovers(projectId)
      // setGeneratedCovers(coversResponse.covers)
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载项目失败')
      console.error('Error loading project:', err)
    } finally {
      setLoading(false)
    }
  }

  // 开始生成套图
  const handleStartGeneration = async () => {
    if (!selectedTemplate || !projectId || selectedProjects.size === 0) {
      toast.error('请选择模板和AI项目')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      // 调用生成API
      const result = await coverProjectService.startCoverGeneration({
        coverProjectId: projectId,
        templateId: selectedTemplate.id,
        aiProjectIds: Array.from(selectedProjects)
      })

      console.log('套图生成已启动:', result)

      // 初始化生成状态
      setGenerationStatus({
        projectId,
        totalTasks: result.tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        results: []
      })

      // 开始轮询任务状态 (每5秒轮询一次)
      coverPollingService.startTaskPolling(
        result.tasks,
        (taskStatuses) => {
          setTaskStatuses(taskStatuses)

          // 更新整体状态
          const completedTasks = taskStatuses.filter(t => t.status === 'completed').length
          const failedTasks = taskStatuses.filter(t => t.status === 'failed').length

          setGenerationStatus({
            projectId,
            totalTasks: result.tasks.length,
            completedTasks,
            failedTasks,
            results: [] // 将在完成时构建
          })
        },
        (taskStatuses) => {
          setTaskStatuses(taskStatuses)

          // 构建生成结果
          const completedTasks = taskStatuses.filter(t => t.status === 'completed')
          const generatedCovers: GeneratedCover[] = []

          completedTasks.forEach(task => {
            task.resultImages?.forEach((imageUrl, index) => {
              generatedCovers.push({
                id: `${task.taskId}-${index}`,
                projectId: task.aiProjectId,
                templateId: selectedTemplate.id,
                imageUrl,
                thumbnailUrl: imageUrl, // 使用同一张图作为缩略图
                width: 800,
                height: 600,
                status: 'completed',
                createdAt: task.createdAt,
                replacements: []
              })
            })
          })

          setGeneratedCovers(generatedCovers)
          setIsGenerating(false)
          toast.success('套图生成完成！')
        },
        (error) => {
          setError(error.message)
          setIsGenerating(false)
          toast.error('生成过程中发生错误')
        },
        5000 // 5秒轮询间隔
      )

    } catch (error) {
      console.error('生成套图失败:', error)
      toast.error('生成套图失败，请重试')
      setIsGenerating(false)
    }
  }

  // 处理模板选择确认
  const handleTemplateConfirm = () => {
    if (!selectedTemplate) return
    handleStartGeneration()
  }

  // 加载项目数据
  useEffect(() => {
    loadProject()
  }, [projectId])

  // 组件卸载时停止轮询
  useEffect(() => {
    return () => {
      if (projectId) {
        coverPollingService.stopPolling(projectId)
      }
    }
  }, [projectId])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => navigate('/workspace/cover-projects')}>
            返回项目列表
          </Button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">项目不存在</p>
          <Button onClick={() => navigate('/workspace/cover-projects')}>
            返回项目列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/workspace/cover-projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回项目
          </Button>
          <h1 className="font-semibold text-lg">{project?.name || '套图制作'}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowTemplateDialog(true)}
            disabled={isGenerating || selectedProjects.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>生成中...</>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                开始生成
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 p-6">
        <GenerationResultStep
          generatedCovers={generatedCovers}
          isGenerating={isGenerating}
          taskStatuses={taskStatuses}
          selectedProjects={selectedProjects}
          onProjectsSelect={setSelectedProjects}
          selectedTemplate={selectedTemplate}
        />
      </div>
      
      {/* 模板选择对话框 */}
      <TemplateSelectionDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        selectedTemplate={selectedTemplate}
        onTemplateSelect={setSelectedTemplate}
        onConfirm={handleTemplateConfirm}
      />
    </div>
  )
}