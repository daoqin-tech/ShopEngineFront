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

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(50) // 每页显示50个项目

  // 加载项目列表
  const loadProjects = async (page: number = currentPage) => {
    try {
      setLoading(true)
      setError(null)
      const response = await coverProjectService.getProjects({
        page,
        limit: pageSize
      })

      setProjects(response.data || [])
      setTotal(response.total || 0)
      setCurrentPage(response.page || page)
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
    loadProjects(1)
  }, [])

  // 创建新项目
  const handleCreateProject = async () => {
    try {
      const newProject = await coverProjectService.createProject()
      toast.success('项目创建成功')
      // 刷新项目列表
      await loadProjects(1)
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
        await loadProjects(1)
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
            <Button onClick={() => loadProjects(1)}>重试</Button>
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
        {(projects || []).map((project: CoverProject) => (
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

            {/* 项目信息 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg truncate">
                {project.name}
              </h3>

              {/* 任务统计 */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">总任务数</span>
                  <span className="font-medium">{project.stats.TotalTasks}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">等待中</span>
                    <span className="text-orange-600 font-medium">{project.stats.PendingTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">处理中</span>
                    <span className="text-blue-600 font-medium">{project.stats.ProcessingTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">已完成</span>
                    <span className="text-green-600 font-medium">{project.stats.CompletedTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">失败</span>
                    <span className="text-red-600 font-medium">{project.stats.FailedTasks}</span>
                  </div>
                </div>

                {/* 进度条 */}
                {project.stats.TotalTasks > 0 && (
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{
                          width: `${(project.stats.CompletedTasks / project.stats.TotalTasks) * 100}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      完成率 {Math.round((project.stats.CompletedTasks / project.stats.TotalTasks) * 100)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(project.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控件 */}
      {total > pageSize && (
        <div className="flex items-center justify-center mt-8 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadProjects(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
          >
            上一页
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => loadProjects(page)}
                disabled={loading}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadProjects(currentPage + 1)}
            disabled={currentPage >= Math.ceil(total / pageSize) || loading}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 页面信息 */}
      {total > 0 && (
        <div className="text-center mt-4 text-sm text-gray-500">
          共 {total} 个项目，第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
        </div>
      )}

      {/* 空状态 */}
      {projects.length === 0 && !loading && (
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

