import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, RefreshCw, Search, ChevronRight, Settings2, ArrowLeft, Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { temuCategoryService, type TemuCategory, type TemuProductAttribute, type CreateTemuCategoryRequest, type UpdateTemuCategoryRequest } from '@/services/temuCategoryService';
import { temuCategoryAPIService, type TemuCategoryPath, type TemuAPICategory, type ProductAttributeProperty, type ProductAttributeValue } from '@/services/temuShopCategoryService';
import { systemConfigService } from '@/services/systemConfigService';
import { toast } from 'sonner';

// Temu 站点配置类型
interface TemuSite {
  siteId: number;
  siteName: string;
  isOpen?: boolean;
  region?: string | null;
}

// 用户填写的属性值
interface AttributeFormValue {
  property: ProductAttributeProperty;
  selectedValue?: ProductAttributeValue;       // 单选时使用
  selectedValues?: ProductAttributeValue[];    // 多选时使用
  customValue?: string;
  numberInputValue?: string;
}

// 判断属性是否支持多选
const isMultiSelect = (property: ProductAttributeProperty): boolean => {
  return (property.chooseMaxNum ?? 1) > 1;
};

export function TemuCategories() {
  const [categories, setCategories] = useState<TemuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAttributeDialog, setShowAttributeDialog] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<TemuCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 从 Temu 平台添加分类相关状态
  const [showAddFromTemuDialog, setShowAddFromTemuDialog] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>(undefined);
  const [temuSearchKeyword, setTemuSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<TemuCategoryPath[]>([]);
  const [searching, setSearching] = useState(false);
  const [browseColumns, setBrowseColumns] = useState<TemuAPICategory[][]>([]);
  const [selectedPath, setSelectedPath] = useState<TemuAPICategory[]>([]);
  const [loadingColumn, setLoadingColumn] = useState<number | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);  // 是否处于搜索模式
  const [fetchedAttributeCount, setFetchedAttributeCount] = useState<number>(0);
  const [fetchingAttributes, setFetchingAttributes] = useState(false);

  // 两步流程相关状态：选择分类 -> 填写属性
  const [addStep, setAddStep] = useState<'select' | 'attributes'>('select');
  const [pendingCategory, setPendingCategory] = useState<TemuAPICategory | null>(null);
  const [pendingCategoryPath, setPendingCategoryPath] = useState<TemuCategoryPath | null>(null);
  const [attributeProperties, setAttributeProperties] = useState<ProductAttributeProperty[]>([]);
  const [attributeFormValues, setAttributeFormValues] = useState<AttributeFormValue[]>([]);
  const [pendingLabel, setPendingLabel] = useState<string>('');  // 添加分类时的标签

  // 标签筛选状态
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  // Temu 站点列表（从系统配置加载）
  const [temuSites, setTemuSites] = useState<TemuSite[]>([]);

  // 属性配置相关状态
  const [configuringCategory, setConfiguringCategory] = useState<TemuCategory | null>(null);
  const [attributeJson, setAttributeJson] = useState('');
  const [configuringLabel, setConfiguringLabel] = useState('');

  // 加载分类列表
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await temuCategoryService.getAllCategories();
      setCategories(response.categories);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      toast.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载 Temu 站点配置
  const loadTemuSites = async () => {
    try {
      const config = await systemConfigService.getConfigByKey('temu_sites');
      if (config && config.configValue) {
        const sites = JSON.parse(config.configValue) as TemuSite[];
        // 只显示开放的站点
        setTemuSites(sites.filter(s => s.isOpen !== false));
      }
    } catch (error) {
      console.error('加载站点配置失败:', error);
      // 使用默认站点列表作为回退
      setTemuSites([
        { siteId: 211, siteName: '美国站' },
        { siteId: 221, siteName: '欧洲站' },
      ]);
    }
  };

  useEffect(() => {
    fetchCategories();
    loadTemuSites();
  }, []);

  // 将搜索结果转换为层级列（用于统一显示）
  const convertSearchResultsToColumns = (paths: TemuCategoryPath[]): TemuAPICategory[][] => {
    if (paths.length === 0) return [];

    // 找出最大层级数
    let maxLevel = 0;
    paths.forEach(path => {
      for (let i = 10; i >= 1; i--) {
        if (path[`cat${i}` as keyof TemuCategoryPath]) {
          maxLevel = Math.max(maxLevel, i);
          break;
        }
      }
    });

    // 构建每一层的分类（去重）
    const columns: TemuAPICategory[][] = [];
    for (let level = 1; level <= maxLevel; level++) {
      const categoryMap = new Map<number, TemuAPICategory>();
      paths.forEach(path => {
        const cat = path[`cat${level}` as keyof TemuCategoryPath] as TemuAPICategory | undefined;
        if (cat && !categoryMap.has(cat.catId)) {
          categoryMap.set(cat.catId, cat);
        }
      });
      columns.push(Array.from(categoryMap.values()));
    }

    return columns;
  };

  // 搜索 Temu 分类
  const handleTemuSearch = async () => {
    if (!temuSearchKeyword.trim()) return;

    try {
      setSearching(true);
      setSelectedPath([]);
      setFetchedAttributeCount(0);
      setAttributeProperties([]);
      const response = await temuCategoryAPIService.searchCategories(
        temuSearchKeyword.trim(),
        selectedSiteId
      );
      const paths = response.categoryPaths || [];
      setSearchResults(paths);
      setIsSearchMode(true);
    } catch (error: any) {
      console.error('搜索分类失败:', error);
      toast.error(error.response?.data?.message || '搜索分类失败');
    } finally {
      setSearching(false);
    }
  };

  // 从搜索结果中提取完整路径
  const getPathFromSearchResult = (path: TemuCategoryPath): TemuAPICategory[] => {
    const result: TemuAPICategory[] = [];
    for (let i = 1; i <= 10; i++) {
      const cat = path[`cat${i}` as keyof TemuCategoryPath] as TemuAPICategory | undefined;
      if (cat) result.push(cat);
    }
    return result;
  };

  // 获取搜索结果的叶子分类
  const getLeafFromSearchResult = (path: TemuCategoryPath): TemuAPICategory | null => {
    const fullPath = getPathFromSearchResult(path);
    return fullPath.length > 0 ? fullPath[fullPath.length - 1] : null;
  };

  // 选择搜索结果
  const handleSelectSearchResult = async (path: TemuCategoryPath) => {
    const fullPath = getPathFromSearchResult(path);
    const leafCategory = fullPath[fullPath.length - 1];

    if (!leafCategory) return;

    setSelectedPath(fullPath);

    // 获取产品属性模板
    if (leafCategory.isLeaf) {
      try {
        setFetchingAttributes(true);
        setFetchedAttributeCount(0);
        setAttributeProperties([]);

        const attrsResponse = await temuCategoryAPIService.getProductAttributes(leafCategory.catId);

        if (attrsResponse.properties && attrsResponse.properties.length > 0) {
          const requiredProps = attrsResponse.properties.filter(prop => prop.required);
          setAttributeProperties(requiredProps);
          setFetchedAttributeCount(requiredProps.length);
        }
      } catch (attrError: any) {
        console.error('获取产品属性失败:', attrError);
        toast.error(`获取产品属性失败: ${attrError.response?.data?.message || attrError.message}`);
      } finally {
        setFetchingAttributes(false);
      }
    }
  };

  // 清除搜索，返回浏览模式
  const handleClearSearch = () => {
    setTemuSearchKeyword('');
    setSearchResults([]);
    setIsSearchMode(false);
    setSelectedPath([]);
    loadTemuCategories(undefined, 0);
  };

  // 加载 Temu 分类层级
  const loadTemuCategories = async (parentCatId?: number, columnIndex: number = 0) => {
    try {
      setLoadingColumn(columnIndex);
      const response = await temuCategoryAPIService.getCategories(
        parentCatId,
        false,
        selectedSiteId
      );

      const newColumns = [...browseColumns.slice(0, columnIndex), response.categories || []];
      setBrowseColumns(newColumns);

      if (columnIndex === 0) {
        setSelectedPath([]);
      }
    } catch (error: any) {
      console.error('加载分类失败:', error);
      toast.error(error.response?.data?.message || '加载分类失败');
    } finally {
      setLoadingColumn(null);
    }
  };

  // 选择分类层级
  const handleSelectCategory = async (category: TemuAPICategory, columnIndex: number) => {
    const newPath = [...selectedPath.slice(0, columnIndex), category];
    setSelectedPath(newPath);

    if (!category.isLeaf) {
      // 非叶子分类
      setFetchedAttributeCount(0);
      setAttributeProperties([]);

      if (isSearchMode) {
        // 搜索模式：根据选择过滤显示下一层
        const filteredPaths = searchResults.filter(path => {
          // 检查路径中前 columnIndex+1 层是否匹配
          for (let i = 0; i <= columnIndex; i++) {
            const pathCat = path[`cat${i + 1}` as keyof TemuCategoryPath] as TemuAPICategory | undefined;
            const selectedCat = i === columnIndex ? category : newPath[i];
            if (!pathCat || pathCat.catId !== selectedCat.catId) {
              return false;
            }
          }
          return true;
        });

        // 构建新的列
        const newColumns = convertSearchResultsToColumns(filteredPaths);
        setBrowseColumns(newColumns);
      } else {
        // 浏览模式：调用 API 加载子分类
        await loadTemuCategories(category.catId, columnIndex + 1);
      }
    } else {
      // 叶子分类，截断列并获取产品属性模板
      if (isSearchMode) {
        // 搜索模式：根据选择过滤并截断
        const filteredPaths = searchResults.filter(path => {
          for (let i = 0; i <= columnIndex; i++) {
            const pathCat = path[`cat${i + 1}` as keyof TemuCategoryPath] as TemuAPICategory | undefined;
            const selectedCat = i === columnIndex ? category : newPath[i];
            if (!pathCat || pathCat.catId !== selectedCat.catId) {
              return false;
            }
          }
          return true;
        });
        const newColumns = convertSearchResultsToColumns(filteredPaths);
        setBrowseColumns(newColumns.slice(0, columnIndex + 1));
      } else {
        setBrowseColumns(browseColumns.slice(0, columnIndex + 1));
      }

      // 获取产品属性模板
      try {
        setFetchingAttributes(true);
        setFetchedAttributeCount(0);
        setAttributeProperties([]);

        const attrsResponse = await temuCategoryAPIService.getProductAttributes(category.catId);

        // 保存属性列表，用于后续填写
        if (attrsResponse.properties && attrsResponse.properties.length > 0) {
          const requiredProps = attrsResponse.properties.filter(prop => prop.required);
          setAttributeProperties(requiredProps);
          setFetchedAttributeCount(requiredProps.length);
        }
      } catch (attrError: any) {
        console.error('获取产品属性失败:', attrError);
        toast.error(`获取产品属性失败: ${attrError.response?.data?.message || attrError.message}`);
      } finally {
        setFetchingAttributes(false);
      }
    }
  };

  // 从浏览中进入属性填写步骤
  const handleAddFromBrowse = () => {
    const leafCategory = selectedPath[selectedPath.length - 1];
    if (!leafCategory || !leafCategory.isLeaf) {
      toast.error('请选择一个叶子分类');
      return;
    }

    // 已经获取了属性，直接进入填写步骤
    setPendingCategory(leafCategory);
    setPendingCategoryPath(null);

    // 初始化表单值
    setAttributeFormValues(attributeProperties.map(prop => ({ property: prop })));
    setAddStep('attributes');
  };

  // 添加分类到数据库（带属性值）
  const addCategoryToDatabase = async () => {
    if (!pendingCategory) return;

    try {
      setSubmitting(true);

      // 构建完整路径
      let fullPath = '';
      if (pendingCategoryPath) {
        const pathParts: string[] = [];
        for (let i = 1; i <= 10; i++) {
          const cat = pendingCategoryPath[`cat${i}` as keyof TemuCategoryPath] as TemuAPICategory | undefined;
          if (cat) pathParts.push(cat.catName);
        }
        fullPath = pathParts.join(' > ');
      } else if (selectedPath.length > 0) {
        fullPath = selectedPath.map(c => c.catName).join(' > ');
      }

      // 从表单中提取属性值（支持多选）
      const productAttributes: TemuProductAttribute[] = [];

      attributeFormValues.forEach(item => {
        const prop = item.property;

        if (isMultiSelect(prop) && item.selectedValues && item.selectedValues.length > 0) {
          // 多选：为每个选中的值创建一个属性条目
          item.selectedValues.forEach(val => {
            productAttributes.push({
              vid: val.vid,
              pid: prop.pid,
              templatePid: prop.templatePid,
              refPid: prop.refPid || 0,
              propName: prop.name,
              propValue: val.value,
              valueUnit: '',
              numberInputValue: item.numberInputValue || '',
            });
          });
        } else if (item.selectedValue) {
          // 单选
          productAttributes.push({
            vid: item.selectedValue.vid,
            pid: prop.pid,
            templatePid: prop.templatePid,
            refPid: prop.refPid || 0,
            propName: prop.name,
            propValue: item.selectedValue.value,
            valueUnit: '',
            numberInputValue: item.numberInputValue || '',
          });
        } else if (item.customValue) {
          // 文本输入
          productAttributes.push({
            vid: 0,
            pid: prop.pid,
            templatePid: prop.templatePid,
            refPid: prop.refPid || 0,
            propName: prop.name,
            propValue: item.customValue,
            valueUnit: '',
            numberInputValue: item.numberInputValue || '',
          });
        }
      });

      // 创建分类
      const req: CreateTemuCategoryRequest = {
        catId: pendingCategory.catId,
        catName: pendingCategory.catName,
        catLevel: pendingCategory.catLevel,
        parentCatId: pendingCategory.parentCatId || undefined,
        isLeaf: pendingCategory.isLeaf,
        catType: pendingCategory.catType,
        fullPath: fullPath,
        label: pendingLabel.trim() || undefined,  // 添加标签
        productAttributes: productAttributes.length > 0 ? productAttributes : undefined,
      };

      await temuCategoryService.upsertCategory(req);

      // 重置状态
      setAddStep('select');
      setPendingCategory(null);
      setPendingCategoryPath(null);
      setAttributeFormValues([]);
      setFetchedAttributeCount(0);
      setPendingLabel('');  // 重置标签
      setShowAddFromTemuDialog(false);
      await fetchCategories();
    } catch (error: any) {
      console.error('添加分类失败:', error);
      toast.error(error.response?.data?.message || '添加分类失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 打开添加对话框
  const handleOpenAddDialog = () => {
    setShowAddFromTemuDialog(true);
    setTemuSearchKeyword('');
    setSearchResults([]);
    setBrowseColumns([]);
    setSelectedPath([]);
    setFetchedAttributeCount(0);
    setFetchingAttributes(false);
    setIsSearchMode(false);
    // 重置两步流程状态
    setAddStep('select');
    setPendingCategory(null);
    setPendingCategoryPath(null);
    setAttributeProperties([]);
    setAttributeFormValues([]);
    setPendingLabel('');  // 重置标签
    // 自动加载顶级分类
    loadTemuCategories(undefined, 0);
  };

  // 返回选择分类步骤
  const handleBackToSelect = () => {
    setAddStep('select');
    setPendingCategory(null);
    setPendingCategoryPath(null);
    setAttributeFormValues([]);
  };

  // 更新属性表单值
  const updateAttributeValue = (index: number, value: Partial<AttributeFormValue>) => {
    setAttributeFormValues(prev => {
      const newValues = [...prev];
      newValues[index] = { ...newValues[index], ...value };
      return newValues;
    });
  };

  // 打开属性配置对话框
  const handleConfigureAttributes = (category: TemuCategory) => {
    setConfiguringCategory(category);
    setAttributeJson(category.productAttributes ? JSON.stringify(category.productAttributes, null, 2) : '[]');
    setConfiguringLabel(category.label || '');
    setShowAttributeDialog(true);
  };

  // 保存属性配置
  const handleSaveAttributes = async () => {
    if (!configuringCategory) return;

    try {
      setSubmitting(true);
      let attributes: TemuProductAttribute[] = [];

      if (attributeJson.trim()) {
        try {
          attributes = JSON.parse(attributeJson);
        } catch (e) {
          toast.error('JSON 格式错误');
          return;
        }
      }

      const updateData: UpdateTemuCategoryRequest = {
        catName: configuringCategory.catName,
        catLevel: configuringCategory.catLevel,
        parentCatId: configuringCategory.parentCatId,
        isLeaf: configuringCategory.isLeaf,
        catType: configuringCategory.catType,
        fullPath: configuringCategory.fullPath,
        label: configuringLabel.trim() || undefined,
        productAttributes: attributes,
        isActive: configuringCategory.isActive,
      };

      await temuCategoryService.updateCategory(configuringCategory.id, updateData);
      setShowAttributeDialog(false);
      await fetchCategories();
    } catch (error: any) {
      console.error('保存属性失败:', error);
      toast.error(error.response?.data?.message || '保存属性失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换分类启用状态
  const handleToggleActive = async (category: TemuCategory) => {
    try {
      const updateData: UpdateTemuCategoryRequest = {
        catName: category.catName,
        catLevel: category.catLevel,
        parentCatId: category.parentCatId,
        isLeaf: category.isLeaf,
        catType: category.catType,
        fullPath: category.fullPath,
        label: category.label,
        productAttributes: category.productAttributes,
        isActive: !category.isActive,
      };

      await temuCategoryService.updateCategory(category.id, updateData);
      await fetchCategories();
    } catch (error: any) {
      console.error('切换状态失败:', error);
      toast.error(error.response?.data?.message || '切换状态失败');
    }
  };

  // 删除分类
  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      setSubmitting(true);
      await temuCategoryService.deleteCategory(deletingCategory.id);
      setShowDeleteDialog(false);
      setDeletingCategory(null);
      await fetchCategories();
    } catch (error: any) {
      console.error('删除分类失败:', error);
      toast.error(error.response?.data?.message || '删除分类失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 获取所有不重复的标签
  const allLabels = [...new Set(categories.map(c => c.label).filter(Boolean))] as string[];

  // 过滤分类
  const filteredCategories = categories.filter(c => {
    const matchesKeyword = c.catName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.fullPath?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      String(c.catId).includes(searchKeyword);
    const matchesLabel = !selectedLabel || c.label === selectedLabel;
    return matchesKeyword && matchesLabel;
  });

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temu 分类管理</h1>
          <p className="text-gray-600">管理 Temu 平台商品分类和产品属性配置</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCategories} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            从 Temu 添加
          </Button>
        </div>
      </div>

      {/* 搜索框和标签筛选 */}
      <div className="mb-4 flex gap-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索分类名称、路径或ID..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-10"
          />
        </div>
        {allLabels.length > 0 && (
          <Select value={selectedLabel || 'all'} onValueChange={(v) => setSelectedLabel(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部标签" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部标签</SelectItem>
              {allLabels.map(label => (
                <SelectItem key={label} value={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 分类列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">分类ID</TableHead>
              <TableHead className="w-32">分类名称</TableHead>
              <TableHead className="w-24">标签</TableHead>
              <TableHead>完整路径</TableHead>
              <TableHead className="w-24">属性数量</TableHead>
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-40 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {searchKeyword || selectedLabel ? '没有找到匹配的分类' : '暂无分类数据，点击"从 Temu 添加"按钮添加分类'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-mono text-sm">{category.catId}</TableCell>
                  <TableCell className="font-medium">{category.catName}</TableCell>
                  <TableCell>
                    {category.label ? (
                      <Badge variant="outline">{category.label}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm max-w-md truncate" title={category.fullPath}>
                    {category.fullPath || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.productAttributes && category.productAttributes.length > 0 ? 'default' : 'secondary'}>
                      {category.productAttributes?.length || 0} 个
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={() => handleToggleActive(category)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigureAttributes(category)}
                        title="配置产品属性"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeletingCategory(category);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 从 Temu 添加分类对话框 */}
      <Dialog open={showAddFromTemuDialog} onOpenChange={(open) => {
        if (!open) {
          setAddStep('select');
          setPendingCategory(null);
          setPendingCategoryPath(null);
          setAttributeFormValues([]);
        }
        setShowAddFromTemuDialog(open);
      }}>
        <DialogContent className="sm:max-w-6xl max-w-6xl h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {addStep === 'select' ? '从 Temu 平台添加分类' : '填写产品属性'}
            </DialogTitle>
            <DialogDescription>
              {addStep === 'select'
                ? '搜索或浏览 Temu 平台分类，可选择站点筛选'
                : `分类：${pendingCategory?.catName}，请填写必填的产品属性`
              }
            </DialogDescription>
          </DialogHeader>

          {/* 步骤1：选择分类 */}
          {addStep === 'select' && (
            <>
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {/* 站点选择和搜索框 */}
                <div className="flex items-center gap-2 mb-4">
                  <Select
                    value={selectedSiteId?.toString() || 'all'}
                    onValueChange={(value) => {
                      const newSiteId = value === 'all' ? undefined : parseInt(value);
                      setSelectedSiteId(newSiteId);
                      setBrowseColumns([]);
                      setSelectedPath([]);
                      setSearchResults([]);
                      loadTemuCategories(undefined, 0);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="全部站点" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部站点</SelectItem>
                      {temuSites.map((site) => (
                        <SelectItem key={site.siteId} value={site.siteId.toString()}>
                          {site.siteName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜索分类名称..."
                      value={temuSearchKeyword}
                      onChange={(e) => setTemuSearchKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTemuSearch()}
                      className="pl-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <Button onClick={handleTemuSearch} disabled={searching || !temuSearchKeyword.trim()}>
                    {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                  {isSearchMode && (
                    <Button variant="outline" size="icon" onClick={handleClearSearch}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* 当前选中路径 */}
                {selectedPath.length > 0 && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">当前选择：</div>
                      <div className="flex items-center flex-wrap gap-1">
                        {selectedPath.map((cat, index) => (
                          <div key={cat.catId} className="flex items-center">
                            <span className={`text-sm ${index === selectedPath.length - 1 ? 'font-medium text-primary' : 'text-gray-600'}`}>
                              {cat.catName}
                            </span>
                            {index < selectedPath.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* 选中叶子分类时显示添加按钮 */}
                    {selectedPath.length > 0 && selectedPath[selectedPath.length - 1].isLeaf && (
                      <div className="flex items-center gap-2 ml-4">
                        {fetchingAttributes ? (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            获取属性中...
                          </span>
                        ) : fetchedAttributeCount > 0 ? (
                          <span className="text-xs text-amber-600">
                            {fetchedAttributeCount} 个必填属性
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">无必填属性</span>
                        )}
                        <Button
                          size="sm"
                          onClick={handleAddFromBrowse}
                          disabled={categories.some(c => c.catId === selectedPath[selectedPath.length - 1].catId) || fetchingAttributes}
                        >
                          {categories.some(c => c.catId === selectedPath[selectedPath.length - 1].catId) ? (
                            '已添加'
                          ) : fetchedAttributeCount > 0 ? (
                            '填写属性'
                          ) : (
                            '添加'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* 搜索模式：扁平列表 */}
                {isSearchMode ? (
                  <div className="flex-1 border rounded-lg overflow-hidden flex flex-col min-h-0">
                    <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
                      搜索结果 ({searchResults.length})
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {searchResults.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500 py-12">
                          <Search className="w-8 h-8 mr-3 text-gray-300" />
                          <span>未找到匹配的分类，请尝试其他关键词</span>
                        </div>
                      ) : (
                        searchResults.map((path, index) => {
                          const fullPath = getPathFromSearchResult(path);
                          const leafCategory = fullPath[fullPath.length - 1];
                          const isSelected = selectedPath.length > 0 &&
                            selectedPath[selectedPath.length - 1]?.catId === leafCategory?.catId;
                          const isAdded = leafCategory && categories.some(c => c.catId === leafCategory.catId);

                          return (
                            <div
                              key={index}
                              onClick={() => handleSelectSearchResult(path)}
                              className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 ${
                                isSelected ? 'bg-primary/10' : ''
                              } ${isAdded ? 'bg-green-50' : ''}`}
                            >
                              <div className="flex items-center flex-wrap gap-1 flex-1 min-w-0">
                                {fullPath.map((cat, catIndex) => (
                                  <div key={cat.catId} className="flex items-center">
                                    <span className={`text-sm ${catIndex === fullPath.length - 1 ? 'font-medium text-primary' : 'text-gray-600'}`}>
                                      {cat.catName}
                                    </span>
                                    {catIndex < fullPath.length - 1 && (
                                      <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
                                    )}
                                  </div>
                                ))}
                              </div>
                              {isAdded && (
                                <Badge variant="outline" className="text-xs text-green-600 px-1 ml-2 shrink-0">已添加</Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  /* 浏览模式：多列分类浏览器 */
                  <div className="flex-1 border rounded-lg overflow-x-auto overflow-y-hidden flex flex-col min-h-0">
                    <div className="flex-1 flex min-h-0 min-w-max">
                      {browseColumns.length === 0 && loadingColumn === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                          <span className="ml-2 text-gray-500">加载分类中...</span>
                        </div>
                      ) : browseColumns.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <Button variant="outline" onClick={() => loadTemuCategories(undefined, 0)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            加载分类
                          </Button>
                        </div>
                      ) : (
                        browseColumns.map((column, colIndex) => (
                          <div
                            key={colIndex}
                            className="w-48 flex-shrink-0 border-r last:border-r-0 flex flex-col min-h-0"
                          >
                            <div className="p-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
                              {colIndex === 0 ? '一级分类' : `${colIndex + 1}级分类`}
                            </div>
                            <div className="flex-1 overflow-y-auto">
                              {loadingColumn === colIndex ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                  加载中...
                                </div>
                              ) : (
                                column.map((cat) => {
                                  const isSelected = selectedPath[colIndex]?.catId === cat.catId;
                                  const isAdded = categories.some(c => c.catId === cat.catId);

                                  return (
                                    <div
                                      key={cat.catId}
                                      onClick={() => handleSelectCategory(cat, colIndex)}
                                      className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm hover:bg-gray-50 border-b border-gray-100 ${
                                        isSelected ? 'bg-primary/10 text-primary font-medium' : ''
                                      } ${isAdded ? 'bg-green-50' : ''}`}
                                    >
                                      <span className="truncate flex-1">{cat.catName}</span>
                                      <div className="flex items-center gap-1 ml-1">
                                        {isAdded && (
                                          <Badge variant="outline" className="text-xs text-green-600 px-1">已添加</Badge>
                                        )}
                                        {!cat.isLeaf && (
                                          <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddFromTemuDialog(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          )}

          {/* 步骤2：填写属性 */}
          {addStep === 'attributes' && pendingCategory && (
            <>
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {/* 分类路径 */}
                <div className="flex items-center gap-1 mb-4 text-sm text-gray-500">
                  {selectedPath.map((cat, index) => (
                    <div key={cat.catId} className="flex items-center">
                      <span className={index === selectedPath.length - 1 ? 'text-gray-900 font-medium' : ''}>
                        {cat.catName}
                      </span>
                      {index < selectedPath.length - 1 && (
                        <ChevronRight className="w-4 h-4 mx-0.5" />
                      )}
                    </div>
                  ))}
                </div>

                {/* 表单内容 */}
                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* 标签 */}
                  <div className="flex items-center gap-3">
                    <Label className="text-sm w-20 shrink-0">标签</Label>
                    <Input
                      placeholder="如：日历"
                      value={pendingLabel}
                      onChange={(e) => setPendingLabel(e.target.value)}
                      className="max-w-48"
                    />
                  </div>

                  {/* Temu 属性 */}
                  {attributeFormValues.map((item, index) => (
                    <div key={item.property.templatePid} className="flex items-start gap-3">
                      <Label className="text-sm w-20 shrink-0 pt-2">{item.property.name}</Label>
                      <div className="flex-1">
                        {item.property.values && item.property.values.length > 0 ? (
                          isMultiSelect(item.property) ? (
                            <div className="grid grid-cols-6 gap-x-2 gap-y-1">
                              {item.property.values.map((val) => {
                                const isChecked = item.selectedValues?.some(v => v.vid === val.vid) ?? false;
                                const isDisabled = !isChecked &&
                                  (item.selectedValues?.length ?? 0) >= (item.property.chooseMaxNum ?? 1);
                                return (
                                  <div key={val.vid} className="flex items-center space-x-1">
                                    <Checkbox
                                      id={`attr-${item.property.templatePid}-${val.vid}`}
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onCheckedChange={(checked) => {
                                        const currentValues = item.selectedValues || [];
                                        if (checked) {
                                          updateAttributeValue(index, {
                                            selectedValues: [...currentValues, val],
                                            selectedValue: undefined,
                                            customValue: undefined
                                          });
                                        } else {
                                          updateAttributeValue(index, {
                                            selectedValues: currentValues.filter(v => v.vid !== val.vid),
                                            selectedValue: undefined,
                                            customValue: undefined
                                          });
                                        }
                                      }}
                                    />
                                    <label
                                      htmlFor={`attr-${item.property.templatePid}-${val.vid}`}
                                      className={`text-sm cursor-pointer truncate ${isDisabled ? 'text-gray-400' : ''}`}
                                    >
                                      {val.value}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <Select
                              value={item.selectedValue?.vid?.toString() || ''}
                              onValueChange={(vid) => {
                                const selectedVal = item.property.values?.find(v => v.vid.toString() === vid);
                                updateAttributeValue(index, {
                                  selectedValue: selectedVal,
                                  selectedValues: undefined,
                                  customValue: undefined
                                });
                              }}
                            >
                              <SelectTrigger className="max-w-48">
                                <SelectValue placeholder="请选择" />
                              </SelectTrigger>
                              <SelectContent>
                                {item.property.values.map((val) => (
                                  <SelectItem key={val.vid} value={val.vid.toString()}>
                                    {val.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )
                        ) : (
                          <Input
                            placeholder="请输入"
                            value={item.customValue || ''}
                            onChange={(e) => updateAttributeValue(index, { customValue: e.target.value })}
                            className="max-w-48"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={handleBackToSelect}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回
                </Button>
                <Button
                  onClick={addCategoryToDatabase}
                  disabled={submitting || (attributeFormValues.length > 0 && !attributeFormValues.every(item => {
                    if (isMultiSelect(item.property)) {
                      return (item.selectedValues?.length ?? 0) > 0;
                    }
                    return item.selectedValue || item.customValue;
                  }))}
                >
                  {submitting ? '添加中...' : '确认添加'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 属性配置对话框 */}
      <Dialog open={showAttributeDialog} onOpenChange={setShowAttributeDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>配置产品属性</DialogTitle>
            <DialogDescription>
              分类：{configuringCategory?.catName} (ID: {configuringCategory?.catId})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* 标签输入 */}
            <div className="flex items-center gap-4">
              <Label className="font-medium w-16 shrink-0">标签</Label>
              <Input
                placeholder="输入标签，如：日历、挂钟（用于分组筛选）"
                value={configuringLabel}
                onChange={(e) => setConfiguringLabel(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>产品属性用于商品上架时填充 Temu 平台的属性字段。</p>
              <p className="mt-1">格式为 JSON 数组，每个属性包含以下字段：</p>
              <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
                {`[{"propName":"材料","pid":89,"templatePid":909872,"vid":"2491","propValue":"纸","refPid":121}]`}
              </code>
            </div>

            <div className="flex-1 overflow-hidden">
              <Label className="mb-2 block">产品属性 JSON</Label>
              <textarea
                className="w-full h-[250px] p-3 border rounded-lg font-mono text-sm resize-none"
                value={attributeJson}
                onChange={(e) => setAttributeJson(e.target.value)}
                placeholder="输入产品属性 JSON 数组..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttributeDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveAttributes} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除分类 "{deletingCategory?.catName}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {submitting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
