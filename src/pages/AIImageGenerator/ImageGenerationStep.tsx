import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Download, Eye, X, CheckSquare, Square, FileText, Upload, GripVertical } from 'lucide-react';
import { ImageGenerationStepProps, AspectRatio, PromptStatus, GeneratedImage, ASPECT_RATIOS } from './types';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
import { FileUploadAPI } from '@/services/fileUpload';


// 验证尺寸是否符合API要求
const validateDimension = (value: number): number => {
  // 限制在256-1440范围内
  const clamped = Math.max(256, Math.min(1440, value));
  // 确保是32的倍数
  return Math.round(clamped / 32) * 32;
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
  isGeneratingImages
}: ImageGenerationStepProps) {
  const selectedPrompts = Array.from(session.prompts?.values() || []).filter(p => selectedPromptIds.has(p.id));
  
  // 生成参数状态
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]); // 默认选择1:1
  const [customWidth, setCustomWidth] = useState<number>(1024);
  const [customHeight, setCustomHeight] = useState<number>(768); // FLUX默认高度
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
  
  // PDF导出相关状态
  const [showPdfDialog, setShowPdfDialog] = useState(false);
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
  
  // 不再默认全选图片

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

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedImageIds.size === completedImages.length) {
      // 当前全选，则取消全选
      setSelectedImageIds(new Set());
    } else {
      // 否则全选
      setSelectedImageIds(new Set(completedImages.map(img => img.id)));
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
      const pdf = new jsPDF();
      
      // A4纸张尺寸（单位：mm）
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin;

      for (let i = 0; i < pdfImages.length; i++) {
        const image = pdfImages[i];
        
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

          // 居中显示图片
          const x = (pageWidth - displayWidth) / 2;
          const y = (pageHeight - displayHeight) / 2;

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

  // 下载图片
  const handleDownloadImage = (imageUrl: string, filename?: string) => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename || `generated-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('下载图片失败:', error);
      alert('下载失败，请重试');
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
    const validatedValue = validateDimension(customWidth);
    if (validatedValue !== customWidth) {
      setCustomWidth(validatedValue);
      setWidthAdjusted(true);
      // 3秒后清除提示
      setTimeout(() => setWidthAdjusted(false), 3000);
    }
  };

  const handleHeightBlur = () => {
    const validatedValue = validateDimension(customHeight);
    if (validatedValue !== customHeight) {
      setCustomHeight(validatedValue);
      setHeightAdjusted(true);
      // 3秒后清除提示
      setTimeout(() => setHeightAdjusted(false), 3000);
    }
  };



  // 获取状态对应的中文显示
  const getStatusText = (status: PromptStatus) => {
    switch (status) {
      case PromptStatus.PENDING:
        return '等待中';
      case PromptStatus.QUEUED:
        return '排队中';
      case PromptStatus.PROCESSING:
        return '生成中';
      case PromptStatus.COMPLETED:
        return '已完成';
      case PromptStatus.FAILED:
        return '失败';
      default:
        return '未知';
    }
  };

  // 获取状态对应的颜色样式
  const getStatusColor = (status: PromptStatus) => {
    switch (status) {
      case PromptStatus.PENDING:
        return 'text-gray-500';
      case PromptStatus.QUEUED:
        return 'text-blue-500';
      case PromptStatus.PROCESSING:
        return 'text-yellow-500';
      case PromptStatus.COMPLETED:
        return 'text-green-500';
      case PromptStatus.FAILED:
        return 'text-red-500';
      default:
        return 'text-gray-500';
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
                <div className="mt-6 text-xs text-gray-500">
                  尺寸要求：256-1440像素，必须是32的倍数
                </div>
              </>
            )}
            
            <div className="mt-4 text-sm text-gray-700 bg-white p-3 rounded-lg border">
              最终尺寸: <span className="font-mono font-semibold">
                {useCustomSize ? customWidth : selectedAspectRatio.width} × {useCustomSize ? customHeight : selectedAspectRatio.height}
              </span>
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
                  历史图片 ({historicalImages.length}张)
                </h3>
                {historicalImages.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    项目中的所有图片及其生成状态
                  </p>
                )}
              </div>
              {completedImages.length > 0 && (
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleSelectAll}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {selectedImageIds.size === completedImages.length && selectedImageIds.size > 0 ? (
                      <CheckSquare className="w-4 h-4 mr-1" />
                    ) : (
                      <Square className="w-4 h-4 mr-1" />
                    )}
                    {selectedImageIds.size === completedImages.length && selectedImageIds.size > 0 ? '取消全选' : '全选'}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {historicalImages.map((image) => {
                  const isCompleted = image.status === PromptStatus.COMPLETED;
                  const isSelected = selectedImageIds.has(image.id);
                  
                  return (
                    <div key={image.id} className={`group border rounded-xl bg-white hover:shadow-lg transition-all duration-200 ${
                      isCompleted && isSelected 
                        ? 'border-blue-300 bg-blue-50' 
                        : isCompleted 
                          ? 'border-gray-200 hover:border-gray-300' 
                          : 'border-gray-200'
                    }`}>
                      {/* 提示词区域 */}
                      <div className="p-4 border-b border-gray-100 relative">
                        {/* 选择框 - 只有COMPLETED状态的图片才显示 */}
                        {isCompleted && (
                          <button
                            onClick={() => toggleImageSelection(image.id)}
                            className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            )}
                          </button>
                        )}
                        
                        <div className="flex-1 min-w-0 pr-10">
                          <div 
                            className="text-sm text-gray-700 leading-relaxed"
                            title={image.promptText}
                          >
                            <div className="line-clamp-2">
                              {image.promptText || '提示词文本'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 图片区域 */}
                      <div className="p-4">
                        {image.status === PromptStatus.COMPLETED ? (
                          <div className="space-y-3">
                            <div className="relative group">
                              {/* 图片容器 */}
                              <div className="relative w-full h-48 rounded-lg border border-gray-100 overflow-hidden bg-gray-50">
                                <img 
                                  src={image.imageUrl} 
                                  alt="历史生成图片"
                                  className="w-full h-full object-cover"
                                />
                                {/* 毛玻璃全覆盖层 - 渐显效果 */}
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 rounded-lg">
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white shadow-lg border border-white/20"
                                      onClick={() => setPreviewImage(image)}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      预览
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white shadow-lg border border-white/20"
                                      onClick={() => handleDownloadImage(image.imageUrl, `image-${image.id}.jpg`)}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      下载
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="font-mono">
                                {image.width}×{image.height}
                              </span>
                              <span className={getStatusColor(image.status)}>
                                {getStatusText(image.status)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                              {image.status === PromptStatus.PROCESSING ? (
                                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : image.status === PromptStatus.FAILED ? (
                                <div className="w-5 h-5 text-red-500">✕</div>
                              ) : (
                                <MessageSquare className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <p className={`text-sm mb-2 ${getStatusColor(image.status)}`}>
                              {getStatusText(image.status)}
                            </p>
                            <p className="text-xs text-gray-400 text-center">
                              {image.status === PromptStatus.PROCESSING ? '正在生成中...' : 
                               image.status === PromptStatus.FAILED ? '生成失败' : 
                               '等待处理'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          
        </div>

        {/* 图片预览模态框 */}
        {previewImage && (
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
                            <img 
                              src={image.imageUrl}
                              alt={`页面 ${index + 1}`}
                              className="w-full h-32 rounded border border-gray-100"
                            />
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
      </div>
    </div>
  );
}