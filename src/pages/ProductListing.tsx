import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, X, Image as ImageIcon, Upload, Clock, Loader2, RotateCcw } from 'lucide-react';
import { productService, type Product, type ListingStep } from '@/services/productService';
import { productCategoryService } from '@/services/productCategoryService';
import { type ProductCategoryWithChildren } from '@/types/productCategory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { temuShopService, type TemuShop } from '@/services/temuShopService';
import { toast } from 'sonner';
import { UnifiedExportDialog } from '@/components/UnifiedExportDialog';
import { SenfanExportDialog } from '@/components/SenfanExportDialog';
import {
  exportCarouselImages as exportCarouselImagesUtil,
  exportProductImages as exportProductImagesUtil
} from '@/utils/productExportUtils';

export function ProductListing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [parentCategories, setParentCategories] = useState<ProductCategoryWithChildren[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [temuShops, setTemuShops] = useState<TemuShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // 森梵物流导出对话框
  const [showSenfanExportDialog, setShowSenfanExportDialog] = useState(false);

  // 重新上架状态
  const [relistLoading, setRelistLoading] = useState(false);

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
  const [productCategoryId, setProductCategoryId] = useState(''); // 产品分类ID
  const [status, setStatus] = useState(''); // 状态筛选
  const [startTime, setStartTime] = useState(''); // 开始时间（datetime-local格式）
  const [endTime, setEndTime] = useState(''); // 结束时间（datetime-local格式）
  const [temuIdType, setTemuIdType] = useState<'spu' | 'skc' | 'sku'>('spu'); // Temu ID类型
  const [temuIdValue, setTemuIdValue] = useState(''); // Temu ID值

  // 图片预览状态
  const [previewImages, setPreviewImages] = useState<{images: string[], title: string} | null>(null);

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
        productCategoryId: productCategoryId || undefined,
        status: status || undefined,
        startTime: startTimestamp,
        endTime: endTimestamp,
        temuIdType: temuIdValue.trim() ? temuIdType : undefined,
        temuIdValue: temuIdValue.trim() || undefined
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

  // 加载产品分类（树形结构）
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await productCategoryService.getCategoryTree();
      setParentCategories(data);
    } catch (error: any) {
      console.error('获取产品分类失败:', error);
      toast.error(error.response?.data?.message || '获取产品分类失败');
    } finally {
      setLoadingCategories(false);
    }
  };

  // 获取当前选中父分类的子分类列表
  const currentChildCategories = React.useMemo(() => {
    const parent = parentCategories.find(p => p.id === selectedParentId);
    return parent?.children || [];
  }, [parentCategories, selectedParentId]);

  // 加载 Temu 店铺
  const fetchTemuShops = async () => {
    try {
      const response = await temuShopService.getAllShops();
      setTemuShops(response.shops);
    } catch (error: any) {
      console.error('获取店铺数据失败:', error);
      // 不显示错误提示，静默失败
    }
  };

  // 初始加载
  useEffect(() => {
    fetchProducts(1);
    fetchCategories();
    fetchTemuShops();
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
    setSelectedParentId('');
    setProductCategoryId('');
    setStatus('');
    setStartTime('');
    setEndTime('');
    setTemuIdType('spu');
    setTemuIdValue('');
    setPageSize(100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'listed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'queued':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'pending':
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'listed':
        return '已上架';
      case 'failed':
        return '上架失败';
      case 'processing':
        return '上架中';
      case 'queued':
        return '排队中';
      case 'pending':
      default:
        return '待处理';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'listed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      case 'queued':
        return 'text-orange-600';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  // 上架步骤名称映射
  const stepNameMap: Record<string, string> = {
    'prepare': '准备',
    'generate_title': '生成标题',
    'upload_images': '上传图片',
    'create_spec': '创建规格',
    'upload_goods': '上传商品',
  };

  // 获取步骤状态图标
  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'pending':
      default:
        return <Clock className="w-3 h-3 text-gray-300" />;
    }
  };

  // 渲染上架步骤进度（带文字说明）
  const renderListingSteps = (steps: ListingStep[] | undefined) => {
    if (!steps || steps.length === 0) return null;

    return (
      <div className="flex items-center gap-0.5 mt-1">
        {steps.map((step, index) => (
          <div
            key={step.step}
            className="flex items-center"
            title={step.error ? step.error : undefined}
          >
            <div className="flex flex-col items-center">
              {getStepStatusIcon(step.status)}
              <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
                {stepNameMap[step.step] || step.step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-2 h-0.5 mx-0.5 mt-[-10px] ${step.status === 'success' ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // 获取失败步骤的错误信息
  const getFailedStepError = (steps: ListingStep[] | undefined): string | null => {
    if (!steps) return null;
    const failedStep = steps.find(s => s.status === 'failed');
    if (failedStep && failedStep.error) {
      return failedStep.error;
    }
    return null;
  };

  // 根据 shopId（数据库UUID）查找店铺名称
  const getShopName = (shopId: string): string => {
    // product.shopId 存的是数据库 UUID（id），不是 Temu 的 shopId
    const shop = temuShops.find(s => s.id === shopId);
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

  // 重新上架失败的商品
  const handleRelist = async () => {
    if (selectedProductIds.size === 0) {
      toast.error('请至少选择一个商品');
      return;
    }

    // 只允许重新上架失败状态的商品
    const selectedProducts = products.filter(p => selectedProductIds.has(p.id));
    const failedProducts = selectedProducts.filter(p => p.status === 'failed');

    if (failedProducts.length === 0) {
      toast.error('没有选中失败状态的商品，只能重新上架失败的商品');
      return;
    }

    if (failedProducts.length !== selectedProducts.length) {
      toast.warning(`已自动过滤 ${selectedProducts.length - failedProducts.length} 个非失败状态的商品`);
    }

    setRelistLoading(true);
    try {
      const response = await productService.relistProducts(failedProducts.map(p => p.id));
      if (response.success) {
        toast.success(response.message);
        // 刷新列表
        fetchProducts(currentPage);
        // 清空选中
        setSelectedProductIds(new Set());
      } else {
        toast.error(response.message);
        if (response.errors && response.errors.length > 0) {
          response.errors.forEach(err => toast.error(err));
        }
      }
    } catch (error) {
      console.error('重新上架失败:', error);
      toast.error(error instanceof Error ? error.message : '重新上架失败');
    } finally {
      setRelistLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">上架记录</h1>
          <p className="text-gray-600">查看商品上架状态</p>
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
            onClick={() => setShowSenfanExportDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            森梵物流导出
          </Button>
          <Button
            onClick={handleRelist}
            variant="outline"
            className="flex items-center gap-2"
            disabled={selectedProductIds.size === 0 || relistLoading}
          >
            <RotateCcw className={`w-4 h-4 ${relistLoading ? 'animate-spin' : ''}`} />
            {relistLoading ? '上架中...' : `重新上架 ${selectedProductIds.size > 0 ? `(${selectedProductIds.size})` : ''}`}
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

          {/* Temu ID搜索（组合组件：下拉+输入框融合） */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Temu ID:</label>
            <div className="flex h-10 rounded-md border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <select
                className="h-full px-3 text-sm bg-transparent border-r border-gray-300 rounded-l-md focus:outline-none w-20"
                value={temuIdType}
                onChange={(e) => setTemuIdType(e.target.value as 'spu' | 'skc' | 'sku')}
              >
                <option value="spu">SPU</option>
                <option value="skc">SKC</option>
                <option value="sku">SKU</option>
              </select>
              <input
                type="text"
                placeholder="输入ID"
                value={temuIdValue}
                onChange={(e) => setTemuIdValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilters();
                  }
                }}
                className="h-full px-3 text-sm bg-transparent border-0 focus:outline-none w-36 rounded-r-md"
              />
            </div>
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
              {temuShops.map(shop => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* 产品分类选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">产品分类:</label>
            {loadingCategories ? (
              <div className="text-sm text-gray-500">加载中...</div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={selectedParentId}
                  onValueChange={(value) => {
                    if (value === '__all__') {
                      setSelectedParentId('');
                      setProductCategoryId('');
                    } else {
                      setSelectedParentId(value);
                      setProductCategoryId('');
                    }
                  }}
                >
                  <SelectTrigger className="w-32 h-10">
                    <SelectValue placeholder="一级分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部</SelectItem>
                    {parentCategories.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={productCategoryId}
                  onValueChange={(value) => {
                    if (value === '__all__') {
                      setProductCategoryId('');
                    } else {
                      setProductCategoryId(value);
                    }
                  }}
                  disabled={!selectedParentId || currentChildCategories.length === 0}
                >
                  <SelectTrigger className="w-32 h-10">
                    <SelectValue placeholder="二级分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部</SelectItem>
                    {currentChildCategories.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 状态选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">状态:</label>
            <select
              className="h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-28"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">全部</option>
              <option value="pending">待处理</option>
              <option value="queued">排队中</option>
              <option value="processing">上架中</option>
              <option value="listed">已上架</option>
              <option value="failed">上架失败</option>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">预览图</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品信息</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">货号/店铺</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[280px]">错误信息</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
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
                      <td className="px-4 py-3">
                        {product.previewImage ? (
                          <img
                            src={product.previewImage}
                            alt="预览图"
                            className="w-14 h-14 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded border flex items-center justify-center">
                            <span className="text-gray-400 text-xs">无图片</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-[280px] max-w-[400px]">
                          <div className="text-sm font-medium text-gray-900">
                            {product.nameZh || '未生成标题'}
                          </div>
                          {product.nameEn && (
                            <div className="text-xs text-gray-500 mt-1">
                              {product.nameEn}
                            </div>
                          )}
                          {product.categoryName && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">{product.categoryName}</Badge>
                            </div>
                          )}
                          {(product.productId || product.temuSkcId || product.temuSkuId) && (
                            <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                              {product.productId && <div>SPU: {product.productId}</div>}
                              {product.temuSkcId && <div>SKC: {product.temuSkcId}</div>}
                              {product.temuSkuId && <div>SKU: {product.temuSkuId}</div>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-900">
                        <div className="space-y-0.5">
                          <div><span className="text-gray-500">店铺:</span> {getShopName(product.shopId) || '-'}</div>
                          <div><span className="text-gray-500">老货号:</span> {product.productCode || '-'}</div>
                          <div><span className="text-gray-500">新货号:</span> {product.newProductCode || '-'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {getStatusIcon(product.status)}
                          <span className={`ml-2 text-xs font-medium ${getStatusColor(product.status)}`}>
                            {getStatusText(product.status)}
                          </span>
                        </div>
                        {/* 上架步骤进度（带文字说明） */}
                        {renderListingSteps(product.listingLog?.steps)}
                      </td>
                      <td className="px-4 py-3 text-xs min-w-[280px]">
                        {/* 错误信息列 */}
                        {(() => {
                          const stepError = getFailedStepError(product.listingLog?.steps);
                          const error = stepError || product.errorMessage;
                          if (!error) return <span className="text-gray-400">-</span>;
                          return (
                            <div className="text-red-500" title={error}>
                              <div className="line-clamp-4">
                                {error}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(product.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewCarouselImages(product)}
                            className="h-6 px-2 text-blue-500 hover:text-blue-700 text-xs"
                          >
                            商品图
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewProductImages(product)}
                            className="h-6 px-2 text-green-600 hover:text-green-700 text-xs"
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

      {/* 森梵物流导出对话框 */}
      <SenfanExportDialog
        open={showSenfanExportDialog}
        onOpenChange={setShowSenfanExportDialog}
        getShopName={getShopName}
      />

    </div>
  );
}