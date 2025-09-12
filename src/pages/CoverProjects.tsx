import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileImage, Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type CoverProject } from '@/types/template'
import { toast } from 'sonner'
import { coverProjectService } from '@/services/coverProjectService'

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function CoverProjects() {
  const navigate = useNavigate()
  
  // 状态管理
  const [projects, setProjects] = useState<CoverProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载项目列表
  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const projectList = await coverProjectService.getProjects()
      setProjects(projectList)
    } catch (err) {
      console.error('加载项目列表失败:', err)
      setError('加载项目列表失败，请稍后重试')
      toast.error('加载项目列表失败', {
        description: '请检查网络连接或稍后重试'
      })
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时加载项目
  useEffect(() => {
    loadProjects()
  }, [])

  // 创建新项目
  const handleCreateProject = async () => {
    try {
      const newProject = await coverProjectService.createProject()
      toast.success('项目创建成功')
      // 刷新项目列表
      await loadProjects()
      // 直接跳转到新项目的编辑界面
      navigate(`/workspace/cover-project/${newProject.id}`)
    } catch (err) {
      toast.error('创建项目失败', {
        description: '请稍后再试'
      })
      console.error('Error creating project:', err)
    }
  }

  // 删除项目
  const handleDeleteProject = async (projectId: string) => {
    if (confirm('确定要删除这个项目吗？此操作无法撤销。')) {
      try {
        await coverProjectService.deleteProject(projectId)
        toast.success('项目删除成功')
        // 重新加载项目列表
        await loadProjects()
      } catch (err) {
        console.error('删除项目失败:', err)
        toast.error('删除项目失败', {
          description: '请稍后重试'
        })
      }
    }
  }


  // 加载状态
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">套图项目</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">套图项目</h1>
            <p className="text-gray-600 mt-1">管理您的批量套图制作项目</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadProjects}>重试</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">套图项目</h1>
          <p className="text-gray-600 mt-1">管理您的批量套图制作项目</p>
        </div>
        
        <Button onClick={handleCreateProject}>
          <Plus className="w-4 h-4 mr-2" />
          新建套图项目
        </Button>
      </div>

      {/* 项目网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project: CoverProject) => (
          <div
            key={project.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white relative group"
            onClick={() => navigate(`/workspace/cover-project/${project.id}`)}
          >
            {/* 删除按钮 - hover时显示 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 bg-red-50 hover:text-red-700 hover:bg-red-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteProject(project.id)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 缩略图区域 */}
            <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
              <div className="w-full h-full flex items-center justify-center">
                <FileImage className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            {/* 项目信息 */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg truncate mb-4">
                {project.name}
              </h3>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(project.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无套图项目</h3>
          <p className="text-gray-600 mb-4">创建您的第一个套图项目</p>
          <Button onClick={handleCreateProject}>
            <Plus className="w-4 h-4 mr-2" />
            新建套图项目
          </Button>
        </div>
      )}
    </div>
  )
}

