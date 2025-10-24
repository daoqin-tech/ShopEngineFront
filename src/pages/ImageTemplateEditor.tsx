import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Plus, Trash2, Save, ArrowLeft, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadCroppedImageToTencentCloud } from '@/lib/tencentCloud';
import { imageTemplateService } from '@/services/imageTemplateService';
import { useNavigate, useParams } from 'react-router-dom';

interface ReplaceRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number; // 替换顺序
}

interface TemplateImage {
  id: string;
  file?: File;
  localUrl: string;  // 本地预览URL
  uploadedUrl?: string;  // 上传后的云端URL
  regions: ReplaceRegion[];
  uploading?: boolean;
}

export default function ImageTemplateEditor() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const isEditMode = projectId && projectId !== 'new';

  const [templates, setTemplates] = useState<TemplateImage[]>([]);
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Partial<ReplaceRegion> | null>(null);
  const [scale, setScale] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const currentTemplate = templates[currentTemplateIndex];

  // 加载图片模板项目数据（编辑模式）
  useEffect(() => {
    if (isEditMode) {
      loadTemplateProject();
    }
  }, [projectId]);

  const loadTemplateProject = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const project = await imageTemplateService.getProject(projectId);
      setProjectName(project.name);
      setProjectDescription(project.description || '');

      // 加载项目下的所有模板
      const templateList = await imageTemplateService.getTemplates(projectId);

      // 转换模板数据
      const loadedTemplates: TemplateImage[] = await Promise.all(
        templateList.map(async (template) => {
          const templateDetail = await imageTemplateService.getTemplate(projectId, template.templateId);
          return {
            id: template.templateId,
            localUrl: template.imageUrl,
            uploadedUrl: template.imageUrl,
            regions: templateDetail.regions.map((region, rIndex) => ({
              id: `region-${rIndex}`,
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height,
              order: region.order || rIndex + 1, // 使用保存的顺序或默认顺序
            })),
          };
        })
      );

      setTemplates(loadedTemplates);
      if (loadedTemplates.length > 0) {
        setCurrentTemplateIndex(0);
      }
    } catch (error) {
      console.error('加载图片模板项目失败:', error);
      toast.error('加载图片模板项目失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 压缩图片函数
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取canvas上下文'));
            return;
          }

          // 计算压缩后的尺寸（保持宽高比）
          // 日历印刷使用240 DPI，A4尺寸(21×29cm)需要约1984×2806像素
          const MAX_WIDTH = 2000;  // 最大宽度（约240DPI）
          const MAX_HEIGHT = 2800; // 最大高度（约240DPI）
          let width = img.width;
          let height = img.height;

          // 如果图片尺寸超过最大值，等比例缩放
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // 设置canvas尺寸
          canvas.width = width;
          canvas.height = height;

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 压缩图片（质量0.80，进一步减小文件大小）
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }

              // 创建新的File对象
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              // 输出压缩信息
              const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
              const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
              console.log(`图片压缩: ${originalSizeMB}MB -> ${compressedSizeMB}MB (尺寸: ${width}×${height})`);

              resolve(compressedFile);
            },
            'image/jpeg',
            0.80  // 压缩质量80%，减小文件大小
          );
        };

        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsDataURL(file);
    });
  };

  // 加载模板图片
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTemplates: TemplateImage[] = [];
    const fileArray = Array.from(files);

    // 显示压缩进度提示
    if (fileArray.length > 0) {
      toast.info(`正在压缩 ${fileArray.length} 张图片...`);
    }

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是图片文件`);
        continue;
      }

      try {
        // 压缩图片
        const compressedFile = await compressImage(file);
        const localUrl = URL.createObjectURL(compressedFile);

        newTemplates.push({
          id: Date.now().toString() + Math.random(),
          file: compressedFile,
          localUrl,
          regions: [],
        });
      } catch (error) {
        console.error(`压缩图片 ${file.name} 失败:`, error);
        toast.error(`压缩图片 ${file.name} 失败`);
      }
    }

    if (newTemplates.length > 0) {
      setTemplates([...templates, ...newTemplates]);

      if (templates.length === 0) {
        setCurrentTemplateIndex(0);
      }

      toast.success(`已添加 ${newTemplates.length} 个模板图片`);
    }

    // 清空input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 删除模板
  const handleDeleteTemplate = (templateId: string) => {
    const index = templates.findIndex(t => t.id === templateId);
    const newTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(newTemplates);

    // 调整当前选中的模板索引
    if (newTemplates.length === 0) {
      setCurrentTemplateIndex(0);
    } else if (currentTemplateIndex >= newTemplates.length) {
      setCurrentTemplateIndex(newTemplates.length - 1);
    } else if (currentTemplateIndex > index) {
      setCurrentTemplateIndex(currentTemplateIndex - 1);
    }
  };

  // 绘制canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img || !currentTemplate) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 计算缩放比例以适应容器
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const containerHeight = canvas.parentElement?.clientHeight || 600;
    const scaleX = (containerWidth - 40) / img.width;
    const scaleY = (containerHeight - 40) / img.height;
    const newScale = Math.min(scaleX, scaleY, 1);
    setScale(newScale);

    // 设置canvas尺寸
    canvas.width = img.width * newScale;
    canvas.height = img.height * newScale;

    // 绘制图片
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 绘制已有的替换区域
    currentTemplate.regions.forEach((region) => {
      const x = region.x * newScale;
      const y = region.y * newScale;
      const w = region.width * newScale;
      const h = region.height * newScale;

      // 绘制蓝色边框
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // 绘制四个角的装饰
      const cornerSize = 16;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;

      // 左上角
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      ctx.stroke();

      // 右上角
      ctx.beginPath();
      ctx.moveTo(x + w - cornerSize, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerSize);
      ctx.stroke();

      // 左下角
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerSize);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerSize, y + h);
      ctx.stroke();

      // 右下角
      ctx.beginPath();
      ctx.moveTo(x + w - cornerSize, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerSize);
      ctx.stroke();

      // 绘制区域标签
      const label = `区域 ${region.order}`;
      ctx.font = 'bold 14px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const padding = 8;
      const labelHeight = 24;

      // 标签背景
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, y, textWidth + padding * 2, labelHeight);

      // 标签文字
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + padding, y + labelHeight / 2);
    });

    // 绘制当前正在绘制的区域
    if (currentRegion && currentRegion.x !== undefined && currentRegion.y !== undefined && currentRegion.width !== undefined && currentRegion.height !== undefined) {
      const x = currentRegion.x * newScale;
      const y = currentRegion.y * newScale;
      const w = currentRegion.width * newScale;
      const h = currentRegion.height * newScale;

      // 绘制虚线边框
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // 绘制四个角的装饰
      const cornerSize = 16;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;

      // 左上角
      ctx.beginPath();
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      ctx.stroke();

      // 右上角
      ctx.beginPath();
      ctx.moveTo(x + w - cornerSize, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerSize);
      ctx.stroke();

      // 左下角
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerSize);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerSize, y + h);
      ctx.stroke();

      // 右下角
      ctx.beginPath();
      ctx.moveTo(x + w - cornerSize, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerSize);
      ctx.stroke();

      // 绘制"绘制中"标签
      const label = '绘制中...';
      ctx.font = 'bold 14px Arial';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const padding = 8;
      const labelHeight = 24;

      // 标签背景
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x, y, textWidth + padding * 2, labelHeight);

      // 标签文字
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + padding, y + labelHeight / 2);
    }
  };

  // 加载图片到canvas
  useEffect(() => {
    if (!currentTemplate) {
      setImageDimensions(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      loadedImageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      drawCanvas();
    };
    img.src = currentTemplate.localUrl;

    return () => {
      img.onload = null;
    };
  }, [currentTemplate?.id]);

  useEffect(() => {
    drawCanvas();
  }, [currentTemplate?.regions, currentRegion, scale]);

  // Canvas鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!loadedImageRef.current || !currentTemplate) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setIsDrawing(true);
    setCurrentRegion({ id: Date.now().toString(), x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentRegion || currentRegion.x === undefined || currentRegion.y === undefined) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;

    setCurrentRegion({
      ...currentRegion,
      width: currentX - currentRegion.x,
      height: currentY - currentRegion.y,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRegion || !currentTemplate) return;

    if (currentRegion.width && currentRegion.height && Math.abs(currentRegion.width) > 10 && Math.abs(currentRegion.height) > 10) {
      // 计算新区域的默认顺序（当前区域数量 + 1）
      const newOrder = currentTemplate.regions.length + 1;

      // 标准化坐标（处理负值）
      const normalizedRegion: ReplaceRegion = {
        id: currentRegion.id!,
        x: currentRegion.width! < 0 ? currentRegion.x! + currentRegion.width! : currentRegion.x!,
        y: currentRegion.height! < 0 ? currentRegion.y! + currentRegion.height! : currentRegion.y!,
        width: Math.abs(currentRegion.width!),
        height: Math.abs(currentRegion.height!),
        order: newOrder,
      };

      // 更新当前模板的区域
      setTemplates(templates.map((t, idx) =>
        idx === currentTemplateIndex
          ? { ...t, regions: [...t.regions, normalizedRegion] }
          : t
      ));
    }

    setIsDrawing(false);
    setCurrentRegion(null);
  };

  // 删除区域
  const handleDeleteRegion = (regionId: string) => {
    if (!currentTemplate) return;

    setTemplates(templates.map((t, idx) =>
      idx === currentTemplateIndex
        ? { ...t, regions: t.regions.filter(r => r.id !== regionId) }
        : t
    ));
  };

  // 打开编辑项目信息对话框
  const handleOpenEditDialog = () => {
    setEditingName(projectName);
    setEditingDescription(projectDescription);
    setShowEditDialog(true);
  };

  // 更新项目信息
  const handleUpdateProjectInfo = async () => {
    if (!projectId) {
      toast.error('项目ID不存在');
      return;
    }

    if (!editingName.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    setIsUpdating(true);
    try {
      await imageTemplateService.updateProject(projectId, {
        name: editingName.trim(),
        description: editingDescription.trim(),
      });

      setProjectName(editingName.trim());
      setProjectDescription(editingDescription.trim());
      setShowEditDialog(false);
      toast.success('项目信息更新成功');
    } catch (error) {
      console.error('更新项目信息失败:', error);
      toast.error('更新项目信息失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 更新区域坐标或顺序
  const handleUpdateRegion = (regionId: string, field: 'x' | 'y' | 'width' | 'height' | 'order', value: number) => {
    if (!currentTemplate) return;

    setTemplates(templates.map((t, idx) =>
      idx === currentTemplateIndex
        ? {
            ...t,
            regions: t.regions.map(r =>
              r.id === regionId ? { ...r, [field]: value } : r
            ),
          }
        : t
    ));
  };

  // 上传所有模板到腾讯云
  const uploadAllTemplates = async () => {
    const uploadPromises = templates.map(async (template) => {
      if (template.uploadedUrl || !template.file) return template;

      try {
        const uploadedUrl = await uploadCroppedImageToTencentCloud(template.file);
        return { ...template, uploadedUrl, uploading: false };
      } catch (error) {
        console.error(`上传模板 ${template.id} 失败:`, error);
        throw error;
      }
    });

    return await Promise.all(uploadPromises);
  };

  // 保存图片模板到后端
  const handleSaveTemplateProject = async () => {
    if (!projectId) {
      toast.error('项目ID不存在');
      return;
    }

    if (templates.length === 0) {
      toast.error('请至少添加一个模板图片');
      return;
    }

    setIsSaving(true);

    try {
      // 1. 上传所有模板图片到腾讯云
      const uploadedTemplates = await uploadAllTemplates();
      setTemplates(uploadedTemplates);

      // 2. 删除项目下的所有旧模板
      await imageTemplateService.deleteAllTemplates(projectId);

      // 3. 批量创建新模板
      const templateData = uploadedTemplates.map((template) => ({
        imageUrl: template.uploadedUrl!,
        regions: template.regions.map(region => ({
          x: Math.round(region.x),
          y: Math.round(region.y),
          width: Math.round(region.width),
          height: Math.round(region.height),
          order: region.order,
        })),
      }));

      await imageTemplateService.batchCreateTemplates(projectId, templateData);
      toast.success('保存成功');
    } catch (error) {
      console.error('保存图片模板失败:', error);
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workspace/image-templates')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">图片模板编辑器</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenEditDialog}
                className="h-7"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                编辑项目信息
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              {projectName || '图片模板项目'} - 已添加 {templates.length} 个模板图片
            </p>
          </div>
        </div>
        <Button
          onClick={handleSaveTemplateProject}
          disabled={templates.length === 0 || isSaving}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存模板
            </>
          )}
        </Button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧 - 模板列表和区域管理 */}
        <div className="w-[480px] border-r flex flex-col">
          {/* 上传按钮 */}
          <div className="p-4 border-b flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleTemplateUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加模板图片
            </Button>
          </div>

          {/* 标签页切换 */}
          <Tabs defaultValue="templates" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
              <TabsTrigger value="templates">模板列表 ({templates.length})</TabsTrigger>
              <TabsTrigger value="regions">替换区域 ({currentTemplate?.regions.length || 0})</TabsTrigger>
            </TabsList>

            {/* 模板列表标签页 */}
            <TabsContent value="templates" className="flex-1 overflow-y-auto p-4 mt-0">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>还没有添加模板图片</p>
                  <p className="text-sm mt-2">点击上方按钮添加</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template, index) => (
                    <div
                      key={template.id}
                      className={`relative border-2 rounded-lg p-2 cursor-pointer hover:bg-gray-50 ${
                        index === currentTemplateIndex ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                      onClick={() => setCurrentTemplateIndex(index)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={template.localUrl}
                          alt={`模板 ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">模板 {index + 1}</p>
                          <p className="text-xs text-gray-500">
                            {template.regions.length} 个替换区域
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 替换区域标签页 */}
            <TabsContent value="regions" className="flex-1 overflow-y-auto p-4 mt-0">
              {!currentTemplate ? (
                <div className="text-center py-8 text-gray-500">
                  <p>请先选择或添加模板</p>
                </div>
              ) : currentTemplate.regions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>在画布上拖动鼠标标记区域</p>
                </div>
              ) : (
              <div className="space-y-2">
                {currentTemplate.regions.map((region, index) => (
                  <div key={region.id} className="p-3 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">区域 {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRegion(region.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 区域坐标和尺寸信息 - 可编辑 */}
                    <div className="space-y-2">
                      {/* 替换顺序 - 单独一行 */}
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">替换顺序</label>
                        <Input
                          type="number"
                          min="1"
                          value={region.order}
                          onChange={(e) => handleUpdateRegion(region.id, 'order', parseInt(e.target.value) || 1)}
                          className="h-9 text-sm"
                          placeholder="顺序"
                        />
                      </div>

                      {/* 坐标和尺寸 - 使用4列网格布局 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">X</label>
                          <Input
                            type="number"
                            value={Math.round(region.x)}
                            onChange={(e) => handleUpdateRegion(region.id, 'x', parseInt(e.target.value) || 0)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">Y</label>
                          <Input
                            type="number"
                            value={Math.round(region.y)}
                            onChange={(e) => handleUpdateRegion(region.id, 'y', parseInt(e.target.value) || 0)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">宽</label>
                          <Input
                            type="number"
                            value={Math.round(region.width)}
                            onChange={(e) => handleUpdateRegion(region.id, 'width', parseInt(e.target.value) || 0)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">高</label>
                          <Input
                            type="number"
                            value={Math.round(region.height)}
                            onChange={(e) => handleUpdateRegion(region.id, 'height', parseInt(e.target.value) || 0)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧 - Canvas画布 */}
        <div className="flex-1 flex flex-col p-4 bg-gray-50">
          {/* 图片尺寸信息 */}
          {imageDimensions && currentTemplate && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-blue-900">模板图片尺寸:</span>
                  <span className="ml-2 text-sm text-blue-700">
                    {imageDimensions.width} × {imageDimensions.height} px
                    <span className="ml-2 text-xs text-blue-600">
                      (总像素: {(imageDimensions.width * imageDimensions.height / 1000000).toFixed(2)}M)
                    </span>
                  </span>
                </div>
                {isDrawing && currentRegion && currentRegion.width !== undefined && currentRegion.height !== undefined && (
                  <div className="text-xs text-orange-700">
                    <span>正在绘制: ({Math.round(currentRegion.x || 0)}, {Math.round(currentRegion.y || 0)}) - {Math.round(Math.abs(currentRegion.width))} × {Math.round(Math.abs(currentRegion.height))} px</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Canvas画布 */}
          <div className="flex-1 bg-white rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-300">
            {currentTemplate ? (
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="cursor-crosshair"
              />
            ) : (
              <div className="text-gray-400 text-center">
                <Upload className="w-16 h-16 mx-auto mb-4" />
                <p>请先添加模板图片</p>
                <p className="text-sm mt-2">在左侧选择模板后开始标记区域</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 编辑项目信息对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑项目信息</DialogTitle>
            <DialogDescription>
              修改图片模板项目的名称和描述
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">项目名称 *</Label>
              <Input
                id="edit-project-name"
                placeholder="输入项目名称"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editingName.trim()) {
                    handleUpdateProjectInfo();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-project-description">项目描述（可选）</Label>
              <Input
                id="edit-project-description"
                placeholder="输入项目描述"
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isUpdating}
            >
              取消
            </Button>
            <Button
              onClick={handleUpdateProjectInfo}
              disabled={!editingName.trim() || isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  更新中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
