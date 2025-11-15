import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateTimePicker } from '@/components/ui/date-picker';
import { ArrowLeft, Sparkles, Images, Image as ImageIcon, X, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { TEMU_SHOPS, JOURNAL_PAPER_SPECS, JOURNAL_PAPER_CATEGORIES, DECORATIVE_PAPER_SPECS, DECORATIVE_PAPER_CATEGORIES, CALENDAR_SPECS, CALENDAR_CATEGORIES, PAPER_BAG_SPECS, PAPER_BAG_CATEGORIES } from '@/types/shop';
import { coverProjectService, type TaskInfo, type TemplateSearchItem } from '@/services/coverProjectService';
import { productService } from '@/services/productService';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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

  // 产品类型：手账纸、装饰纸、日历 或 手提纸袋
  const [productType, setProductType] = useState<'journal' | 'decorative' | 'calendar' | 'paper-bag'>('journal');

  // 根据产品类型获取对应的规格和分类
  const currentSpecs = productType === 'journal' ? JOURNAL_PAPER_SPECS :
                       productType === 'decorative' ? DECORATIVE_PAPER_SPECS :
                       productType === 'calendar' ? CALENDAR_SPECS :
                       PAPER_BAG_SPECS;
  const currentCategories = productType === 'journal' ? JOURNAL_PAPER_CATEGORIES :
                           productType === 'decorative' ? DECORATIVE_PAPER_CATEGORIES :
                           productType === 'calendar' ? CALENDAR_CATEGORIES :
                           PAPER_BAG_CATEGORIES;

  const [formData, setFormData] = useState<ProductFormData>({
    shopAccount: '',
    productSpec: '',
    productCategory: '',
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
  // 解析模板名称，提取分类信息
  const parseTemplateName = (name: string): { displayName: string; category: string } => {
    const match = name.match(/^(.+?)[(（](.+?)[)）]$/)
    if (match) {
      return {
        displayName: match[1].trim(),
        category: match[2].trim()
      }
    }
    return {
      displayName: name,
      category: '其他'
    }
  }

  // 按分类分组模板
  const groupedTemplates = React.useMemo(() => {
    const groups: { [category: string]: TemplateSearchItem[] } = {}
    templatesForSearch.forEach(template => {
      const { category } = parseTemplateName(template.name)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(template)
    })
    return Object.keys(groups).sort().reduce((acc, category) => {
      acc[category] = groups[category]
      return acc
    }, {} as { [category: string]: TemplateSearchItem[] })
  }, [templatesForSearch])

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
      templateName: imageSet.templateName,
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

                  const selectedSpec = currentSpecs.find(spec => spec.id === formData.productSpec);
                  if (!selectedSpec) {
                    toast.error('请选择商品规格');
                    return;
                  }

                  const selectedCategory = currentCategories.find(cat => cat.id === formData.productCategory);
                  if (!selectedCategory) {
                    toast.error('请选择商品分类');
                    return;
                  }

                  // 获取所有已选任务的唯一taskId列表
                  const taskIds = Array.from(new Set(selectedProducts.map(p => p.taskId)));

                  // 产品类型到数据库分类ID的映射
                  const productCategoryIdMap: Record<string, string> = {
                    'journal': '1',      // 手账纸
                    'decorative': '2',   // 包装纸
                    'calendar': '3',     // 日历 (注: 竖版和横版可能需要区分，暂时统一为3)
                    'paper-bag': '5',    // 手提纸袋
                  };

                  const submitData = {
                    shopId: selectedShop.shopId,
                    shopAccount: selectedShop.account,
                    categoryId: selectedCategory.categoryId,  // TEMU平台分类ID
                    categoryName: selectedCategory.categoryName,
                    productCategoryId: productCategoryIdMap[productType],  // 自定义产品分类ID (1-5)
                    productAttributes: selectedCategory.productAttributes,
                    origin: formData.origin,
                    freightTemplateId: selectedShop.freightTemplateId,
                    freightTemplateName: selectedShop.freightTemplateName,
                    operatingSite: selectedShop.operatingSite,
                    length: selectedSpec.length,
                    width: selectedSpec.width,
                    height: selectedSpec.height,
                    weight: selectedSpec.weight,
                    declaredPrice: selectedSpec.declaredPrice,
                    suggestedRetailPrice: selectedSpec.suggestedRetailPrice,
                    variantName: selectedSpec.variantName,
                    variantAttributeName1: selectedSpec.variantAttributeName1,
                    variantAttributeValue1: selectedSpec.variantAttributeValue1,
                    stock: selectedSpec.stock,
                    shippingTime: selectedSpec.shippingTime,
                    productCodePrefix: selectedShop.businessCode,
                    productSpec: selectedSpec.productSpec,
                    productUsage: selectedSpec.productUsage,
                    taskIds
                  };

                  try {
                    setCreating(true);
                    await productService.batchCreate(submitData);

                    // 任务已提交，立即跳转到商品列表页
                    toast.success(
                      `已提交 ${taskIds.length} 个商品的创建任务，正在后台处理中...`,
                      {
                        description: '商品标题由AI生成，请在商品列表查看进度',
                        duration: 5000
                      }
                    );

                    // 立即跳转，不等待任务完成
                    navigate('/workspace/batch-upload');
                  } catch (error: any) {
                    console.error('批量创建商品失败:', error);
                    toast.error(error.response?.data?.message || '提交任务失败，请重试');
                    setCreating(false);
                  }
                }}
                disabled={creating || !formData.shopAccount || !formData.productSpec || !formData.productCategory || selectedProducts.length === 0}
                className="min-w-24"
              >
                {creating ? '提交中...' : `提交任务 (${selectedProducts.length})`}
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

            {/* 店铺选择 - 卡片式 */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">店铺账号 *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {TEMU_SHOPS
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((shop) => (
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
                        relative p-4 rounded-md border-2 text-left transition-colors
                        ${formData.shopAccount === shop.id
                          ? 'border-primary bg-background'
                          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      <div className="space-y-1.5">
                        <div className="font-medium text-sm">
                          {shop.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {shop.businessCode}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* 产品类型 Tab 切换（选中店铺后显示） */}
            {formData.shopAccount && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">产品类型 *</Label>
                <Tabs
                  value={productType}
                  onValueChange={(value) => {
                    setProductType(value as 'journal' | 'calendar');
                    // 切换产品类型时清空规格和分类选择
                    updateFormData('productSpec', '');
                    updateFormData('productCategory', '');
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="journal">手账纸</TabsTrigger>
                    <TabsTrigger value="decorative">装饰纸</TabsTrigger>
                    <TabsTrigger value="calendar">日历</TabsTrigger>
                    <TabsTrigger value="paper-bag">手提纸袋</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* 商品规格选择（选中店铺后显示） */}
            {formData.shopAccount && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  商品规格 *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentSpecs.map((spec) => (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => updateFormData('productSpec', spec.id)}
                      className={`
                        p-4 rounded-md border-2 text-left transition-colors
                        ${formData.productSpec === spec.id
                          ? 'border-primary bg-background'
                          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      <div className="space-y-2">
                        <div className="font-medium text-sm">{spec.name}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{spec.sheets}张 • {spec.size}</div>
                          <div>¥{spec.declaredPrice} / ${spec.suggestedRetailPrice}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 商品分类选择（选中店铺后显示） */}
            {formData.shopAccount && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  商品分类 *
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => updateFormData('productCategory', category.id)}
                      className={`
                        p-4 rounded-md border-2 text-left transition-colors
                        ${formData.productCategory === category.id
                          ? 'border-primary bg-background'
                          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      <div className="space-y-2">
                        <div className="font-medium text-sm">{category.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {category.categoryName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          分类ID: {category.categoryId}
                        </div>
                      </div>
                    </button>
                  ))}
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
                  <label className="text-sm font-medium text-gray-700">模板:</label>
                  <Select
                    value={templateFilter || undefined}
                    onValueChange={(value) => setTemplateFilter(value || '')}
                    disabled={loadingTemplates}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="全部模板" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      <SelectItem value="all">全部模板 ({templatesForSearch.length})</SelectItem>
                      <SelectSeparator />
                      {Object.entries(groupedTemplates).map(([category, templates], index) => (
                        <React.Fragment key={category}>
                          {index > 0 && <SelectSeparator />}
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-gray-900 bg-gray-50 px-3 py-2 -mx-1 mb-1">
                              {category}
                            </SelectLabel>
                            {templates.map((template) => {
                              const { displayName } = parseTemplateName(template.name)
                              return (
                                <SelectItem key={template.id} value={template.id} className="pl-6">
                                  {displayName}
                                </SelectItem>
                              )
                            })}
                          </SelectGroup>
                        </React.Fragment>
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
                      <div className="col-span-3">模板名称</div>
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
                                    templateName: imageSet.templateName,
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