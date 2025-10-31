import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Eye, X, CheckSquare, Square, FileText, Upload, GripVertical, Copy, Trash2, Image as ImageIcon } from 'lucide-react';
import { PromptStatus, GeneratedImage, Prompt, ReferenceImage } from './types';
import { AIImageSessionsAPI } from '@/services/aiImageSessions';
import { FileUploadAPI } from '@/services/fileUpload';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// PDF页面尺寸配置（单位：mm）
const PAGE_SIZES = {
  small: { width: 158, height: 158, label: '小尺寸 (15.8 × 15.8 cm)' },
  large: { width: 306, height: 306, label: '大尺寸 (30.6 × 30.6 cm)' },
  paperBag: { width: 350, height: 660, label: '手提纸袋 (35.0 × 66.0 cm)' }
};

// 获取图片实际尺寸
const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 800, height: 600 });
    };
    img.src = objectUrl;
  });
};

interface ImageContentAreaProps {
  selectedPrompts: Prompt[];
  selectedReferenceImages?: ReferenceImage[];
  historicalImages: GeneratedImage[];
  isLoadingHistoricalData: boolean;
  projectName?: string;
  onRefreshImages: () => void;
  onToggleReferenceImageSelection?: (id: string) => void;
}

export function ImageContentArea({
  selectedPrompts,
  selectedReferenceImages,
  historicalImages,
  isLoadingHistoricalData,
  projectName,
  onRefreshImages,
  onToggleReferenceImageSelection: _onToggleReferenceImageSelection
}: ImageContentAreaProps) {
  const navigate = useNavigate();

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  // 批量导出相关状态
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  // 批量重试相关状态
  const [isRetrying, setIsRetrying] = useState(false);

  // 批量复制相关状态
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyCount, setCopyCount] = useState(1);
  const [isCopying, setIsCopying] = useState(false);
  const [copyType, setCopyType] = useState<'regenerate' | 'duplicate'>('regenerate');

  // 批量删除相关状态
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF导出相关状态
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfPageSize, setPdfPageSize] = useState<'small' | 'large' | 'paperBag'>('small');
  const [pdfImages, setPdfImages] = useState<GeneratedImage[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // 文件上传相关状态
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取可导出的图片
  const completedImages = (historicalImages || []).filter(img => img.status === PromptStatus.COMPLETED);
  const failedImages = (historicalImages || []).filter(img => img.status === PromptStatus.FAILED);
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

  // 全选/取消全选
  const toggleSelectAll = () => {
    const selectableImages = filteredImages.filter(img =>
      img.status === PromptStatus.COMPLETED || img.status === PromptStatus.FAILED
    );
    const selectableIds = selectableImages.map(img => img.id);
    const allSelected = selectableIds.every(id => selectedImageIds.has(id));

    if (allSelected && selectableImages.length > 0) {
      setSelectedImageIds(prev => {
        const newSet = new Set(prev);
        selectableIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedImageIds(prev => {
        const newSet = new Set(prev);
        selectableIds.forEach(id => newSet.add(id));
        return newSet;
      });
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
      const selectedImages = completedImages.filter(img => selectedImageIds.has(img.id));
      const promptIds = selectedImages.map(img => img.promptId);

      if (copyType === 'regenerate') {
        await AIImageSessionsAPI.batchGenerateImages(promptIds, copyCount);
        toast.success(`成功提交批量生成任务：${selectedImageIds.size} 个提示词，每个生成 ${copyCount} 张图片`);
      } else {
        await AIImageSessionsAPI.batchDuplicateImages(promptIds, copyCount);
        toast.success(`成功复制图片：${selectedImageIds.size} 张图片，每张复制 ${copyCount} 份`);
      }

      setSelectedImageIds(new Set());
      setCopyCount(1);
      setShowCopyDialog(false);
      setCopyType('regenerate');

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

      setSelectedImageIds(new Set());
      onRefreshImages();
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
      const imageIds = Array.from(selectedImageIds);

      await AIImageSessionsAPI.deleteImages(imageIds);
      toast.success(`已删除 ${imageIds.length} 张图片`);

      setSelectedImageIds(new Set());
      onRefreshImages();
    } catch (error) {
      console.error('批量删除失败:', error);
      toast.error('删除失败，请稍后再试');
    } finally {
      setIsDeleting(false);
    }
  };

  // 加载图片模板项目列表
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
      files.forEach(file => {
        FileUploadAPI.validateFile(file, 10 * 1024 * 1024);
      });

      const uploadedUrls = await FileUploadAPI.uploadFiles(files);

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
            height,
            taskId: null
          };
        })
      );

      setPdfImages(prev => [...prev, ...uploadedImages]);

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
      const jsPDF = (await import('jspdf')).default;

      let pdf: any = null;

      for (let i = 0; i < pdfImages.length; i++) {
        const image = pdfImages[i];

        if (!image.imageUrl) {
          console.warn(`PDF图片 ${image.id} 缺少 imageUrl，跳过`);
          continue;
        }

        try {
          const response = await fetch(image.imageUrl, {
            mode: 'cors',
            headers: { 'Accept': 'image/*' }
          });

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const blob = await response.blob();
          const imageDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(blob);
          });

          const imgWidth = image.width || 800;
          const imgHeight = image.height || 600;

          if (imgWidth <= 0 || imgHeight <= 0) {
            console.warn(`图片 ${image.id} 尺寸无效，跳过`);
            continue;
          }

          // 获取页面基础尺寸
          const pageSize = PAGE_SIZES[pdfPageSize];

          // 计算图片宽高比
          const imgRatio = imgWidth / imgHeight;

          // 根据图片方向决定PDF页面方向
          // 如果图片是横向(宽>高)且页面也应该是横向，或者图片是竖向且页面应该是竖向
          let pdfWidth, pdfHeight;
          if (imgRatio > 1) {
            // 图片是横向的，让PDF页面也横向(宽>高)
            pdfWidth = Math.max(pageSize.width, pageSize.height);
            pdfHeight = Math.min(pageSize.width, pageSize.height);
          } else {
            // 图片是竖向的，让PDF页面也竖向(高>宽)
            pdfWidth = Math.min(pageSize.width, pageSize.height);
            pdfHeight = Math.max(pageSize.width, pageSize.height);
          }

          // 第一页时创建PDF实例
          if (!pdf) {
            pdf = new jsPDF({
              orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
              unit: 'mm',
              format: [pdfWidth, pdfHeight]
            });
          } else {
            pdf.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? 'landscape' : 'portrait');
          }

          // 使用图片完全填充页面，不留空白
          pdf.addImage(imageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        } catch (error) {
          console.warn(`跳过图片 ${image.id}，CORS限制或网络错误:`, error);
        }
      }

      if (!pdf) {
        alert('没有有效的图片可以生成PDF');
        return;
      }

      const filename = projectName ? `${projectName}.pdf` : `generated-images-${Date.now()}.pdf`;
      pdf.save(filename);

      setShowPdfDialog(false);
      setSelectedImageIds(new Set());
    } catch (error) {
      console.error('生成PDF失败:', error);
      alert('生成PDF失败，请重试');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="p-6 space-y-8">
        {/* 待生成提示词区域 */}
        {selectedPrompts.length > 0 && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                待生成图片 ({selectedPrompts.length}个提示词)
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                选中的提示词将生成对应的图片，点击左侧生成按钮开始生成
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
              {selectedPrompts.map((prompt) => (
                <div key={prompt.id} className="group relative border border-dashed border-gray-300 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-200">
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="relative cursor-default">
                        <div className="text-sm text-gray-700 leading-relaxed relative" title={prompt.text}>
                          <div className="line-clamp-3">{prompt.text}</div>
                          {prompt.text.length > 100 && (
                            <div className="absolute bottom-0 right-0 bg-gradient-to-l from-gray-50 to-transparent pl-8 text-gray-500">
                              ...
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center h-32 bg-white border-2 border-dashed border-gray-200 rounded-lg">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mb-2">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                        </div>
                        <p className="text-xs text-gray-500 text-center">等待生成图片</p>
                      </div>

                      <div className="flex items-center justify-center">
                        <span className="text-xs text-gray-400">准备中</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 参考图片区域 (以图生图模式) */}
        {selectedReferenceImages && selectedReferenceImages.length > 0 && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                参考图片 ({selectedReferenceImages.length}张)
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                选中的参考图片将用于生成相似的图片，点击左侧生成按钮开始生成
              </p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {selectedReferenceImages.map((refImage) => (
                <div key={refImage.id} className="group relative border border-gray-300 rounded-lg bg-white hover:shadow-md transition-all duration-200">
                  <div className="aspect-square relative overflow-hidden rounded-t-lg">
                    <img
                      src={refImage.imageUrl}
                      alt="参考图片"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-gray-700 font-medium">
                          <ImageIcon className="w-3 h-3 inline-block mr-1" />
                          参考图
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 text-center">
                    <span className="text-xs text-gray-500">等待生成</span>
                  </div>
                </div>
              ))}
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
                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-gray-600 hover:text-gray-900">
                  {(() => {
                    const selectableImages = filteredImages.filter(img =>
                      img.status === PromptStatus.COMPLETED || img.status === PromptStatus.FAILED
                    );
                    const allSelected = selectableImages.length > 0 && selectableImages.every(img => selectedImageIds.has(img.id));
                    return allSelected ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />;
                  })()}
                  {(() => {
                    const selectableImages = filteredImages.filter(img =>
                      img.status === PromptStatus.COMPLETED || img.status === PromptStatus.FAILED
                    );
                    const allSelected = selectableImages.length > 0 && selectableImages.every(img => selectedImageIds.has(img.id));
                    return allSelected ? '取消全选' : '全选';
                  })()}
                </Button>

                {selectedImageIds.size > 0 && (
                  <span className="text-sm text-gray-600">已选择 {selectedImageIds.size} 张</span>
                )}

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

                {/* 批量操作按钮已隐藏 - 该功能已移至 /product-images 页面 */}
                {/* <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400"
                  onClick={() => setShowCopyDialog(true)} disabled={selectedImageIds.size === 0 || isCopying}>
                  {isCopying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      批量操作
                    </>
                  )}
                </Button> */}

                <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400"
                  onClick={() => {
                    const selectedImages = completedImages.filter(img => selectedImageIds.has(img.id));
                    if (selectedImages.length === 0) {
                      alert('请选择要导出的图片');
                      return;
                    }
                    setPdfImages(selectedImages);
                    setShowPdfDialog(true);
                  }}
                  disabled={selectedImageIds.size === 0}>
                  <FileText className="w-4 h-4 mr-2" />
                  导出PDF
                </Button>

                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:text-red-900 hover:border-red-400"
                  onClick={handleBatchDelete} disabled={selectedImageIds.size === 0 || isDeleting}>
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
                           ? isFailed ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'
                           : isSelectable
                             ? isFailed ? 'border-red-200 hover:border-red-300 cursor-pointer' : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                             : 'border-gray-200'
                       }`}
                       onClick={isSelectable ? () => toggleImageSelection(image.id) : undefined}>
                    {isSelectable && isSelected && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-md bg-white/90 backdrop-blur-sm shadow-sm border border-white/20 z-10">
                        <CheckSquare className={`w-4 h-4 ${isFailed ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                    )}

                    {image.status === PromptStatus.COMPLETED && image.imageUrl ? (
                      <div className="relative group bg-gray-50 leading-none">
                        <img src={image.imageUrl} alt="历史生成图片" className="w-full h-auto object-contain block" style={{ verticalAlign: 'top' }} />
                        <div className="absolute inset-0 bg-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white shadow-lg border border-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(image);
                              }}>
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
                           image.status === PromptStatus.FAILED ? '生成失败' : '等待处理'}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">图片预览</h3>
                <p className="text-sm text-gray-500 mt-1">{previewImage.width}×{previewImage.height}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPreviewImage(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4">
              <div className="flex justify-center">
                <img src={previewImage.imageUrl} alt="图片预览" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF导出弹窗 */}
      {showPdfDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowPdfDialog(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">导出PDF</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPdfDialog(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">页面设置</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">页面尺寸</label>
                      <select
                        value={pdfPageSize}
                        onChange={(e) => setPdfPageSize(e.target.value as 'small' | 'large' | 'paperBag')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <option value="small">{PAGE_SIZES.small.label}</option>
                        <option value="large">{PAGE_SIZES.large.label}</option>
                        <option value="paperBag">{PAGE_SIZES.paperBag.label}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">图片排序</h3>
                      <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={isUploading} className="border-gray-300 text-gray-700">
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
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600">说明：拖拽调整图片顺序，可上传自己的图片插入PDF</p>
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
                        className="relative group cursor-move border border-gray-200 rounded-lg bg-white hover:shadow-md transition-all duration-200">
                        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">{index + 1}</div>
                        <div className="absolute top-2 left-10 p-1 bg-white/80 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="p-3">
                          {image.imageUrl && <img src={image.imageUrl} alt={`页面 ${index + 1}`} className="w-full h-32 rounded border border-gray-100" />}
                        </div>
                        <button onClick={() => setPdfImages(pdfImages.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">共 {pdfImages.length} 张图片</div>
              <Button onClick={handleGeneratePdf} disabled={pdfImages.length === 0 || isGeneratingPdf} className="bg-blue-600 hover:bg-blue-700">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCopyDialog(false)}>
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">批量复制图片</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCopyDialog(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6">
              <Tabs value={copyType} onValueChange={(value) => setCopyType(value as 'regenerate' | 'duplicate')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="regenerate">批量生成</TabsTrigger>
                  <TabsTrigger value="duplicate">批量复制</TabsTrigger>
                </TabsList>

                <TabsContent value="regenerate" className="space-y-4">
                  <div className="text-sm text-gray-600">
                    已选择 <span className="font-semibold text-gray-900">{selectedImageIds.size}</span> 张图片
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <p className="text-sm text-blue-800">
                      <strong>批量生成：</strong>异步生成类似但不同的图片，每张图片都会重新生成。
                    </p>
                    <p className="text-xs text-blue-700">
                      <strong>适用场景：</strong>需要同款不同样式的图片，如同一产品的多角度展示、不同配色方案等，例如手账纸业务。
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">每张图片生成数量</label>
                    <Input type="number" min="1" max="40" value={copyCount}
                      onChange={(e) => setCopyCount(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
                      className="w-full" placeholder="输入生成数量" />
                    <p className="text-xs text-gray-500 mt-1">每张图片最多可生成 40 个类似图片</p>
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

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                    <p className="text-sm text-green-800">
                      <strong>批量复制：</strong>直接复制相同的图片，每份都完全一样。
                    </p>
                    <p className="text-xs text-green-700">
                      <strong>适用场景：</strong>需要大量完全相同的图片用于生产，例如手提纸袋。
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">每张图片复制份数</label>
                    <Input type="number" min="1" max="50" value={copyCount}
                      onChange={(e) => setCopyCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                      className="w-full" placeholder="输入复制份数" />
                    <p className="text-xs text-gray-500 mt-1">每张图片最多可复制 50 份</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">
                      将复制：<span className="font-semibold text-gray-900">{selectedImageIds.size * copyCount}</span> 张图片（完全相同）
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" onClick={() => setShowCopyDialog(false)} disabled={isCopying}>取消</Button>
              <Button onClick={handleBatchCopy} disabled={isCopying || selectedImageIds.size === 0} className="bg-blue-600 hover:bg-blue-700">
                {isCopying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    处理中...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    确认
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
