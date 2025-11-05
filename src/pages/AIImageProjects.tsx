import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/ui/date-picker';
import { useNavigate } from 'react-router-dom';
import { Plus, Image, Check, Search, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { imageTemplateService, type ImageTemplateProjectListItem } from '@/services/imageTemplateService';
import { FileUploadAPI } from '@/services/fileUpload';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

export function AIImageProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AIImageProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AIImageProject | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // 拆分对话框状态 - 已禁用
  // const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  // const [splitCount, setSplitCount] = useState<number>(2);
  // const [splitting, setSplitting] = useState(false);

  // 复制项目对话框状态
  const [dynamicCopyDialogOpen, setDynamicCopyDialogOpen] = useState(false);
  const [copyCount, setCopyCount] = useState<number>(1);
  const [dynamicCopying, setDynamicCopying] = useState(false);
  const [copyMode, setCopyMode] = useState<'dynamic' | 'static'>('dynamic'); // 复制模式：动态复制、静态复制

  // 模板替换统一对话框状态
  const [templateReplaceDialogOpen, setTemplateReplaceDialogOpen] = useState(false);
  const [selectedTemplateProjectId, setSelectedTemplateProjectId] = useState<string>('');
  const [templateProjects, setTemplateProjects] = useState<ImageTemplateProjectListItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false); // 是否正在处理
  const [queueProgress, setQueueProgress] = useState<{
    current: number;
    total: number;
    currentImage: string;
    successCount: number;
    failedCount: number;
    isPaused: boolean;
    isCompleted: boolean;
  }>({
    current: 0,
    total: 0,
    currentImage: '',
    successCount: 0,
    failedCount: 0,
    isPaused: false,
    isCompleted: false,
  });

  // 多选状态
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

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
      navigate(`/workspace/project/${newProject.id}/image-generation`);
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
    navigate(`/workspace/project/${projectId}/image-generation`);
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

  // 切换项目选择
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedProjectIds.size === projects.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(projects.map(p => p.id)));
    }
  };

  // 重新生成选中的项目
  const handleRegenerateSelected = async () => {
    if (selectedProjectIds.size === 0) {
      toast.error('请选择要重新生成的项目');
      return;
    }

    try {
      const projectIdsArray = Array.from(selectedProjectIds);
      await AIImageProjectsAPI.regenerateAIImageProjects(projectIdsArray);
      toast.success(`已提交 ${selectedProjectIds.size} 个项目重新生成`);
      setSelectedProjectIds(new Set());
      fetchProjects(currentPage); // 刷新列表
    } catch (err) {
      toast.error('重新生成失败', {
        description: '请稍后再试'
      });
      console.error('Error regenerating projects:', err);
    }
  };

  // 打开批量拆分对话框 - 已禁用
  // const handleOpenSplitDialog = () => {
  //   if (selectedProjectIds.size === 0) {
  //     toast.error('请选择要拆分的项目');
  //     return;
  //   }
  //   setSplitCount(2);
  //   setSplitDialogOpen(true);
  // };

  // 确认批量拆分项目 - 已禁用
  // const handleConfirmSplit = async () => {
  //   if (selectedProjectIds.size === 0) {
  //     toast.error('请选择要拆分的项目');
  //     return;
  //   }

  //   if (splitCount < 2) {
  //     toast.error('请输入有效的拆分数量（最小为2）');
  //     return;
  //   }

  //   try {
  //     setSplitting(true);
  //     const projectIdsArray = Array.from(selectedProjectIds);
  //     await AIImageProjectsAPI.splitProjects(projectIdsArray, splitCount);
  //     toast.success(`已成功拆分 ${selectedProjectIds.size} 个项目`);
  //     setSplitDialogOpen(false);
  //     setSelectedProjectIds(new Set());
  //     setSplitCount(2);
  //     fetchProjects(currentPage); // 刷新列表
  //   } catch (err: any) {
  //     toast.error('项目拆分失败', {
  //       description: err.response?.data?.message || '请稍后再试'
  //     });
  //     console.error('Error splitting projects:', err);
  //   } finally {
  //     setSplitting(false);
  //   }
  // };

  // 打开复制项目对话框
  const handleOpenDynamicCopyDialog = () => {
    if (selectedProjectIds.size === 0) {
      toast.error('请选择要复制的项目');
      return;
    }
    setCopyCount(1);
    setDynamicCopyDialogOpen(true);
  };

  // 确认复制项目
  const handleConfirmDynamicCopy = async () => {
    if (selectedProjectIds.size === 0) {
      toast.error('请选择要复制的项目');
      return;
    }

    if (copyCount < 1 || copyCount > 10) {
      toast.error('请输入有效的复制数量（1-10）');
      return;
    }

    try {
      setDynamicCopying(true);
      const projectIdsArray = Array.from(selectedProjectIds);
      await AIImageProjectsAPI.dynamicCopyProjects(projectIdsArray, copyCount);
      toast.success(`已成功复制 ${selectedProjectIds.size} 个项目，正在后台生成图片`);
      setDynamicCopyDialogOpen(false);
      setSelectedProjectIds(new Set());
      setCopyCount(1);
      fetchProjects(currentPage); // 刷新列表
    } catch (err: any) {
      toast.error('项目复制失败', {
        description: err.response?.data?.message || '请稍后再试'
      });
      console.error('Error dynamic copying projects:', err);
    } finally {
      setDynamicCopying(false);
    }
  };

  // 打开模板替换对话框
  const handleOpenTemplateReplaceDialog = async () => {
    if (selectedProjectIds.size === 0) {
      toast.error('请选择要替换的项目');
      return;
    }
    try {
      const projects = await imageTemplateService.getProjects();
      setTemplateProjects(projects);
      setSelectedTemplateProjectId('');
      setIsProcessing(false);
      setQueueProgress({
        current: 0,
        total: 0,
        currentImage: '',
        successCount: 0,
        failedCount: 0,
        isPaused: false,
        isCompleted: false,
      });
      setTemplateReplaceDialogOpen(true);
    } catch (err) {
      toast.error('加载模板项目失败');
      console.error('Error loading template projects:', err);
    }
  };

  // 加载图片到Image对象
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');

      // 设置跨域属性和回调
      img.onload = () => {
        console.log('图片加载成功:', url);
        resolve(img);
      };

      img.onerror = () => {
        console.error('图片加载失败:', url);
        // 尝试不使用crossOrigin重新加载
        const img2 = document.createElement('img');
        img2.onload = () => {
          console.log('不使用crossOrigin加载成功:', url);
          resolve(img2);
        };
        img2.onerror = () => {
          reject(new Error(`图片加载失败: ${url}`));
        };
        img2.src = url;
      };

      // 对于腾讯云COS的图片设置crossOrigin
      if (url.includes('.myqcloud.com')) {
        img.crossOrigin = 'anonymous';
      }

      img.src = url;
    });
  };

  // 合成图片：将图片放置到模板的指定区域
  const compositeImages = async (
    templateImageUrl: string,
    regions: Array<{ x: number; y: number; width: number; height: number; order: number }>,
    replacementImageUrl: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<{ blob: Blob; width: number; height: number }> => {
    console.log('开始合成图片...');
    console.log('模板URL:', templateImageUrl);
    console.log('替换图片URL:', replacementImageUrl);
    console.log('目标尺寸:', targetWidth, 'x', targetHeight);
    console.log('区域信息:', regions);

    // 加载模板图片
    const templateImg = await loadImage(templateImageUrl);
    console.log('模板图片加载完成:', templateImg.width, 'x', templateImg.height);

    // 创建原始尺寸的canvas
    const canvas = document.createElement('canvas');
    canvas.width = templateImg.width;
    canvas.height = templateImg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建canvas上下文');
    }

    // 绘制模板图片作为底图
    ctx.drawImage(templateImg, 0, 0);
    console.log('模板底图绘制完成');

    // 加载替换图片
    const replaceImg = await loadImage(replacementImageUrl);
    console.log('替换图片加载完成:', replaceImg.width, 'x', replaceImg.height);

    // 按顺序替换区域
    const sortedRegions = [...regions].sort((a, b) => a.order - b.order);

    for (let i = 0; i < sortedRegions.length; i++) {
      const region = sortedRegions[i];
      console.log(`绘制区域 ${i + 1}:`, region);

      // 将替换图片绘制到指定区域（覆盖模式）
      ctx.drawImage(
        replaceImg,
        region.x,
        region.y,
        region.width,
        region.height
      );
    }
    console.log('所有区域替换完成');

    // 创建压缩后的canvas
    const compressedCanvas = document.createElement('canvas');
    compressedCanvas.width = targetWidth;
    compressedCanvas.height = targetHeight;
    const compressedCtx = compressedCanvas.getContext('2d');
    if (!compressedCtx) {
      throw new Error('无法创建压缩canvas上下文');
    }

    // 将原始图片缩放到目标尺寸
    compressedCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    console.log('图片压缩完成');

    // 转换为blob（提高质量到98%以保留更多细节）
    return new Promise((resolve, reject) => {
      compressedCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Blob生成成功，大小:', blob.size);
            resolve({
              blob,
              width: targetWidth,
              height: targetHeight,
            });
          } else {
            reject(new Error('图片转换失败'));
          }
        },
        'image/jpeg',
        0.98
      );
    });
  };

  // 开始模板替换处理
  const handleStartTemplateReplace = async () => {
    if (selectedProjectIds.size === 0) {
      toast.error('请选择要替换的项目');
      return;
    }

    if (!selectedTemplateProjectId) {
      toast.error('请选择模板项目');
      return;
    }

    try {
      setIsProcessing(true);
      const projectIdsArray = Array.from(selectedProjectIds);

      // 1. 获取模板信息和图片信息
      const result = await AIImageProjectsAPI.getTemplateMatchInfo(projectIdsArray, selectedTemplateProjectId);

      if (!result.totalImages || result.totalImages === 0) {
        toast.error('没有找到符合尺寸的图片');
        setIsProcessing(false);
        return;
      }

      console.log('后端返回结果:', result);

      // 2. 获取模板项目信息以确定输出尺寸
      const templateProject = result.templateProject;
      let targetWidth: number, targetHeight: number;

      switch (templateProject.type) {
        case 'calendar_landscape':
          targetWidth = 1440;
          targetHeight = 1120;
          break;
        case 'calendar_portrait':
          targetWidth = 1024;
          targetHeight = 1440;
          break;
        default:
          targetWidth = 1024;
          targetHeight = 1440;
      }

      const templates = result.templates;
      if (templates.length === 0) {
        toast.error('模板项目中没有模板');
        setIsProcessing(false);
        return;
      }

      // 3. 构建任务队列 - 按项目分组
      const projectTaskQueue: Array<{
        projectId: string;
        projectName: string;
        tasks: Array<{
          imageId: string;
          imageUrl: string;
          templateId: string;
          templateName: string;
        }>;
      }> = [];

      let totalTaskCount = 0;
      for (const projectResult of result.projectResults) {
        const projectTasks: Array<{
          imageId: string;
          imageUrl: string;
          templateId: string;
          templateName: string;
        }> = [];

        let templateIndex = 0;
        for (const image of projectResult.images) {
          const template = templates[templateIndex % templates.length];
          projectTasks.push({
            imageId: image.id,
            imageUrl: image.imageUrl,
            templateId: template.id,
            templateName: template.name,
          });
          templateIndex++;
          totalTaskCount++;
        }

        projectTaskQueue.push({
          projectId: projectResult.projectId,
          projectName: projectResult.projectName,
          tasks: projectTasks,
        });
      }

      // 4. 初始化进度
      setQueueProgress({
        current: 0,
        total: totalTaskCount,
        currentImage: '',
        successCount: 0,
        failedCount: 0,
        isPaused: false,
        isCompleted: false,
      });

      // 5. 开始队列处理 - 按项目处理
      await processProjectQueueWithDelay(projectTaskQueue, selectedTemplateProjectId, targetWidth, targetHeight);

    } catch (err: any) {
      setIsProcessing(false);
      toast.error('模板替换失败', {
        description: err.response?.data?.message || err.message || '请稍后再试'
      });
      console.error('Error applying template:', err);
    }
  };

  // 按项目队列处理函数 - 一个项目一个项目处理，带延迟
  const processProjectQueueWithDelay = async (
    projectQueue: Array<{
      projectId: string;
      projectName: string;
      tasks: Array<{
        imageId: string;
        imageUrl: string;
        templateId: string;
        templateName: string;
      }>;
    }>,
    templateProjectId: string,
    targetWidth: number,
    targetHeight: number
  ) => {
    let successCount = 0;
    let failedCount = 0;
    let processedCount = 0;

    // 按项目一个一个处理
    for (let projectIdx = 0; projectIdx < projectQueue.length; projectIdx++) {
      const project = projectQueue[projectIdx];

      console.log(`\n开始处理项目 [${projectIdx + 1}/${projectQueue.length}]: ${project.projectName}`);

      // 处理当前项目的所有图片
      for (let taskIdx = 0; taskIdx < project.tasks.length; taskIdx++) {
        const task = project.tasks[taskIdx];
        processedCount++;

        // 更新当前处理的图片信息
        setQueueProgress(prev => ({
          ...prev,
          current: processedCount,
          currentImage: `[项目 ${projectIdx + 1}/${projectQueue.length}] ${project.projectName} - 图片 ${taskIdx + 1}/${project.tasks.length}`,
        }));

        try {
          console.log(`  处理图片 [${taskIdx + 1}/${project.tasks.length}]: ${task.imageId}`);

          // 获取模板详情
          const templateDetail = await imageTemplateService.getTemplate(templateProjectId, task.templateId);

          // 合成图片
          const { blob, width, height } = await compositeImages(
            templateDetail.imageUrl,
            templateDetail.regions,
            task.imageUrl,
            targetWidth,
            targetHeight
          );

          // 上传图片
          const fileName = `template-replaced-${Date.now()}-${task.imageId}-${task.templateId}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          const uploadedUrl = await FileUploadAPI.uploadFile(file);

          // 更新图片信息
          await AIImageSessionsAPI.batchUpdateImages([{
            imageId: task.imageId,
            imageUrl: uploadedUrl,
            width,
            height,
          }]);

          successCount++;
          setQueueProgress(prev => ({
            ...prev,
            successCount,
          }));

          console.log(`  图片处理成功`);

        } catch (error) {
          failedCount++;
          setQueueProgress(prev => ({
            ...prev,
            failedCount,
          }));
          console.error(`  图片处理失败:`, error);
        }
      }

      console.log(`项目 ${project.projectName} 处理完成\n`);

      // 项目之间间隔 1 秒
      if (projectIdx < projectQueue.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 处理完成
    setQueueProgress(prev => ({
      ...prev,
      isCompleted: true,
      currentImage: '所有项目处理完成',
    }));

    // 显示最终结果
    if (failedCount === 0) {
      toast.success(`成功替换 ${successCount} 张图片`);
    } else {
      toast.warning(`完成处理：成功 ${successCount} 张，失败 ${failedCount} 张`);
    }

    // 刷新项目列表
    fetchProjects(currentPage);
  };

  // 关闭模板替换对话框
  const handleCloseTemplateReplaceDialog = () => {
    if (isProcessing && !queueProgress.isCompleted) {
      const confirm = window.confirm('任务正在处理中，关闭对话框会中断处理，确定要关闭吗？');
      if (!confirm) return;
    }

    setTemplateReplaceDialogOpen(false);
    setSelectedProjectIds(new Set());
    setSelectedTemplateProjectId('');
    setIsProcessing(false);
    setQueueProgress({
      current: 0,
      total: 0,
      currentImage: '',
      successCount: 0,
      failedCount: 0,
      isPaused: false,
      isCompleted: false,
    });
  };


  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <div className="flex justify-between items-center p-6 border-b bg-white">
        <h1 className="text-2xl font-bold">手账纸产品图制作</h1>
        <div className="flex items-center gap-3">
          {selectedProjectIds.size > 0 && (
            <span className="text-sm text-gray-600">
              已选择 {selectedProjectIds.size} 个项目
            </span>
          )}
          <Button
            onClick={handleRegenerateSelected}
            disabled={selectedProjectIds.size === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            重新生成
          </Button>
          {/* 拆分项目按钮 - 已禁用 */}
          {/* <Button
            onClick={handleOpenSplitDialog}
            disabled={selectedProjectIds.size === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Scissors className="w-4 h-4" />
            拆分项目
          </Button> */}
          <Button
            onClick={handleOpenDynamicCopyDialog}
            disabled={selectedProjectIds.size === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            复制项目
          </Button>
          <Button
            onClick={handleOpenTemplateReplaceDialog}
            disabled={selectedProjectIds.size === 0 || isProcessing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Image className="w-4 h-4" />
            {isProcessing ? '替换中...' : '模板替换'}
          </Button>
          <Button onClick={handleNewProject} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建商品制图
          </Button>
        </div>
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
                <div className="grid grid-cols-[auto_auto_1fr_2fr_2fr_1fr_1.5fr_1fr] gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-10">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={projects.length > 0 && selectedProjectIds.size === projects.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-gray-900 focus:ring-2 focus:ring-gray-900 cursor-pointer"
                    />
                  </div>
                  <div className="text-center">序号</div>
                  <div className="text-center">缩略图</div>
                  <div>项目名称</div>
                  <div>任务状态</div>
                  <div>生成图片数</div>
                  <div>创建时间</div>
                  <div>操作</div>
                </div>

                {/* 项目列表 */}
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className="grid grid-cols-[auto_auto_1fr_2fr_2fr_1fr_1.5fr_1fr] gap-4 p-4 border-b hover:bg-gray-50 group"
                  >
                    {/* 复选框 */}
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedProjectIds.has(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-gray-900 focus:ring-2 focus:ring-gray-900 cursor-pointer"
                      />
                    </div>

                    {/* 序号 */}
                    <div className="flex items-center justify-center text-sm text-gray-500">
                      {(currentPage - 1) * pageSize + index + 1}
                    </div>

                    {/* 缩略图 */}
                    <div className="flex items-center justify-center">
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
                    <div className="flex items-center">
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

                    {/* 任务状态 */}
                    <div className="flex items-center gap-1 flex-wrap">
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

                    {/* 生成图片数 */}
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-blue-600">
                        {project.totalImages}
                      </Badge>
                    </div>

                    {/* 创建时间 */}
                    <div className="flex items-center text-sm text-gray-500">
                      {new Date(project.createdAt).toLocaleString('zh-CN')}
                    </div>

                    {/* 操作 */}
                    <div className="flex items-center gap-1">
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

      {/* 拆分项目对话框 - 已禁用 */}
      {/* <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-purple-600" />
              拆分项目
            </DialogTitle>
            <DialogDescription>
              将项目拆分成多个子项目，每个子项目包含均等数量的任务
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="splitCount">拆分数量</Label>
              <Input
                id="splitCount"
                type="number"
                min={2}
                value={splitCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 2) {
                    setSplitCount(value);
                  }
                }}
                placeholder="输入拆分数量（最小为2）"
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                项目将被拆分成 {splitCount} 个新项目，每个项目包含约等数量的任务
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSplitDialogOpen(false);
                setSplitCount(2);
              }}
              disabled={splitting}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmSplit}
              disabled={splitting || splitCount < 2}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {splitting ? '拆分中...' : '确认拆分'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* 复制项目对话框 */}
      <Dialog open={dynamicCopyDialogOpen} onOpenChange={setDynamicCopyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              复制项目
            </DialogTitle>
            <DialogDescription>
              选择复制模式，复制项目并立即开始生成新图片
            </DialogDescription>
          </DialogHeader>

          {/* 复制模式选择 Tabs */}
          <Tabs value={copyMode} onValueChange={(value) => setCopyMode(value as 'dynamic' | 'static')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dynamic">动态复制</TabsTrigger>
              <TabsTrigger value="static">静态复制</TabsTrigger>
            </TabsList>

            <TabsContent value="dynamic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="copyCount">每个项目复制数量</Label>
                <Input
                  id="copyCount"
                  type="number"
                  min={1}
                  max={10}
                  value={copyCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setCopyCount(value);
                    } else if (e.target.value === '') {
                      setCopyCount(1);
                    }
                  }}
                  placeholder="输入复制数量（1-10）"
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  已选择 {selectedProjectIds.size} 个项目，每个项目将创建 {copyCount} 个副本，共 {selectedProjectIds.size * copyCount} 个新项目
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>动态复制：</strong>生成的图片都不同
                  </p>
                </div>
                <p className="text-sm text-amber-600">
                  具体实现逻辑待开发
                </p>
              </div>
            </TabsContent>

            <TabsContent value="static" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="copyCount">每个项目复制数量</Label>
                <Input
                  id="copyCount"
                  type="number"
                  min={1}
                  max={10}
                  value={copyCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setCopyCount(value);
                    } else if (e.target.value === '') {
                      setCopyCount(1);
                    }
                  }}
                  placeholder="输入复制数量（1-10）"
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  已选择 {selectedProjectIds.size} 个项目，每个项目将创建 {copyCount} 个副本，共 {selectedProjectIds.size * copyCount} 个新项目
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>静态复制：</strong>生成的图片都相同
                  </p>
                </div>
                <p className="text-sm text-amber-600">
                  具体实现逻辑待开发
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDynamicCopyDialogOpen(false);
                setCopyCount(1);
              }}
              disabled={dynamicCopying}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmDynamicCopy}
              disabled={dynamicCopying || copyCount < 1 || copyCount > 10}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {dynamicCopying ? '复制中...' : '确认复制'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模板替换统一对话框 */}
      <Dialog open={templateReplaceDialogOpen} onOpenChange={() => handleCloseTemplateReplaceDialog()}>
        <DialogContent
          className="sm:max-w-2xl"
          onPointerDownOutside={(e) => isProcessing && e.preventDefault()}
          onEscapeKeyDown={(e) => isProcessing && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-600" />
              批量模板替换
            </DialogTitle>
            <DialogDescription>
              {!isProcessing ? '选择一个模板项目批量替换已选项目中的图片' : '正在处理图片替换，请勿关闭此对话框或刷新页面'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 未开始处理：显示模板选择 */}
            {!isProcessing && (
              <>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">选择日历模板类型</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {templateProjects.map((project) => (
                      <div
                        key={project.projectId}
                        onClick={() => setSelectedTemplateProjectId(project.projectId)}
                        className={`
                          relative p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${selectedTemplateProjectId === project.projectId
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                            ${selectedTemplateProjectId === project.projectId
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                            }
                          `}>
                            <Image className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                {project.type === 'calendar_landscape' ? '📐 横版日历' : '📱 竖版日历'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {project.templateCount} 个模板
                              </p>
                              <p className="text-xs text-gray-500">
                                {project.type === 'calendar_landscape' ? '匹配 928×1440 图片' : '匹配 1408×992 图片'}
                              </p>
                            </div>
                          </div>
                          {selectedTemplateProjectId === project.projectId && (
                            <div className="absolute top-3 right-3">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTemplateProjectId && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700 font-medium mb-1">
                      ✓ 已选择 {selectedProjectIds.size} 个项目进行模板替换
                    </p>
                    <p className="text-xs text-blue-600">
                      点击下方按钮开始替换
                    </p>
                  </div>
                )}
              </>
            )}

            {/* 处理中：显示进度 */}
            {isProcessing && (
              <>
                {/* 进度条 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">总进度</span>
                    <span className="font-medium">
                      {queueProgress.current} / {queueProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${queueProgress.total > 0 ? (queueProgress.current / queueProgress.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {queueProgress.total > 0
                        ? `${Math.round((queueProgress.current / queueProgress.total) * 100)}%`
                        : '0%'}
                    </span>
                    <span>
                      预计剩余: {Math.ceil((queueProgress.total - queueProgress.current) * 0.8)} 秒
                    </span>
                  </div>
                </div>

                {/* 当前处理信息 */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-600 mb-1">当前处理:</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {queueProgress.currentImage || '准备中...'}
                  </p>
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
                    <p className="text-xs text-blue-600 mb-1">已处理</p>
                    <p className="text-lg font-bold text-blue-700">{queueProgress.current}</p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-center">
                    <p className="text-xs text-green-600 mb-1">成功</p>
                    <p className="text-lg font-bold text-green-700">{queueProgress.successCount}</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-center">
                    <p className="text-xs text-red-600 mb-1">失败</p>
                    <p className="text-lg font-bold text-red-700">{queueProgress.failedCount}</p>
                  </div>
                </div>

                {/* 处理中动画 */}
                {!queueProgress.isCompleted && (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>正在处理中，请稍候...</span>
                  </div>
                )}

                {/* 完成提示 */}
                {queueProgress.isCompleted && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 text-center font-medium">
                      ✓ 所有任务处理完成！
                    </p>
                  </div>
                )}

                {/* 警告提示 */}
                {!queueProgress.isCompleted && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-xs text-amber-800">
                      ⚠️ 请勿关闭此对话框或刷新页面，否则会中断处理进度
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            {!isProcessing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseTemplateReplaceDialog}
                >
                  取消
                </Button>
                <Button
                  onClick={handleStartTemplateReplace}
                  disabled={!selectedTemplateProjectId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  开始替换
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCloseTemplateReplaceDialog}
                disabled={!queueProgress.isCompleted}
                className={queueProgress.isCompleted ? '' : 'opacity-50 cursor-not-allowed'}
              >
                {queueProgress.isCompleted ? '关闭' : '处理中...'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}