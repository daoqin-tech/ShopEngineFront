import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Download, Eye, X, CheckSquare, Square, FileText, Upload, GripVertical, Copy, Trash2 } from 'lucide-react';
import { ImageGenerationStepProps, AspectRatio, PromptStatus, GeneratedImage, ASPECT_RATIOS } from './types';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
import { FileUploadAPI } from '@/services/fileUpload';
import { toast } from 'sonner';


// 验证尺寸是否符合新模型API要求
const validateDimension = (value: number): number => {
  // 限制在256-1440范围内
  const clamped = Math.max(256, Math.min(1440, value));
  // 确保是32的倍数
  return Math.round(clamped / 32) * 32;
};

// 智能验证并调整尺寸组合以符合所有约束
const validateDimensions = (width: number, height: number): { width: number; height: number } => {
  // 首先验证单个尺寸范围并调整为32的倍数
  let validWidth = validateDimension(width);
  let validHeight = validateDimension(height);

  return { width: validWidth, height: validHeight };
};

// 检查尺寸是否满足所有约束（不调整，仅检查）
const checkDimensionsValid = (width: number, height: number): { valid: boolean; reason?: string } => {
  // 检查基本范围（单个维度）
  if (width < 256 || width > 1440) {
    return { valid: false, reason: '宽度必须在256-1440范围内' };
  }
  if (height < 256 || height > 1440) {
    return { valid: false, reason: '高度必须在256-1440范围内' };
  }

  // 检查32的倍数
  if (width % 32 !== 0 || height % 32 !== 0) {
    return { valid: false, reason: '尺寸必须是32的倍数' };
  }

  return { valid: true };
};

// PDF页面尺寸配置（单位：cm）
const PAGE_SIZES = {
  small: { width: 158, height: 158, label: '小尺寸 (15.8 × 15.8 cm)' },
  large: { width: 306, height: 306, label: '大尺寸 (30.6 × 30.6 cm)' }
};

// 获取图片实际尺寸
const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // 清理临时URL
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl); // 清理临时URL
      // 如果无法获取尺寸，返回默认值
      resolve({ width: 800, height: 600 });
    };
    img.src = objectUrl;
  });
};

export function ImageGenerationStep({ 
  session,
  selectedPromptIds,
  onGenerateImages,
  refreshTrigger,
  projectName,
  isGeneratingImages,
  onStartPolling
}: ImageGenerationStepProps) {
  const navigate = useNavigate();
  const selectedPrompts = Array.from(session.prompts?.values() || []).filter(p => selectedPromptIds.has(p.id));
  
  // 生成参数状态
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]); // 默认选择1:1
  const [customWidth, setCustomWidth] = useState<number>(1024);
  const [customHeight, setCustomHeight] = useState<number>(1024); // 新模型默认尺寸
  const [useCustomSize, setUseCustomSize] = useState(false);
  
  // 输入验证反馈状态
  const [widthAdjusted, setWidthAdjusted] = useState(false);
  const [heightAdjusted, setHeightAdjusted] = useState(false);
  
  // 加载状态
  const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState(false);
  
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  
  
  // 批量导出相关状态
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // 批量重试相关状态
  const [isRetrying, setIsRetrying] = useState(false);

  // 批量复制相关状态
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyCount, setCopyCount] = useState(1);
  const [isCopying, setIsCopying] = useState(false);
  const [copyType, setCopyType] = useState<'regenerate' | 'duplicate'>('regenerate'); // 复制类型

  // 批量删除相关状态
  const [isDeleting, setIsDeleting] = useState(false);
  
  // PDF导出相关状态
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfPageSize, setPdfPageSize] = useState<'small' | 'large'>('small');
  const [pdfImages, setPdfImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // 文件上传相关状态
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 历史图片状态
  const [historicalImages, setHistoricalImages] = useState<GeneratedImage[]>([]);

  // 组件挂载时加载图片数据
  useEffect(() => {
    if (session.projectId) {
      setIsLoadingHistoricalData(true);

      AIImageSessionsAPI.loadImages(session.projectId)
        .then((images) => {
          setHistoricalImages(images || []);

          // 检查是否有非完成状态的图片，如果有则开始轮询
          if (images) {
            const processingImages = images.filter(img =>
              img.status === PromptStatus.PENDING ||
              img.status === PromptStatus.QUEUED ||
              img.status === PromptStatus.PROCESSING
            );

            if (processingImages.length > 0) {
              // 获取这些图片对应的promptId
              const promptIdsToMonitor = processingImages.map(img => img.promptId);
              // 去重
              const uniquePromptIds = Array.from(new Set(promptIdsToMonitor));

              // 调用父组件的轮询方法
              if (onStartPolling) {
                onStartPolling(uniquePromptIds);
              }
            }
          }
        })
        .catch((error) => {
          console.error('Error loading images:', error);
        })
        .finally(() => {
          setIsLoadingHistoricalData(false);
        });
    }
  }, [session.projectId]);

  // 监听refreshTrigger变化，重新加载历史图片数据
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && session.projectId) {
      setIsLoadingHistoricalData(true);
      
      AIImageSessionsAPI.loadImages(session.projectId)
        .then((images) => {
          setHistoricalImages(images || []);
        })
        .catch((error) => {
          console.error('Error refreshing images:', error);
        })
        .finally(() => {
          setIsLoadingHistoricalData(false);
        });
    }
  }, [refreshTrigger, session.projectId]);

  // 键盘事件处理 - ESC关闭预览
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };

    if (previewImage) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [previewImage]);

  // 获取可导出的图片（只有COMPLETED状态的图片）
  const completedImages = (historicalImages || []).filter(img => img.status === PromptStatus.COMPLETED);

  // 获取失败的图片
  const failedImages = (historicalImages || []).filter(img => img.status === PromptStatus.FAILED);

  // 所有历史图片
  const filteredImages = historicalImages || [];

  // 切换图片选择状态
  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  // 全选/取消全选（只针对已完成和失败的图片）
  const toggleSelectAll = () => {
    // 只对已完成和失败的图片进行全选操作
    const selectableImages = filteredImages.filter(img =>
      img.status === PromptStatus.COMPLETED || img.status === PromptStatus.FAILED
    );
    const selectableIds = selectableImages.map(img => img.id);
    const allSelected = selectableIds.every(id => selectedImageIds.has(id));

    if (allSelected && selectableImages.length > 0) {
      // 当前全选，则取消选择
      setSelectedImageIds(prev => {
        const newSet = new Set(prev);
        selectableIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // 否则选择所有可选图片
      setSelectedImageIds(prev => {
        const newSet = new Set(prev);
        selectableIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  // 批量导出压缩包
  const handleBatchExport = async () => {
    if (selectedImageIds.size === 0) {
      alert('请选择要导出的图片');
      return;
    }

    setIsExporting(true);

    try {
      // 动态导入JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const selectedImages = completedImages.filter(img => selectedImageIds.has(img.id));

      // 下载并添加图片到压缩包
      const downloadPromises = selectedImages.map(async (image, index) => {
        if (!image.imageUrl) {
          console.warn(`图片 ${image.id} 缺少 imageUrl`);
          return;
        }

        try {
          const response = await fetch(image.imageUrl, {
            mode: 'cors',
            headers: {
              'Accept': 'image/*',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          const filename = `image-${index + 1}-${image.id}.jpg`;
          zip.file(filename, blob);
        } catch (error) {
          console.warn(`跳过图片 ${image.id}，CORS限制或网络错误:`, error);
          // 如果某个图片下载失败，跳过它继续处理其他图片
        }
      });

      await Promise.all(downloadPromises);

      // 生成压缩包
      const content = await zip.generateAsync({ type: 'blob' });

      // 生成文件名，优先使用项目名称
      const filename = projectName 
        ? `${projectName}.zip`
        : `generated-images-${Date.now()}.zip`;

      // 下载压缩包
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 导出成功后清除所有选择
      setSelectedImageIds(new Set());

    } catch (error) {
      console.error('批量导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 批量复制图片
  const handleBatchCopy = async () => {
    if (selectedImageIds.size === 0) {
      toast.error('请选择要复制的图片');
      return;
    }

    setIsCopying(true);

    try {
      // 获取选中图片对应的promptId
      const selectedImages = completedImages.filter(img => selectedImageIds.has(img.id));
      const promptIds = selectedImages.map(img => img.promptId);

      if (copyType === 'regenerate') {
        // 手账纸模式：异步生成类似图片
        await AIImageSessionsAPI.batchGenerateImages(promptIds, copyCount);
        toast.success(`成功提交批量生成任务：${selectedImageIds.size} 个提示词，每个生成 ${copyCount} 张图片`);
      } else {
        // 牛皮纸袋模式：直接复制相同图片
        await AIImageSessionsAPI.batchDuplicateImages(promptIds, copyCount);
        toast.success(`成功复制图片：${selectedImageIds.size} 张图片，每张复制 ${copyCount} 份`);
      }

      // 清除选择和重置状态
      setSelectedImageIds(new Set());
      setCopyCount(1);
      setShowCopyDialog(false);
      setCopyType('regenerate');

      // 跳转到项目列表页面
      navigate('/workspace/product-images');

    } catch (error) {
      console.error('批量复制图片失败:', error);
      toast.error('复制失败，请重试');
    } finally {
      setIsCopying(false);
    }
  };

  // 批量重试失败的图片
  const handleBatchRetry = async () => {
    if (selectedImageIds.size === 0) {
      toast.error('请选择要重试的图片');
      return;
    }

    // 分类选中的图片
    const selectedFailedImages: string[] = [];
    const selectedCompletedImages: string[] = [];

    Array.from(selectedImageIds).forEach(id => {
      const image = historicalImages.find(img => img.id === id);
      if (image) {
        if (image.status === PromptStatus.FAILED) {
          selectedFailedImages.push(id);
        } else if (image.status === PromptStatus.COMPLETED) {
          selectedCompletedImages.push(id);
        }
      }
    });

    // 如果选择了成功的图片,给出提示
    if (selectedCompletedImages.length > 0) {
      toast.error(`已选择 ${selectedCompletedImages.length} 张成功的图片，成功的图片不需要重新生成`);
      return;
    }

    if (selectedFailedImages.length === 0) {
      toast.error('所选图片中没有失败的图片');
      return;
    }

    setIsRetrying(true);

    try {
      await AIImageSessionsAPI.retryFailedImages(selectedFailedImages);
      toast.success(`已提交 ${selectedFailedImages.length} 张失败图片重新生成`);

      // 清除选择
      setSelectedImageIds(new Set());

      // 刷新图片列表
      if (session.projectId) {
        const images = await AIImageSessionsAPI.loadImages(session.projectId);
        setHistoricalImages(images || []);
      }

    } catch (error) {
      console.error('批量重试失败:', error);
      toast.error('重试失败，请稍后再试');
    } finally {
      setIsRetrying(false);
    }
  };

  // 批量删除图片
  const handleBatchDelete = async () => {
    if (selectedImageIds.size === 0) {
      toast.error('请选择要删除的图片');
      return;
    }

    setIsDeleting(true);

    try {
      // 获取选中图片对应的 promptId
      const selectedImages = historicalImages.filter(img => selectedImageIds.has(img.id));
      const promptIds = selectedImages.map(img => img.promptId);

      await AIImageSessionsAPI.deleteImages(promptIds);
      toast.success(`已删除 ${promptIds.length} 张图片`);

      // 清除选择
      setSelectedImageIds(new Set());

      // 刷新图片列表
      if (session.projectId) {
        const images = await AIImageSessionsAPI.loadImages(session.projectId);
        setHistoricalImages(images || []);
      }

    } catch (error) {
      console.error('批量删除失败:', error);
      toast.error('删除失败，请稍后再试');
    } finally {
      setIsDeleting(false);
    }
  };

  // 拖拽排序功能
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex === dropIndex) return;

    const newPdfImages = [...pdfImages];
    const [removed] = newPdfImages.splice(dragIndex, 1);
    newPdfImages.splice(dropIndex, 0, removed);
    setPdfImages(newPdfImages);
  };

  // 处理上传点击
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      // 验证所有文件
      files.forEach(file => {
        FileUploadAPI.validateFile(file, 10 * 1024 * 1024); // 10MB限制
      });

      // 上传文件到腾讯云
      const uploadedUrls = await FileUploadAPI.uploadFiles(files);
      
      // 获取每个图片的实际尺寸
      const uploadedImages: GeneratedImage[] = await Promise.all(
        uploadedUrls.map(async (url, index) => {
          const { width, height } = await getImageDimensions(files[index]);
          return {
            id: `uploaded-${Date.now()}-${index}`,
            promptId: 'uploaded',
            promptText: '用户上传的图片',
            imageUrl: url,
            createdAt: new Date().toISOString(),
            status: PromptStatus.COMPLETED,
            width,
            height
          };
        })
      );
      
      // 添加到PDF图片列表
      setPdfImages(prev => [...prev, ...uploadedImages]);
      
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('文件上传失败:', error);
      alert(error instanceof Error ? error.message : '文件上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  // 生成PDF
  const handleGeneratePdf = async () => {
    if (pdfImages.length === 0) {
      alert('请添加图片到PDF中');
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // 动态导入jsPDF
      const jsPDF = (await import('jspdf')).default;
      
      // 获取页面尺寸
      const pageSize = PAGE_SIZES[pdfPageSize];
      const pdf = new jsPDF({
        orientation: 'portrait', // 正方形页面，默认用portrait
        unit: 'mm',
        format: [pageSize.width, pageSize.height]
      });

      // 页面尺寸（单位：mm，从cm转换）
      const pageWidth = pageSize.width;
      const pageHeight = pageSize.height;
      const availableWidth = pageWidth;
      const availableHeight = pageHeight;

      for (let i = 0; i < pdfImages.length; i++) {
        const image = pdfImages[i];

        if (!image.imageUrl) {
          console.warn(`PDF图片 ${image.id} 缺少 imageUrl，跳过`);
          continue;
        }

        try {
          // 获取图片数据
          const response = await fetch(image.imageUrl, {
            mode: 'cors',
            headers: {
              'Accept': 'image/*',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          const imageDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(blob);
          });

          // 如果不是第一页，添加新页
          if (i > 0) {
            pdf.addPage();
          }

          // 计算图片显示尺寸，保持比例
          const imgWidth = image.width || 800; // 如果没有宽度信息，使用默认值
          const imgHeight = image.height || 600; // 如果没有高度信息，使用默认值
          
          // 确保尺寸为正数
          if (imgWidth <= 0 || imgHeight <= 0) {
            console.warn(`图片 ${image.id} 尺寸无效，跳过`);
            continue;
          }
          
          const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
          const displayWidth = imgWidth * ratio;
          const displayHeight = imgHeight * ratio;

          // 铺满页面显示图片
          const x = 0;
          const y = 0;

          pdf.addImage(imageDataUrl, 'JPEG', x, y, displayWidth, displayHeight);

        } catch (error) {
          console.warn(`跳过图片 ${image.id}，CORS限制或网络错误:`, error);
        }
      }

      // 生成文件名
      const filename = projectName ? `${projectName}.pdf` : `generated-images-${Date.now()}.pdf`;
      
      // 保存PDF
      pdf.save(filename);

      // 关闭弹窗并清除选择
      setShowPdfDialog(false);
      setSelectedImageIds(new Set());

    } catch (error) {
      console.error('生成PDF失败:', error);
      alert('生成PDF失败，请重试');
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  // 处理比例选择变化
  const handleAspectRatioChange = (aspectRatio: AspectRatio) => {
    setSelectedAspectRatio(aspectRatio);
    if (!useCustomSize) {
      setCustomWidth(aspectRatio.width);
      setCustomHeight(aspectRatio.height);
    }
  };

  // 处理自定义尺寸变化 - 允许用户输入，不立即验证
  const handleCustomWidthChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setCustomWidth(numValue);
  };

  const handleCustomHeightChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setCustomHeight(numValue);
  };

  // 输入框失焦时验证
  const handleWidthBlur = () => {
    const result = validateDimensions(customWidth, customHeight);
    if (result.width !== customWidth) {
      setCustomWidth(result.width);
      setWidthAdjusted(true);
      // 3秒后清除提示
      setTimeout(() => setWidthAdjusted(false), 3000);
    }
    if (result.height !== customHeight) {
      setCustomHeight(result.height);
      setHeightAdjusted(true);
      // 3秒后清除提示
      setTimeout(() => setHeightAdjusted(false), 3000);
    }
  };

  const handleHeightBlur = () => {
    const result = validateDimensions(customWidth, customHeight);
    if (result.width !== customWidth) {
      setCustomWidth(result.width);
      setWidthAdjusted(true);
      // 3秒后清除提示
      setTimeout(() => setWidthAdjusted(false), 3000);
    }
    if (result.height !== customHeight) {
      setCustomHeight(result.height);
      setHeightAdjusted(true);
      // 3秒后清除提示
      setTimeout(() => setHeightAdjusted(false), 3000);
    }
  };




  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* 左侧生成参数区域 */}
      <div className="w-80 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-6">生成参数</h3>
          
          {/* 比例选择 */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-3 block">选择比例</label>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.name}
                  onClick={() => handleAspectRatioChange(ratio)}
                  className={`p-3 text-left border rounded-lg transition-all duration-200 ${
                    selectedAspectRatio.name === ratio.name
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">{ratio.label}</div>
                  <div className="text-xs opacity-75">{ratio.width}×{ratio.height}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 自定义尺寸选项 */}
          <div>
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={useCustomSize}
                onChange={(e) => setUseCustomSize(e.target.checked)}
                className="w-4 h-4 text-gray-900 focus:ring-2 focus:ring-gray-900"
              />
              <span className="text-sm font-medium text-gray-700">自定义尺寸</span>
            </label>
            
            {useCustomSize && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">宽度</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={customWidth || ''}
                        onChange={(e) => handleCustomWidthChange(e.target.value)}
                        onBlur={handleWidthBlur}
                        min="256"
                        max="1440"
                        step="32"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          widthAdjusted
                            ? 'border-amber-400 bg-amber-50 focus:ring-amber-400'
                            : 'border-gray-200 focus:ring-gray-900'
                        }`}
                        placeholder="256-1440"
                      />
                      {widthAdjusted && (
                        <div className="absolute -bottom-6 left-0 text-xs text-amber-600">
                          已自动调整为 {customWidth}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">高度</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={customHeight || ''}
                        onChange={(e) => handleCustomHeightChange(e.target.value)}
                        onBlur={handleHeightBlur}
                        min="256"
                        max="1440"
                        step="32"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                          heightAdjusted
                            ? 'border-amber-400 bg-amber-50 focus:ring-amber-400'
                            : 'border-gray-200 focus:ring-gray-900'
                        }`}
                        placeholder="256-1440"
                      />
                      {heightAdjusted && (
                        <div className="absolute -bottom-6 left-0 text-xs text-amber-600">
                          已自动调整为 {customHeight}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-xs text-gray-500 space-y-1">
                  <div>• 尺寸范围：256-1440像素</div>
                  <div>• 必须是32的倍数</div>
                </div>
              </>
            )}
            
            <div className="mt-4 text-sm text-gray-700 bg-white p-3 rounded-lg border">
              最终尺寸: <span className="font-mono font-semibold">
                {useCustomSize ? customWidth : selectedAspectRatio.width} × {useCustomSize ? customHeight : selectedAspectRatio.height}
              </span>

              {useCustomSize && (() => {
                const validation = checkDimensionsValid(customWidth, customHeight);

                return (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={validation.valid ? "text-green-600" : "text-red-600"}>
                      {validation.valid ? "✓ 参数验证通过" : `✗ ${validation.reason}`}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* 生成图片按钮 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Button 
              onClick={() => onGenerateImages({
                width: useCustomSize ? customWidth : selectedAspectRatio.width,
                height: useCustomSize ? customHeight : selectedAspectRatio.height,
                aspectRatio: selectedAspectRatio.name
              })}
              disabled={selectedPrompts.length === 0 || isGeneratingImages}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingImages ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  生成中...
                </>
              ) : (
                <>
                  生成图片
                  {selectedPrompts.length > 0 && (
                    <span className="ml-2 text-sm opacity-75">
                      ({selectedPrompts.length}个)
                    </span>
                  )}
                </>
              )}
            </Button>
            {selectedPrompts.length === 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                请先在上一步选择提示词
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-6 space-y-8">
          
          {/* 待生成提示词区域 */}
          {selectedPrompts.length > 0 && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  待生成图片 ({selectedPrompts.length}个)
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  选中的提示词将生成对应的图片，点击左侧生成按钮开始生成
                </p>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
                {selectedPrompts.map((prompt) => {
                  return (
                    <div key={prompt.id} className="group relative border border-dashed border-gray-300 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-200">
                      <div className="p-4">
                        <div className="space-y-3">
                          {/* 提示词文本 */}
                          <div className="relative cursor-default">
                            <div 
                              className="text-sm text-gray-700 leading-relaxed relative"
                              title={prompt.text}
                            >
                              <div className="line-clamp-3">
                                {prompt.text}
                              </div>
                              {prompt.text.length > 100 && (
                                <div className="absolute bottom-0 right-0 bg-gradient-to-l from-gray-50 to-transparent pl-8 text-gray-500">
                                  ...
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* 占位图片区域 */}
                          <div className="flex flex-col items-center justify-center h-32 bg-white border-2 border-dashed border-gray-200 rounded-lg">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mb-2">
                              <MessageSquare className="w-4 h-4 text-gray-500" />
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                              等待生成图片
                            </p>
                          </div>
                          
                          {/* 状态显示 */}
                          <div className="flex items-center justify-center">
                            <span className="text-xs text-gray-400">
                              准备中
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 历史图片区域 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  历史图片 ({completedImages.length}张)
                </h3>
                {historicalImages.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    项目中的所有图片及其生成状态
                  </p>
                )}
              </div>
              {(completedImages.length > 0 || failedImages.length > 0) && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {(() => {
                      const selectableImages = filteredImages.filter(img =>
                        img.status === PromptStatus.COMPLETED || img.status === PromptStatus.FAILED
                      );
                      const allSelected = selectableImages.length > 0 && selectableImages.every(img => selectedImageIds.has(img.id));
                      return allSelected ? (
                        <CheckSquare className="w-4 h-4 mr-1" />
                      ) : (
                        <Square className="w-4 h-4 mr-1" />
                      );
                    })()}
                    {(() => {
                      const selectableImages = filteredImages.filter(img =>
                        img.status === PromptStatus.COMPLETED || img.status === PromptStatus.FAILED
                      );
                      const allSelected = selectableImages.length > 0 && selectableImages.every(img => selectedImageIds.has(img.id));
                      return allSelected ? '取消全选' : '全选';
                    })()}
                  </Button>

                  {/* 已选择数量 */}
                  {selectedImageIds.size > 0 && (
                    <span className="text-sm text-gray-600">
                      已选择 {selectedImageIds.size} 张
                    </span>
                  )}

                  {/* 重新生成按钮 - 只在有失败图片时显示 */}
                  {failedImages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:text-red-900 hover:border-red-400"
                      onClick={handleBatchRetry}
                      disabled={selectedImageIds.size === 0 || isRetrying}
                    >
                      {isRetrying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                          重试中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          重新生成
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400"
                    onClick={() => setShowCopyDialog(true)}
                    disabled={selectedImageIds.size === 0 || isCopying}
                  >
                    {isCopying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                        复制中...
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        批量复制
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400"
                    onClick={handleBatchExport}
                    disabled={selectedImageIds.size === 0 || isExporting}
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                        导出中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        导出压缩包
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400"
                    onClick={() => {
                      const selectedImages = completedImages.filter(img => selectedImageIds.has(img.id));
                      if (selectedImages.length === 0) {
                        alert('请选择要导出的图片');
                        return;
                      }
                      setPdfImages(selectedImages);
                      setShowPdfDialog(true);
                    }}
                    disabled={selectedImageIds.size === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    导出PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-700 hover:text-red-900 hover:border-red-400"
                    onClick={handleBatchDelete}
                    disabled={selectedImageIds.size === 0 || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                        删除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        批量删除
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {isLoadingHistoricalData ? (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg text-gray-900 font-medium mb-2">加载历史数据中...</p>
                <p className="text-sm text-gray-500">正在检查已生成的图片</p>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-4">
                {filteredImages.map((image) => {
                  const isCompleted = image.status === PromptStatus.COMPLETED;
                  const isFailed = image.status === PromptStatus.FAILED;
                  const isSelectable = isCompleted || isFailed;
                  const isSelected = selectedImageIds.has(image.id);

                  return (
                    <div key={image.id}
                         className={`group border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 relative ${
                           isSelected
                             ? isFailed
                               ? 'border-red-300 bg-red-50'
                               : 'border-blue-300 bg-blue-50'
                             : isSelectable
                               ? isFailed
                                 ? 'border-red-200 hover:border-red-300 cursor-pointer'
                                 : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                               : 'border-gray-200'
                         }`}
                         onClick={isSelectable ? () => toggleImageSelection(image.id) : undefined}
                    >
                      {/* 选择框 - 只有选中状态才显示 */}
                      {isSelectable && isSelected && (
                        <div className="absolute top-2 right-2 p-1.5 rounded-md bg-white/90 backdrop-blur-sm shadow-sm border border-white/20 z-10">
                          <CheckSquare className={`w-4 h-4 ${isFailed ? 'text-red-600' : 'text-blue-600'}`} />
                        </div>
                      )}

                      {image.status === PromptStatus.COMPLETED && image.imageUrl ? (
                        <div className="relative group bg-gray-50 leading-none">
                          <img
                            src={image.imageUrl}
                            alt="历史生成图片"
                            className="w-full h-auto object-contain block"
                            style={{ verticalAlign: 'top' }}
                          />
                          {/* 磨砂全覆盖层 - 渐显效果 */}
                          <div className="absolute inset-0 bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white shadow-lg border border-white/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(image);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                预览
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 p-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                            {image.status === PromptStatus.PROCESSING ? (
                              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : image.status === PromptStatus.FAILED ? (
                              <div className="w-5 h-5 text-red-500">✕</div>
                            ) : (
                              <MessageSquare className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 text-center mb-2">
                            {image.status === PromptStatus.PROCESSING ? '正在生成中...' :
                             image.status === PromptStatus.FAILED ? '生成失败' :
                             '等待处理'}
                          </p>
                          {image.status === PromptStatus.FAILED && image.errorMessage && (
                            <p className="text-xs text-red-600 text-center break-words max-w-full px-2" title={image.errorMessage}>
                              {image.errorMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          
        </div>

        {/* 图片预览模态框 */}
        {previewImage && previewImage.imageUrl && (
          <div 
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div 
              className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">图片预览</h3>
                  <p className="text-sm text-gray-500 mt-1">{previewImage.width}×{previewImage.height}</p>
                </div>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* 图片内容 */}
              <div className="p-4">
                <div className="flex justify-center">
                  <img 
                    src={previewImage.imageUrl}
                    alt="图片预览"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF导出弹窗 */}
        {showPdfDialog && (
          <div 
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPdfDialog(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">导出PDF</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPdfDialog(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 overflow-auto p-6">
                <div className="space-y-6">
                  {/* 页面设置区域 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">页面设置</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 页面尺寸选择 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          页面尺寸
                        </label>
                        <select
                          value={pdfPageSize}
                          onChange={(e) => setPdfPageSize(e.target.value as 'small' | 'large')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="small">{PAGE_SIZES.small.label}</option>
                          <option value="large">{PAGE_SIZES.large.label}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* 图片排序区域 */}
                  <div>
                    <div className="mb-4">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-lg font-medium text-gray-900">图片排序</h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleUploadClick}
                          disabled={isUploading}
                          className="border-gray-300 text-gray-700"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                              上传中...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              上传图片
                            </>
                          )}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">
                          说明：拖拽调整图片顺序，可上传自己的图片插入PDF
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {pdfImages.map((image, index) => (
                        <div
                          key={image.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          className="relative group cursor-move border border-gray-200 rounded-lg bg-white hover:shadow-md transition-all duration-200"
                        >
                          {/* 页码指示 */}
                          <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                            {index + 1}
                          </div>
                          
                          {/* 拖拽手柄 */}
                          <div className="absolute top-2 left-10 p-1 bg-white/80 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>

                          {/* 图片 */}
                          <div className="p-3">
                            {image.imageUrl && (
                              <img
                                src={image.imageUrl}
                                alt={`页面 ${index + 1}`}
                                className="w-full h-32 rounded border border-gray-100"
                              />
                            )}
                          </div>

                          {/* 删除按钮 */}
                          <button
                            onClick={() => {
                              setPdfImages(pdfImages.filter((_, i) => i !== index));
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  共 {pdfImages.length} 张图片
                </div>
                <Button 
                  onClick={handleGeneratePdf}
                  disabled={pdfImages.length === 0 || isGeneratingPdf}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      生成中...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      生成PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 批量复制对话框 */}
        {showCopyDialog && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCopyDialog(false)}
          >
            <div
              className="bg-white rounded-lg max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">批量复制图片</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCopyDialog(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* 内容 */}
              <div className="p-6">
                <Tabs value={copyType} onValueChange={(value) => setCopyType(value as 'regenerate' | 'duplicate')}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="regenerate">手账纸模式</TabsTrigger>
                    <TabsTrigger value="duplicate">牛皮纸袋模式</TabsTrigger>
                  </TabsList>

                  <TabsContent value="regenerate" className="space-y-4">
                    <div className="text-sm text-gray-600">
                      已选择 <span className="font-semibold text-gray-900">{selectedImageIds.size}</span> 张图片
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>手账纸模式：</strong>异步生成类似但不同的图片，每张图片都会重新生成。
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        每张图片生成数量
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="40"
                        value={copyCount}
                        onChange={(e) => setCopyCount(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
                        className="w-full"
                        placeholder="输入生成数量"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        每张图片最多可生成 40 个类似图片
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">
                        将生成：<span className="font-semibold text-gray-900">{selectedImageIds.size * copyCount}</span> 张新图片
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="duplicate" className="space-y-4">
                    <div className="text-sm text-gray-600">
                      已选择 <span className="font-semibold text-gray-900">{selectedImageIds.size}</span> 张图片
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>牛皮纸袋模式：</strong>直接复制相同的图片，每份都完全一样。
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        每张图片复制份数
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="40"
                        value={copyCount}
                        onChange={(e) => setCopyCount(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
                        className="w-full"
                        placeholder="输入复制份数"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        每张图片最多可复制 40 份
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">
                        将复制：<span className="font-semibold text-gray-900">{selectedImageIds.size * copyCount}</span> 张图片（完全相同）
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* 底部按钮 */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <Button
                  variant="outline"
                  onClick={() => setShowCopyDialog(false)}
                  disabled={isCopying}
                >
                  取消
                </Button>
                <Button
                  onClick={handleBatchCopy}
                  disabled={isCopying || selectedImageIds.size === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isCopying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {copyType === 'regenerate' ? '生成中...' : '复制中...'}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {copyType === 'regenerate' ? '开始生成' : '开始复制'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}