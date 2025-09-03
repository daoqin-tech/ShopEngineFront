import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Play, Eye, Trash2, FileImage } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { type CoverProject, CoverProjectStatus } from '@/types/template'

export function CoverProjects() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // 模拟数据
  const mockProjects: CoverProject[] = [
    {
      id: '1',
      name: '春季促销海报套图',
      templateId: 'template-1',
      template: {
        id: 'template-1',
        name: '电商产品海报模板',
        thumbnailUrl: '/api/placeholder/300/200',
        data: {
          width: 1920,
          height: 1080,
          layers: []
        },
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15'
      },
      status: CoverProjectStatus.IN_PROGRESS,
      totalImages: 20,
      completedImages: 15,
      createdAt: '2024-01-20',
      updatedAt: '2024-01-20'
    },
    {
      id: '2',
      name: 'Banner广告批量制作',
      templateId: 'template-2',
      template: {
        id: 'template-2',
        name: 'Banner广告模板',
        thumbnailUrl: '/api/placeholder/300/150',
        data: {
          width: 1200,
          height: 600,
          layers: []
        },
        createdAt: '2024-01-14',
        updatedAt: '2024-01-14'
      },
      status: CoverProjectStatus.COMPLETED,
      totalImages: 12,
      completedImages: 12,
      createdAt: '2024-01-18',
      updatedAt: '2024-01-19'
    }
  ]

  const filteredProjects = mockProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.template.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: CoverProjectStatus) => {
    switch (status) {
      case CoverProjectStatus.COMPLETED:
        return 'bg-green-100 text-green-800'
      case CoverProjectStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800'
      case CoverProjectStatus.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case CoverProjectStatus.FAILED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: CoverProjectStatus) => {
    switch (status) {
      case CoverProjectStatus.COMPLETED:
        return '已完成'
      case CoverProjectStatus.IN_PROGRESS:
        return '进行中'
      case CoverProjectStatus.DRAFT:
        return '草稿'
      case CoverProjectStatus.FAILED:
        return '失败'
      default:
        return '未知状态'
    }
  }

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">套图项目</h1>
          <p className="text-gray-600 mt-1">管理您的批量套图制作项目</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建套图项目
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新建套图项目</DialogTitle>
            </DialogHeader>
            <CreateProjectForm onClose={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="搜索项目名称或模板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 项目网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                <img
                  src={project.template.thumbnailUrl}
                  alt={project.template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge className={getStatusColor(project.status)}>
                    {getStatusText(project.status)}
                  </Badge>
                </div>
                
                {/* 悬停时显示的操作按钮 */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <Button size="sm" variant="secondary">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4">
              <CardTitle className="text-lg mb-2 line-clamp-1">{project.name}</CardTitle>
              <p className="text-sm text-gray-600 mb-3">
                使用模板: {project.template.name}
              </p>
              
              {/* 进度条 */}
              <div className="mb-3">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">生成进度</span>
                  <span className="font-medium">
                    {project.completedImages}/{project.totalImages}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${getProgressPercentage(project.completedImages, project.totalImages)}%`
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getProgressPercentage(project.completedImages, project.totalImages)}% 完成
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                模板尺寸: {project.template.data.width} × {project.template.data.height}
              </div>
            </CardContent>
            
            <CardFooter className="p-4 pt-0">
              <div className="flex justify-between items-center w-full text-xs text-gray-500">
                <span>创建于 {project.createdAt}</span>
                <span>更新于 {project.updatedAt}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FileImage className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无套图项目</h3>
          <p className="text-gray-500 mb-4">创建您的第一个套图项目</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建套图项目
          </Button>
        </div>
      )}
    </div>
  )
}

// 创建项目表单组件
function CreateProjectForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('请输入项目名称')
      return
    }

    // TODO: 实际创建项目API调用
    // 模拟创建成功后获得项目ID
    const newProjectId = 'project-' + Date.now()
    
    console.log('创建套图项目:', formData)
    onClose()
    
    // 创建项目后跳转到模板选择页面
    navigate(`/workspace/cover-project/${newProjectId}/template-selection`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="project-name">项目名称 *</Label>
        <Input
          id="project-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="请输入套图项目名称"
          required
        />
      </div>

      {/* 按钮 */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={!formData.name.trim()}>
          下一步：选择模板
        </Button>
      </div>
    </form>
  )
}