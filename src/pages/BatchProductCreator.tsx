import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-picker';
import { Sparkles, Images, Image as ImageIcon, X, ChevronLeft, ChevronRight, Package, Info, Tag, Ruler } from 'lucide-react';
import { temuShopService, type TemuShop } from '@/services/temuShopService';
import { temuTemplateService, type TemuTemplate } from '@/services/temuTemplateService';
import { coverProjectService, type TaskInfo } from '@/services/coverProjectService';
import { productService } from '@/services/productService';
import { productCategoryService } from '@/services/productCategoryService';
import type { ProductCategoryWithChildren } from '@/types/productCategory';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 商品信息表单数据
interface ProductFormData {
  shopAccount: string;        // 店铺账号
  productSpec: string;        // 商品规格ID
  productCategory: string;    // 商品分类ID
  titleChinese: string;      // 产品标题（中文）
  titleEnglish: string;      // 英文标题
  origin: string;            // 产地
}

// 选中的商品项
interface SelectedProduct {
  id: string;                // 唯一ID
  taskId: string;           // 任务ID
  categoryName: string;     // 产品分类名称
  imageUrl: string;         // 商品图URL
  thumbnailUrl?: string;    // 缩略图URL
  createdAt: string;        // 创建时间
}

// 商品图信息
interface ProductImage {
  taskId: string;
  categoryName: string;
  images: string[];
  thumbnail?: string;
  createdAt: string;
}

interface BatchProductCreatorProps {}



export function BatchProductCreator({}: BatchProductCreatorProps) {
  // Temu 店铺数据
  const [temuShops, setTemuShops] = useState<TemuShop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  // Temu 模板数据（从本地数据库）
  const [allTemuTemplates, setAllTemuTemplates] = useState<TemuTemplate[]>([]);
  const [loadingTemuTemplates, setLoadingTemuTemplates] = useState(false);

  // 数据库分类数据
  const [parentCategories, setParentCategories] = useState<ProductCategoryWithChildren[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  // 表单数据（需要在 useMemo 之前声明）
  const [formData, setFormData] = useState<ProductFormData>({
    shopAccount: '',
    productSpec: '',
    productCategory: '',
    titleChinese: '',
    titleEnglish: '',
    origin: '中国-湖北省',
  });

  // 获取当前选中父分类的子分类列表
  const currentChildCategories = React.useMemo(() => {
    const parent = parentCategories.find(p => p.id === selectedParentId);
    return parent?.children || [];
  }, [parentCategories, selectedParentId]);

  // 根据选中的二级分类过滤 Temu 模板
  const filteredTemuTemplates = React.useMemo(() => {
    if (!selectedParentId || !formData.productSpec) return [];
    const parent = parentCategories.find(p => p.id === selectedParentId);
    const selectedChild = parent?.children?.find(c => c.id === formData.productSpec);
    if (!selectedChild?.temuTemplateIds || selectedChild.temuTemplateIds.length === 0) {
      return [];
    }
    // 过滤出该分类关联的模板
    return allTemuTemplates.filter(t => selectedChild.temuTemplateIds!.includes(t.id));
  }, [allTemuTemplates, selectedParentId, formData.productSpec, parentCategories]);

  // 获取选中的 Temu 模板详情
  const selectedTemuTemplate = React.useMemo(() => {
    if (!formData.productCategory) return null;
    return allTemuTemplates.find(t => t.id === formData.productCategory) || null;
  }, [allTemuTemplates, formData.productCategory]);


  // 加载 Temu 店铺数据
  useEffect(() => {
    const loadShops = async () => {
      try {
        setLoadingShops(true);
        const response = await temuShopService.getAllShops(true); // 只获取激活的店铺
        setTemuShops(response.shops);
      } catch (error) {
        console.error('Failed to load shops:', error);
        toast.error('加载店铺数据失败');
      } finally {
        setLoadingShops(false);
      }
    };
    loadShops();
  }, []);

  // 加载数据库分类
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await productCategoryService.getCategoryTree();
        setParentCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
        toast.error('加载分类数据失败');
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // 加载所有 Temu 模板（从本地数据库）
  useEffect(() => {
    const loadTemuTemplatesFromDB = async () => {
      try {
        setLoadingTemuTemplates(true);
        const response = await temuTemplateService.getAllTemplates(true, true); // activeOnly=true, leafOnly=true
        setAllTemuTemplates(response.templates || []);
      } catch (error) {
        console.error('Failed to load temu templates:', error);
        setAllTemuTemplates([]);
      } finally {
        setLoadingTemuTemplates(false);
      }
    };
    loadTemuTemplatesFromDB();
  }, []);


  const [availableImages, setAvailableImages] = useState<ProductImage[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewImages, setPreviewImages] = useState<{ taskId: string; categoryName: string; images: string[] } | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState<number | ''>(100);
  const [jumpPage, setJumpPage] = useState('');

  // 筛选状态
  const [filterParentId, setFilterParentId] = useState('');  // 筛选用的一级分类
  const [categoryFilter, setCategoryFilter] = useState('');  // 筛选用的二级分类（可选）
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();

  // 获取筛选用的子分类列表
  const filterChildCategories = React.useMemo(() => {
    if (!filterParentId) return [];
    const parent = parentCategories.find(p => p.id === filterParentId);
    return parent?.children || [];
  }, [parentCategories, filterParentId]);

  // 获取可用的商品图（来自CoverGeneration）
  const fetchAvailableImages = async (page: number = currentPage) => {
    try {
      setLoading(true);

      const params: any = {
        page,
        limit: pageSize || 100
      };

      // 添加产品分类筛选（优先使用二级分类，否则用一级分类）
      const effectiveCategoryId = categoryFilter || filterParentId;
      if (effectiveCategoryId && effectiveCategoryId !== 'all') {
        params.categoryId = effectiveCategoryId;
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
          categoryName: task.categoryName || '未分类',
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

  // 应用筛选
  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchAvailableImages(1);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilterParentId('');
    setCategoryFilter('');
    setStartTime(undefined);
    setEndTime(undefined);
    setCurrentPage(1);
    fetchAvailableImages(1);
  };

  // 初始化时加载数据
  React.useEffect(() => {
    fetchAvailableImages(1);
  }, []);

  // 更新表单数据
  const updateFormData = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 清空所有选择
  const clearAllSelections = () => {
    setSelectedProducts([]);
  };

  // 全选功能 - 一个任务 = 一个商品
  const toggleSelectAll = () => {
    // 获取所有可选择的商品（每个任务对应一个商品）
    const allSelectableProducts: SelectedProduct[] = availableImages.map(imageSet => ({
      id: imageSet.taskId,
      taskId: imageSet.taskId,
      categoryName: imageSet.categoryName,
      imageUrl: imageSet.images[0] || '', // 使用第一张图作为代表
      thumbnailUrl: imageSet.thumbnail,
      createdAt: imageSet.createdAt
    }));

    const allSelected = allSelectableProducts.every(product =>
      selectedProducts.some(p => p.taskId === product.taskId)
    );

    if (allSelected) {
      // 取消全选
      setSelectedProducts([]);
    } else {
      // 全选 - 只添加未选中的任务
      const newProducts = allSelectableProducts.filter(product =>
        !selectedProducts.some(p => p.taskId === product.taskId)
      );
      setSelectedProducts([...selectedProducts, ...newProducts]);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">创建商品</h1>
            </div>
            <div className="flex items-center gap-4">
              {selectedProducts.length > 0 && (
                <span className="text-sm text-gray-600">
                  已选择 {selectedProducts.length} 个商品
                </span>
              )}
              <Button
                onClick={async () => {
                  const selectedShop = temuShops.find(shop => shop.id === formData.shopAccount);
                  if (!selectedShop) {
                    toast.error('请选择店铺');
                    return;
                  }

                  // 从数据库分类中获取选中的子分类（商品规格）
                  const selectedChildCategory = currentChildCategories.find(cat => cat.id === formData.productSpec);
                  if (!selectedChildCategory) {
                    toast.error('请选择商品规格');
                    return;
                  }

                  // 从模板列表中查找选中的 Temu 模板
                  const selectedTemuTemplate = allTemuTemplates.find(t => t.id === formData.productCategory);
                  if (!selectedTemuTemplate) {
                    toast.error('请选择Temu模板');
                    return;
                  }

                  // 获取所有已选任务的唯一taskId列表
                  const taskIds = Array.from(new Set(selectedProducts.map(p => p.taskId)));

                  // 简化版请求：大部分信息从数据库（店铺、Temu模板、产品分类）自动获取
                  const submitData = {
                    shopId: selectedShop.id,        // 使用店铺的数据库ID（而非平台shopId）
                    taskIds,
                    enableListing: true,            // 启用上架
                    temuTemplateId: selectedTemuTemplate.id,  // Temu 模板 ID
                  };

                  try {
                    setCreating(true);
                    await productService.batchCreate(submitData);

                    // 任务已提交成功，停留在当前页面
                    toast.success(
                      `已提交 ${taskIds.length} 个商品的创建任务，正在后台处理中...`,
                      {
                        description: '商品标题由AI生成，请在商品列表查看进度',
                        duration: 5000
                      }
                    );

                    // 成功后恢复按钮状态
                    setCreating(false);
                  } catch (error: any) {
                    console.error('批量创建商品失败:', error);
                    toast.error(error.response?.data?.message || '创建商品失败，请重试');
                    // 失败后恢复按钮状态
                    setCreating(false);
                  }
                }}
                disabled={creating || !formData.shopAccount || !selectedParentId || !formData.productSpec || !formData.productCategory || selectedProducts.length === 0}
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
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
              <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">商品标题将由AI自动生成</span>
              </div>
            </div>

            {/* 店铺选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">店铺账号 *</Label>
              {loadingShops ? (
                <div className="text-sm text-muted-foreground">加载店铺中...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {temuShops.map((shop) => (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => {
                        updateFormData('shopAccount', shop.id);
                        // 切换店铺时清空规格和分类选择
                        updateFormData('productSpec', '');
                        updateFormData('productCategory', '');
                      }}
                      className={`
                        px-3 py-1.5 rounded-md border text-sm transition-colors
                        ${formData.shopAccount === shop.id
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                        }
                      `}
                    >
                      {shop.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 产品分类选择（选中店铺后显示） - 一级分类 + 二级分类 */}
            {formData.shopAccount && (
              <div className="space-y-3 pt-4">
                <Label className="text-sm font-medium">产品分类 *</Label>
                {loadingCategories ? (
                  <div className="text-sm text-muted-foreground">加载中...</div>
                ) : (
                  <div className="flex gap-3">
                    <Select
                      value={selectedParentId}
                      onValueChange={(value) => {
                        setSelectedParentId(value);
                        // 自动选择第一个二级分类
                        const parent = parentCategories.find(p => p.id === value);
                        const firstChild = parent?.children?.[0];
                        if (firstChild) {
                          updateFormData('productSpec', firstChild.id);
                        } else {
                          updateFormData('productSpec', '');
                        }
                        updateFormData('productCategory', '');
                      }}
                    >
                      <SelectTrigger className="w-48 h-10">
                        <SelectValue placeholder="请选择一级分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentCategories.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={formData.productSpec}
                      onValueChange={(value) => updateFormData('productSpec', value)}
                      disabled={!selectedParentId || currentChildCategories.length === 0}
                    >
                      <SelectTrigger className="w-48 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
            )}

            {/* Temu模板选择（选中二级分类后显示） */}
            {formData.productSpec && (
              <div className="space-y-3 pt-4">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Temu模板 *
                </Label>
                {loadingTemuTemplates ? (
                  <div className="text-sm text-muted-foreground">加载Temu模板中...</div>
                ) : filteredTemuTemplates.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-orange-600">
                    该分类未关联Temu模板，请在产品分类管理中配置
                  </div>
                ) : (
                  <Select
                    value={formData.productCategory || undefined}
                    onValueChange={(value) => updateFormData('productCategory', value)}
                  >
                    <SelectTrigger className="w-96 h-10">
                      <SelectValue placeholder="请选择Temu模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemuTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name || template.fullPath || template.catName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* 选中模板的详细信息展示 */}
            {selectedTemuTemplate && (
              <div className="mt-6 border rounded-lg bg-blue-50/50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-100/50 border-b">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">模板详情</span>
                </div>
                <div className="p-4 space-y-4">
                  {/* 分类路径 */}
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Temu分类路径</div>
                      <div className="text-sm text-gray-800 font-medium">
                        {selectedTemuTemplate.fullPath || selectedTemuTemplate.catName}
                      </div>
                    </div>
                  </div>

                  {/* 商品属性 */}
                  {selectedTemuTemplate.productAttributes && selectedTemuTemplate.productAttributes.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-2">商品属性</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemuTemplate.productAttributes.map((attr, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 bg-white border rounded text-xs"
                            >
                              <span className="text-gray-500">{attr.propName}:</span>
                              <span className="ml-1 text-gray-800 font-medium">
                                {attr.propValue}
                                {attr.valueUnit && <span className="text-gray-400 ml-0.5">{attr.valueUnit}</span>}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 规格配置 */}
                  {selectedTemuTemplate.specifications && selectedTemuTemplate.specifications.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-2">规格配置</div>
                        <div className="space-y-2">
                          {selectedTemuTemplate.specifications.map((spec, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                {spec.parentSpecName}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {spec.specValues.map((value, vIndex) => (
                                  <span
                                    key={vIndex}
                                    className="text-xs bg-white border px-2 py-0.5 rounded"
                                  >
                                    {value.specName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SKU默认配置 - 从 volumeWeightConfigs 读取 */}
                  {selectedTemuTemplate.skuDefaultConfig?.volumeWeightConfigs && selectedTemuTemplate.skuDefaultConfig.volumeWeightConfigs.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Ruler className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-2">SKU默认配置</div>
                        {selectedTemuTemplate.skuDefaultConfig.volumeWeightConfigs.map((config, index) => (
                          <div key={index} className="mb-3 last:mb-0">
                            {config.specValues && config.specValues.length > 0 && (
                              <div className="text-xs text-gray-600 mb-2">
                                规格: {config.specValues.join(' / ')}
                              </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              {/* 尺寸 */}
                              {(config.longestSide || config.middleSide || config.shortestSide) && (
                                <div className="bg-white border rounded p-2">
                                  <div className="text-xs text-gray-400 mb-1">尺寸 (长×宽×高)</div>
                                  <div className="text-sm font-medium text-gray-800">
                                    {(config.longestSide / 10).toFixed(1)} × {(config.middleSide / 10).toFixed(1)} × {(config.shortestSide / 10).toFixed(1)} cm
                                  </div>
                                </div>
                              )}
                              {/* 重量 */}
                              {config.weight !== undefined && (
                                <div className="bg-white border rounded p-2">
                                  <div className="text-xs text-gray-400 mb-1">重量</div>
                                  <div className="text-sm font-medium text-gray-800">
                                    {config.weight} g
                                  </div>
                                </div>
                              )}
                              {/* 申报价格 */}
                              {config.supplierPrice !== undefined && (
                                <div className="bg-white border rounded p-2">
                                  <div className="text-xs text-gray-400 mb-1">申报价格</div>
                                  <div className="text-sm font-medium text-gray-800">
                                    ¥{config.supplierPrice.toFixed(2)}
                                  </div>
                                </div>
                              )}
                              {/* 建议零售价 */}
                              {config.suggestedPrice !== undefined && (
                                <div className="bg-white border rounded p-2">
                                  <div className="text-xs text-gray-400 mb-1">建议零售价</div>
                                  <div className="text-sm font-medium text-gray-800">
                                    ${config.suggestedPrice.toFixed(2)}
                                  </div>
                                </div>
                              )}
                              {/* 默认库存 */}
                              {config.stockQuantity !== undefined && (
                                <div className="bg-white border rounded p-2">
                                  <div className="text-xs text-gray-400 mb-1">库存</div>
                                  <div className="text-sm font-medium text-gray-800">
                                    {config.stockQuantity}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">产品分类:</label>
                  <Select
                    value={filterParentId || undefined}
                    onValueChange={(value) => {
                      setFilterParentId(value === 'all' ? '' : value || '');
                      setCategoryFilter(''); // 切换一级分类时清空二级分类
                    }}
                    disabled={loadingCategories}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="一级分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectSeparator />
                      {parentCategories.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={categoryFilter || undefined}
                    onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value || '')}
                    disabled={!filterParentId || filterChildCategories.length === 0}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="二级分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectSeparator />
                      {filterChildCategories.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name}
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
                          checked={availableImages.length > 0 && availableImages.every(imageSet =>
                            selectedProducts.some(p => p.taskId === imageSet.taskId)
                          )}
                          onChange={toggleSelectAll}
                        />
                      </div>
                      <div className="col-span-1">缩略图</div>
                      <div className="col-span-3">产品分类</div>
                      <div className="col-span-2">图片数量</div>
                      <div className="col-span-3">创建时间</div>
                      <div className="col-span-2">操作</div>
                    </div>

                    {/* 任务列表 */}
                    {availableImages.map((imageSet) => {
                      // 检查该任务是否被选中（一个任务 = 一个商品）
                      const isTaskSelected = selectedProducts.some(p => p.taskId === imageSet.taskId);

                      return (
                        <div
                          key={imageSet.taskId}
                          className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 group"
                        >
                          {/* 选择框 - 选择该任务作为一个商品 */}
                          <div className="col-span-1 flex items-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                              checked={isTaskSelected}
                              onChange={() => {
                                if (isTaskSelected) {
                                  // 取消选择该任务
                                  setSelectedProducts(prev =>
                                    prev.filter(p => p.taskId !== imageSet.taskId)
                                  );
                                } else {
                                  // 选择该任务（作为一个商品）
                                  const newProduct: SelectedProduct = {
                                    id: imageSet.taskId,
                                    taskId: imageSet.taskId,
                                    categoryName: imageSet.categoryName,
                                    imageUrl: imageSet.images[0] || '',
                                    thumbnailUrl: imageSet.thumbnail,
                                    createdAt: imageSet.createdAt
                                  };
                                  setSelectedProducts(prev => [...prev, newProduct]);
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
                                  alt={imageSet.categoryName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 产品分类 */}
                          <div className="col-span-3 flex items-center">
                            <div className="text-sm text-gray-700 truncate" title={imageSet.categoryName}>
                              {imageSet.categoryName}
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
                                  categoryName: imageSet.categoryName,
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
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">
                      共 {total} 个任务
                    </div>

                    {/* 每页显示数量输入 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">每页</span>
                      <Input
                        type="text"
                        value={pageSize}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // 只保留数字
                          if (value === '' || parseInt(value) > 0) {
                            setPageSize(value === '' ? '' : parseInt(value));
                          }
                        }}
                        onBlur={() => {
                          if (!pageSize || pageSize < 1) {
                            setPageSize(20);
                          } else if (pageSize > 500) {
                            setPageSize(500);
                          }
                          setCurrentPage(1);
                          fetchAvailableImages(1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (!pageSize || pageSize < 1) {
                              setPageSize(20);
                            } else if (pageSize > 500) {
                              setPageSize(500);
                            }
                            setCurrentPage(1);
                            fetchAvailableImages(1);
                          }
                        }}
                        className="w-20 h-8 text-center"
                        placeholder="20"
                      />
                      <span className="text-sm text-gray-600">条</span>
                    </div>
                  </div>

                  {total > (pageSize || 100) && (
                    <div className="flex items-center gap-3">
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
                        {currentPage} / {Math.ceil(total / (pageSize || 100))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAvailableImages(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(total / (pageSize || 100)) || loading}
                      >
                        下一页
                        <ChevronRight className="w-4 h-4" />
                      </Button>

                      {/* 跳转到指定页 */}
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-gray-600">跳转到</span>
                        <Input
                          type="text"
                          value={jumpPage}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ''); // 只保留数字
                            setJumpPage(value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const page = parseInt(jumpPage);
                              const maxPage = Math.ceil(total / (pageSize || 100));
                              if (page >= 1 && page <= maxPage) {
                                setCurrentPage(page);
                                fetchAvailableImages(page);
                                setJumpPage('');
                              } else {
                                toast.error(`请输入 1 到 ${maxPage} 之间的页码`);
                              }
                            }
                          }}
                          className="w-16 h-8 text-center"
                          placeholder="页"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const page = parseInt(jumpPage);
                            const maxPage = Math.ceil(total / (pageSize || 100));
                            if (page >= 1 && page <= maxPage) {
                              setCurrentPage(page);
                              fetchAvailableImages(page);
                              setJumpPage('');
                            } else {
                              toast.error(`请输入 1 到 ${maxPage} 之间的页码`);
                            }
                          }}
                          disabled={!jumpPage || loading}
                        >
                          跳转
                        </Button>
                      </div>
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
                {previewImages.categoryName} - 共 {previewImages.images.length} 张图片
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
                        alt={`${previewImages.categoryName} ${index + 1}`}
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