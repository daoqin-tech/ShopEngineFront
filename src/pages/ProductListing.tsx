import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Plus, ChevronLeft, ChevronRight, Download, RefreshCw, FileText, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { productService, type Product } from '@/services/productService';
import { TEMU_SHOPS } from '@/types/shop';
import { toast } from 'sonner';
import { ImageReorderDialog } from '@/components/ImageReorderDialog';
import { RegenerateTitleDialog } from '@/components/RegenerateTitleDialog';
import { UnifiedExportDialog } from '@/components/UnifiedExportDialog';
import {
  exportCarouselImages as exportCarouselImagesUtil,
  exportProductImages as exportProductImagesUtil,
  exportToExcel as exportToExcelUtil,
  exportProductPdf as exportProductPdfUtil,
  type PageSizeType
} from '@/utils/productExportUtils';

export function ProductListing() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // 选择状态
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState<number | ''>(100);

  // 筛选条件
  const [productCodes, setProductCodes] = useState(''); // 货号，包含逗号时精确查询，否则模糊查询
  const [title, setTitle] = useState(''); // 标题模糊搜索
  const [shopId, setShopId] = useState(''); // 店铺ID
  const [startTime, setStartTime] = useState(''); // 开始时间（datetime-local格式）
  const [endTime, setEndTime] = useState(''); // 结束时间（datetime-local格式）

  // PDF导出相关状态
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfPageSize, setPdfPageSize] = useState<'JOURNAL_PAPER' | 'DECORATIVE_PAPER' | 'CALENDAR_PORTRAIT' | 'CALENDAR_LANDSCAPE'>('JOURNAL_PAPER');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [productsToExport, setProductsToExport] = useState<Product[]>([]);

  // 图片预览状态
  const [previewImages, setPreviewImages] = useState<{images: string[], title: string} | null>(null);

  // 导出状态
  const [isRegeneratingTitles, setIsRegeneratingTitles] = useState(false);

  // 统一导出对话框状态
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDialogConfig, setExportDialogConfig] = useState({
    title: '',
    description: '',
    productCount: 0,
    stage: 'confirm' as 'confirm' | 'processing' | 'completed',
    currentProject: 0,
    totalProjects: 0,
    currentImage: 0,
    totalImages: 0,
    currentProductName: '',
  });

  // 重新生成标题对话框
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // 获取商品列表
  const fetchProducts = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;

      // 将 datetime-local 格式转换为秒级时间戳
      const startTimestamp = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : undefined;
      const endTimestamp = endTime ? Math.floor(new Date(endTime).getTime() / 1000) : undefined;

      const response = await productService.getProducts({
        page,
        limit: validPageSize,
        productCodes: productCodes.trim() || undefined,
        title: title.trim() || undefined,
        shopId: shopId || undefined,
        startTime: startTimestamp,
        endTime: endTimestamp
      });
      setProducts(response.data);
      setTotal(response.total);
      setCurrentPage(page);
    } catch (error: any) {
      console.error('获取商品列表失败:', error);
      toast.error(error.response?.data?.message || '获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchProducts(1);
  }, []);

  // 应用筛选
  const handleApplyFilters = () => {
    fetchProducts(1);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setProductCodes('');
    setTitle('');
    setShopId('');
    setStartTime('');
    setEndTime('');
    setPageSize(100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      default:
        return '处理中';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  // 根据 shopId 查找店铺名称
  const getShopName = (shopId: string): string => {
    const shop = TEMU_SHOPS.find(s => s.shopId === shopId);
    return shop?.name || '';
  };

  // 切换商品选择
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const productIds = products.map(p => p.id);
    const allSelected = productIds.every(id => selectedProductIds.has(id));

    if (allSelected) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(productIds));
    }
  };

  // PDF页面尺寸配置（单位：mm）
  // 所有类型: 实际PDF尺寸 = 规格尺寸 + 6mm(打印出血)
  const PAGE_SIZE_CONFIG = {
    JOURNAL_PAPER: {
      width: 152,   // 15.2cm
      height: 152,
      label: '15.2 × 15.2 cm',
      displayLabel: '15.2 × 15.2 cm',
      type: '手账纸'
    },
    DECORATIVE_PAPER: {
      width: 300,   // 30cm
      height: 300,
      label: '30 × 30 cm',
      displayLabel: '30 × 30 cm',
      type: '包装纸'
    },
    CALENDAR_PORTRAIT: {
      width: 210,   // 21cm
      height: 297,  // 29.7cm
      label: '21 × 29.7 cm',
      displayLabel: '21 × 29.7 cm',
      type: '竖版日历'
    },
    CALENDAR_LANDSCAPE: {
      width: 297,   // 29.7cm
      height: 210,  // 21cm
      label: '29.7 × 21 cm',
      displayLabel: '29.7 × 21 cm',
      type: '横版日历'
    }
  };

  // 导出产品图PDF - 旧版本(双面打印,保留备用)
  // const handleExportProductPdf_DoubleSided = async () => {
  //   if (selectedProductIds.size === 0) {
  //     toast.error('请至少选择一个商品');
  //     return;
  //   }

  //   const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

  //   setIsGeneratingPdf(true);

  //   try {
  //     // 获取所有选中商品的taskId
  //     const taskIds = selectedProducts.map(p => p.taskId);

  //     // 批量获取产品图
  //     const taskImagesMap = await productService.batchGetTaskImages(taskIds);

  //     // 过滤出有图片的商品
  //     const productsWithImages = selectedProducts.filter(p => {
  //       const images = taskImagesMap[p.taskId];
  //       return images && images.length > 0;
  //     });

  //     if (productsWithImages.length === 0) {
  //       toast.error('所选商品没有产品图');
  //       setIsGeneratingPdf(false);
  //       return;
  //     }

  //     // 创建 JSZip 实例
  //     const zip = new JSZip();

  //     // 获取选择的页面尺寸
  //     const pageSize = PAGE_SIZES[pdfPageSize];

  //     // 为每个商品生成一个PDF(包含所有产品图)
  //     for (const product of productsWithImages) {
  //       const productImages = taskImagesMap[product.taskId];
  //       if (!productImages || productImages.length === 0) continue;

  //       const pdf = new jsPDF({
  //         orientation: 'portrait',
  //         unit: 'mm',
  //         format: [pageSize.width, pageSize.height]
  //       });

  //       const pageWidth = pageSize.width;
  //       const pageHeight = pageSize.height;

  //       let isFirstPage = true;

  //       // 为该商品的所有产品图创建页面(每张图后面跟一个空白页,确保图片在正面)
  //       for (const imageUrl of productImages) {
  //           try {
  //             const response = await fetch(imageUrl, {
  //               mode: 'cors',
  //               headers: {
  //                 'Accept': 'image/*',
  //               }
  //             });

  //             if (!response.ok) {
  //               console.warn(`跳过图片 ${imageUrl}，HTTP错误: ${response.status}`);
  //               continue;
  //             }

  //             const blob = await response.blob();
  //             const imageDataUrl = await new Promise<string>((resolve) => {
  //               const reader = new FileReader();
  //               reader.onload = (e) => resolve(e.target?.result as string);
  //               reader.readAsDataURL(blob);
  //             });

  //             // 如果不是第一页，添加新页
  //             if (!isFirstPage) {
  //               pdf.addPage();
  //             }
  //             isFirstPage = false;

  //             // 获取图片尺寸
  //             const img = new Image();
  //             await new Promise((resolve, reject) => {
  //               img.onload = resolve;
  //               img.onerror = reject;
  //               img.src = imageDataUrl;
  //             });

  //             const imgWidth = img.naturalWidth;
  //             const imgHeight = img.naturalHeight;

  //             // 计算图片显示尺寸，保持比例并铺满页面
  //             const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  //             const displayWidth = imgWidth * ratio;
  //             const displayHeight = imgHeight * ratio;

  //             // 居中显示
  //             const x = (pageWidth - displayWidth) / 2;
  //             const y = (pageHeight - displayHeight) / 2;

  //             pdf.addImage(imageDataUrl, 'JPEG', x, y, displayWidth, displayHeight);

  //             // 在每张产品图后添加一个空白页,确保下一张产品图在正面
  //             pdf.addPage();

  //         } catch (error) {
  //           console.warn(`跳过图片 ${imageUrl}，处理失败:`, error);
  //         }
  //       }

  //       // 此时最后一页是空白页(最后一张产品图的背面)
  //       // 需要再添加一页空白页(新纸张的正面),然后货号页在其背面
  //       pdf.addPage(); // 新纸张的正面(空白页)
  //       pdf.addPage(); // 新纸张的背面(货号页)

  //       // 设置货号文字样式 - 居中显示
  //       pdf.setFontSize(40);
  //       pdf.setTextColor(0, 0, 0);
  //       const productCode = product.productCode || product.id;
  //       const textWidth = pdf.getTextWidth(productCode);
  //       const textX = (pageWidth - textWidth) / 2;
  //       const textY = pageHeight / 2;
  //       pdf.text(productCode, textX, textY);

  //       // 添加右下角黑色标记 (用于分本)
  //       // 黑标尺寸: 宽10mm (1cm), 高5mm (0.5cm)
  //       // 位置: 距离右边缘0mm, 距离底部5mm (0.5cm)
  //       const blackMarkWidth = 10;  // 1cm
  //       const blackMarkHeight = 5;  // 0.5cm
  //       const blackMarkX = pageWidth - blackMarkWidth;  // 右对齐
  //       const blackMarkY = pageHeight - blackMarkHeight - 5;  // 距离底部0.5cm

  //       pdf.setFillColor(0, 0, 0);  // 黑色
  //       pdf.rect(blackMarkX, blackMarkY, blackMarkWidth, blackMarkHeight, 'F');  // 'F' = filled

  //       // 生成PDF blob并添加到压缩包
  //       const pdfBlob = pdf.output('blob');
  //       const pdfFileName = `${product.productCode || product.id}.pdf`;
  //       zip.file(pdfFileName, pdfBlob);
  //     }

  //     // 生成压缩包
  //     const zipContent = await zip.generateAsync({ type: 'blob' });

  //     // 生成文件名
  //     const now = new Date();
  //     const dateTimeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  //     const filename = `产品图PDF_${dateTimeStr}.zip`;

  //     // 下载压缩包
  //     const url = window.URL.createObjectURL(zipContent);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = filename;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(url);

  //     toast.success(`成功导出 ${productsWithImages.length} 个商品的PDF`);
  //     setSelectedProductIds(new Set());
  //     setShowPdfDialog(false);

  //   } catch (error) {
  //     console.error('导出PDF失败:', error);
  //     toast.error('导出PDF失败，请重试');
  //   } finally {
  //     setIsGeneratingPdf(false);
  //   }
  // };

  // 导出产品图PDF - 点击开始导出按钮
  const handleExportProductPdf = async () => {
    if (selectedProductIds.size === 0) {
      toast.error('请至少选择一个商品');
      return;
    }

    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

    // 如果是日历模式，先显示重排序对话框
    if (pdfPageSize.startsWith('CALENDAR')) {
      setProductsToExport(selectedProducts);
      setShowPdfDialog(false);
      setShowReorderDialog(true);
    } else {
      // 非日历模式直接导出
      setIsGeneratingPdf(true);
      try {
        await exportProductPdfUtil(selectedProducts, pdfPageSize as PageSizeType);
        toast.success(`成功导出 PDF`);
        setSelectedProductIds(new Set());
        setShowPdfDialog(false);
      } catch (error) {
        console.error('导出PDF失败:', error);
        toast.error(error instanceof Error ? error.message : '导出PDF失败，请重试');
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  // 确认重排序后导出
  const handleConfirmReorder = async (reorderedProducts: Product[]) => {
    setIsGeneratingPdf(true);
    try {
      await exportProductPdfUtil(reorderedProducts, pdfPageSize as PageSizeType);
      toast.success(`成功导出 PDF`);
      setSelectedProductIds(new Set());
      setShowReorderDialog(false);
    } catch (error) {
      console.error('导出PDF失败:', error);
      toast.error(error instanceof Error ? error.message : '导出PDF失败，请重试');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 商品图预览
  const handlePreviewCarouselImages = (product: Product) => {
    if (!product.carouselImages || product.carouselImages.length === 0) {
      toast.error('该商品没有商品图');
      return;
    }
    setPreviewImages({
      images: product.carouselImages,
      title: `商品图预览 - ${product.productCode || product.id}`
    });
  };

  // 产品图预览
  const handlePreviewProductImages = (product: Product) => {
    if (!product.productImages || product.productImages.length === 0) {
      toast.error('该商品没有产品图');
      return;
    }
    setPreviewImages({
      images: product.productImages,
      title: `产品图预览 - ${product.productCode || product.id}`
    });
  };

  // 批量导出商品图
  const handleExportCarouselImages = () => {
    if (selectedProductIds.size === 0) {
      toast.error('请至少选择一个商品');
      return;
    }

    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

    // 显示确认对话框
    setExportDialogConfig({
      title: '导出商品图',
      description: '确定要导出选中商品的商品图吗？',
      productCount: selectedProducts.length,
      stage: 'confirm',
      currentProject: 0,
      totalProjects: selectedProducts.length,
      currentImage: 0,
      totalImages: 0,
      currentProductName: '',
    });
    setShowExportDialog(true);
  };

  // 执行导出商品图
  const executeExportCarouselImages = async (selectedProducts: Product[]) => {
    // 切换到处理阶段
    setExportDialogConfig(prev => ({ ...prev, stage: 'processing' }));

    try {
      await exportCarouselImagesUtil(
        selectedProducts,
        (currentProject, totalProjects, currentImage, totalImages, productName) => {
          setExportDialogConfig(prev => ({
            ...prev,
            currentProject,
            totalProjects,
            currentImage,
            totalImages,
            currentProductName: productName,
          }));
        }
      );

      // 切换到完成阶段
      setExportDialogConfig(prev => ({ ...prev, stage: 'completed' }));

      // 2秒后自动关闭并清空选择
      setTimeout(() => {
        setShowExportDialog(false);
        setSelectedProductIds(new Set());
        toast.success(`成功导出 ${selectedProducts.length} 个商品的商品图`);
      }, 2000);
    } catch (error) {
      console.error('导出商品图失败:', error);
      setShowExportDialog(false);
      toast.error(error instanceof Error ? error.message : '导出商品图失败');
    }
  };

  // 批量导出产品图
  const handleExportProductImages = () => {
    if (selectedProductIds.size === 0) {
      toast.error('请至少选择一个商品');
      return;
    }

    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));

    // 显示确认对话框
    setExportDialogConfig({
      title: '导出产品图',
      description: '确定要导出选中商品的产品图吗？',
      productCount: selectedProducts.length,
      stage: 'confirm',
      currentProject: 0,
      totalProjects: selectedProducts.length,
      currentImage: 0,
      totalImages: 0,
      currentProductName: '',
    });
    setShowExportDialog(true);
  };

  // 执行导出产品图
  const executeExportProductImages = async (selectedProducts: Product[]) => {
    // 切换到处理阶段
    setExportDialogConfig(prev => ({ ...prev, stage: 'processing' }));

    try {
      await exportProductImagesUtil(
        selectedProducts,
        (currentProject, totalProjects, currentImage, totalImages, productName) => {
          setExportDialogConfig(prev => ({
            ...prev,
            currentProject,
            totalProjects,
            currentImage,
            totalImages,
            currentProductName: productName,
          }));
        }
      );

      // 切换到完成阶段
      setExportDialogConfig(prev => ({ ...prev, stage: 'completed' }));

      // 2秒后自动关闭并清空选择
      setTimeout(() => {
        setShowExportDialog(false);
        setSelectedProductIds(new Set());
        toast.success(`成功导出 ${selectedProducts.length} 个商品的产品图`);
      }, 2000);
    } catch (error) {
      console.error('导出产品图失败:', error);
      setShowExportDialog(false);
      toast.error(error instanceof Error ? error.message : '导出产品图失败');
    }
  };

  // 导出Excel功能
  const handleExport = () => {
    try {
      if (selectedProductIds.size === 0) {
        toast.error('请至少选择一个商品');
        return;
      }

      const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
      exportToExcelUtil(selectedProducts, getShopName);
      toast.success(`成功导出 ${selectedProductIds.size} 个商品`);
      setSelectedProductIds(new Set());
    } catch (error) {
      console.error('导出Excel失败:', error);
      toast.error(error instanceof Error ? error.message : '导出Excel失败');
    }
  };

  // 打开重新生成标题对话框
  const handleOpenRegenerateDialog = () => {
    if (selectedProductIds.size === 0) {
      toast.error('请至少选择一个商品');
      return;
    }
    setShowRegenerateDialog(true);
  };

  // 确认重新生成商品标题
  const handleConfirmRegenerateTitles = async (productSpec: string, productUsage: string) => {
    setIsRegeneratingTitles(true);
    try {
      const productIds = Array.from(selectedProductIds);
      await productService.regenerateTitles({
        productIds,
        productSpec,
        productUsage
      });

      toast.success(`已提交 ${productIds.length} 个商品的标题重新生成任务，正在后台处理中...`, {
        description: '商品标题由AI生成，请稍后刷新查看结果',
        duration: 5000
      });

      setSelectedProductIds(new Set());
    } catch (error) {
      console.error('重新生成标题失败:', error);
      toast.error(error instanceof Error ? error.message : '重新生成标题失败，请重试');
    } finally {
      setIsRegeneratingTitles(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">批量上架(文件版)</h1>
          <p className="text-gray-600">商品信息管理</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchProducts(currentPage)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            onClick={handleExportCarouselImages}
            variant="outline"
            className="flex items-center gap-2"
            disabled={selectedProductIds.size === 0}
          >
            <ImageIcon className="w-4 h-4" />
            导出商品图 {selectedProductIds.size > 0 && `(${selectedProductIds.size})`}
          </Button>
          <Button
            onClick={handleExportProductImages}
            variant="outline"
            className="flex items-center gap-2"
            disabled={selectedProductIds.size === 0}
          >
            <ImageIcon className="w-4 h-4" />
            导出产品图 {selectedProductIds.size > 0 && `(${selectedProductIds.size})`}
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
            disabled={selectedProductIds.size === 0}
          >
            <Download className="w-4 h-4" />
            导出上架表格 {selectedProductIds.size > 0 && `(${selectedProductIds.size})`}
          </Button>
          <Button
            onClick={() => setShowPdfDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
            disabled={selectedProductIds.size === 0}
          >
            <FileText className="w-4 h-4" />
            导出产品图PDF {selectedProductIds.size > 0 && `(${selectedProductIds.size})`}
          </Button>
          <Button
            onClick={handleOpenRegenerateDialog}
            variant="outline"
            className="flex items-center gap-2"
            disabled={selectedProductIds.size === 0 || isRegeneratingTitles}
          >
            {isRegeneratingTitles ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                重新生成标题 {selectedProductIds.size > 0 && `(${selectedProductIds.size})`}
              </>
            )}
          </Button>
          <Button onClick={() => navigate('/workspace/batch-upload/create')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            批量新建商品
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="bg-gray-50 p-4 border rounded-lg mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 货号输入 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">货号:</label>
            <Input
              placeholder="支持模糊查询和逗号分割查询"
              value={productCodes}
              onChange={(e) => setProductCodes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilters();
                }
              }}
              className="w-64"
            />
          </div>

          {/* 标题搜索 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">标题:</label>
            <Input
              placeholder="模糊搜索标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilters();
                }
              }}
              className="w-48"
            />
          </div>

          {/* 店铺选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">店铺:</label>
            <select
              className="h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
            >
              <option value="">全部店铺</option>
              {TEMU_SHOPS.map(shop => (
                <option key={shop.shopId} value={shop.shopId}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* 开始时间 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">开始时间:</label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-48"
            />
          </div>

          {/* 结束时间 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">结束时间:</label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-48"
            />
          </div>

          {/* 搜索按钮 */}
          <Button onClick={handleApplyFilters} className="px-6">
            搜索
          </Button>

          {/* 重置按钮 */}
          <Button variant="outline" onClick={handleResetFilters}>
            重置
          </Button>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={products.length > 0 && products.every(p => selectedProductIds.has(p.id))}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">预览图</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品信息</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">货号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">店铺</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedProductIds.has(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {product.previewImage ? (
                          <img
                            src={product.previewImage}
                            alt="预览图"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                            <span className="text-gray-400 text-xs">无图片</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {product.nameZh || '未生成标题'}
                          </div>
                          {product.nameEn && (
                            <div className="text-sm text-gray-500 mt-1">
                              {product.nameEn}
                            </div>
                          )}
                          {product.categoryName && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">{product.categoryName}</Badge>
                            </div>
                          )}
                          {product.productId && (
                            <div className="text-xs text-gray-500 mt-1">
                              商品ID: {product.productId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.productCode || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getShopName(product.shopId)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(product.status)}
                          <span className={`ml-2 text-sm font-medium ${getStatusColor(product.status)}`}>
                            {getStatusText(product.status)}
                          </span>
                        </div>
                        {product.errorMessage && (
                          <div className="text-xs text-red-500 mt-1">
                            {product.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(product.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewCarouselImages(product)}
                            className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                          >
                            商品图
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewProductImages(product)}
                            className="h-7 px-2 text-green-600 hover:text-green-700 text-xs"
                          >
                            产品图
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页控件 */}
            {total > 0 && (
              <div className="border-t bg-white p-4">
                <div className="flex items-center gap-4">
                  {/* 统计信息 */}
                  <div className="text-sm text-gray-500">
                    共 {total} 个商品
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchProducts(1); // 回车时重置到第一页并查询
                        }
                      }}
                      className="w-16 h-8 text-sm text-center"
                    />
                    <span className="text-sm text-gray-600">条（按回车查询）</span>
                  </div>

                  {/* 分隔线 */}
                  <div className="h-6 w-px bg-gray-300"></div>

                  {/* 上一页按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchProducts(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>

                  {/* 页码按钮 */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const validPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100;
                      const totalPages = Math.ceil(total / validPageSize);
                      const maxVisiblePages = 7;

                      if (totalPages <= maxVisiblePages) {
                        return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => fetchProducts(page)}
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
                            onClick={() => fetchProducts(page)}
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
                    onClick={() => fetchProducts(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(total / (typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100)) || loading}
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
                            fetchProducts(value);
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
                    共 {Math.ceil(total / (typeof pageSize === 'number' && pageSize > 0 ? pageSize : 100))} 页
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无商品</h3>
            <p className="text-gray-500">
              没有找到符合条件的商品
            </p>
          </div>
        )}
      </div>

      {/* PDF导出弹窗 */}
      {showPdfDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPdfDialog(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">导出产品图PDF</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPdfDialog(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 内容区域 */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  已选择 <span className="font-semibold text-gray-900">{selectedProductIds.size}</span> 个商品
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    选择规格
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(PAGE_SIZE_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setPdfPageSize(key as any)}
                        className={`
                          relative p-4 border-2 rounded-lg text-left transition-all
                          ${pdfPageSize === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className="font-semibold text-gray-900 mb-1">
                          {config.type}
                        </div>
                        <div className="text-sm text-gray-600">
                          {config.displayLabel}
                        </div>
                        {pdfPageSize === key && (
                          <div className="absolute top-2 right-2">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    {pdfPageSize.startsWith('CALENDAR')
                      ? '日历模式会自动添加 6mm 出血，货号显示在页面右下角'
                      : '手账纸和包装纸会添加 6mm 打印预留空间，货号居中显示'}
                  </p>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowPdfDialog(false)}
                disabled={isGeneratingPdf}
              >
                取消
              </Button>
              <Button
                onClick={handleExportProductPdf}
                disabled={isGeneratingPdf || selectedProductIds.size === 0}
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
                    开始导出
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImages && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImages(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{previewImages.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewImages(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 图片列表 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewImages.images.map((imageUrl, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`图片 ${index + 1}`}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 底部 */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                共 {previewImages.images.length} 张图片
              </div>
              <Button
                variant="outline"
                onClick={() => setPreviewImages(null)}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 图片重排序对话框 */}
      <ImageReorderDialog
        open={showReorderDialog}
        onOpenChange={setShowReorderDialog}
        products={productsToExport}
        onConfirm={handleConfirmReorder}
        isCalendar={pdfPageSize.startsWith('CALENDAR')}
      />

      {/* 重新生成标题对话框 */}
      <RegenerateTitleDialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        selectedCount={selectedProductIds.size}
        onConfirm={handleConfirmRegenerateTitles}
      />

      {/* 统一导出对话框 */}
      <UnifiedExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title={exportDialogConfig.title}
        description={exportDialogConfig.description}
        productCount={exportDialogConfig.productCount}
        stage={exportDialogConfig.stage}
        currentProject={exportDialogConfig.currentProject}
        totalProjects={exportDialogConfig.totalProjects}
        currentImage={exportDialogConfig.currentImage}
        totalImages={exportDialogConfig.totalImages}
        currentProductName={exportDialogConfig.currentProductName}
        onConfirm={() => {
          const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
          if (exportDialogConfig.title === '导出商品图') {
            executeExportCarouselImages(selectedProducts);
          } else if (exportDialogConfig.title === '导出产品图') {
            executeExportProductImages(selectedProducts);
          }
        }}
        onCancel={() => setShowExportDialog(false)}
      />

    </div>
  );
}