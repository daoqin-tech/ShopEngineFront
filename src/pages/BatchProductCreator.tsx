import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-picker';
import { Sparkles, Images, Image as ImageIcon, X, ChevronLeft, ChevronRight, Package, CheckCircle2, Plus } from 'lucide-react';
import { temuShopService, type TemuShop } from '@/services/temuShopService';
import { temuTemplateService, type TemuTemplate } from '@/services/temuTemplateService';
import { temuTitleTemplateService, type TemuTitleTemplate } from '@/services/temuTitleTemplateService';
import { coverProjectService, type TaskInfo, type TemplateSelectionItem } from '@/services/coverProjectService';
import { productService } from '@/services/productService';
import { productCategoryService } from '@/services/productCategoryService';
import type { ProductCategoryWithChildren } from '@/types/productCategory';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// 商品信息表单数据
interface ProductFormData {
  shopAccount: string;        // 店铺账号
  productSpec: string;        // 商品规格ID
  productCategory: string;    // Temu模板ID
  titleTemplateId: string;    // 标题模板ID
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

  // 标题模板数据
  const [titleTemplates, setTitleTemplates] = useState<TemuTitleTemplate[]>([]);
  const [loadingTitleTemplates, setLoadingTitleTemplates] = useState(false);

  // 数据库分类数据
  const [parentCategories, setParentCategories] = useState<ProductCategoryWithChildren[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  // 表单数据（需要在 useMemo 之前声明）
  const [formData, setFormData] = useState<ProductFormData>({
    shopAccount: '',
    productSpec: '',
    productCategory: '',
    titleTemplateId: '',
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
    // 过滤出该分类关联的模板（模板的productCategoryId匹配二级分类或一级分类）
    return allTemuTemplates.filter(t =>
      t.productCategoryId === formData.productSpec ||
      t.productCategoryId === selectedParentId
    );
  }, [allTemuTemplates, selectedParentId, formData.productSpec]);

  // 获取选中的 Temu 模板详情
  const selectedTemuTemplate = React.useMemo(() => {
    if (!formData.productCategory) return null;
    return allTemuTemplates.find(t => t.id === formData.productCategory) || null;
  }, [allTemuTemplates, formData.productCategory]);

  // 根据选中的分类过滤标题模板
  const filteredTitleTemplates = React.useMemo(() => {
    if (!selectedParentId || !formData.productSpec) return [];
    return titleTemplates.filter(t =>
      t.productCategoryId === formData.productSpec ||
      t.productCategoryId === selectedParentId
    );
  }, [titleTemplates, selectedParentId, formData.productSpec]);

  // 获取选中的标题规则详情
  const selectedTitleTemplate = React.useMemo(() => {
    if (!formData.titleTemplateId) return null;
    return titleTemplates.find(t => t.id === formData.titleTemplateId) || null;
  }, [titleTemplates, formData.titleTemplateId]);

  // 获取当前选中的二级分类名称（用于筛选商品图）
  const selectedCategoryName = React.useMemo(() => {
    if (!selectedParentId || !formData.productSpec) return '';
    const parent = parentCategories.find(p => p.id === selectedParentId);
    const selectedChild = parent?.children?.find(c => c.id === formData.productSpec);
    return selectedChild?.name || '';
  }, [parentCategories, selectedParentId, formData.productSpec]);


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

  // 加载标题模板
  useEffect(() => {
    const loadTitleTemplates = async () => {
      try {
        setLoadingTitleTemplates(true);
        const response = await temuTitleTemplateService.getAllTemplates(true); // activeOnly=true
        setTitleTemplates(response.templates || []);
      } catch (error) {
        console.error('Failed to load title templates:', error);
        setTitleTemplates([]);
      } finally {
        setLoadingTitleTemplates(false);
      }
    };
    loadTitleTemplates();
  }, []);

  // 加载套图模板列表（用于筛选）
  useEffect(() => {
    const loadCoverTemplates = async () => {
      try {
        // 使用 getTemplates 获取完整模板信息（包含 productCategoryId）
        const templates = await coverProjectService.getTemplates();
        setCoverTemplates(templates || []);
      } catch (error) {
        console.error('Failed to load cover templates:', error);
        setCoverTemplates([]);
      }
    };
    loadCoverTemplates();
  }, []);

  const [availableImages, setAvailableImages] = useState<ProductImage[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewImages, setPreviewImages] = useState<{ taskId: string; categoryName: string; images: string[] } | null>(null);

  // 对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  const navigate = useNavigate();

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState<number | ''>(50);
  const [jumpPage, setJumpPage] = useState('');

  // 筛选状态
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();

  // 套图模板筛选
  const [coverTemplates, setCoverTemplates] = useState<TemplateSelectionItem[]>([]);
  const [selectedCoverTemplateId, setSelectedCoverTemplateId] = useState<string>('');

  // 根据选中的二级分类过滤套图模板
  const filteredCoverTemplates = React.useMemo(() => {
    if (!formData.productSpec) return [];
    // 返回关联当前二级分类的模板
    return coverTemplates.filter(t => t.productCategoryId === formData.productSpec);
  }, [coverTemplates, formData.productSpec]);

  // 获取可用的商品图（来自CoverGeneration）
  const fetchAvailableImages = async (page: number = currentPage, categoryName?: string, templateId?: string) => {
    try {
      setLoading(true);

      const params: any = {
        page,
        limit: pageSize || 50
      };

      // 添加分类筛选
      if (categoryName) {
        params.categoryName = categoryName;
      }

      // 添加模板筛选
      if (templateId) {
        params.templateId = templateId;
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
    fetchAvailableImages(1, selectedCategoryName, selectedCoverTemplateId || undefined);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setStartTime(undefined);
    setEndTime(undefined);
    setSelectedCoverTemplateId('');
    setCurrentPage(1);
    fetchAvailableImages(1, selectedCategoryName, undefined);
  };

  // 当选择二级分类时，自动筛选商品图
  useEffect(() => {
    if (selectedCategoryName) {
      setCurrentPage(1);
      setSelectedProducts([]); // 切换分类时清空已选
      setSelectedCoverTemplateId(''); // 切换分类时重置模板选择
      fetchAvailableImages(1, selectedCategoryName, undefined);
    }
  }, [selectedCategoryName]);

  // 当选择套图模板时，重新加载商品图
  useEffect(() => {
    if (selectedCategoryName && selectedCoverTemplateId) {
      setCurrentPage(1);
      setSelectedProducts([]); // 切换模板时清空已选
      fetchAvailableImages(1, selectedCategoryName, selectedCoverTemplateId);
    }
  }, [selectedCoverTemplateId]);

  // 当可用的 Temu 模板列表变化且当前没有选择时，自动选择第一个
  useEffect(() => {
    if (filteredTemuTemplates.length > 0 && !formData.productCategory) {
      updateFormData('productCategory', filteredTemuTemplates[0].id);
    }
  }, [filteredTemuTemplates, formData.productCategory]);

  // 当可用的标题规则列表变化且当前没有选择时，自动选择第一个
  useEffect(() => {
    if (filteredTitleTemplates.length > 0 && !formData.titleTemplateId) {
      updateFormData('titleTemplateId', filteredTitleTemplates[0].id);
    }
  }, [filteredTitleTemplates, formData.titleTemplateId]);

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

  // 执行创建商品
  const handleCreateProducts = async () => {
    const selectedShop = temuShops.find(shop => shop.id === formData.shopAccount);
    const selectedTemuTemplate = allTemuTemplates.find(t => t.id === formData.productCategory);
    const titleTemplate = titleTemplates.find(t => t.id === formData.titleTemplateId);

    if (!selectedShop || !selectedTemuTemplate) {
      toast.error('请确保已选择店铺和Temu模板');
      return;
    }

    if (!titleTemplate) {
      toast.error('请选择标题模板');
      return;
    }

    // 获取所有已选任务的唯一taskId列表
    const taskIds = Array.from(new Set(selectedProducts.map(p => p.taskId)));

    const submitData = {
      shopId: selectedShop.id,
      taskIds,
      temuTemplateId: selectedTemuTemplate.id,
      titleTemplateId: titleTemplate.id,
    };

    try {
      setCreating(true);
      setShowConfirmDialog(false);

      await productService.batchCreate(submitData);

      // 记录创建数量，显示成功对话框
      setCreatedCount(taskIds.length);
      setShowSuccessDialog(true);

      // 清空选择
      setSelectedProducts([]);
    } catch (error: any) {
      console.error('批量创建商品失败:', error);
      toast.error(error.response?.data?.message || '创建商品失败，请重试');
    } finally {
      setCreating(false);
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
              <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">商品标题将由AI自动生成</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {selectedProducts.length > 0 && (
                <span className="text-sm text-gray-600">
                  已选择 {selectedProducts.length} 个商品
                </span>
              )}
              <Button
                onClick={() => {
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

                  // 检查标题模板是否已选择
                  if (!formData.titleTemplateId) {
                    toast.error('请选择标题模板');
                    return;
                  }

                  // 显示确认对话框
                  setShowConfirmDialog(true);
                }}
                disabled={creating || !formData.shopAccount || !selectedParentId || !formData.productSpec || !formData.productCategory || !formData.titleTemplateId || selectedProducts.length === 0}
                className="min-w-24"
              >
                {creating ? '创建中...' : `创建商品 (${selectedProducts.length})`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            {/* 配置区域 */}
            <div className="p-6 border-b">
              {/* 商品配置 */}
              <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-3 items-start">
                {/* 店铺账号 */}
                <Label className="text-sm font-medium text-gray-600 pt-1.5 text-right">店铺</Label>
                <div>
                  {loadingShops ? (
                    <div className="text-sm text-muted-foreground py-1.5">加载店铺中...</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {temuShops.map((shop) => (
                        <button
                          key={shop.id}
                          type="button"
                          onClick={() => {
                            updateFormData('shopAccount', shop.id);
                            updateFormData('productSpec', '');
                            updateFormData('productCategory', '');
                            setSelectedParentId('');
                          }}
                          className={`px-2.5 py-1 rounded text-sm transition-colors ${
                            formData.shopAccount === shop.id
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {shop.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 产品分类 */}
                {formData.shopAccount && (
                  <>
                    <Label className="text-sm font-medium text-gray-600 pt-1.5 text-right">分类</Label>
                    <div className="flex gap-2">
                      {loadingCategories ? (
                        <div className="text-sm text-muted-foreground py-1.5">加载中...</div>
                      ) : (
                        <>
                          <Select
                            value={selectedParentId}
                            onValueChange={(value) => {
                              setSelectedParentId(value);
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
                            <SelectTrigger className="w-40 h-9">
                              <SelectValue placeholder="一级分类" />
                            </SelectTrigger>
                            <SelectContent>
                              {parentCategories.map((parent) => (
                                <SelectItem key={parent.id} value={parent.id}>{parent.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={formData.productSpec}
                            onValueChange={(value) => {
                              updateFormData('productSpec', value);
                              updateFormData('productCategory', '');
                            }}
                            disabled={!selectedParentId || currentChildCategories.length === 0}
                          >
                            <SelectTrigger className="w-48 h-9">
                              <SelectValue placeholder="二级分类" />
                            </SelectTrigger>
                            <SelectContent>
                              {currentChildCategories.map((child) => (
                                <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* 上架类目 */}
                {formData.productSpec && (
                  <>
                    <Label className="text-sm font-medium text-gray-600 pt-1.5 text-right">上架类目</Label>
                    <div className="space-y-2">
                      {loadingTemuTemplates ? (
                        <div className="text-sm text-muted-foreground py-1.5">加载中...</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {filteredTemuTemplates.map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => updateFormData('productCategory', template.id)}
                                className={`px-2.5 py-1 rounded text-sm transition-colors ${
                                  formData.productCategory === template.id
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {template.name || template.catName}
                              </button>
                            ))}
                            <Link
                              to="/workspace/settings/temu-templates"
                              className="px-2 py-1 rounded text-sm transition-colors bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center"
                              title="配置更多上架类目"
                            >
                              <Plus className="h-4 w-4" />
                            </Link>
                          </div>
                          {selectedTemuTemplate && (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1">
                              <div><span className="text-gray-400">Temu分类:</span> {selectedTemuTemplate.fullPath || selectedTemuTemplate.catName}</div>
                              {selectedTemuTemplate.productAttributes && selectedTemuTemplate.productAttributes.length > 0 && (
                                <div><span className="text-gray-400">属性:</span> {selectedTemuTemplate.productAttributes.map(attr => `${attr.propName}:${attr.propValue}`).join(', ')}</div>
                              )}
                              {selectedTemuTemplate.specifications && selectedTemuTemplate.specifications.length > 0 && (
                                <div><span className="text-gray-400">规格:</span> {selectedTemuTemplate.specifications.map(spec => `${spec.parentSpecName}(${spec.specValues.map(v => v.specName).join('/')})`).join(', ')}</div>
                              )}
                              {selectedTemuTemplate.skuDefaultConfig?.volumeWeightConfigs?.[0] && (() => {
                                const config = selectedTemuTemplate.skuDefaultConfig!.volumeWeightConfigs![0];
                                const parts = [];
                                if (config.longestSide || config.middleSide || config.shortestSide) {
                                  parts.push(`${config.longestSide}×${config.middleSide}×${config.shortestSide}cm`);
                                }
                                if (config.weight !== undefined) parts.push(`${config.weight}g`);
                                if (config.supplierPrice !== undefined) parts.push(`¥${config.supplierPrice.toFixed(2)}`);
                                return parts.length > 0 ? <div><span className="text-gray-400">SKU:</span> {parts.join(' / ')}</div> : null;
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* 标题规则 */}
                {formData.productSpec && (
                  <>
                    <Label className="text-sm font-medium text-gray-600 pt-1.5 text-right">标题规则</Label>
                    <div className="space-y-2">
                      {loadingTitleTemplates ? (
                        <div className="text-sm text-muted-foreground py-1.5">加载中...</div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {filteredTitleTemplates.map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => updateFormData('titleTemplateId', template.id)}
                                className={`px-2.5 py-1 rounded text-sm transition-colors ${
                                  formData.titleTemplateId === template.id
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {template.name}
                              </button>
                            ))}
                            <Link
                              to="/workspace/settings/temu-title-templates"
                              className="px-2 py-1 rounded text-sm transition-colors bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center"
                              title="配置更多标题规则"
                            >
                              <Plus className="h-4 w-4" />
                            </Link>
                          </div>
                          {selectedTitleTemplate && (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 space-y-1">
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                {selectedTitleTemplate.categoryKeywordsZh && (
                                  <div><span className="text-gray-400">类目关键词(中):</span> {selectedTitleTemplate.categoryKeywordsZh}</div>
                                )}
                                {selectedTitleTemplate.categoryKeywordsEn && (
                                  <div><span className="text-gray-400">类目关键词(英):</span> {selectedTitleTemplate.categoryKeywordsEn}</div>
                                )}
                                {selectedTitleTemplate.festivalKeywords && (
                                  <div><span className="text-gray-400">节日关键词:</span> {selectedTitleTemplate.festivalKeywords}</div>
                                )}
                              </div>
                              {(selectedTitleTemplate.sampleTitleZh || selectedTitleTemplate.sampleTitleEn) && (
                                <div className="border-t pt-1 mt-1 space-y-0.5">
                                  {selectedTitleTemplate.sampleTitleZh && (
                                    <div><span className="text-gray-400">示例标题(中):</span> <span className="text-gray-600">{selectedTitleTemplate.sampleTitleZh}</span></div>
                                  )}
                                  {selectedTitleTemplate.sampleTitleEn && (
                                    <div><span className="text-gray-400">示例标题(英):</span> <span className="text-gray-600">{selectedTitleTemplate.sampleTitleEn}</span></div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 图片筛选 - 分隔线 */}
              {formData.productSpec && (
                <>
                  <div className="border-t my-4"></div>
                  <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-3 items-center">
                    {/* 套图模板 */}
                    {filteredCoverTemplates.length > 0 && (
                      <>
                        <Label className="text-sm font-medium text-gray-600 text-right">套图模板</Label>
                        <Select
                          value={selectedCoverTemplateId || 'all'}
                          onValueChange={(value) => {
                            const newValue = value === 'all' ? '' : value;
                            setSelectedCoverTemplateId(newValue);
                            setCurrentPage(1);
                            fetchAvailableImages(1, selectedCategoryName, newValue || undefined);
                          }}
                        >
                          <SelectTrigger className="w-48 h-9">
                            <SelectValue placeholder="选择套图模板" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部模板</SelectItem>
                            {filteredCoverTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    {/* 时间筛选 */}
                    <Label className="text-sm font-medium text-gray-600 text-right">时间</Label>
                    <div className="flex items-center gap-2">
                      <DateTimePicker
                        date={startTime}
                        onDateChange={setStartTime}
                        placeholder="开始时间"
                        className="w-52"
                      />
                      <span className="text-gray-400">-</span>
                      <DateTimePicker
                        date={endTime}
                        onDateChange={setEndTime}
                        placeholder="结束时间"
                        className="w-52"
                      />
                      <Button size="sm" onClick={handleApplyFilters}>搜索</Button>
                      <Button size="sm" variant="outline" onClick={handleResetFilters}>重置</Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 商品图列表 */}
            {formData.productSpec ? (
              <div className="flex-1 overflow-hidden">
                {/* 列表头部 */}
                <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Images className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-gray-900">选择商品图片</span>
                    <span className="text-sm text-gray-500">
                      （{selectedCategoryName} 分类下共 {total} 个任务）
                    </span>
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
                      <h2 className="text-xl font-semibold text-gray-600 mb-2">该分类下没有可用的商品图</h2>
                      <p className="text-gray-500">请先在套图生成页面生成该分类的商品图</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <div className="bg-white">
                      {/* 表头 */}
                      <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b bg-gray-50 font-medium text-sm text-gray-700 sticky top-0 z-5">
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
                        <div className="col-span-4">产品分类</div>
                        <div className="col-span-2">图片数量</div>
                        <div className="col-span-2">创建时间</div>
                        <div className="col-span-2">操作</div>
                      </div>

                      {/* 任务列表 */}
                      {availableImages.map((imageSet) => {
                        // 检查该任务是否被选中（一个任务 = 一个商品）
                        const isTaskSelected = selectedProducts.some(p => p.taskId === imageSet.taskId);

                        return (
                          <div
                            key={imageSet.taskId}
                            className="grid grid-cols-12 gap-4 px-6 py-3 border-b hover:bg-gray-50 group"
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
                            <div className="col-span-4 flex items-center">
                              <div className="text-sm text-gray-700 truncate" title={imageSet.categoryName}>
                                {imageSet.categoryName}
                              </div>
                            </div>

                            {/* 图片数量 */}
                            <div className="col-span-2 flex items-center">
                              <span className="text-sm text-gray-600">{imageSet.images.length} 张图片</span>
                            </div>

                            {/* 创建时间 - 精确到秒 */}
                            <div className="col-span-2 flex items-center text-sm text-gray-500">
                              {new Date(imageSet.createdAt).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
                              fetchAvailableImages(1, selectedCategoryName, selectedCoverTemplateId || undefined);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (!pageSize || pageSize < 1) {
                                  setPageSize(20);
                                } else if (pageSize > 500) {
                                  setPageSize(500);
                                }
                                setCurrentPage(1);
                                fetchAvailableImages(1, selectedCategoryName, selectedCoverTemplateId || undefined);
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
                            onClick={() => fetchAvailableImages(currentPage - 1, selectedCategoryName, selectedCoverTemplateId || undefined)}
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
                            onClick={() => fetchAvailableImages(currentPage + 1, selectedCategoryName, selectedCoverTemplateId || undefined)}
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
                                    fetchAvailableImages(page, selectedCategoryName, selectedCoverTemplateId || undefined);
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
                                  fetchAvailableImages(page, selectedCategoryName, selectedCoverTemplateId || undefined);
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
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-600 mb-2">请先选择产品分类</h2>
                  <p className="text-gray-500 text-sm">选择分类后将自动显示该分类下的商品图</p>
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

      {/* 确认创建对话框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认创建商品</DialogTitle>
            <DialogDescription>
              即将创建 {selectedProducts.length} 个商品，商品标题将由 AI 自动生成。确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">店铺：</span>
              <span className="font-medium">{temuShops.find(s => s.id === formData.shopAccount)?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">商品数量：</span>
              <span className="font-medium text-blue-600">{selectedProducts.length} 个</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateProducts} disabled={creating}>
              {creating ? '创建中...' : '确认创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建成功对话框 */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              创建任务已提交
            </DialogTitle>
            <DialogDescription>
              已成功提交 {createdCount} 个商品的创建任务，正在后台处理中。商品标题由 AI 自动生成，请稍后在商品列表中查看进度。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSuccessDialog(false)}>
              继续创建
            </Button>
            <Button onClick={() => {
              setShowSuccessDialog(false);
              navigate('/workspace/batch-upload');
            }}>
              查看商品列表
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
