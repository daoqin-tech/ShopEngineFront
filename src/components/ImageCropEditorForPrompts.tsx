import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import type { CropAreaWithUrl } from '@/types/cropImage';
import type { Platform } from '@/types/capturedImage';
import { v4 as uuidv4 } from 'uuid';
import { cropImageFromUrl, blobToFile } from '@/utils/imageCrop';
import { uploadCroppedImageToTencentCloud } from '@/lib/tencentCloud';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
import { toast } from 'sonner';

interface PromptItem {
  id: string;
  sourceImageId: string;
  imageUrl: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

interface ImageCropEditorForPromptsProps {
  imageUrl: string;
  sourceImageId: string;
  platform: Platform;
  projectId: string;
  onClose: () => void;
  onComplete?: (prompts: string[]) => void;
}

export function ImageCropEditorForPrompts({
  imageUrl,
  sourceImageId,
  platform: _platform,
  projectId,
  onClose,
  onComplete
}: ImageCropEditorForPromptsProps) {
  const [cropAreas, setCropAreas] = useState<CropAreaWithUrl[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentCrop, setCurrentCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [promptItems, setPromptItems] = useState<PromptItem[]>([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());
  const [isAddingToConversation, setIsAddingToConversation] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // 组件挂载时加载历史记录
  useEffect(() => {
    setCropAreas([]);
    loadHistoryPrompts();
  }, []);

  // 加载历史提示词
  const loadHistoryPrompts = async () => {
    try {
      const response = await AIImageSessionsAPI.getPromptsBySourceImage(sourceImageId);
      if (response.items) {
        const items: PromptItem[] = response.items.map(item => ({
          ...item,
          status: item.status as 'pending' | 'processing' | 'completed' | 'failed'
        }));
        setPromptItems(items);
      }
    } catch (error) {
      console.error('加载历史提示词失败:', error);
    }
  };

  // 加载图片
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
      toast.error('图片加载失败');
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

    const padding = 16;
    const containerWidth = container.clientWidth - padding;
    const containerHeight = container.clientHeight - padding;

    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const newScale = Math.min(scaleX, scaleY) * 0.95;

    const scaledWidth = image.width * newScale;
    const scaledHeight = image.height * newScale;

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    setScale(newScale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);

    // 绘制所有裁剪区域
    cropAreas.forEach((area) => {
      const scaledArea = {
        x: area.x * newScale,
        y: area.y * newScale,
        width: area.width * newScale,
        height: area.height * newScale,
      };

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledArea.x, scaledArea.y, scaledArea.width, scaledArea.height);
    });

    // 绘制当前正在绘制的裁剪框
    if (currentCrop) {
      const scaledCrop = {
        x: currentCrop.x * newScale,
        y: currentCrop.y * newScale,
        width: currentCrop.width * newScale,
        height: currentCrop.height * newScale,
      };

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);
      ctx.setLineDash([]);
    }
  };

  // 重绘canvas
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [cropAreas, currentCrop, imageLoaded]);

  // 鼠标按下 - 开始绘制
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setIsDrawing(true);
    setCurrentCrop({ x, y, width: 0, height: 0 });
  };

  // 鼠标移动 - 更新裁剪框
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentCrop) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;

    setCurrentCrop({
      ...currentCrop,
      width: currentX - currentCrop.x,
      height: currentY - currentCrop.y,
    });
  };

  // 鼠标抬起 - 完成绘制并自动上传
  const handleMouseUp = async () => {
    if (!isDrawing || !currentCrop || !loadedImageRef.current) return;

    const { x, y, width, height } = currentCrop;

    if (Math.abs(width) < 10 || Math.abs(height) < 10) {
      setIsDrawing(false);
      setCurrentCrop(null);
      return;
    }

    const normalizedCrop = {
      x: width < 0 ? x + width : x,
      y: height < 0 ? y + height : y,
      width: Math.abs(width),
      height: Math.abs(height),
    };

    const newCropArea: CropAreaWithUrl = {
      ...normalizedCrop,
      id: uuidv4(),
      uploading: true,
      croppedImageUrl: undefined,
    };

    setCropAreas(prev => [...prev, newCropArea]);
    setIsDrawing(false);
    setCurrentCrop(null);

    // 自动上传裁剪图片并生成提示词
    try {
      const croppedBlob = await cropImageFromUrl(
        imageUrl,
        {
          id: newCropArea.id,
          x: normalizedCrop.x,
          y: normalizedCrop.y,
          width: normalizedCrop.width,
          height: normalizedCrop.height
        }
      );

      const file = blobToFile(croppedBlob, `crop-${newCropArea.id}.png`);
      const uploadedUrl = await uploadCroppedImageToTencentCloud(file);

      setCropAreas(prev =>
        prev.map(area =>
          area.id === newCropArea.id
            ? { ...area, uploading: false, croppedImageUrl: uploadedUrl }
            : area
        )
      );

      // 立即调用后端API生成提示词
      const response = await AIImageSessionsAPI.batchGeneratePrompts(sourceImageId, [{ imageUrl: uploadedUrl }]);

      // 更新提示词列表 - 新的放在最前面
      if (response.items && response.items.length > 0) {
        const newItems: PromptItem[] = response.items.map(item => ({
          ...item,
          status: item.status as 'pending' | 'processing' | 'completed' | 'failed'
        }));
        setPromptItems(prev => [...newItems, ...prev]);

        // 自动选中新生成的提示词
        setSelectedPromptIds(prev => {
          const newSet = new Set(prev);
          newItems.forEach(item => newSet.add(item.id));
          return newSet;
        });
      }

      toast.success('截图上传成功，正在生成提示词...');
    } catch (error) {
      console.error('截图上传失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`截图上传失败: ${errorMessage}`);

      setCropAreas(prev => prev.filter(area => area.id !== newCropArea.id));
    }
  };

  // 轮询获取提示词状态
  const pollPromptStatus = useCallback(async () => {
    if (promptItems.length === 0) return;

    const hasPending = promptItems.some(item => item.status === 'pending' || item.status === 'processing');
    if (!hasPending) return;

    try {
      const response = await AIImageSessionsAPI.getPromptsBySourceImage(sourceImageId);
      if (response.items) {
        const items: PromptItem[] = response.items.map(item => ({
          ...item,
          status: item.status as 'pending' | 'processing' | 'completed' | 'failed'
        }));
        setPromptItems(items);
      }
    } catch (error) {
      console.error('轮询提示词状态失败:', error);
    }
  }, [sourceImageId, promptItems]);

  // 定时轮询
  useEffect(() => {
    const hasPending = promptItems.some(item => item.status === 'pending' || item.status === 'processing');
    if (!hasPending) return;

    const timer = setInterval(() => {
      pollPromptStatus();
    }, 3000); // 每3秒轮询一次

    return () => clearInterval(timer);
  }, [promptItems, pollPromptStatus]);

  // 切换提示词选中状态
  const togglePromptSelection = (id: string) => {
    setSelectedPromptIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 加入对话
  const handleAddToConversation = async () => {
    const selectedItems = promptItems.filter(
      item => selectedPromptIds.has(item.id) && item.status === 'completed' && item.prompt
    );

    if (selectedItems.length === 0) {
      toast.error('请选择至少一个已完成的提示词');
      return;
    }

    setIsAddingToConversation(true);

    try {
      const ids = selectedItems.map(item => item.id);
      await AIImageSessionsAPI.addPromptsToConversation(projectId, ids);

      toast.success(`成功添加 ${ids.length} 个提示词到对话`);

      // 调用回调函数
      if (onComplete) {
        const prompts = selectedItems.map(item => item.prompt);
        onComplete(prompts);
      }

      // 关闭弹窗
      onClose();
    } catch (error) {
      console.error('加入对话失败:', error);
      toast.error('加入对话失败，请重试');
    } finally {
      setIsAddingToConversation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">图片截图 - 生成提示词</h2>
            <p className="text-sm text-muted-foreground mt-1">
              已创建 {cropAreas.length} 个截图 | 在左侧图片上拖拽鼠标创建截图区域
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 主体内容 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧 - 图片编辑区 */}
          <div className="flex-1 p-2 overflow-hidden" ref={containerRef}>
            <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center">
              {!imageLoaded ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">加载图片中...</p>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              )}
            </div>
          </div>

          {/* 右侧 - 提示词列表 */}
          <div className="w-96 border-l bg-gray-50 flex flex-col">
            <div className="px-4 py-3 border-b bg-white">
              <h3 className="font-semibold mb-1">提示词列表</h3>
              <p className="text-xs text-muted-foreground">
                在左侧图片上拖拽鼠标创建截图，自动生成提示词
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {promptItems.length > 0 ? (
                <div className="space-y-3">
                  {promptItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 space-y-2 cursor-pointer transition-colors ${
                        selectedPromptIds.has(item.id)
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => item.status === 'completed' && togglePromptSelection(item.id)}
                    >
                      {/* 顶部：复选框和状态 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* 复选框 */}
                          {item.status === 'completed' && (
                            <input
                              type="checkbox"
                              checked={selectedPromptIds.has(item.id)}
                              onChange={() => togglePromptSelection(item.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <span className="text-xs font-medium text-muted-foreground">
                            {item.status === 'completed' ? '可选' : '状态'}
                          </span>
                        </div>

                        {/* 状态标签 */}
                        <div>
                          {item.status === 'completed' && (
                            <span className="flex items-center text-xs text-green-600">
                              <Check className="w-3 h-3 mr-1" />
                              已完成
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="flex items-center text-xs text-blue-600">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              生成中
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="flex items-center text-xs text-gray-600">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              等待中
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="flex items-center text-xs text-red-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              失败
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 截图预览 */}
                      <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt="Cropped"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 提示词内容 */}
                      {item.prompt && (
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded line-clamp-3">
                          {item.prompt}
                        </div>
                      )}

                      {item.errorMessage && (
                        <div className="text-xs text-red-600">
                          {item.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">还没有生成提示词</p>
                  <p className="text-xs text-gray-400 mt-1">在左侧图片上拖拽鼠标创建截图</p>
                </div>
              )}
            </div>

            {/* 底部操作按钮 */}
            <div className="px-4 py-3 border-t bg-white">
              <Button
                className="w-full"
                onClick={handleAddToConversation}
                disabled={
                  selectedPromptIds.size === 0 ||
                  isAddingToConversation
                }
              >
                {isAddingToConversation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    加入对话中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    加入对话 ({selectedPromptIds.size} 个已选)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
