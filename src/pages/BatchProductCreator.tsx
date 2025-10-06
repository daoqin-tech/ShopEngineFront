import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-picker';
import { ArrowLeft, Store, Sparkles, Images, Image as ImageIcon, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEMU_SHOPS } from '@/types/shop';
import { coverProjectService, type TaskInfo, type TemplateSearchItem } from '@/services/coverProjectService';
import { productService } from '@/services/productService';
import { toast } from 'sonner';

// 商品信息表单数据
interface ProductFormData {
  shopAccount: string;        // 店铺账号
  titleChinese: string;      // 产品标题（中文）
  titleEnglish: string;      // 英文标题
  origin: string;            // 产地
}

// 选中的商品项
interface SelectedProduct {
  id: string;                // 唯一ID
  taskId: string;           // 任务ID
  templateName: string;     // 模板名称
  imageUrl: string;         // 商品图URL
  thumbnailUrl?: string;    // 缩略图URL
  createdAt: string;        // 创建时间
}

// 商品图信息
interface ProductImage {
  taskId: string;
  templateName: string;
  images: string[];
  thumbnail?: string;
  createdAt: string;
}

interface BatchProductCreatorProps {}



export function BatchProductCreator({}: BatchProductCreatorProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>({
    shopAccount: '',
    titleChinese: '',
    titleEnglish: '',
    origin: '中国-湖北省',
  });

  const [availableImages, setAvailableImages] = useState<ProductImage[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewImages, setPreviewImages] = useState<{ taskId: string; templateName: string; images: string[] } | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(100);

  // 筛选状态
  const [templateFilter, setTemplateFilter] = useState('');
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();

  // 模板搜索选项状态
  const [templatesForSearch, setTemplatesForSearch] = useState<TemplateSearchItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // 获取可用的商品图（来自CoverGeneration）
  const fetchAvailableImages = async (page: number = currentPage) => {
    try {
      setLoading(true);

      const params: any = {
        page,
        limit: pageSize
      };

      // 添加模板筛选
      if (templateFilter && templateFilter !== 'all') {
        params.templateId = templateFilter;
      }

      // 添加时间筛选（转换为时间戳）
      if (startTime) {
        params.startTime = Math.floor(startTime.getTime() / 1000);
      }

      if (endTime) {
        params.endTime = Math.floor(endTime.getTime() / 1000);
      }

      const response = await coverProjectService.getAllCovers(params);

      const imageList: ProductImage[] = response.data
        ?.filter((task: TaskInfo) => task.status === 'completed' && task.resultImages?.length)
        .map((task: TaskInfo) => ({
          taskId: task.taskId,
          templateName: task.templateName || '未知模板',
          images: task.resultImages || [],
          thumbnail: task.thumbnail,
          createdAt: task.createdAt
        })) || [];

      setAvailableImages(imageList);
      setTotal(response.total || 0);
      setCurrentPage(response.page || page);
    } catch (error) {
      console.error('获取商品图失败:', error);
      toast.error('获取商品图失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取模板搜索选项
  const fetchTemplatesForSearch = async () => {
    try {
      setLoadingTemplates(true);
      const templates = await coverProjectService.getTemplatesForSearch();
      setTemplatesForSearch(templates);
    } catch (err) {
      console.error('Error fetching templates for search:', err);
      toast.error('加载模板选项失败');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 应用筛选
  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchAvailableImages(1);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setTemplateFilter('');
    setStartTime(undefined);
    setEndTime(undefined);
    setCurrentPage(1);
    fetchAvailableImages(1);
  };

  // 初始化时加载数据
  React.useEffect(() => {
    fetchAvailableImages(1);
    fetchTemplatesForSearch();
  }, []);

  // 更新表单数据
  const updateFormData = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 切换商品选择状态
  const toggleProductSelection = (taskId: string, templateName: string, imageUrl: string, createdAt: string) => {
    const productId = `${taskId}-${imageUrl}`;
    const isSelected = selectedProducts.some(p => p.id === productId);

    if (isSelected) {
      // 取消选择
      setSelectedProducts(prev => prev.filter(p => p.id !== productId));
      toast.info('已取消选择该商品图');
    } else {
      // 选择商品
      const newProduct: SelectedProduct = {
        id: productId,
        taskId,
        templateName,
        imageUrl,
        createdAt
      };
      setSelectedProducts(prev => [...prev, newProduct]);
      toast.success('已选择该商品图');
    }
  };


  // 清空所有选择
  const clearAllSelections = () => {
    setSelectedProducts([]);
    toast.info('已清空所有选择');
  };

  // 全选功能
  const toggleSelectAll = () => {
    // 获取所有可选择的商品
    const allSelectableProducts: SelectedProduct[] = [];
    availableImages.forEach(imageSet => {
      imageSet.images.forEach(imageUrl => {
        allSelectableProducts.push({
          id: `${imageSet.taskId}-${imageUrl}`,
          taskId: imageSet.taskId,
          templateName: imageSet.templateName,
          imageUrl,
          createdAt: imageSet.createdAt
        });
      });
    });

    const allSelected = allSelectableProducts.every(product =>
      selectedProducts.some(p => p.id === product.id)
    );

    if (allSelected) {
      // 取消全选
      setSelectedProducts([]);
      toast.info('已取消全选');
    } else {
      // 全选
      const newProducts = allSelectableProducts.filter(product =>
        !selectedProducts.some(p => p.id === product.id)
      );
      setSelectedProducts([...selectedProducts, ...newProducts]);
      toast.success(`已全选 ${allSelectableProducts.length} 个商品`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <h1 className="text-2xl font-bold">批量新建商品</h1>
            </div>
            <div className="flex items-center gap-4">
              {selectedProducts.length > 0 && (
                <span className="text-sm text-gray-600">
                  已选择 {selectedProducts.length} 个商品
                </span>
              )}
              <Button
                onClick={async () => {
                  const selectedShop = TEMU_SHOPS.find(shop => shop.id === formData.shopAccount);
                  if (!selectedShop) {
                    toast.error('请选择店铺');
                    return;
                  }

                  // 获取所有已选任务的唯一taskId列表
                  const taskIds = Array.from(new Set(selectedProducts.map(p => p.taskId)));

                  const submitData = {
                    shopId: selectedShop.shopId,
                    shopAccount: selectedShop.account,
                    categoryId: selectedShop.categoryId,
                    categoryName: selectedShop.categoryName,
                    origin: formData.origin,
                    freightTemplateId: selectedShop.freightTemplateId,
                    freightTemplateName: selectedShop.freightTemplateName,
                    operatingSite: selectedShop.operatingSite,
                    length: selectedShop.length,
                    width: selectedShop.width,
                    height: selectedShop.height,
                    weight: selectedShop.weight,
                    declaredPrice: selectedShop.declaredPrice,
                    suggestedRetailPrice: selectedShop.suggestedRetailPrice,
                    variantName: selectedShop.variantName,
                    variantAttributeName1: selectedShop.variantAttributeName1,
                    variantAttributeValue1: selectedShop.variantAttributeValue1,
                    stock: selectedShop.stock,
                    shippingTime: selectedShop.shippingTime,
                    productCodePrefix: selectedShop.productCodePrefix,
                    taskIds
                  };

                  try {
                    setCreating(true);
                    await productService.batchCreate(submitData);

                    // 创建成功后直接跳转到商品列表页
                    toast.success(`已提交 ${taskIds.length} 个商品的创建任务`);
                    navigate('/workspace/batch-upload');
                  } catch (error: any) {
                    console.error('批量创建商品失败:', error);
                    toast.error(error.response?.data?.message || '批量创建商品失败');
                    setCreating(false);
                  }
                }}
                disabled={creating || !formData.shopAccount || selectedProducts.length === 0}
                className="min-w-24"
              >
                {creating ? '创建中...' : `创建商品 (${selectedProducts.length})`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 - 卡片分组布局 */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* 1. 基本信息卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
              <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">商品标题将由AI自动生成</span>
              </div>
            </div>
            {/* 店铺选择 */}
            <div className="space-y-2 mb-6">
              <Label htmlFor="shopAccount" className="text-base font-medium text-gray-700">店铺账号 *</Label>
              <Select value={formData.shopAccount} onValueChange={(value) => updateFormData('shopAccount', value)}>
                <SelectTrigger className="w-full h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-200">
                  <SelectValue placeholder="选择店铺账号" />
                </SelectTrigger>
                <SelectContent>
                  {TEMU_SHOPS
                    .sort((a, b) => {
                      // 有描述的在前面
                      if (a.description && !b.description) return -1;
                      if (!a.description && b.description) return 1;
                      // 都有描述或都没有描述时，按名称排序
                      return a.name.localeCompare(b.name);
                    })
                    .map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 店铺详细信息（选中店铺后显示） */}
            {formData.shopAccount && (() => {
              const selectedShop = TEMU_SHOPS.find(shop => shop.id === formData.shopAccount);
              if (!selectedShop) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 店铺描述 */}
                  {selectedShop.description && (
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">店铺描述</Label>
                      <div className="text-sm text-gray-900">{selectedShop.description}</div>
                    </div>
                  )}

                  {/* 产品分类 */}
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">产品分类</Label>
                    <div className="text-sm text-gray-900">
                      {selectedShop.categoryName || '暂无分类信息'}
                    </div>
                  </div>

                  {/* 产地 */}
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">产地</Label>
                    <div className="text-sm text-gray-900">中国-湖北省</div>
                  </div>

                  {selectedShop.freightTemplateId && (
                    <>
                      {/* 运费模板 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">运费模板</Label>
                        <div className="text-sm text-gray-900">{selectedShop.freightTemplateName}</div>
                        <div className="text-xs text-gray-500">{selectedShop.freightTemplateId}</div>
                      </div>

                      {/* 经营站点 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">经营站点</Label>
                        <div className="text-sm text-gray-900">{selectedShop.operatingSite}</div>
                      </div>

                      {/* 发货时效 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">发货时效</Label>
                        <div className="text-sm text-gray-900">{selectedShop.shippingTime} 天</div>
                      </div>

                      {/* 商品尺寸 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">商品尺寸 (长×宽×高)</Label>
                        <div className="text-sm text-gray-900">
                          {selectedShop.length} × {selectedShop.width} × {selectedShop.height} cm
                        </div>
                      </div>

                      {/* 商品重量 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">商品重量</Label>
                        <div className="text-sm text-gray-900">{selectedShop.weight} g</div>
                      </div>

                      {/* 价格 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">申报价格 / 建议零售价</Label>
                        <div className="text-sm text-gray-900">
                          ¥{selectedShop.declaredPrice} / ${selectedShop.suggestedRetailPrice}
                        </div>
                      </div>

                      {/* 变种名称 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">变种名称</Label>
                        <div className="text-sm text-gray-900">{selectedShop.variantName}</div>
                      </div>

                      {/* 变种属性 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">变种属性</Label>
                        <div className="text-sm text-gray-900">
                          {selectedShop.variantAttributeName1}: {selectedShop.variantAttributeValue1}
                        </div>
                      </div>

                      {/* 库存 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">库存</Label>
                        <div className="text-sm text-gray-900">{selectedShop.stock?.toLocaleString()}</div>
                      </div>

                      {/* 货号前缀 */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-600">货号前缀</Label>
                        <div className="text-sm text-gray-900">{selectedShop.productCodePrefix}</div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 2. 商品图选择卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                  <Images className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">选择商品图片</h2>
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
                  <ImageIcon className="w-4 h-4" />
                  <span className="font-medium">一个任务的多张图片对应一个商品</span>
                </div>
              </div>
              {selectedProducts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllSelections}
                  className="text-gray-600 hover:text-red-600 hover:border-red-300"
                >
                  清空选择
                </Button>
              )}
            </div>

            {/* 筛选器 */}
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">模板:</label>
                  <Select
                    value={templateFilter || undefined}
                    onValueChange={(value) => setTemplateFilter(value || '')}
                    disabled={loadingTemplates}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="全部模板" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部模板</SelectItem>
                      {templatesForSearch.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
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

            {/* 任务列表容器 - 可滚动 */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">加载中...</div>
                </div>
              ) : availableImages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Images className="w-12 h-12 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-600 mb-2">还没有可用的商品图</h2>
                    <p className="text-gray-500 mb-6">请先在套图生成页面生成商品图</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto">
                  <div className="bg-white border-l border-r">
                    {/* 表头 */}
                    <div className="grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-5">
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          checked={(() => {
                            const allSelectableProducts: SelectedProduct[] = [];
                            availableImages.forEach(imageSet => {
                              imageSet.images.forEach(imageUrl => {
                                allSelectableProducts.push({
                                  id: `${imageSet.taskId}-${imageUrl}`,
                                  taskId: imageSet.taskId,
                                  templateName: imageSet.templateName,
                                  imageUrl,
                                  createdAt: imageSet.createdAt
                                });
                              });
                            });
                            return allSelectableProducts.length > 0 && allSelectableProducts.every(product =>
                              selectedProducts.some(p => p.id === product.id)
                            );
                          })()}
                          onChange={toggleSelectAll}
                        />
                      </div>
                      <div className="col-span-1">缩略图</div>
                      <div className="col-span-3">模板名称</div>
                      <div className="col-span-2">图片数量</div>
                      <div className="col-span-3">创建时间</div>
                      <div className="col-span-2">操作</div>
                    </div>

                    {/* 任务列表 */}
                    {availableImages.map((imageSet) => {
                      // 计算该任务下有多少图片被选中
                      const taskSelectedCount = imageSet.images.filter(imageUrl =>
                        selectedProducts.some(p => p.id === `${imageSet.taskId}-${imageUrl}`)
                      ).length;
                      const allTaskImagesSelected = taskSelectedCount === imageSet.images.length;

                      return (
                        <div
                          key={imageSet.taskId}
                          className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 group"
                        >
                          {/* 选择框 - 全选该任务的所有图片 */}
                          <div className="col-span-1 flex items-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                              checked={allTaskImagesSelected}
                              onChange={() => {
                                if (allTaskImagesSelected) {
                                  // 取消选择该任务的所有图片
                                  setSelectedProducts(prev =>
                                    prev.filter(p => !imageSet.images.some(img => p.id === `${imageSet.taskId}-${img}`))
                                  );
                                  toast.info('已取消选择该任务的所有图片');
                                } else {
                                  // 选择该任务的所有图片
                                  const newProducts = imageSet.images.map(imageUrl => ({
                                    id: `${imageSet.taskId}-${imageUrl}`,
                                    taskId: imageSet.taskId,
                                    templateName: imageSet.templateName,
                                    imageUrl,
                                    createdAt: imageSet.createdAt
                                  })).filter(product =>
                                    !selectedProducts.some(p => p.id === product.id)
                                  );
                                  setSelectedProducts(prev => [...prev, ...newProducts]);
                                  toast.success(`已选择 ${imageSet.images.length} 张图片`);
                                }
                              }}
                            />
                          </div>

                          {/* 缩略图 */}
                          <div className="col-span-1 flex items-center">
                            <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                              {imageSet.thumbnail || imageSet.images[0] ? (
                                <img
                                  src={imageSet.thumbnail || imageSet.images[0]}
                                  alt={imageSet.templateName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 模板名称 */}
                          <div className="col-span-3 flex items-center">
                            <div className="text-sm text-gray-700 truncate" title={imageSet.templateName}>
                              {imageSet.templateName}
                              {taskSelectedCount > 0 && (
                                <span className="ml-2 text-xs text-blue-600">
                                  (已选 {taskSelectedCount}/{imageSet.images.length})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 图片数量 */}
                          <div className="col-span-2 flex items-center">
                            <span className="text-sm text-gray-600">{imageSet.images.length} 张图片</span>
                          </div>

                          {/* 创建时间 - 精确到秒 */}
                          <div className="col-span-3 flex items-center text-sm text-gray-500">
                            {new Date(imageSet.createdAt).toLocaleString('zh-CN')}
                          </div>

                          {/* 操作 */}
                          <div className="col-span-2 flex items-center justify-start">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-blue-500 hover:text-blue-700 text-xs"
                                onClick={() => setPreviewImages({
                                  taskId: imageSet.taskId,
                                  templateName: imageSet.templateName,
                                  images: imageSet.images
                                })}
                              >
                                预览
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 分页控件 */}
            {total > 0 && (
              <div className="border-t bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    共 {total} 个任务，第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
                  </div>

                  {total > pageSize && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAvailableImages(currentPage - 1)}
                        disabled={currentPage <= 1 || loading}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        上一页
                      </Button>

                      <div className="text-sm text-gray-600">
                        {currentPage} / {Math.ceil(total / pageSize)}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAvailableImages(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(total / pageSize) || loading}
                      >
                        下一页
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 图片预览对话框 */}
      {previewImages && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
          onClick={() => setPreviewImages(null)}
        >
          <div
            className="relative w-[90vw] max-w-6xl bg-white rounded-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                {previewImages.templateName} - 共 {previewImages.images.length} 张图片
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewImages(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                {previewImages.images.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square bg-gray-100 rounded overflow-hidden border-2 border-gray-200">
                      <img
                        src={imageUrl}
                        alt={`${previewImages.templateName} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center mt-2 text-sm text-gray-600">
                      第 {index + 1} 张
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}