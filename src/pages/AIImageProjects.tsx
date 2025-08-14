import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Image, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function AIImageProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AIImageProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AIImageProject | null>(null);
  const [editingName, setEditingName] = useState('');

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await AIImageProjectsAPI.getAIImageProjects();
      setProjects(response.data || []);
    } catch (err) {
      toast.error('加载项目列表失败', {
        description: '请检查网络连接或稍后再试'
      });
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleNewProject = async () => {
    try {
      const newProject = await AIImageProjectsAPI.createAIImageProject({
        name: '新建项目',
      });
      navigate(`/workspace/project/${newProject.id}/edit`);
    } catch (err) {
      toast.error('创建项目失败', {
        description: '请稍后再试'
      });
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteProject = (project: AIImageProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleEditProject = (project: AIImageProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setEditingName(project.name);
    setEditDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProject) return;
    
    try {
      await AIImageProjectsAPI.deleteAIImageProject(selectedProject.id);
      toast.success('项目删除成功');
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      fetchProjects(); // 重新获取项目列表
    } catch (err) {
      toast.error('删除项目失败', {
        description: '请稍后再试'
      });
      console.error('Error deleting project:', err);
    }
  };

  const confirmEdit = async () => {
    if (!selectedProject || !editingName.trim()) return;
    
    try {
      await AIImageProjectsAPI.updateAIImageProject(selectedProject.id, {
        name: editingName.trim()
      });
      toast.success('项目名称更新成功');
      setEditDialogOpen(false);
      setSelectedProject(null);
      setEditingName('');
      fetchProjects(); // 重新获取项目列表
    } catch (err) {
      toast.error('更新项目失败', {
        description: '请稍后再试'
      });
      console.error('Error updating project:', err);
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/workspace/project/${projectId}/edit`);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI商品制图</h1>
        <Button onClick={handleNewProject} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建商品制图
        </Button>
      </div>

      {/* 加载状态 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Image className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-600 mb-2">还没有制图项目</h2>
          <p className="text-gray-500 mb-6">点击上方按钮创建您的第一个商品制图项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white relative"
              onClick={() => handleOpenProject(project.id)}
            >
              {/* 操作按钮 */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleEditProject(project, e)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      编辑名称
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleDeleteProject(project, e)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除项目
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* 缩略图区域 */}
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                {project.thumbnail ? (
                  <img 
                    src={project.thumbnail} 
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* 项目信息 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg truncate mb-4">
                  {project.name}
                </h3>

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Image className="w-4 h-4" />
                    <span>{project.imageCount} 张图片</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(project.updatedAt).toLocaleString('zh-CN')}</span>
                  </div>
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

      {/* 编辑项目名称对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑项目名称</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="请输入项目名称"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmEdit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmEdit} disabled={!editingName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}