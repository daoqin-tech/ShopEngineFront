import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Upload, Plus, Trash2, Save, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { GeneratedImage } from '@/pages/AIImageGenerator/types';
import { uploadCroppedImageToTencentCloud } from '@/lib/tencentCloud';
import { templateGroupService, TemplateGroupListItem } from '@/services/templateGroupService';

interface ReplaceRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TemplateImage {
  id: string;
  file?: File;
  localUrl: string;  // 本地预览URL
  uploadedUrl?: string;  // 上传后的云端URL
  regions: ReplaceRegion[];
  uploading?: boolean;
}

interface ImageReplaceDialogProps {
  selectedImages?: GeneratedImage[];  // 现在不需要选中的图片
  onClose: () => void;
}

export function ImageReplaceDialog({ onClose }: ImageReplaceDialogProps) {
  const [templates, setTemplates] = useState<TemplateImage[]>([]);
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Partial<ReplaceRegion> | null>(null);
  const [scale, setScale] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [savedGroups, setSavedGroups] = useState<TemplateGroupListItem[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showSavedGroups, setShowSavedGroups] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const currentTemplate = templates[currentTemplateIndex];

  // 组件挂载时加载已保存的模板组列表
  useEffect(() => {
    loadSavedGroups();
  }, []);

  // 加载已保存的模板组列表
  const loadSavedGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const groups = await templateGroupService.getGroups();
      setSavedGroups(groups);
    } catch (error) {
      console.error('加载模板组列表失败:', error);
      toast.error('加载模板组列表失败');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // 加载模板图片
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTemplates: TemplateImage[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是图片文件`);
        return;
      }

      const localUrl = URL.createObjectURL(file);
      newTemplates.push({
        id: Date.now().toString() + Math.random(),
        file,
        localUrl,
        regions: [],
      });
    });

    setTemplates([...templates, ...newTemplates]);

    if (templates.length === 0 && newTemplates.length > 0) {
      setCurrentTemplateIndex(0);
    }

    toast.success(`已添加 ${newTemplates.length} 个模板图片`);

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
    currentTemplate.regions.forEach((region, index) => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        region.x * newScale,
        region.y * newScale,
        region.width * newScale,
        region.height * newScale
      );

      // 绘制区域编号
      ctx.fillStyle = '#3b82f6';
      ctx.font = '14px Arial';
      ctx.fillText(
        `区域 ${index + 1}`,
        region.x * newScale + 5,
        region.y * newScale + 20
      );
    });

    // 绘制当前正在绘制的区域
    if (currentRegion && currentRegion.x !== undefined && currentRegion.y !== undefined && currentRegion.width !== undefined && currentRegion.height !== undefined) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentRegion.x * newScale,
        currentRegion.y * newScale,
        currentRegion.width * newScale,
        currentRegion.height * newScale
      );
      ctx.setLineDash([]);
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
      // 标准化坐标（处理负值）
      const normalizedRegion: ReplaceRegion = {
        id: currentRegion.id!,
        x: currentRegion.width! < 0 ? currentRegion.x! + currentRegion.width! : currentRegion.x!,
        y: currentRegion.height! < 0 ? currentRegion.y! + currentRegion.height! : currentRegion.y!,
        width: Math.abs(currentRegion.width!),
        height: Math.abs(currentRegion.height!),
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

  // 更新区域坐标
  const handleUpdateRegion = (regionId: string, field: 'x' | 'y' | 'width' | 'height', value: number) => {
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

  // 保存模板组到后端
  const handleSaveTemplateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('请输入模板组名称');
      return;
    }

    if (templates.length === 0) {
      toast.error('请至少添加一个模板图片');
      return;
    }

    setIsSaving(true);

    try {
      // 1. 上传所有模板图片到腾讯云
      toast.info('正在上传模板图片...');
      const uploadedTemplates = await uploadAllTemplates();
      setTemplates(uploadedTemplates);

      // 2. 构建模板组数据
      const groupData = {
        name: groupName,
        templates: uploadedTemplates.map((template) => ({
          imageUrl: template.uploadedUrl!,
          regions: template.regions.map(region => ({
            x: Math.round(region.x),
            y: Math.round(region.y),
            width: Math.round(region.width),
            height: Math.round(region.height),
          })),
        })),
      };

      // 3. 调用后端接口保存
      const result = await templateGroupService.createGroup(groupData);

      toast.success(`模板组 "${result.name}" 保存成功`);
      console.log('模板组已保存:', result);

      // 保存成功后重新加载模板组列表
      await loadSavedGroups();

      // 清空当前编辑状态
      setTemplates([]);
      setGroupName('');
      setCurrentTemplateIndex(0);
    } catch (error) {
      console.error('保存模板组失败:', error);
      toast.error('保存模板组失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[95vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">模板图片管理</h2>
              <p className="text-sm text-gray-500">已添加 {templates.length} 个模板图片</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="输入模板组名称"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-64"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavedGroups(!showSavedGroups)}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {showSavedGroups ? '隐藏已保存' : '查看已保存'} ({savedGroups.length})
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧 - 模板列表和区域管理 */}
          <div className="w-96 border-r flex flex-col">
            {/* 已保存的模板组列表 */}
            {showSavedGroups && (
              <div className="border-b bg-gray-50">
                <div className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center justify-between">
                    <span>已保存的模板组</span>
                    {isLoadingGroups && (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </h3>
                  {savedGroups.length === 0 ? (
                    <p className="text-sm text-gray-500">暂无已保存的模板组</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {savedGroups.map((group) => (
                        <div
                          key={group.groupId}
                          className="p-3 bg-white border rounded-lg hover:border-blue-500 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{group.name}</p>
                              {group.description && (
                                <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span>{group.templateCount} 个模板</span>
                                <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 上传按钮 */}
            <div className="p-4 border-b">
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

            {/* 模板选择列表 */}
            {templates.length > 0 && (
              <div className="p-4 border-b">
                <h3 className="font-semibold mb-3">模板列表 ({templates.length})</h3>
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
              </div>
            )}
            {/* 当前模板的替换区域列表 */}
            <div className="flex-1 p-4 overflow-y-auto">
              <h3 className="font-semibold mb-3">
                当前模板的替换区域 ({currentTemplate?.regions.length || 0})
              </h3>
              {!currentTemplate ? (
                <p className="text-sm text-gray-500">请先选择或添加模板</p>
              ) : currentTemplate.regions.length === 0 ? (
                <p className="text-sm text-gray-500">在画布上拖动鼠标标记区域</p>
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
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">X 坐标</label>
                            <Input
                              type="number"
                              value={Math.round(region.x)}
                              onChange={(e) => handleUpdateRegion(region.id, 'x', parseInt(e.target.value) || 0)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Y 坐标</label>
                            <Input
                              type="number"
                              value={Math.round(region.y)}
                              onChange={(e) => handleUpdateRegion(region.id, 'y', parseInt(e.target.value) || 0)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">宽度 (px)</label>
                            <Input
                              type="number"
                              value={Math.round(region.width)}
                              onChange={(e) => handleUpdateRegion(region.id, 'width', parseInt(e.target.value) || 0)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">高度 (px)</label>
                            <Input
                              type="number"
                              value={Math.round(region.height)}
                              onChange={(e) => handleUpdateRegion(region.id, 'height', parseInt(e.target.value) || 0)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 pt-1">
                          结束坐标: ({Math.round(region.x + region.width)}, {Math.round(region.y + region.height)})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        {/* 底部操作按钮 */}
        <div className="flex items-center justify-between p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>

          <Button
            onClick={handleSaveTemplateGroup}
            disabled={templates.length === 0 || isSaving || !groupName.trim()}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存模板组
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
