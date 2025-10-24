import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Trash2, Check, Loader2, ImageIcon, MessageSquarePlus } from 'lucide-react';
import type { CropArea, CropAreaWithUrl, CroppedImageRecord } from '@/types/cropImage';
import type { Platform } from '@/types/capturedImage';
import { v4 as uuidv4 } from 'uuid';
import { cropImageFromUrl, blobToFile } from '@/utils/imageCrop';
import { uploadCroppedImageToTencentCloud } from '@/lib/tencentCloud';
import { aiPromptService } from '@/services/aiPromptService';
import { toast } from 'sonner';

interface ImageCropEditorProps {
  imageUrl: string;
  sourceImageId: string;
  platform: Platform;
  projectId: string;
  onClose: () => void;
  onComplete?: () => void;
}

export function ImageCropEditor({ imageUrl, sourceImageId, platform: _platform, projectId, onClose }: ImageCropEditorProps) {
  const [cropAreas, setCropAreas] = useState<CropAreaWithUrl[]>([]);
  const [historicalCrops, setHistoricalCrops] = useState<CroppedImageRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentCrop, setCurrentCrop] = useState<CropArea | null>(null);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1); // 图片缩放比例
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [selectedHistoricalIds, setSelectedHistoricalIds] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null); // 存储加载的图片对象

  // 加载历史截图数据（带轮询）
  useEffect(() => {
    const loadHistoricalCrops = async () => {
      // 第一次加载时显示loading
      if (historicalCrops.length === 0) {
        setIsLoadingHistory(true);
      }

      try {
        const response = await aiPromptService.getCroppedImages(sourceImageId);
        if (response.items) {
          setHistoricalCrops(response.items);
        }
      } catch (error) {
        console.error('加载历史截图失败:', error);
        // 不显示错误提示，静默失败
      } finally {
        setIsLoadingHistory(false);
      }
    };

    // 立即加载一次
    loadHistoricalCrops();

    // 设置定时器，每10秒轮询一次
    const intervalId = setInterval(() => {
      loadHistoricalCrops();
    }, 10000); // 10秒

    // 清理定时器
    return () => {
      clearInterval(intervalId);
    };
  }, [sourceImageId]);

  // 加载图片并绘制到canvas
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      loadedImageRef.current = img;
      setImageLoaded(true);
      drawCanvas();
    };

    img.onerror = () => {
      console.error('图片加载失败:', imageUrl);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  // 绘制canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = loadedImageRef.current;
    const container = containerRef.current;
    if (!canvas || !image || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取容器的可用空间 (减去padding: p-2 = 0.5rem * 2 = 1rem = 16px)
    const padding = 16; // p-2 的padding
    const containerWidth = container.clientWidth - padding;
    const containerHeight = container.clientHeight - padding;

    // 计算缩放比例以适应容器,允许放大或缩小
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const newScale = Math.min(scaleX, scaleY) * 0.95; // 稍微缩小一点,避免贴边

    // 计算缩放后的尺寸
    const scaledWidth = image.width * newScale;
    const scaledHeight = image.height * newScale;

    // 设置canvas尺寸为缩放后的尺寸
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    // 保存缩放比例
    setScale(newScale);

    // 填充白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制图片(缩放到canvas大小)
    ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);

    // 绘制所有裁剪区域(按缩放比例)
    cropAreas.forEach((crop) => {
      drawCropArea(ctx, crop, crop.id === selectedCropId);
    });

    // 绘制当前正在创建的裁剪区域
    if (currentCrop) {
      drawCropArea(ctx, currentCrop, true);
    }
  };

  // 绘制单个裁剪区域
  const drawCropArea = (ctx: CanvasRenderingContext2D, crop: CropArea, isSelected: boolean) => {
    // 绘制矩形边框
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    // 绘制半透明遮罩
    ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(crop.x, crop.y, crop.width, crop.height);

    // 绘制角标
    const index = cropAreas.findIndex(c => c.id === crop.id) + 1;
    if (index > 0) {
      ctx.fillStyle = isSelected ? '#3b82f6' : '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`#${index}`, crop.x + 8, crop.y + 24);
    }
  };

  // 重新绘制
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [cropAreas, currentCrop, selectedCropId, imageLoaded]);

  // 监听窗口大小变化,重新计算canvas尺寸
  useEffect(() => {
    if (!imageLoaded) return;

    const handleResize = () => {
      drawCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, cropAreas, currentCrop, selectedCropId]);

  // 鼠标按下 - 开始绘制裁剪区域
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Canvas的实际显示尺寸 vs CSS显示尺寸的比例
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setCurrentCrop({
      id: uuidv4(),
      x,
      y,
      width: 0,
      height: 0,
    });
  };

  // 鼠标移动 - 更新裁剪区域大小
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentCrop) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    setCurrentCrop({
      ...currentCrop,
      width: currentX - currentCrop.x,
      height: currentY - currentCrop.y,
    });
  };

  // 鼠标抬起 - 完成绘制并自动上传
  const handleMouseUp = async () => {
    if (!isDrawing || !currentCrop) return;

    // 确保宽高为正数
    const normalizedCrop: CropArea = {
      ...currentCrop,
      x: currentCrop.width < 0 ? currentCrop.x + currentCrop.width : currentCrop.x,
      y: currentCrop.height < 0 ? currentCrop.y + currentCrop.height : currentCrop.y,
      width: Math.abs(currentCrop.width),
      height: Math.abs(currentCrop.height),
    };

    // 只添加有效的裁剪区域（宽高大于10像素）
    if (normalizedCrop.width > 10 && normalizedCrop.height > 10) {
      // 转换为原始图片坐标
      const originalCrop: CropArea = {
        ...normalizedCrop,
        x: normalizedCrop.x / scale,
        y: normalizedCrop.y / scale,
        width: normalizedCrop.width / scale,
        height: normalizedCrop.height / scale,
      };

      // 创建带上传状态的裁剪区域
      const cropWithUrl: CropAreaWithUrl = {
        ...normalizedCrop, // 显示坐标保持缩放后的
        uploading: true,
      };

      setCropAreas([...cropAreas, cropWithUrl]);
      setSelectedCropId(cropWithUrl.id);

      // 开始上传
      uploadCropArea(cropWithUrl.id, originalCrop);
    }

    setIsDrawing(false);
    setCurrentCrop(null);
  };

  // 上传裁剪区域到腾讯云
  const uploadCropArea = async (cropId: string, originalCrop: CropArea) => {
    try {
      // 裁剪图片
      const croppedBlob = await cropImageFromUrl(imageUrl, originalCrop);
      const fileName = `crop_${Date.now()}_${cropId.slice(0, 8)}.jpg`;
      const croppedFile = blobToFile(croppedBlob, fileName);

      // 上传到腾讯云
      const uploadedUrl = await uploadCroppedImageToTencentCloud(croppedFile);

      // 更新上传成功状态
      setCropAreas(prev =>
        prev.map(crop =>
          crop.id === cropId
            ? { ...crop, croppedImageUrl: uploadedUrl, uploading: false }
            : crop
        )
      );

      toast.success('截图上传成功');
    } catch (error) {
      console.error('上传失败:', error);
      const errorMessage = error instanceof Error ? error.message : '上传失败';

      // 更新上传失败状态
      setCropAreas(prev =>
        prev.map(crop =>
          crop.id === cropId
            ? { ...crop, uploading: false, uploadError: errorMessage }
            : crop
        )
      );

      toast.error(`截图上传失败: ${errorMessage}`);
    }
  };

  // 删除裁剪区域
  const deleteCropArea = (id: string) => {
    setCropAreas(cropAreas.filter(crop => crop.id !== id));
    if (selectedCropId === id) {
      setSelectedCropId(null);
    }
  };

  // 切换历史截图选择
  const toggleHistoricalSelection = (id: string) => {
    const newSelected = new Set(selectedHistoricalIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedHistoricalIds(newSelected);
  };

  // 全选/取消全选历史截图
  const toggleSelectAll = () => {
    // 只选择已完成的截图
    const completedCrops = historicalCrops.filter(crop => crop.status === 'completed' && crop.prompt);

    if (selectedHistoricalIds.size === completedCrops.length) {
      // 已全选，则取消全选
      setSelectedHistoricalIds(new Set());
    } else {
      // 全选所有已完成的
      setSelectedHistoricalIds(new Set(completedCrops.map(crop => crop.id)));
    }
  };

  // 加入到对话
  const handleAddToConversation = async () => {
    const selectedCrops = historicalCrops.filter(crop => selectedHistoricalIds.has(crop.id));

    if (selectedCrops.length === 0) {
      toast.warning('请先选择要加入对话的截图');
      return;
    }

    try {
      await aiPromptService.addToConversation({
        projectId,
        ids: Array.from(selectedHistoricalIds),
      });

      toast.success(`已将 ${selectedCrops.length} 个提示词加入对话，可以在对话中查看`, { duration: 5000 });
      // 清空选择
      setSelectedHistoricalIds(new Set());
    } catch (error) {
      console.error('加入对话失败:', error);
      toast.error('加入对话失败，请重试');
    }
  };

  // 生成提示词
  const handleGeneratePrompts = async () => {
    // 检查是否有已上传的截图
    const uploadedCrops = cropAreas.filter(crop => crop.croppedImageUrl && !crop.uploading);

    if (uploadedCrops.length === 0) {
      toast.error('请等待截图上传完成');
      return;
    }

    setIsGeneratingPrompts(true);

    try {
      const images = uploadedCrops.map(crop => ({
        imageUrl: crop.croppedImageUrl!,
      }));

      const response = await aiPromptService.batchGeneratePrompts({
        sourceImageId,
        images,
      });

      const { summary } = response;

      // 任务已创建，正在异步处理
      toast.success(`已创建 ${summary.total} 个提示词生成任务`);

      // 将新创建的任务添加到历史列表中（这样可以立即看到pending状态）
      if (response.items && response.items.length > 0) {
        setHistoricalCrops(prev => [...response.items, ...prev]);
      }

      // 清空当前截图列表
      setCropAreas([]);

      // 提示用户等待异步处理
      toast.info('提示词正在后台生成中，请稍候查看结果', { duration: 5000 });
    } catch (error) {
      console.error('提示词生成失败:', error);
      toast.error('提示词生成失败，请重试');
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">图片截图编辑</h2>
            <span className="text-sm text-gray-500">
              已创建 {cropAreas.length} 个截图
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧 - Canvas编辑区 */}
          <div ref={containerRef} className="flex-1 p-2 bg-gray-50 flex items-center justify-center overflow-hidden border-r">
            <div className="relative w-full h-full flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 cursor-crosshair bg-white shadow-lg"
                style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <p>图片加载中...</p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧 - 截图预览区 */}
          <div className="w-80 bg-white flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-1">截图管理</h3>
              <p className="text-sm text-gray-500">
                在左侧图片上拖拽鼠标创建截图区域，截图会自动上传
              </p>
            </div>

            <div className="flex-1 overflow-auto">
              {/* 当前截图区域 */}
              <div className="p-4 border-b bg-blue-50/30">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  当前截图 ({cropAreas.length})
                </h4>

                {cropAreas.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Plus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">还没有创建截图</p>
                    <p className="text-xs mt-1">在左侧拖拽创建</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cropAreas.map((crop, index) => (
                      <div
                        key={crop.id}
                        className={`p-3 border-2 rounded-lg transition-all bg-white ${
                          selectedCropId === crop.id
                            ? 'border-blue-500 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCropId(crop.id)}
                      >
                        <div className="flex gap-3">
                          {/* 预览图 */}
                          <div className="w-20 h-20 rounded border bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {crop.uploading ? (
                              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            ) : crop.uploadError ? (
                              <X className="w-6 h-6 text-red-500" />
                            ) : crop.croppedImageUrl ? (
                              <img
                                src={crop.croppedImageUrl}
                                alt={`截图 #${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>

                          {/* 信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm">截图 #{index + 1}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCropArea(crop.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>

                            <div className="text-xs text-gray-500 space-y-1">
                              <div>大小: {Math.round(crop.width / scale)} × {Math.round(crop.height / scale)}</div>
                              {crop.uploading && (
                                <div className="text-blue-600 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  上传中...
                                </div>
                              )}
                              {crop.uploadError && (
                                <div className="text-red-600 text-xs">
                                  上传失败: {crop.uploadError}
                                </div>
                              )}
                              {crop.croppedImageUrl && !crop.uploading && (
                                <div className="text-green-600 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  已上传
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 生成提示词按钮 - 放在当前截图和历史截图之间 */}
              <div className="px-4 py-3 border-y bg-gray-50">
                <Button
                  className="w-full"
                  disabled={cropAreas.length === 0 || cropAreas.some(c => c.uploading) || isGeneratingPrompts}
                  onClick={handleGeneratePrompts}
                >
                  {isGeneratingPrompts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成提示词中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      完成截图并生成提示词 ({cropAreas.filter(c => c.croppedImageUrl).length})
                    </>
                  )}
                </Button>
              </div>

              {/* 历史截图区域 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    历史截图 ({historicalCrops.length})
                  </h4>
                  {historicalCrops.filter(c => c.status === 'completed' && c.prompt).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={toggleSelectAll}
                    >
                      {selectedHistoricalIds.size === historicalCrops.filter(c => c.status === 'completed' && c.prompt).length
                        ? '取消全选'
                        : '全选'}
                    </Button>
                  )}
                </div>

                {isLoadingHistory ? (
                  <div className="text-center text-gray-400 py-8">
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">加载中...</p>
                  </div>
                ) : historicalCrops.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-sm">暂无历史截图</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historicalCrops.map((crop) => {
                      const canSelect = crop.status === 'completed' && crop.prompt;
                      const isSelected = selectedHistoricalIds.has(crop.id);

                      return (
                        <div
                          key={crop.id}
                          className={`p-3 border rounded-lg transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex gap-3">
                            {/* 复选框 - 只有已完成的才能选择 */}
                            {canSelect && (
                              <div className="flex items-start pt-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleHistoricalSelection(crop.id)}
                                />
                              </div>
                            )}

                            <div className="w-20 h-20 rounded border bg-white flex-shrink-0 overflow-hidden">
                              <img
                                src={crop.imageUrl}
                                alt="历史截图"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-gray-500">
                                {new Date(crop.createdAt).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              {/* 状态标签 */}
                              {crop.status === 'processing' && (
                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  处理中
                                </div>
                              )}
                              {crop.status === 'completed' && (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <Check className="w-3 h-3" />
                                  已完成
                                </div>
                              )}
                              {crop.status === 'failed' && (
                                <div className="text-xs text-red-600">失败</div>
                              )}
                              {crop.status === 'pending' && (
                                <div className="text-xs text-gray-400">待处理</div>
                              )}
                            </div>

                            {/* 提示词或错误信息 */}
                            {crop.status === 'completed' && crop.prompt ? (
                              <div className="text-sm text-gray-700 line-clamp-3">
                                {crop.prompt}
                              </div>
                            ) : crop.status === 'failed' && crop.errorMessage ? (
                              <div className="text-xs text-red-600">
                                {crop.errorMessage}
                              </div>
                            ) : crop.status === 'processing' ? (
                              <div className="text-sm text-gray-400 italic">
                                正在生成提示词...
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">
                                暂无提示词
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* 加入对话按钮 - 放在历史截图下方 */}
                {historicalCrops.filter(c => c.status === 'completed' && c.prompt).length > 0 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={selectedHistoricalIds.size === 0}
                      onClick={handleAddToConversation}
                    >
                      <MessageSquarePlus className="w-4 h-4 mr-2" />
                      加入对话 ({selectedHistoricalIds.size})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
