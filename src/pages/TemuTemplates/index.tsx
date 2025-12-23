import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2, RefreshCw, Search, Pencil } from 'lucide-react';
import { temuTemplateService, type TemuTemplate, type TemuProductAttribute, type CreateTemuTemplateRequest, type UpdateTemuTemplateRequest, type TemuSpecification, type TemuSkuDefaultConfig, type TemuSpecVolumeWeightConfig } from '@/services/temuTemplateService';
import { temuCategoryAPIService, type TemuCategoryPath, type TemuAPICategory, type ProductAttributeProperty, type ProductAttributeValue, type ParentSpecification } from '@/services/temuShopCategoryService';
import { systemConfigService } from '@/services/systemConfigService';
import { toast } from 'sonner';
import { TemuSite, AttributeFormValue, isMultiSelect } from './types';
import { AddTemplateDialog } from './AddTemplateDialog';
import { EditTemplateDialog } from './EditTemplateDialog';

export function TemuTemplates() {
  const [templates, setTemplates] = useState<TemuTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<TemuTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 从 Temu 平台添加模板相关状态
  const [showAddFromTemuDialog, setShowAddFromTemuDialog] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>(undefined);
  const [temuSearchKeyword, setTemuSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<TemuCategoryPath[]>([]);
  const [searching, setSearching] = useState(false);
  const [browseColumns, setBrowseColumns] = useState<TemuAPICategory[][]>([]);
  const [selectedPath, setSelectedPath] = useState<TemuAPICategory[]>([]);
  const [loadingColumn, setLoadingColumn] = useState<number | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [fetchedAttributeCount, setFetchedAttributeCount] = useState<number>(0);
  const [fetchingAttributes, setFetchingAttributes] = useState(false);

  // 两步流程相关状态：选择Temu分类 -> 填写属性
  const [addStep, setAddStep] = useState<'select' | 'attributes'>('select');
  const [pendingCategory, setPendingCategory] = useState<TemuAPICategory | null>(null);
  const [pendingCategoryPath, setPendingCategoryPath] = useState<TemuCategoryPath | null>(null);
  const [attributeProperties, setAttributeProperties] = useState<ProductAttributeProperty[]>([]);
  const [attributeFormValues, setAttributeFormValues] = useState<AttributeFormValue[]>([]);
  const [pendingName, setPendingName] = useState<string>('');

  // Temu 站点列表
  const [temuSites, setTemuSites] = useState<TemuSite[]>([]);

  // 规格配置相关状态
  const [inputMaxSpecNum, setInputMaxSpecNum] = useState<number>(0);
  const [singleSpecValueNum, setSingleSpecValueNum] = useState<number>(0);
  const [parentSpecs, setParentSpecs] = useState<ParentSpecification[]>([]);
  const [specFormValues, setSpecFormValues] = useState<TemuSpecification[]>([]);
  const [fetchingParentSpecs, setFetchingParentSpecs] = useState(false);

  // 编辑模板相关状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemuTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecFormValues, setEditSpecFormValues] = useState<TemuSpecification[]>([]);
  const [editParentSpecs, setEditParentSpecs] = useState<ParentSpecification[]>([]);
  const [editInputMaxSpecNum, setEditInputMaxSpecNum] = useState<number>(0);
  const [editSingleSpecValueNum, setEditSingleSpecValueNum] = useState<number>(0);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [editAttributeFormValues, setEditAttributeFormValues] = useState<AttributeFormValue[]>([]);
  // 编辑模式下的分类变更状态
  const [editIsChangingCategory, setEditIsChangingCategory] = useState(false);
  const [editTemuSearchKeyword, setEditTemuSearchKeyword] = useState('');
  const [editSearchResults, setEditSearchResults] = useState<TemuCategoryPath[]>([]);
  const [editSearching, setEditSearching] = useState(false);
  const [editBrowseColumns, setEditBrowseColumns] = useState<TemuAPICategory[][]>([]);
  const [editSelectedPath, setEditSelectedPath] = useState<TemuAPICategory[]>([]);
  const [editLoadingColumn, setEditLoadingColumn] = useState<number | null>(null);
  const [editIsSearchMode, setEditIsSearchMode] = useState(false);
  const [editPendingCategory, setEditPendingCategory] = useState<TemuAPICategory | null>(null);
  const [editFetchingAttributes, setEditFetchingAttributes] = useState(false);

  // SKU 默认配置状态（添加模板）
  const [skuDefaultConfig, setSkuDefaultConfig] = useState<TemuSkuDefaultConfig>({});
  const [volumeWeightConfigs, setVolumeWeightConfigs] = useState<TemuSpecVolumeWeightConfig[]>([]);

  // SKU 默认配置状态（编辑模板）
  const [editSkuDefaultConfig, setEditSkuDefaultConfig] = useState<TemuSkuDefaultConfig>({});
  const [editVolumeWeightConfigs, setEditVolumeWeightConfigs] = useState<TemuSpecVolumeWeightConfig[]>([]);

  // 用于防止加载编辑数据时 useEffect 覆盖已加载的配置
  const isLoadingEditDataRef = useRef(false);

  // 根据规格配置生成体积重量配置列表
  const generateVolumeWeightConfigs = (specs: TemuSpecification[]): TemuSpecVolumeWeightConfig[] => {
    if (specs.length === 0) {
      return [{
        specValues: ['默认'],
        isSensitive: false,
        sensitiveList: [],
        longestSide: 0,
        middleSide: 0,
        shortestSide: 0,
        weight: 0,
      }];
    }

    const configs: TemuSpecVolumeWeightConfig[] = [];
    const generateCombinations = (specIndex: number, currentValues: string[]) => {
      if (specIndex >= specs.length) {
        configs.push({
          specValues: [...currentValues],
          isSensitive: false,
          sensitiveList: [],
          longestSide: 0,
          middleSide: 0,
          shortestSide: 0,
          weight: 0,
        });
        return;
      }
      const spec = specs[specIndex];
      if (spec.specValues && spec.specValues.length > 0) {
        for (const specValue of spec.specValues) {
          generateCombinations(specIndex + 1, [...currentValues, specValue.specName]);
        }
      } else {
        generateCombinations(specIndex + 1, currentValues);
      }
    };
    generateCombinations(0, []);
    return configs;
  };

  // 更新单个体积重量配置
  const updateVolumeWeightConfig = (index: number, data: Partial<TemuSpecVolumeWeightConfig>) => {
    setVolumeWeightConfigs(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], ...data };
      return newList;
    });
  };

  // 更新编辑模式的单个体积重量配置
  const updateEditVolumeWeightConfig = (index: number, data: Partial<TemuSpecVolumeWeightConfig>) => {
    setEditVolumeWeightConfigs(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], ...data };
      return newList;
    });
  };

  // 当规格配置变化时，重新生成体积重量配置
  useEffect(() => {
    const newConfigs = generateVolumeWeightConfigs(specFormValues);
    setVolumeWeightConfigs(newConfigs);
  }, [specFormValues]);

  // 当编辑模式的规格配置变化时，重新生成体积重量配置
  // 注意：如果正在加载编辑数据，则不重新生成，以保留从数据库加载的配置
  useEffect(() => {
    if (isLoadingEditDataRef.current) {
      return;
    }
    if (editSpecFormValues.length > 0) {
      const newConfigs = generateVolumeWeightConfigs(editSpecFormValues);
      setEditVolumeWeightConfigs(newConfigs);
    }
  }, [editSpecFormValues]);

  // 加载模板列表
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await temuTemplateService.getAllTemplates();
      setTemplates(response.templates);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      toast.error('获取模板列表失败');
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
        setTemuSites(sites.filter(s => s.isOpen !== false));
      }
    } catch (error) {
      console.error('加载站点配置失败:', error);
      setTemuSites([
        { siteId: 211, siteName: '美国站' },
        { siteId: 221, siteName: '欧洲站' },
      ]);
    }
  };

  useEffect(() => {
    fetchTemplates();
    loadTemuSites();
  }, []);

  // 从搜索结果中提取完整路径
  const getPathFromSearchResult = (path: TemuCategoryPath): TemuAPICategory[] => {
    const result: TemuAPICategory[] = [];
    for (let i = 1; i <= 10; i++) {
      const cat = path[`cat${i}` as keyof TemuCategoryPath] as TemuAPICategory | undefined;
      if (cat) result.push(cat);
    }
    return result;
  };

  // 将搜索结果转换为层级列
  const convertSearchResultsToColumns = (paths: TemuCategoryPath[]): TemuAPICategory[][] => {
    if (paths.length === 0) return [];

    let maxLevel = 0;
    paths.forEach(path => {
      for (let i = 10; i >= 1; i--) {
        if (path[`cat${i}` as keyof TemuCategoryPath]) {
          maxLevel = Math.max(maxLevel, i);
          break;
        }
      }
    });

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

  // 选择搜索结果
  const handleSelectSearchResult = async (path: TemuCategoryPath) => {
    const fullPath = getPathFromSearchResult(path);
    const leafCategory = fullPath[fullPath.length - 1];

    if (!leafCategory) return;

    setSelectedPath(fullPath);

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
      setFetchedAttributeCount(0);
      setAttributeProperties([]);

      if (isSearchMode) {
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
        setBrowseColumns(newColumns);
      } else {
        await loadTemuCategories(category.catId, columnIndex + 1);
      }
    } else {
      if (isSearchMode) {
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

      try {
        setFetchingAttributes(true);
        setFetchedAttributeCount(0);
        setAttributeProperties([]);
        setInputMaxSpecNum(0);
        setSingleSpecValueNum(0);
        setParentSpecs([]);

        const attrsResponse = await temuCategoryAPIService.getProductAttributes(category.catId);

        if (attrsResponse.properties && attrsResponse.properties.length > 0) {
          const requiredProps = attrsResponse.properties.filter(prop => prop.required);
          setAttributeProperties(requiredProps);
          setFetchedAttributeCount(requiredProps.length);
        }

        setInputMaxSpecNum(attrsResponse.inputMaxSpecNum ?? 0);
        setSingleSpecValueNum(attrsResponse.singleSpecValueNum ?? 0);

        if (attrsResponse.inputMaxSpecNum && attrsResponse.inputMaxSpecNum > 0) {
          setFetchingParentSpecs(true);
          try {
            const parentSpecsResponse = await temuCategoryAPIService.getParentSpecifications(category.catId);
            setParentSpecs(parentSpecsResponse.parentSpecs || []);
          } catch (specError: any) {
            console.error('获取父规格列表失败:', specError);
          } finally {
            setFetchingParentSpecs(false);
          }
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

    setPendingCategory(leafCategory);
    setPendingCategoryPath(null);

    setAttributeFormValues(attributeProperties.map(prop => ({ property: prop })));
    setSpecFormValues([]);
    setAddStep('attributes');
  };

  // 添加规格配置
  const handleAddSpec = () => {
    if (specFormValues.length >= inputMaxSpecNum) {
      toast.error(`最多只能添加 ${inputMaxSpecNum} 个规格`);
      return;
    }
    setSpecFormValues(prev => [...prev, {
      parentSpecId: 0,
      parentSpecName: '',
      specValues: []
    }]);
  };

  // 删除规格配置
  const handleRemoveSpec = (index: number) => {
    setSpecFormValues(prev => prev.filter((_, i) => i !== index));
  };

  // 更新规格的父规格
  const handleUpdateSpecParent = (index: number, parentSpecId: number) => {
    const parentSpec = parentSpecs.find(p => p.parentSpecId === parentSpecId);
    if (!parentSpec) return;

    setSpecFormValues(prev => {
      const newSpecs = [...prev];
      newSpecs[index] = {
        ...newSpecs[index],
        parentSpecId: parentSpec.parentSpecId,
        parentSpecName: parentSpec.parentSpecName,
      };
      return newSpecs;
    });
  };

  // 更新规格的子规格值（保留兼容性）
  const handleUpdateSpecValues = (index: number, valuesStr: string) => {
    const values = valuesStr.split(',').map(v => v.trim()).filter(v => v);
    setSpecFormValues(prev => {
      const newSpecs = [...prev];
      newSpecs[index] = {
        ...newSpecs[index],
        specValues: values.map(v => ({ specName: v })),
      };
      return newSpecs;
    });
  };

  // 添加单个规格值
  const handleAddSpecValue = (specIndex: number) => {
    setSpecFormValues(prev => {
      const newSpecs = [...prev];
      if (newSpecs[specIndex].specValues.length >= singleSpecValueNum) {
        toast.error(`每个规格最多只能添加 ${singleSpecValueNum} 个值`);
        return prev;
      }
      newSpecs[specIndex] = {
        ...newSpecs[specIndex],
        specValues: [...newSpecs[specIndex].specValues, { specName: '' }],
      };
      return newSpecs;
    });
  };

  // 删除单个规格值
  const handleRemoveSpecValue = (specIndex: number, valueIndex: number) => {
    setSpecFormValues(prev => {
      const newSpecs = [...prev];
      newSpecs[specIndex] = {
        ...newSpecs[specIndex],
        specValues: newSpecs[specIndex].specValues.filter((_, i) => i !== valueIndex),
      };
      return newSpecs;
    });
  };

  // 更新单个规格值
  const handleUpdateSpecValue = (specIndex: number, valueIndex: number, value: string) => {
    setSpecFormValues(prev => {
      const newSpecs = [...prev];
      const newValues = [...newSpecs[specIndex].specValues];
      newValues[valueIndex] = { specName: value };
      newSpecs[specIndex] = {
        ...newSpecs[specIndex],
        specValues: newValues,
      };
      return newSpecs;
    });
  };

  // 添加模板到数据库
  const addTemplateToDatabase = async () => {
    if (!pendingCategory) return;

    try {
      setSubmitting(true);

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

      const productAttributes: TemuProductAttribute[] = [];

      attributeFormValues.forEach(item => {
        const prop = item.property;

        if (isMultiSelect(prop) && item.selectedValues && item.selectedValues.length > 0) {
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

      const validSpecifications = specFormValues.filter(
        s => s.parentSpecId > 0 && s.specValues.length > 0
      );

      const hasVolumeWeightConfigs = volumeWeightConfigs.some(c =>
        c.longestSide > 0 || c.middleSide > 0 || c.shortestSide > 0 || c.weight > 0 || c.isSensitive
      );
      const hasSkuConfig = skuDefaultConfig.defaultSupplierPrice || skuDefaultConfig.defaultStockQuantity ||
        skuDefaultConfig.suggestedPrice || hasVolumeWeightConfigs;

      const finalSkuDefaultConfig: TemuSkuDefaultConfig | undefined = hasSkuConfig ? {
        ...skuDefaultConfig,
        volumeWeightConfigs: hasVolumeWeightConfigs ? volumeWeightConfigs : undefined,
      } : undefined;

      const req: CreateTemuTemplateRequest = {
        catId: pendingCategory.catId,
        catName: pendingCategory.catName,
        catLevel: pendingCategory.catLevel,
        parentCatId: pendingCategory.parentCatId || undefined,
        isLeaf: pendingCategory.isLeaf,
        catType: pendingCategory.catType,
        fullPath: fullPath,
        name: pendingName.trim() || undefined,
        productAttributes: productAttributes.length > 0 ? productAttributes : undefined,
        inputMaxSpecNum: inputMaxSpecNum > 0 ? inputMaxSpecNum : undefined,
        singleSpecValueNum: singleSpecValueNum > 0 ? singleSpecValueNum : undefined,
        specifications: validSpecifications.length > 0 ? validSpecifications : undefined,
        skuDefaultConfig: finalSkuDefaultConfig,
      };

      await temuTemplateService.upsertTemplate(req);

      setAddStep('select');
      setPendingCategory(null);
      setPendingCategoryPath(null);
      setAttributeFormValues([]);
      setFetchedAttributeCount(0);
      setPendingName('');
      setSpecFormValues([]);
      setSkuDefaultConfig({});
      setShowAddFromTemuDialog(false);
      await fetchTemplates();
    } catch (error: any) {
      console.error('添加模板失败:', error);
      toast.error(error.response?.data?.message || '添加模板失败');
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
    setAddStep('select');
    setPendingCategory(null);
    setPendingCategoryPath(null);
    setAttributeProperties([]);
    setAttributeFormValues([]);
    setPendingName('');
    setInputMaxSpecNum(0);
    setSingleSpecValueNum(0);
    setParentSpecs([]);
    setSpecFormValues([]);
    setSkuDefaultConfig({});
    loadTemuCategories(undefined, 0);
  };

  // 返回选择分类步骤
  const handleBackToSelect = () => {
    setAddStep('select');
    setPendingCategory(null);
    setPendingCategoryPath(null);
    setAttributeFormValues([]);
    setSpecFormValues([]);
    setSkuDefaultConfig({});
  };

  // 更新属性表单值
  const updateAttributeValue = (index: number, value: Partial<AttributeFormValue>) => {
    setAttributeFormValues(prev => {
      const newValues = [...prev];
      newValues[index] = { ...newValues[index], ...value };
      return newValues;
    });
  };

  // 切换模板启用状态
  const handleToggleActive = async (template: TemuTemplate) => {
    try {
      const updateData: UpdateTemuTemplateRequest = {
        catName: template.catName,
        catLevel: template.catLevel,
        parentCatId: template.parentCatId,
        isLeaf: template.isLeaf,
        catType: template.catType,
        fullPath: template.fullPath,
        name: template.name,
        productCategoryId: template.productCategoryId,
        productAttributes: template.productAttributes,
        isActive: !template.isActive,
      };

      await temuTemplateService.updateTemplate(template.id, updateData);
      await fetchTemplates();
    } catch (error: any) {
      console.error('切换状态失败:', error);
      toast.error(error.response?.data?.message || '切换状态失败');
    }
  };

  // 删除模板
  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      setSubmitting(true);
      await temuTemplateService.deleteTemplate(deletingTemplate.id);
      setShowDeleteDialog(false);
      setDeletingTemplate(null);
      await fetchTemplates();
    } catch (error: any) {
      console.error('删除模板失败:', error);
      toast.error(error.response?.data?.message || '删除模板失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 打开编辑对话框
  const handleOpenEditDialog = async (template: TemuTemplate) => {
    // 设置标志位，防止 useEffect 覆盖从数据库加载的配置
    isLoadingEditDataRef.current = true;

    setEditingTemplate(template);
    setEditName(template.name || '');
    setEditSpecFormValues(template.specifications || []);
    setEditInputMaxSpecNum(template.inputMaxSpecNum || 0);
    setEditSingleSpecValueNum(template.singleSpecValueNum || 0);
    setEditAttributeFormValues([]);
    setEditSkuDefaultConfig(template.skuDefaultConfig || {});
    if (template.skuDefaultConfig?.volumeWeightConfigs && template.skuDefaultConfig.volumeWeightConfigs.length > 0) {
      setEditVolumeWeightConfigs(template.skuDefaultConfig.volumeWeightConfigs);
    } else {
      const specs = template.specifications || [];
      setEditVolumeWeightConfigs(generateVolumeWeightConfigs(specs));
    }
    setShowEditDialog(true);
    setLoadingEditData(true);

    // 在下一个事件循环中重置标志位，允许后续用户操作触发 useEffect
    setTimeout(() => {
      isLoadingEditDataRef.current = false;
    }, 0);

    try {
      const attrsResponse = await temuCategoryAPIService.getProductAttributes(template.catId);

      if (attrsResponse.properties && attrsResponse.properties.length > 0) {
        const requiredProps = attrsResponse.properties.filter(prop => prop.required);

        const formValues: AttributeFormValue[] = requiredProps.map(prop => {
          const existingAttrs = template.productAttributes?.filter(a => a.templatePid === prop.templatePid) || [];

          if (existingAttrs.length > 0) {
            if (isMultiSelect(prop)) {
              const selectedValues = existingAttrs
                .map(attr => prop.values?.find(v => v.vid === attr.vid))
                .filter((v): v is ProductAttributeValue => v !== undefined);
              return {
                property: prop,
                selectedValues: selectedValues.length > 0 ? selectedValues : undefined,
                customValue: selectedValues.length === 0 ? existingAttrs[0]?.propValue : undefined,
              };
            } else {
              const existingAttr = existingAttrs[0];
              const selectedValue = prop.values?.find(v => v.vid === existingAttr.vid);
              return {
                property: prop,
                selectedValue: selectedValue,
                customValue: !selectedValue ? existingAttr.propValue : undefined,
              };
            }
          }
          return { property: prop };
        });
        setEditAttributeFormValues(formValues);
      }

      setEditInputMaxSpecNum(attrsResponse.inputMaxSpecNum ?? 0);
      setEditSingleSpecValueNum(attrsResponse.singleSpecValueNum ?? 0);

      if (attrsResponse.inputMaxSpecNum && attrsResponse.inputMaxSpecNum > 0) {
        const parentSpecsResponse = await temuCategoryAPIService.getParentSpecifications(template.catId);
        setEditParentSpecs(parentSpecsResponse.parentSpecs || []);
      }
    } catch (error) {
      console.error('获取属性模板失败:', error);
      toast.error('获取属性模板失败');
    } finally {
      setLoadingEditData(false);
    }
  };

  // 编辑规格相关操作
  const handleEditAddSpec = () => {
    if (editSpecFormValues.length >= editInputMaxSpecNum) {
      toast.error(`最多只能添加 ${editInputMaxSpecNum} 个规格`);
      return;
    }
    setEditSpecFormValues(prev => [...prev, {
      parentSpecId: 0,
      parentSpecName: '',
      specValues: []
    }]);
  };

  const handleEditRemoveSpec = (index: number) => {
    setEditSpecFormValues(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditUpdateSpecParent = (index: number, parentSpecId: number) => {
    const parentSpec = editParentSpecs.find(p => p.parentSpecId === parentSpecId);
    if (!parentSpec) return;

    setEditSpecFormValues(prev => {
      const newSpecs = [...prev];
      newSpecs[index] = {
        ...newSpecs[index],
        parentSpecId: parentSpec.parentSpecId,
        parentSpecName: parentSpec.parentSpecName,
      };
      return newSpecs;
    });
  };

  const handleEditUpdateSpecValues = (index: number, valuesStr: string) => {
    const values = valuesStr.split(',').map(v => v.trim()).filter(v => v);
    setEditSpecFormValues(prev => {
      const newSpecs = [...prev];
      newSpecs[index] = {
        ...newSpecs[index],
        specValues: values.map(v => ({ specName: v })),
      };
      return newSpecs;
    });
  };

  // 添加单个编辑规格值
  const handleEditAddSpecValue = (specIndex: number) => {
    setEditSpecFormValues(prev => {
      const newSpecs = [...prev];
      if (newSpecs[specIndex].specValues.length >= editSingleSpecValueNum) {
        toast.error(`每个规格最多只能添加 ${editSingleSpecValueNum} 个值`);
        return prev;
      }
      newSpecs[specIndex] = {
        ...newSpecs[specIndex],
        specValues: [...newSpecs[specIndex].specValues, { specName: '' }],
      };
      return newSpecs;
    });
  };

  // 删除单个编辑规格值
  const handleEditRemoveSpecValue = (specIndex: number, valueIndex: number) => {
    setEditSpecFormValues(prev => {
      const newSpecs = [...prev];
      newSpecs[specIndex] = {
        ...newSpecs[specIndex],
        specValues: newSpecs[specIndex].specValues.filter((_, i) => i !== valueIndex),
      };
      return newSpecs;
    });
  };

  // 更新单个编辑规格值
  const handleEditUpdateSpecValue = (specIndex: number, valueIndex: number, value: string) => {
    setEditSpecFormValues(prev => {
      const newSpecs = [...prev];
      const newValues = [...newSpecs[specIndex].specValues];
      newValues[valueIndex] = { specName: value };
      newSpecs[specIndex] = {
        ...newSpecs[specIndex],
        specValues: newValues,
      };
      return newSpecs;
    });
  };

  // 更新编辑属性表单值
  const updateEditAttributeValue = (index: number, value: Partial<AttributeFormValue>) => {
    setEditAttributeFormValues(prev => {
      const newValues = [...prev];
      newValues[index] = { ...newValues[index], ...value };
      return newValues;
    });
  };

  // 编辑模式 - 加载 Temu 分类层级
  const loadEditTemuCategories = async (parentCatId?: number, columnIndex: number = 0) => {
    try {
      setEditLoadingColumn(columnIndex);
      const response = await temuCategoryAPIService.getCategories(
        parentCatId,
        false,
        selectedSiteId
      );

      const newColumns = [...editBrowseColumns.slice(0, columnIndex), response.categories || []];
      setEditBrowseColumns(newColumns);

      if (columnIndex === 0) {
        setEditSelectedPath([]);
      }
    } catch (error: any) {
      console.error('加载分类失败:', error);
      toast.error(error.response?.data?.message || '加载分类失败');
    } finally {
      setEditLoadingColumn(null);
    }
  };

  // 编辑模式 - 搜索 Temu 分类
  const handleEditTemuSearch = async () => {
    if (!editTemuSearchKeyword.trim()) return;

    try {
      setEditSearching(true);
      setEditSelectedPath([]);
      const response = await temuCategoryAPIService.searchCategories(
        editTemuSearchKeyword.trim(),
        selectedSiteId
      );
      const paths = response.categoryPaths || [];
      setEditSearchResults(paths);
      setEditIsSearchMode(true);
    } catch (error: any) {
      console.error('搜索分类失败:', error);
      toast.error(error.response?.data?.message || '搜索分类失败');
    } finally {
      setEditSearching(false);
    }
  };

  // 编辑模式 - 选择搜索结果
  const handleEditSelectSearchResult = async (path: TemuCategoryPath) => {
    const fullPath = getPathFromSearchResult(path);
    const leafCategory = fullPath[fullPath.length - 1];

    if (!leafCategory) return;

    setEditSelectedPath(fullPath);

    if (leafCategory.isLeaf) {
      setEditPendingCategory(leafCategory);
    }
  };

  // 编辑模式 - 清除搜索
  const handleEditClearSearch = () => {
    setEditTemuSearchKeyword('');
    setEditSearchResults([]);
    setEditIsSearchMode(false);
    setEditSelectedPath([]);
    loadEditTemuCategories(undefined, 0);
  };

  // 编辑模式 - 选择分类
  const handleEditSelectCategory = async (category: TemuAPICategory, columnIndex: number) => {
    const newPath = [...editSelectedPath.slice(0, columnIndex), category];
    setEditSelectedPath(newPath);

    if (!category.isLeaf) {
      setEditPendingCategory(null);

      if (editIsSearchMode) {
        const filteredPaths = editSearchResults.filter(path => {
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
        setEditBrowseColumns(newColumns);
      } else {
        await loadEditTemuCategories(category.catId, columnIndex + 1);
      }
    } else {
      if (editIsSearchMode) {
        const filteredPaths = editSearchResults.filter(path => {
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
        setEditBrowseColumns(newColumns.slice(0, columnIndex + 1));
      } else {
        setEditBrowseColumns(editBrowseColumns.slice(0, columnIndex + 1));
      }

      setEditPendingCategory(category);
    }
  };

  // 编辑模式 - 确认分类变更
  const handleEditConfirmCategory = async () => {
    if (!editPendingCategory || !editingTemplate) return;

    try {
      setEditFetchingAttributes(true);

      // 获取新分类的属性
      const attrsResponse = await temuCategoryAPIService.getProductAttributes(editPendingCategory.catId);

      // 更新编辑模板的分类信息
      const newFullPath = editSelectedPath.map(c => c.catName).join(' > ');
      setEditingTemplate({
        ...editingTemplate,
        catId: editPendingCategory.catId,
        catName: editPendingCategory.catName,
        catLevel: editPendingCategory.catLevel,
        parentCatId: editPendingCategory.parentCatId,
        isLeaf: editPendingCategory.isLeaf,
        catType: editPendingCategory.catType,
        fullPath: newFullPath,
        // 保存分类链
        cat1Id: editSelectedPath[0]?.catId,
        cat2Id: editSelectedPath[1]?.catId,
        cat3Id: editSelectedPath[2]?.catId,
        cat4Id: editSelectedPath[3]?.catId,
        cat5Id: editSelectedPath[4]?.catId,
        cat6Id: editSelectedPath[5]?.catId,
        cat7Id: editSelectedPath[6]?.catId,
        cat8Id: editSelectedPath[7]?.catId,
        cat9Id: editSelectedPath[8]?.catId,
        cat10Id: editSelectedPath[9]?.catId,
      });

      // 更新属性表单
      if (attrsResponse.properties && attrsResponse.properties.length > 0) {
        const requiredProps = attrsResponse.properties.filter(prop => prop.required);
        setEditAttributeFormValues(requiredProps.map(prop => ({ property: prop })));
      } else {
        setEditAttributeFormValues([]);
      }

      // 更新规格配置
      setEditInputMaxSpecNum(attrsResponse.inputMaxSpecNum ?? 0);
      setEditSingleSpecValueNum(attrsResponse.singleSpecValueNum ?? 0);
      setEditSpecFormValues([]);
      setEditSkuDefaultConfig({});
      setEditVolumeWeightConfigs([]);

      if (attrsResponse.inputMaxSpecNum && attrsResponse.inputMaxSpecNum > 0) {
        const parentSpecsResponse = await temuCategoryAPIService.getParentSpecifications(editPendingCategory.catId);
        setEditParentSpecs(parentSpecsResponse.parentSpecs || []);
      } else {
        setEditParentSpecs([]);
      }

      // 关闭分类选择模式
      setEditIsChangingCategory(false);
      setEditPendingCategory(null);
      toast.success('分类已变更，请重新填写属性');
    } catch (error: any) {
      console.error('获取新分类属性失败:', error);
      toast.error(error.response?.data?.message || '获取新分类属性失败');
    } finally {
      setEditFetchingAttributes(false);
    }
  };

  // 编辑模式 - 开始更改分类
  const handleEditStartChangeCategory = () => {
    setEditIsChangingCategory(true);
    setEditTemuSearchKeyword('');
    setEditSearchResults([]);
    setEditBrowseColumns([]);
    setEditSelectedPath([]);
    setEditIsSearchMode(false);
    setEditPendingCategory(null);
    loadEditTemuCategories(undefined, 0);
  };

  // 编辑模式 - 取消更改分类
  const handleEditCancelChangeCategory = () => {
    setEditIsChangingCategory(false);
    setEditPendingCategory(null);
    setEditSelectedPath([]);
    setEditBrowseColumns([]);
    setEditSearchResults([]);
    setEditTemuSearchKeyword('');
    setEditIsSearchMode(false);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTemplate) return;

    try {
      setSubmitting(true);

      const productAttributes: TemuProductAttribute[] = [];
      editAttributeFormValues.forEach(item => {
        const prop = item.property;

        if (isMultiSelect(prop) && item.selectedValues && item.selectedValues.length > 0) {
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

      const validSpecifications = editSpecFormValues.filter(
        s => s.parentSpecId > 0 && s.specValues.length > 0
      );

      const hasEditVolumeWeightConfigs = editVolumeWeightConfigs.some(c =>
        c.longestSide > 0 || c.middleSide > 0 || c.shortestSide > 0 || c.weight > 0 || c.isSensitive
      );
      const hasSkuConfig = editSkuDefaultConfig.defaultSupplierPrice || editSkuDefaultConfig.defaultStockQuantity ||
        editSkuDefaultConfig.suggestedPrice || hasEditVolumeWeightConfigs;

      const finalEditSkuDefaultConfig: TemuSkuDefaultConfig | undefined = hasSkuConfig ? {
        ...editSkuDefaultConfig,
        volumeWeightConfigs: hasEditVolumeWeightConfigs ? editVolumeWeightConfigs : undefined,
      } : undefined;

      const updateData: UpdateTemuTemplateRequest = {
        catId: editingTemplate.catId,
        catName: editingTemplate.catName,
        catLevel: editingTemplate.catLevel,
        parentCatId: editingTemplate.parentCatId,
        isLeaf: editingTemplate.isLeaf,
        catType: editingTemplate.catType,
        fullPath: editingTemplate.fullPath,
        // 分类链
        cat1Id: editingTemplate.cat1Id,
        cat2Id: editingTemplate.cat2Id,
        cat3Id: editingTemplate.cat3Id,
        cat4Id: editingTemplate.cat4Id,
        cat5Id: editingTemplate.cat5Id,
        cat6Id: editingTemplate.cat6Id,
        cat7Id: editingTemplate.cat7Id,
        cat8Id: editingTemplate.cat8Id,
        cat9Id: editingTemplate.cat9Id,
        cat10Id: editingTemplate.cat10Id,
        name: editName.trim() || undefined,
        productAttributes: productAttributes.length > 0 ? productAttributes : undefined,
        isActive: editingTemplate.isActive,
        inputMaxSpecNum: editInputMaxSpecNum > 0 ? editInputMaxSpecNum : undefined,
        singleSpecValueNum: editSingleSpecValueNum > 0 ? editSingleSpecValueNum : undefined,
        specifications: validSpecifications.length > 0 ? validSpecifications : undefined,
        skuDefaultConfig: finalEditSkuDefaultConfig,
      };

      await temuTemplateService.updateTemplate(editingTemplate.id, updateData);
      toast.success('模板更新成功');
      setShowEditDialog(false);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (error: any) {
      console.error('更新模板失败:', error);
      toast.error(error.response?.data?.message || '更新模板失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 关闭编辑对话框
  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingTemplate(null);
    setEditName('');
    setEditSpecFormValues([]);
    setEditParentSpecs([]);
    setEditAttributeFormValues([]);
    setEditSkuDefaultConfig({});
    // 重置分类变更相关状态
    setEditIsChangingCategory(false);
    setEditTemuSearchKeyword('');
    setEditSearchResults([]);
    setEditBrowseColumns([]);
    setEditSelectedPath([]);
    setEditIsSearchMode(false);
    setEditPendingCategory(null);
  };

  // 过滤并按名称排序模板
  const filteredTemplates = templates
    .filter(c => {
      const matchesKeyword = c.catName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.fullPath?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        String(c.catId).includes(searchKeyword);
      return matchesKeyword;
    })
    .sort((a, b) => {
      // 优先按模板名称排序，没有名称则按分类名称排序
      const nameA = (a.name || a.catName || '').toLowerCase();
      const nameB = (b.name || b.catName || '').toLowerCase();
      return nameA.localeCompare(nameB, 'zh-CN');
    });

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temu 模板管理</h1>
          <p className="text-gray-600">管理 Temu 平台商品模板和产品属性配置</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            添加模板
          </Button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索模板名称、分类名称、路径或ID..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 模板列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">分类ID</TableHead>
              <TableHead className="w-32">分类名称</TableHead>
              <TableHead className="w-32">模板名称</TableHead>
              <TableHead>完整路径</TableHead>
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {searchKeyword ? '没有找到匹配的模板' : '暂无模板数据，点击"从 Temu 添加"按钮添加模板'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-mono text-sm">{template.catId}</TableCell>
                  <TableCell className="font-medium">{template.catName}</TableCell>
                  <TableCell>
                    {template.name ? (
                      <span className="text-gray-700">{template.name}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm max-w-md truncate" title={template.fullPath}>
                    {template.fullPath || '-'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeletingTemplate(template);
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

      {/* 添加模板对话框 */}
      <AddTemplateDialog
        open={showAddFromTemuDialog}
        onOpenChange={setShowAddFromTemuDialog}
        addStep={addStep}
        setAddStep={setAddStep}
        pendingName={pendingName}
        setPendingName={setPendingName}
        // Temu 站点和搜索相关
        selectedSiteId={selectedSiteId}
        setSelectedSiteId={setSelectedSiteId}
        temuSites={temuSites}
        temuSearchKeyword={temuSearchKeyword}
        setTemuSearchKeyword={setTemuSearchKeyword}
        searchResults={searchResults}
        searching={searching}
        isSearchMode={isSearchMode}
        onSearch={handleTemuSearch}
        onClearSearch={handleClearSearch}
        browseColumns={browseColumns}
        selectedPath={selectedPath}
        loadingColumn={loadingColumn}
        onSelectCategory={handleSelectCategory}
        onLoadCategories={loadTemuCategories}
        templates={templates}
        pendingCategory={pendingCategory}
        pendingCategoryPath={pendingCategoryPath}
        fetchedAttributeCount={fetchedAttributeCount}
        fetchingAttributes={fetchingAttributes}
        attributeFormValues={attributeFormValues}
        updateAttributeValue={updateAttributeValue}
        inputMaxSpecNum={inputMaxSpecNum}
        singleSpecValueNum={singleSpecValueNum}
        parentSpecs={parentSpecs}
        specFormValues={specFormValues}
        fetchingParentSpecs={fetchingParentSpecs}
        onAddSpec={handleAddSpec}
        onRemoveSpec={handleRemoveSpec}
        onUpdateSpecParent={handleUpdateSpecParent}
        onUpdateSpecValues={handleUpdateSpecValues}
        onAddSpecValue={handleAddSpecValue}
        onRemoveSpecValue={handleRemoveSpecValue}
        onUpdateSpecValue={handleUpdateSpecValue}
        skuDefaultConfig={skuDefaultConfig}
        setSkuDefaultConfig={setSkuDefaultConfig}
        volumeWeightConfigs={volumeWeightConfigs}
        onVolumeWeightConfigChange={updateVolumeWeightConfig}
        onAddFromBrowse={handleAddFromBrowse}
        onSelectSearchResult={handleSelectSearchResult}
        onBackToSelect={handleBackToSelect}
        onSubmit={addTemplateToDatabase}
        submitting={submitting}
        getPathFromSearchResult={getPathFromSearchResult}
      />

      {/* 编辑模板对话框 */}
      <EditTemplateDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          } else {
            setShowEditDialog(open);
          }
        }}
        editingTemplate={editingTemplate}
        loadingEditData={loadingEditData}
        editName={editName}
        setEditName={setEditName}
        editAttributeFormValues={editAttributeFormValues}
        updateEditAttributeValue={updateEditAttributeValue}
        editInputMaxSpecNum={editInputMaxSpecNum}
        editSingleSpecValueNum={editSingleSpecValueNum}
        editParentSpecs={editParentSpecs}
        editSpecFormValues={editSpecFormValues}
        onEditAddSpec={handleEditAddSpec}
        onEditRemoveSpec={handleEditRemoveSpec}
        onEditUpdateSpecParent={handleEditUpdateSpecParent}
        onEditUpdateSpecValues={handleEditUpdateSpecValues}
        onEditAddSpecValue={handleEditAddSpecValue}
        onEditRemoveSpecValue={handleEditRemoveSpecValue}
        onEditUpdateSpecValue={handleEditUpdateSpecValue}
        editSkuDefaultConfig={editSkuDefaultConfig}
        setEditSkuDefaultConfig={setEditSkuDefaultConfig}
        editVolumeWeightConfigs={editVolumeWeightConfigs}
        onEditVolumeWeightConfigChange={updateEditVolumeWeightConfig}
        onSave={handleSaveEdit}
        onClose={handleCloseEditDialog}
        submitting={submitting}
        // 分类变更相关
        editIsChangingCategory={editIsChangingCategory}
        temuSites={temuSites}
        selectedSiteId={selectedSiteId}
        setSelectedSiteId={setSelectedSiteId}
        editTemuSearchKeyword={editTemuSearchKeyword}
        setEditTemuSearchKeyword={setEditTemuSearchKeyword}
        editSearchResults={editSearchResults}
        editSearching={editSearching}
        editIsSearchMode={editIsSearchMode}
        onEditSearch={handleEditTemuSearch}
        onEditClearSearch={handleEditClearSearch}
        editBrowseColumns={editBrowseColumns}
        editSelectedPath={editSelectedPath}
        editLoadingColumn={editLoadingColumn}
        onEditSelectCategory={handleEditSelectCategory}
        onEditLoadCategories={loadEditTemuCategories}
        editPendingCategory={editPendingCategory}
        editFetchingAttributes={editFetchingAttributes}
        onEditSelectSearchResult={handleEditSelectSearchResult}
        onEditConfirmCategory={handleEditConfirmCategory}
        onEditStartChangeCategory={handleEditStartChangeCategory}
        onEditCancelChangeCategory={handleEditCancelChangeCategory}
        getPathFromSearchResult={getPathFromSearchResult}
        templates={templates}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模板 "{deletingTemplate?.catName}" 吗？此操作不可撤销。
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
