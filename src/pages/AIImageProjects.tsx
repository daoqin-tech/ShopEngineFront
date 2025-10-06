import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/ui/date-picker';
import { useNavigate } from 'react-router-dom';
import { Plus, Image, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { toast } from 'sonner';
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

export function AIImageProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AIImageProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AIImageProject | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  // 筛选状态
  const [nameFilter, setNameFilter] = useState('');
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();

  // 获取项目列表
  const fetchProjects = async (page: number = currentPage) => {
    try {
      setLoading(true);

      // 确保 pageSize 是有效数字
      const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;

      // 转换时间为秒级时间戳
      const params: any = {
        page,
        limit: validPageSize,
      };

      if (nameFilter.trim()) {
        params.name = nameFilter.trim();
      }

      if (startTime) {
        params.startTime = Math.floor(startTime.getTime() / 1000);
      }

      if (endTime) {
        params.endTime = Math.floor(endTime.getTime() / 1000);
      }

      const response = await AIImageProjectsAPI.getAIImageProjects(params);
      setProjects(response.data || []);
      setTotal(response.total || 0);
      setCurrentPage(response.page || page);
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
    fetchProjects(1);
  }, []);

  // 应用筛选 - 保持当前页码
  const handleApplyFilters = () => {
    fetchProjects(currentPage);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setNameFilter('');
    setStartTime(undefined);
    setEndTime(undefined);
    setCurrentPage(1);
    fetchProjects(1);
  };

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


  const confirmDelete = async () => {
    if (!selectedProject) return;
    
    try {
      await AIImageProjectsAPI.deleteAIImageProject(selectedProject.id);
      toast.success('项目删除成功');
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      fetchProjects(1); // 重新获取项目列表
    } catch (err) {
      toast.error('删除项目失败', {
        description: '请稍后再试'
      });
      console.error('Error deleting project:', err);
    }
  };


  const handleOpenProject = (projectId: string) => {
    navigate(`/workspace/project/${projectId}/edit`);
  };

  const handleStartEditName = (project: AIImageProject) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleSaveEditName = async (projectId: string) => {
    if (!editingName.trim()) {
      setEditingProjectId(null);
      return;
    }
    
    try {
      await AIImageProjectsAPI.updateAIImageProject(projectId, {
        name: editingName.trim()
      });
      toast.success('项目名称更新成功');
      setEditingProjectId(null);
      fetchProjects(currentPage); // 重新获取项目列表
    } catch (err) {
      toast.error('更新项目名称失败', {
        description: '请稍后再试'
      });
      console.error('Error updating project name:', err);
    }
  };

  const handleCancelEditName = () => {
    setEditingProjectId(null);
    setEditingName('');
  };


  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <div className="flex justify-between items-center p-6 border-b bg-white">
        <h1 className="text-2xl font-bold">AI生图</h1>
        <Button onClick={handleNewProject} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建商品制图
        </Button>
      </div>

      {/* 筛选器 */}
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">项目名称:</label>
            <div className="relative">
              <Input
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="搜索项目名称"
                className="w-48 pl-8"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">开始时间:</label>
            <DateTimePicker
              date={startTime}
              onDateChange={setStartTime}
              placeholder="选择开始时间"
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">结束时间:</label>
            <DateTimePicker
              date={endTime}
              onDateChange={setEndTime}
              placeholder="选择结束时间"
              className="w-48"
            />
          </div>
          <Button onClick={handleApplyFilters} className="px-6">
            搜索
          </Button>
          <Button variant="outline" onClick={handleResetFilters}>
            重置
          </Button>
        </div>
      </div>

      {/* 项目列表和分页容器 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Image className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-600 mb-2">还没有制图项目</h2>
              <p className="text-gray-500 mb-6">点击上方按钮创建您的第一个商品制图项目</p>
            </div>
          </div>
        ) : (
          <>
            {/* 项目列表 - 可滚动区域 */}
            <div className="flex-1 overflow-auto">
              <div className="bg-white border-l border-r border-t">
                {/* 表头 */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-10">
                  <div className="col-span-1">缩略图</div>
                  <div className="col-span-3">项目名称</div>
                  <div className="col-span-2">总任务数</div>
                  <div className="col-span-3">状态</div>
                  <div className="col-span-2">创建时间</div>
                  <div className="col-span-1">操作</div>
                </div>

                {/* 项目列表 */}
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 group"
                  >
                    {/* 缩略图 */}
                    <div className="col-span-1 flex items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {project.thumbnail ? (
                          <img
                            src={project.thumbnail}
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 项目名称 */}
                    <div className="col-span-3 flex items-center">
                      {editingProjectId === project.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditName(project.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEditName();
                              }
                            }}
                            onBlur={() => handleSaveEditName(project.id)}
                            className="text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEditName(project.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="font-medium hover:text-blue-600 cursor-text"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditName(project);
                          }}
                          title="点击编辑名称"
                        >
                          {project.name}
                        </div>
                      )}
                    </div>

                    {/* 总任务数 */}
                    <div className="col-span-2 flex items-center">
                      <Badge variant="outline" className="text-gray-600">
                        {project.totalTasks}
                      </Badge>
                    </div>

                    {/* 状态（合并所有状态） */}
                    <div className="col-span-3 flex items-center gap-1 flex-wrap">
                      {project.pendingTasks > 0 && (
                        <Badge variant="outline" className="text-yellow-600 text-xs">
                          等待:{project.pendingTasks}
                        </Badge>
                      )}
                      {project.queuedTasks > 0 && (
                        <Badge variant="outline" className="text-orange-600 text-xs">
                          队列:{project.queuedTasks}
                        </Badge>
                      )}
                      {project.processingTasks > 0 && (
                        <Badge variant="outline" className="text-blue-600 text-xs">
                          处理:{project.processingTasks}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-green-600 text-xs">
                        完成:{project.completedTasks}
                      </Badge>
                      {project.failedTasks > 0 && (
                        <Badge variant="outline" className="text-red-600 text-xs">
                          失败:{project.failedTasks}
                        </Badge>
                      )}
                    </div>

                    {/* 创建时间 */}
                    <div className="col-span-2 flex items-center text-sm text-gray-500">
                      {new Date(project.createdAt).toLocaleString('zh-CN')}
                    </div>

                    {/* 操作 */}
                    <div className="col-span-1 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                      >
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-500 hover:text-red-700 text-xs"
                        onClick={(e) => handleDeleteProject(project, e)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 分页控件 - 固定在底部 */}
            {total > 0 && (
              <div className="border-t border-l border-r bg-white p-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* 统计信息 */}
                  <div className="text-sm text-gray-500">
                    共 {total} 个项目
                  </div>

                  {/* 每页显示 */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">每页</label>
                    <Input
                      type="text"
                      value={pageSize}
                      onChange={(e) => {
                        const input = e.target.value;
                        if (!/^\d*$/.test(input)) return;
                        if (input === '') {
                          setPageSize('' as any);
                          return;
                        }
                        const value = parseInt(input);
                        if (value >= 1 && value <= 200) {
                          setPageSize(value);
                        }
                      }}
                      onBlur={(e) => {
                        const input = e.target.value;
                        const value = parseInt(input);
                        if (!input || !value || value < 1) {
                          setPageSize(100);
                        } else if (value > 200) {
                          setPageSize(200);
                        }
                      }}
                      className="w-16 h-8 text-sm text-center"
                    />
                    <span className="text-sm text-gray-600">条</span>
                  </div>

                  {/* 分隔线 */}
                  <div className="h-6 w-px bg-gray-300"></div>

                  {/* 上一页按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchProjects(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>

                  {/* 页码按钮 */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = Math.ceil(total / pageSize);
                      const maxVisiblePages = 7;

                      if (totalPages <= maxVisiblePages) {
                        return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => fetchProjects(page)}
                            disabled={loading}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ));
                      }

                      const pages: (number | string)[] = [];
                      if (currentPage <= 4) {
                        for (let i = 1; i <= 5; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        pages.push(1);
                        pages.push('...');
                        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        pages.push('...');
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      }

                      return pages.map((page, index) =>
                        typeof page === 'number' ? (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => fetchProjects(page)}
                            disabled={loading}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ) : (
                          <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                        )
                      );
                    })()}
                  </div>

                  {/* 下一页按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchProjects(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {/* 分隔线 */}
                  <div className="h-6 w-px bg-gray-300"></div>

                  {/* 跳转输入框 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">跳至</span>
                    <Input
                      type="text"
                      placeholder="页码"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget.value;
                          const value = parseInt(input);
                          const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;
                          const maxPage = Math.ceil(total / validPageSize);

                          if (value >= 1 && value <= maxPage) {
                            fetchProjects(value);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      onChange={(e) => {
                        const input = e.target.value;
                        if (!/^\d*$/.test(input)) {
                          e.target.value = input.replace(/\D/g, '');
                        }
                      }}
                      className="w-16 h-8 text-sm text-center"
                    />
                    <span className="text-sm text-gray-600">页</span>
                  </div>

                  {/* 总页数信息 */}
                  <span className="text-sm text-gray-500">
                    共 {Math.ceil(total / pageSize)} 页
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
  );
}