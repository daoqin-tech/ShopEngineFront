import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Plus, Image, Images, Check, Search, ChevronLeft, ChevronRight, Copy, Calendar } from 'lucide-react';
import { AIImageProjectsAPI, type AIImageProject } from '@/services/aiImageProjects';
import { imageTemplateService, type ImageTemplateProjectListItem } from '@/services/imageTemplateService';
import { FileUploadAPI } from '@/services/fileUpload';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
import { productCategoryService } from '@/services/productCategoryService';
import type { ProductCategory } from '@/types/productCategory';
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

// 竖版日历月份图片（下半部分 1024×720）
const VERTICAL_CALENDAR_PARTS = [
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/01.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/02.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/03.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/04.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/05.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/06.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/07.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/08.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/09.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/10.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/11.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/vertical_bottom/12.jpg",
];

// 横版日历月份图片（右半部分 720×1120）
const HORIZONTAL_CALENDAR_PARTS = [
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/01.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/02.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/03.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/04.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/05.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/06.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/07.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/08.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/09.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/10.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/11.jpg",
  "https://shopengine-1256301913.cos.ap-guangzhou.myqcloud.com/calendar_parts/horizontal_right/12.jpg",
];

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
  const [variationMode, setVariationMode] = useState<'minor' | 'subject' | 'background' | 'style'>('minor'); // 变化模式

  // 填充项目对话框状态
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const [targetImageCount, setTargetImageCount] = useState<number>(12);
  const [filling, setFilling] = useState(false);

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

  // 修改日历对话框状态
  const [fixCalendarDialogOpen, setFixCalendarDialogOpen] = useState(false);
  const [fixCalendarProcessing, setFixCalendarProcessing] = useState(false);
  const [fixCalendarProgress, setFixCalendarProgress] = useState<{
    current: number;
    total: number;
    currentImage: string;
    successCount: number;
    failedCount: number;
    isCompleted: boolean;
  }>({
    current: 0,
    total: 0,
    currentImage: '',
    successCount: 0,
    failedCount: 0,
    isCompleted: false,
  });

  // 多选状态
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  // 查看图片对话框状态
  const [viewImagesDialogOpen, setViewImagesDialogOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<AIImageProject | null>(null);
  const [viewingImages, setViewingImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  // 筛选状态
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(''); // 分类筛选
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();

  // 新建项目对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [creating, setCreating] = useState(false);

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

      if (categoryFilter) {
        params.categoryId = categoryFilter;
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
    loadCategories(); // 加载分类数据供筛选器使用
  }, []);

  // 应用筛选 - 保持当前页码
  const handleApplyFilters = () => {
    fetchProjects(currentPage);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setNameFilter('');
    setCategoryFilter('');
    setStartTime(undefined);
    setEndTime(undefined);
    setCurrentPage(1);
    fetchProjects(1);
  };

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const data = await productCategoryService.getAllCategories(true); // 只获取启用的分类
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('加载分类失败');
    }
  };

  // 打开新建项目对话框
  const handleNewProject = async () => {
    setNewProjectName('');
    setSelectedCategoryId('');
    setCreateDialogOpen(true);
    await loadCategories();
  };

  // 确认创建项目
  const handleConfirmCreate = async () => {
    if (!newProjectName.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('请选择产品分类');
      return;
    }

    try {
      setCreating(true);
      const newProject = await AIImageProjectsAPI.createAIImageProject({
        name: newProjectName.trim(),
        categoryId: selectedCategoryId,
      });
      setCreateDialogOpen(false);
      navigate(`/workspace/project/${newProject.id}/image-generation`);
    } catch (err) {
      toast.error('创建项目失败', {
        description: '请稍后再试'
      });
      console.error('Error creating project:', err);
    } finally {
      setCreating(false);
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

  // 打开查看图片对话框
  const handleViewImages = async (project: AIImageProject) => {
    setViewingProject(project);
    setViewImagesDialogOpen(true);
    setLoadingImages(true);

    try {
      const images = await AIImageSessionsAPI.loadImages(project.id);
      setViewingImages(images || []);
    } catch (error) {
      console.error('加载图片失败:', error);
      toast.error('加载图片失败');
      setViewingImages([]);
    } finally {
      setLoadingImages(false);
    }
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

    if (copyCount < 1 || copyCount > 100) {
      toast.error('请输入有效的复制数量（1-100）');
      return;
    }

    try {
      setDynamicCopying(true);
      const projectIdsArray = Array.from(selectedProjectIds);

      // 只有在动态复制模式下才传递 variationOptions
      const variationOptions = copyMode === 'dynamic' ? {
        mode: variationMode,
      } : undefined;

      await AIImageProjectsAPI.dynamicCopyProjects(projectIdsArray, copyCount, variationOptions);
      toast.success(`已成功复制 ${selectedProjectIds.size} 个项目，正在后台生成图片`);
      setDynamicCopyDialogOpen(false);
      setSelectedProjectIds(new Set());
      setCopyCount(1);
      setVariationMode('minor');
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

  // 打开填充项目对话框
  const handleOpenFillDialog = () => {
    if (selectedProjectIds.size === 0) {
      toast.error('请选择要填充的项目');
      return;
    }
    setTargetImageCount(12);
    setFillDialogOpen(true);
  };

  // 确认填充项目
  const handleConfirmFill = async () => {
    if (selectedProjectIds.size === 0) {
      toast.error('请选择要填充的项目');
      return;
    }

    if (targetImageCount < 1 || targetImageCount > 50) {
      toast.error('请输入有效的目标图片数量（1-50）');
      return;
    }

    try {
      setFilling(true);
      const projectIdsArray = Array.from(selectedProjectIds);

      await AIImageProjectsAPI.fillProjects(projectIdsArray, targetImageCount);
      setFillDialogOpen(false);
      setSelectedProjectIds(new Set());
      setTargetImageCount(targetImageCount);
      fetchProjects(currentPage); // 刷新列表
    } catch (err: any) {
      toast.error('项目填充失败', {
        description: err.response?.data?.message || '请稍后再试'
      });
      console.error('Error filling projects:', err);
    } finally {
      setFilling(false);
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
    // 防止重复点击
    if (isProcessing) return;

    if (selectedProjectIds.size === 0) {
      toast.error('请选择要替换的项目');
      return;
    }

    if (!selectedTemplateProjectId) {
      toast.error('请选择模板项目');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. 获取选中的模板项目信息
      const templateProject = templateProjects.find(p => p.projectId === selectedTemplateProjectId);
      if (!templateProject) {
        toast.error('模板项目不存在');
        setIsProcessing(false);
        return;
      }

      // 2. 获取该模板项目的所有模板
      const templateList = await imageTemplateService.getTemplates(selectedTemplateProjectId);
      if (templateList.length === 0) {
        toast.error('该模板项目没有任何模板');
        setIsProcessing(false);
        return;
      }

      console.log(`模板项目包含 ${templateList.length} 个模板`);

      // 4. 根据模板类型确定目标尺寸
      const targetImageWidth = templateProject.type === 'calendar_landscape' ? 928 : 1408;
      const targetImageHeight = templateProject.type === 'calendar_landscape' ? 1440 : 992;
      const outputWidth = templateProject.type === 'calendar_landscape' ? 1440 : 1024;
      const outputHeight = templateProject.type === 'calendar_landscape' ? 1120 : 1440;

      // 5. 初始化进度
      const projectsArray = Array.from(selectedProjectIds);
      setQueueProgress({
        current: 0,
        total: projectsArray.length,
        currentImage: '',
        successCount: 0,
        failedCount: 0,
        isPaused: false,
        isCompleted: false,
      });

      // 6. 逐个项目处理
      let successCount = 0;
      let failedCount = 0;

      for (let projectIndex = 0; projectIndex < projectsArray.length; projectIndex++) {
        const projectId = projectsArray[projectIndex];

        // 更新当前处理的项目进度
        setQueueProgress(prev => ({
          ...prev,
          current: projectIndex + 1,
          currentImage: `正在处理第 ${projectIndex + 1}/${projectsArray.length} 个项目`,
        }));

        // 获取项目名称
        const project = projects.find(p => p.id === projectId);
        const projectName = project?.name || `项目${projectIndex + 1}`;

        // 获取项目的所有图片
        const images = await AIImageSessionsAPI.loadImages(projectId);

        // 筛选符合尺寸的图片
        const matchedImages = images.filter(
          img => img.width === targetImageWidth && img.height === targetImageHeight
        );

        console.log(`\n开始处理项目 [${projectIndex + 1}/${projectsArray.length}]: ${projectName}, 符合尺寸图片: ${matchedImages.length}张, 模板数: ${templateList.length}`);

        // 确定要处理的数量（取图片和模板数量的最小值）
        const processCount = Math.min(matchedImages.length, templateList.length);

        // 图片和模板一一对应处理
        for (let i = 0; i < processCount; i++) {
          const image = matchedImages[i];
          const templateItem = templateList[i];

          try {
            // 获取当前模板的详情
            const templateDetail = await imageTemplateService.getTemplate(
              selectedTemplateProjectId,
              templateItem.templateId
            );

            console.log(`  处理第 ${i + 1}/${processCount} 张图片，使用模板 ${i + 1}`);

            // 合成图片
            const { blob, width, height } = await compositeImages(
              templateDetail.imageUrl,
              templateDetail.regions,
              image.imageUrl,
              outputWidth,
              outputHeight
            );

            // 上传
            const fileName = `template-replaced-${Date.now()}-${image.id}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            const uploadedUrl = await FileUploadAPI.uploadFile(file);

            // 更新数据库
            await AIImageSessionsAPI.batchUpdateImages([{
              imageId: image.id,
              imageUrl: uploadedUrl,
              width,
              height,
            }]);

            successCount++;
            setQueueProgress(prev => ({ ...prev, successCount }));
            console.log(`  图片 ${image.id} 处理成功，使用了模板 ${i + 1}`);

          } catch (error) {
            console.error(`  图片 ${image.id} 处理失败:`, error);
            failedCount++;
            setQueueProgress(prev => ({ ...prev, failedCount }));
          }
        }

        console.log(`项目 ${projectName} 处理完成\n`);
      }

      // 7. 完成
      setQueueProgress(prev => ({
        ...prev,
        current: projectsArray.length,
        isCompleted: true,
        currentImage: '所有项目处理完成',
      }));

      if (failedCount === 0) {
        toast.success(`成功替换 ${successCount} 张图片`);
      } else {
        toast.warning(`完成处理：成功 ${successCount} 张，失败 ${failedCount} 张`);
      }

      fetchProjects(currentPage);

    } catch (err: any) {
      toast.error('模板替换失败', {
        description: err.response?.data?.message || err.message || '请稍后再试'
      });
      console.error('Error applying template:', err);
    } finally {
      setIsProcessing(false);
    }
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

  // ========== 修改日历功能 ==========

  // 打开修改日历对话框
  // const handleOpenFixCalendarDialog = async () => {
  //   if (selectedProjectIds.size === 0) {
  //     toast.error('请选择要修改的项目');
  //     return;
  //   }

  //   try {
  //     // 重置状态
  //     setFixCalendarProgress({
  //       current: 0,
  //       total: 0,
  //       currentImage: '',
  //       successCount: 0,
  //       failedCount: 0,
  //       isCompleted: false,
  //     });

  //     setFixCalendarDialogOpen(true);
  //   } catch (err) {
  //     toast.error('打开修改日历对话框失败');
  //     console.error('Error opening fix calendar dialog:', err);
  //   }
  // };

  // Canvas合成：竖版日历（1024×1440）
  const compositeVerticalCalendar = async (
    existingImageUrl: string,
    monthIndex: number
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1440;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('无法创建canvas上下文');
    }

    // 1. 加载现有成品图
    const existingImg = await loadImage(existingImageUrl);

    // 2. 绘制上半部分（保留原图的产品内容）
    ctx.drawImage(
      existingImg,
      0, 0, 1024, 720,  // 源：上半部分
      0, 0, 1024, 720   // 目标：上半部分
    );

    // 3. 加载对应月份的日历图片
    const monthImg = await loadImage(VERTICAL_CALENDAR_PARTS[monthIndex]);

    // 4. 绘制下半部分（新的月份日历）
    ctx.drawImage(
      monthImg,
      0, 0, 1024, 720,  // 源：整张月份图（已经是下半部分）
      0, 720, 1024, 720 // 目标：下半部分
    );

    // 5. 转换为blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('图片转换失败'));
          }
        },
        'image/jpeg',
        0.98
      );
    });
  };

  // Canvas合成：横版日历（1440×1120）
  const compositeHorizontalCalendar = async (
    existingImageUrl: string,
    monthIndex: number
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 1120;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('无法创建canvas上下文');
    }

    // 1. 加载现有成品图
    const existingImg = await loadImage(existingImageUrl);

    // 2. 绘制左半部分（保留原图的产品内容）
    ctx.drawImage(
      existingImg,
      0, 0, 720, 1120,  // 源：左半部分
      0, 0, 720, 1120   // 目标：左半部分
    );

    // 3. 加载对应月份的日历图片
    const monthImg = await loadImage(HORIZONTAL_CALENDAR_PARTS[monthIndex]);

    // 4. 绘制右半部分（新的月份日历）
    ctx.drawImage(
      monthImg,
      0, 0, 720, 1120,   // 源：整张月份图（已经是右半部分）
      720, 0, 720, 1120  // 目标：右半部分
    );

    // 5. 转换为blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('图片转换失败'));
          }
        },
        'image/jpeg',
        0.98
      );
    });
  };

  // 开始修改日历
  const handleStartFixCalendar = async () => {
    if (fixCalendarProcessing) return;

    if (selectedProjectIds.size === 0) {
      toast.error('请选择要修改的项目');
      return;
    }

    setFixCalendarProcessing(true);

    try {
      const projectsArray = Array.from(selectedProjectIds);
      let totalImages = 0;
      let successCount = 0;
      let failedCount = 0;

      // 统计总图片数（排除封面图片）
      for (const projectId of projectsArray) {
        const images = await AIImageSessionsAPI.loadImages(projectId);
        // 只统计日历内页（排除 generated-images 路径的封面图片）
        const calendarImages = images.filter(img => !img.imageUrl.includes('generated-images'));
        totalImages += calendarImages.length;
      }

      setFixCalendarProgress({
        current: 0,
        total: totalImages,
        currentImage: '',
        successCount: 0,
        failedCount: 0,
        isCompleted: false,
      });

      let processedCount = 0;

      // 逐个项目处理
      for (let projIndex = 0; projIndex < projectsArray.length; projIndex++) {
        const projectId = projectsArray[projIndex];
        const project = projects.find(p => p.id === projectId);

        // 获取项目的所有图片并按创建时间排序
        const images = await AIImageSessionsAPI.loadImages(projectId);
        images.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // 过滤掉封面图片（包含 generated-images 路径的是原始生成图片，通常是封面）
        const calendarImages = images.filter(img => !img.imageUrl.includes('generated-images'));

        console.log(`处理项目 [${projIndex + 1}/${projectsArray.length}]: ${project?.name}, 共 ${images.length} 张图片，其中 ${calendarImages.length} 张日历内页`);

        for (let i = 0; i < calendarImages.length; i++) {
          const image = calendarImages[i];
          const monthIndex = i % 12; // 循环使用12个月份 (0-11)

          try {
            processedCount++;
            setFixCalendarProgress(prev => ({
              ...prev,
              current: processedCount,
              currentImage: `正在处理第 ${processedCount}/${totalImages} 张图片...`,
            }));

            // 根据图片尺寸判断类型并合成
            let blob: Blob;
            if (image.width === 1024 && image.height === 1440) {
              // 竖版日历
              blob = await compositeVerticalCalendar(image.imageUrl, monthIndex);
            } else if (image.width === 1440 && image.height === 1120) {
              // 横版日历
              blob = await compositeHorizontalCalendar(image.imageUrl, monthIndex);
            } else {
              throw new Error(`不支持的图片尺寸: ${image.width}x${image.height}`);
            }

            // 上传
            const fileName = `calendar-fixed-${Date.now()}-${image.id}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            const uploadedUrl = await FileUploadAPI.uploadFile(file);

            // 更新数据库
            await AIImageSessionsAPI.batchUpdateImages([{
              imageId: image.id,
              imageUrl: uploadedUrl,
              width: image.width,
              height: image.height,
            }]);

            successCount++;
            setFixCalendarProgress(prev => ({ ...prev, successCount }));
            console.log(`图片 ${image.id} 修改成功（${monthIndex + 1}月）`);

          } catch (error) {
            console.error(`图片 ${image.id} 修改失败:`, error);
            failedCount++;
            setFixCalendarProgress(prev => ({ ...prev, failedCount }));
          }
        }
      }

      // 完成
      setFixCalendarProgress(prev => ({
        ...prev,
        current: totalImages,
        isCompleted: true,
        currentImage: '所有图片处理完成',
      }));

      if (failedCount === 0) {
        toast.success(`成功修改 ${successCount} 张图片`);
      } else {
        toast.warning(`完成处理：成功 ${successCount} 张，失败 ${failedCount} 张`);
      }

      fetchProjects(currentPage);

    } catch (err: any) {
      toast.error('修改日历失败', {
        description: err.message || '请稍后再试'
      });
      console.error('Error fixing calendar:', err);
    } finally {
      setFixCalendarProcessing(false);
    }
  };

  // 关闭修改日历对话框
  const handleCloseFixCalendarDialog = () => {
    if (fixCalendarProcessing && !fixCalendarProgress.isCompleted) {
      const confirm = window.confirm('任务正在处理中，关闭对话框会中断处理，确定要关闭吗？');
      if (!confirm) return;
    }

    setFixCalendarDialogOpen(false);
    setFixCalendarProcessing(false);
    setFixCalendarProgress({
      current: 0,
      total: 0,
      currentImage: '',
      successCount: 0,
      failedCount: 0,
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
            onClick={handleOpenFillDialog}
            disabled={selectedProjectIds.size === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Images className="w-4 h-4" />
            填充项目
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
          {/* <Button
            onClick={handleOpenFixCalendarDialog}
            disabled={selectedProjectIds.size === 0 || fixCalendarProcessing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {fixCalendarProcessing ? '修改中...' : '修改日历'}
          </Button> */}
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
            <label className="text-sm font-medium text-gray-700">产品分类:</label>
            <Select value={categoryFilter || undefined} onValueChange={(value) => setCategoryFilter(value || '')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <div className="grid grid-cols-[auto_auto_1fr_2fr_1fr_2fr_1fr_1.5fr_1fr] gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-10">
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
                  <div>产品分类</div>
                  <div>任务状态</div>
                  <div>生成图片数</div>
                  <div>创建时间</div>
                  <div>操作</div>
                </div>

                {/* 项目列表 */}
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className="grid grid-cols-[auto_auto_1fr_2fr_1fr_2fr_1fr_1.5fr_1fr] gap-4 p-4 border-b hover:bg-gray-50 group"
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

                    {/* 产品分类 */}
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">
                        {categories.find(c => c.id === project.categoryId)?.name || '-'}
                      </span>
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
                        className="h-7 px-2 text-green-500 hover:text-green-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewImages(project);
                        }}
                      >
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                      >
                        编辑
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="copyCount">每个项目复制数量</Label>
                  <Input
                    id="copyCount"
                    type="number"
                    min={1}
                    max={100}
                    value={copyCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        setCopyCount(value);
                      } else if (e.target.value === '') {
                        setCopyCount(1);
                      }
                    }}
                    placeholder="输入复制数量（1-100）"
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500">
                    已选择 {selectedProjectIds.size} 个项目，每个项目将创建 {copyCount} 个副本，共 {selectedProjectIds.size * copyCount} 个新项目
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>变化模式</Label>
                  <div className="space-y-2">
                    {[
                      { value: 'minor', label: '微调模式', desc: '保持主要元素，微调细节' },
                      { value: 'subject', label: '主体变化', desc: '替换主要物体，保持场景' },
                      { value: 'background', label: '背景变化', desc: '保持主体，改变背景' },
                      { value: 'style', label: '风格变化', desc: '改变艺术表现风格' },
                      { value: 'notebook', label: '笔记本专用', desc: '保持文字和主题不变，风格和元素多样化' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          variationMode === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="variationMode"
                          value={option.value}
                          checked={variationMode === option.value}
                          onChange={(e) => setVariationMode(e.target.value as any)}
                          className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>动态复制：</strong>基于原图生成相似但有变化的新图片
                  </p>
                </div>
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
              disabled={dynamicCopying || copyCount < 1 || copyCount > 100}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {dynamicCopying ? '复制中...' : '确认复制'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 填充项目对话框 */}
      <Dialog open={fillDialogOpen} onOpenChange={setFillDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Images className="w-5 h-5 text-blue-600" />
              填充项目
            </DialogTitle>
            <DialogDescription>
              为选中的项目填充图片到指定数量
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-600">
              已选择 <span className="font-semibold text-gray-900">{selectedProjectIds.size}</span> 个项目
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-sm text-blue-800">
                <strong>填充功能：</strong>为每个项目复制现有图片，直到达到目标数量
              </p>
              <p className="text-xs text-blue-700">
                <strong>适用场景：</strong>批量将多个项目的图片数量补充到相同数量
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">目标图片数量</label>
              <Input
                type="number"
                value={targetImageCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1 && value <= 50) {
                    setTargetImageCount(value);
                  }
                }}
                min={1}
                max={50}
                className="w-full"
                placeholder="输入目标数量 (1-50)"
              />
              <p className="text-xs text-gray-500 mt-1">每个项目最多可填充到 50 张图片</p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">
                将为 <span className="font-semibold text-gray-900">{selectedProjectIds.size}</span> 个项目填充图片到 <span className="font-semibold text-gray-900">{targetImageCount}</span> 张
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFillDialogOpen(false);
                setTargetImageCount(12);
              }}
              disabled={filling}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmFill}
              disabled={filling || targetImageCount < 1 || targetImageCount > 50}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {filling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  填充中...
                </>
              ) : (
                <>
                  <Images className="w-4 h-4 mr-2" />
                  确认填充
                </>
              )}
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

      {/* 修改日历对话框 */}
      <Dialog open={fixCalendarDialogOpen} onOpenChange={() => handleCloseFixCalendarDialog()}>
        <DialogContent
          className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => fixCalendarProcessing && e.preventDefault()}
          onEscapeKeyDown={(e) => fixCalendarProcessing && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              修改日历月份
            </DialogTitle>
            <DialogDescription>
              {!fixCalendarProcessing ? '为图片选择正确的月份，系统会自动合成' : '正在处理图片，请勿关闭此对话框'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!fixCalendarProcessing ? (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">使用说明：</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 已选择 {selectedProjectIds.size} 个项目</li>
                    <li>• 系统会自动按顺序分配月份（第1张=1月，第2张=2月...）</li>
                    <li>• 超过12张时会循环使用月份（第13张=1月，第14张=2月...）</li>
                    <li>• 系统会自动识别图片类型（竖版/横版日历）并合成</li>
                    <li>• 竖版日历（1024×1440）替换下半部分</li>
                    <li>• 横版日历（1440×1120）替换右半部分</li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-900 mb-2">⚠️ 重要提示：</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• 此功能用于修复已生成的成品图，不会影响封面图</li>
                    <li>• 请确保图片是已经过模板替换的成品图</li>
                    <li>• 处理过程会直接更新数据库中的图片URL</li>
                    <li>• 建议先小批量测试，确认效果后再批量处理</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                {/* 进度条 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">总进度</span>
                    <span className="font-medium">
                      {fixCalendarProgress.current} / {fixCalendarProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${fixCalendarProgress.total > 0 ? (fixCalendarProgress.current / fixCalendarProgress.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {fixCalendarProgress.total > 0
                        ? `${Math.round((fixCalendarProgress.current / fixCalendarProgress.total) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>

                {/* 当前处理信息 */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-600 mb-1">当前处理:</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fixCalendarProgress.currentImage || '准备中...'}
                  </p>
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
                    <p className="text-xs text-blue-600 mb-1">已处理</p>
                    <p className="text-lg font-bold text-blue-700">{fixCalendarProgress.current}</p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-center">
                    <p className="text-xs text-green-600 mb-1">成功</p>
                    <p className="text-lg font-bold text-green-700">{fixCalendarProgress.successCount}</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-center">
                    <p className="text-xs text-red-600 mb-1">失败</p>
                    <p className="text-lg font-bold text-red-700">{fixCalendarProgress.failedCount}</p>
                  </div>
                </div>

                {/* 处理中动画 */}
                {!fixCalendarProgress.isCompleted && (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>正在处理中，请稍候...</span>
                  </div>
                )}

                {/* 完成提示 */}
                {fixCalendarProgress.isCompleted && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 text-center font-medium">
                      ✓ 所有任务处理完成！
                    </p>
                  </div>
                )}

                {/* 警告提示 */}
                {!fixCalendarProgress.isCompleted && (
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
            {!fixCalendarProcessing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseFixCalendarDialog}
                >
                  取消
                </Button>
                <Button
                  onClick={handleStartFixCalendar}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  开始处理
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCloseFixCalendarDialog}
                disabled={!fixCalendarProgress.isCompleted}
                className={fixCalendarProgress.isCompleted ? '' : 'opacity-50 cursor-not-allowed'}
              >
                {fixCalendarProgress.isCompleted ? '关闭' : '处理中...'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建项目对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建商品制图项目</DialogTitle>
            <DialogDescription>
              选择产品分类并输入项目名称
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>产品分类 *</Label>
              <div className="grid grid-cols-3 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-all hover:border-primary hover:bg-primary/5 ${
                      selectedCategoryId === category.id
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{category.name}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">项目名称 *</Label>
              <input
                id="projectName"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="请输入项目名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button onClick={handleConfirmCreate} disabled={creating}>
              {creating ? '创建中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看图片对话框 */}
      <Dialog open={viewImagesDialogOpen} onOpenChange={setViewImagesDialogOpen}>
        <DialogContent className="!max-w-[70vw] w-[70vw] h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              <h3 className="text-lg font-medium">
                {viewingProject?.name || '项目图片'}
              </h3>
              <p className="text-sm text-gray-500 mt-1 font-normal">
                共 {viewingImages.filter(img => img.status === 'completed').length} 张图片
              </p>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {loadingImages ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : viewingImages.filter(img => img.status === 'completed').length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {viewingImages
                  .filter(img => img.status === 'completed')
                  .map((image) => (
                    <div key={image.id} className="group relative bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={image.imageUrl}
                        alt={`图片 ${image.id}`}
                        className="w-full h-auto"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs">{image.width}×{image.height}</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Images className="w-12 h-12 mb-2" />
                <p>暂无图片</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}