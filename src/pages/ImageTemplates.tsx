import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, FolderOpen, Trash2, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';
import { imageTemplateService, ImageTemplateProjectListItem, TemplateProjectType } from '@/services/imageTemplateService';
import { useNavigate } from 'react-router-dom';

export default function ImageTemplates() {
  const navigate = useNavigate();
  const [templateProjects, setTemplateProjects] = useState<ImageTemplateProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState<TemplateProjectType>('calendar_portrait');
  const [isCreating, setIsCreating] = useState(false);

  // 加载图片模板项目列表
  useEffect(() => {
    loadTemplateProjects();
  }, []);

  const loadTemplateProjects = async () => {
    setIsLoading(true);
    try {
      const projects = await imageTemplateService.getProjects();
      setTemplateProjects(projects);
    } catch (error) {
      console.error('加载图片模板项目列表失败:', error);
      toast.error('加载图片模板项目列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除图片模板项目
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('确定要删除这个图片模板项目吗？')) return;

    try {
      await imageTemplateService.deleteProject(projectId);
      toast.success('图片模板项目删除成功');
      loadTemplateProjects();
    } catch (error) {
      console.error('删除图片模板项目失败:', error);
      toast.error('删除图片模板项目失败');
    }
  };

  // 打开创建对话框
  const handleCreateNew = () => {
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectType('calendar_portrait');
    setShowCreateDialog(true);
  };

  // 创建新图片模板项目
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    setIsCreating(true);
    try {
      const project = await imageTemplateService.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        type: newProjectType,
      });

      toast.success('图片模板项目创建成功');
      setShowCreateDialog(false);

      // 跳转到编辑页面
      navigate(`/workspace/image-templates/${project.id}/edit`);
    } catch (error) {
      console.error('创建图片模板项目失败:', error);
      toast.error('创建图片模板项目失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 编辑图片模板项目
  const handleEditProject = (projectId: string) => {
    navigate(`/workspace/image-templates/${projectId}/edit`);
  };

  // 过滤图片模板项目
  const filteredProjects = templateProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">图片模板管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理您的图片模板项目</p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            创建模板项目
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索图片模板项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">加载中...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? '未找到匹配的图片模板项目' : '还没有图片模板项目'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? '尝试使用其他关键词搜索' : '创建第一个图片模板项目开始使用'}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建模板项目
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <Card
                key={project.projectId}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleEditProject(project.projectId)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {project.description || '暂无描述'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>模板类型</span>
                      <span className="font-medium text-blue-600">
                        {project.type === 'calendar_landscape' ? '横版日历 (1440×1120)' : '竖版日历 (1024×1440)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>模板数量</span>
                      <span className="font-medium">{project.templateCount} 个</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>创建时间</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>更新时间</span>
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project.projectId);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.projectId);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 创建项目对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建图片模板项目</DialogTitle>
            <DialogDescription>
              创建一个新的图片模板项目，然后添加模板图片和标记替换区域
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">项目名称 *</Label>
              <Input
                id="project-name"
                placeholder="输入项目名称"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    handleCreateProject();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">项目描述（可选）</Label>
              <Input
                id="project-description"
                placeholder="输入项目描述"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-type">模板类型 *</Label>
              <select
                id="project-type"
                value={newProjectType}
                onChange={(e) => setNewProjectType(e.target.value as TemplateProjectType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="calendar_portrait">竖版日历 (1024 × 1440)</option>
                <option value="calendar_landscape">横版日历 (1440 × 1120)</option>
              </select>
              <p className="text-xs text-gray-500">选择模板类型将决定生成图片的输出尺寸</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  创建中...
                </>
              ) : (
                '创建项目'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
