import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, X, Check, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { OcrProject } from '@/types/ocr'
import { ocrProjectApi } from '@/services/ocrService'
import { toast } from 'sonner'

export function OcrProjects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<OcrProject[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<OcrProject | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await ocrProjectApi.getProjects()
      setProjects(response || [])
      setLoading(false)
    } catch (err) {
      toast.error('加载项目列表失败', {
        description: '请检查网络连接或稍后再试'
      })
      console.error('Error fetching projects:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreateProject = async () => {
    try {
      const newProject = await ocrProjectApi.createProject()
      navigate(`/workspace/ocr-project/${newProject.id}`)
    } catch (err) {
      toast.error('创建项目失败', {
        description: '请稍后再试'
      })
      console.error('Error creating project:', err)
    }
  }

  const handleDeleteProject = (project: OcrProject, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProject(project)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedProject) return
    
    try {
      await ocrProjectApi.deleteProject(selectedProject.id)
      toast.success('项目删除成功')
      setDeleteDialogOpen(false)
      setSelectedProject(null)
      fetchProjects() // 重新获取项目列表
    } catch (err) {
      toast.error('删除项目失败', {
        description: '请稍后再试'
      })
      console.error('Error deleting project:', err)
    }
  }

  const handleStartEditName = (project: OcrProject) => {
    setEditingProjectId(project.id)
    setEditingName(project.name)
  }

  const handleSaveEditName = async (projectId: string) => {
    if (!editingName.trim()) {
      setEditingProjectId(null)
      return
    }
    
    try {
      await ocrProjectApi.updateProject(projectId, { name: editingName.trim() })
      toast.success('项目名称更新成功')
      setEditingProjectId(null)
      fetchProjects() // 重新获取项目列表
    } catch (err) {
      toast.error('更新项目名称失败', {
        description: '请稍后再试'
      })
      console.error('Error updating project name:', err)
    }
  }

  const handleCancelEditName = () => {
    setEditingProjectId(null)
    setEditingName('')
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return '今天'
    if (diffInDays === 1) return '1天前'
    if (diffInDays < 7) return `${diffInDays}天前`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}周前`
    return dateObj.toLocaleDateString('zh-CN')
  }

  const handleProjectClick = (projectId: string) => {
    // 直接跳转到OCR功能界面
    navigate(`/workspace/ocr-project/${projectId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 页面标题和创建按钮 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">以图识文</h1>
        </div>
        
        <Button 
          className="flex items-center gap-2" 
          onClick={handleCreateProject}
        >
          <Plus className="h-4 w-4" />
          新建项目
        </Button>
      </div>

      {/* 项目列表 */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有项目</h3>
          <p className="text-gray-600 mb-4">创建您的第一个图片识文项目</p>
          <Button onClick={handleCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            新建项目
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white relative group"
              onClick={() => editingProjectId !== project.id && handleProjectClick(project.id)}
            >
              {/* 删除按钮 - hover时显示 */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 bg-red-50 hover:text-red-700 hover:bg-red-100"
                  onClick={(e) => handleDeleteProject(project, e)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 缩略图区域 */}
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                {project.thumbnail ? (
                  <img 
                    src={project.thumbnail} 
                    alt="项目缩略图" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* 项目信息 */}
              <div className="space-y-2">
                {editingProjectId === project.id ? (
                  <div className="flex items-center gap-2 mb-4">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEditName(project.id)
                        } else if (e.key === 'Escape') {
                          handleCancelEditName()
                        }
                      }}
                      onBlur={() => handleSaveEditName(project.id)}
                      className="text-lg font-semibold"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveEditName(project.id)
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h3 
                    className="font-semibold text-lg truncate mb-4 hover:bg-gray-50 px-2 py-1 rounded cursor-text"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEditName(project)
                    }}
                    title="点击编辑名称"
                  >
                    {project.name}
                  </h3>
                )}

                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目 "{selectedProject?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}