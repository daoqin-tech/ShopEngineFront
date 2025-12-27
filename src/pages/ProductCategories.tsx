import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Settings, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { productCategoryService } from '@/services/productCategoryService';
import { productCategorySpecService } from '@/services/productCategorySpecService';
import { temuTemplateService, type TemuTemplate } from '@/services/temuTemplateService';
import { formatManufacturingSize } from '@/utils/formatUtils';
import type {
  ProductCategory,
  ProductCategoryWithChildren,
  CreateProductCategoryWithParentRequest,
  UpdateProductCategoryWithParentRequest,
} from '@/types/productCategory';
import type {
  ProductCategorySpec,
  CreateProductCategorySpecRequest,
  UpdateProductCategorySpecRequest,
} from '@/types/productCategorySpec';
import { toast } from 'sonner';

export function ProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  // 树形分类数据（用于父子层级展示）
  const [categoryTree, setCategoryTree] = useState<ProductCategoryWithChildren[]>([]);
  // 展开的分类ID集合
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  // 当前正在为哪个父分类添加子分类
  const [addingChildForParent, setAddingChildForParent] = useState<ProductCategoryWithChildren | null>(null);
  const [formData, setFormData] = useState({
    parentId: null as string | null,
    name: '',
    nameEn: '',
    sortOrder: 0,
    isActive: true,
    typeCode: '',
    sizeCode: '',
    manufacturingLength: undefined as number | undefined,
    manufacturingWidth: undefined as number | undefined,
    manufacturingHeight: undefined as number | undefined,
    productSpec: '',        // 商品规格描述
    productUsage: '',       // 商品用途
    temuTemplateIds: [] as string[],  // 关联的Temu模板ID列表 - 子分类独有
  });

  // Temu 模板数据
  const [allTemuTemplates, setAllTemuTemplates] = useState<TemuTemplate[]>([]);
  const [loadingTemuTemplates, setLoadingTemuTemplates] = useState(false);

  // 规格配置相关状态
  const [isSpecDialogOpen, setIsSpecDialogOpen] = useState(false);
  const [currentCategoryForSpec, setCurrentCategoryForSpec] = useState<ProductCategory | null>(null);
  const [specs, setSpecs] = useState<ProductCategorySpec[]>([]);
  const [editingSpec, setEditingSpec] = useState<ProductCategorySpec | null>(null);
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [specFormData, setSpecFormData] = useState({
    name: '',
    aspectRatio: '',
    width: 1024,
    height: 1024,
    count: 1,
    sortOrder: 0,
    isActive: true,
  });

  // 加载分类列表（扁平和树形两种）
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      // 同时加载扁平列表和树形结构
      const [flatData, treeData] = await Promise.all([
        productCategoryService.getAllCategories(),
        productCategoryService.getCategoryTree(),
      ]);
      setCategories(flatData);
      setCategoryTree(treeData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('加载分类失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // 加载 Temu 模板
  useEffect(() => {
    const loadTemuTemplates = async () => {
      try {
        setLoadingTemuTemplates(true);
        const response = await temuTemplateService.getAllTemplates(true, true);
        setAllTemuTemplates(response.templates || []);
      } catch (error) {
        console.error('Failed to load temu templates:', error);
      } finally {
        setLoadingTemuTemplates(false);
      }
    };
    loadTemuTemplates();
  }, []);

  // 切换展开/折叠
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };


  // 打开新增对话框（顶级分类）
  const handleAdd = () => {
    setEditingCategory(null);
    setAddingChildForParent(null);
    setFormData({
      parentId: null,
      name: '',
      nameEn: '',
      sortOrder: categories.length + 1,
      isActive: true,
      typeCode: '',
      sizeCode: '',
      manufacturingLength: undefined,
      manufacturingWidth: undefined,
      manufacturingHeight: undefined,
      productSpec: '',
      productUsage: '',
      temuTemplateIds: [],
    });
    setIsDialogOpen(true);
  };

  // 打开新增子分类对话框
  const handleAddChild = (parent: ProductCategoryWithChildren) => {
    setEditingCategory(null);
    setAddingChildForParent(parent);
    const childrenCount = parent.children?.length || 0;
    setFormData({
      parentId: parent.id,
      name: '',
      nameEn: '',
      sortOrder: childrenCount + 1,
      isActive: true,
      typeCode: '',
      sizeCode: '',
      // 子分类可以有自己的尺寸，没有则继承父分类
      manufacturingLength: undefined,
      manufacturingWidth: undefined,
      manufacturingHeight: undefined,
      productSpec: '',
      productUsage: '',
      temuTemplateIds: [],
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (category: ProductCategory | ProductCategoryWithChildren) => {
    setEditingCategory(category);
    setAddingChildForParent(null);
    const catWithParent = category as ProductCategoryWithChildren;
    setFormData({
      parentId: catWithParent.parentId || null,
      name: category.name,
      nameEn: category.nameEn || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      typeCode: category.typeCode || '',
      sizeCode: category.sizeCode || '',
      manufacturingLength: category.manufacturingLength,
      manufacturingWidth: category.manufacturingWidth,
      manufacturingHeight: category.manufacturingHeight,
      productSpec: category.productSpec || '',
      productUsage: category.productUsage || '',
      temuTemplateIds: category.temuTemplateIds || [],
    });
    setIsDialogOpen(true);
  };

  // 保存分类
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    // 判断是否为子分类
    const isChildCategory = !!formData.parentId;

    try {
      if (editingCategory) {
        // 更新
        const updateData: UpdateProductCategoryWithParentRequest = {
          parentId: formData.parentId,
          name: formData.name.trim(),
          nameEn: formData.nameEn.trim() || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          typeCode: formData.typeCode.trim() || undefined,
          sizeCode: formData.sizeCode.trim() || undefined,
          // 子分类可以有自己的尺寸，没有则继承父分类
          manufacturingLength: formData.manufacturingLength,
          manufacturingWidth: formData.manufacturingWidth,
          manufacturingHeight: formData.manufacturingHeight,
          productSpec: formData.productSpec.trim() || undefined,
          productUsage: formData.productUsage.trim() || undefined,
          // 子分类关联Temu模板
          temuTemplateIds: isChildCategory ? formData.temuTemplateIds : undefined,
        };
        await productCategoryService.updateCategoryWithParent(editingCategory.id, updateData);
        toast.success('更新成功');
      } else {
        // 新增
        const createData: CreateProductCategoryWithParentRequest = {
          parentId: formData.parentId,
          name: formData.name.trim(),
          nameEn: formData.nameEn.trim() || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          typeCode: formData.typeCode.trim() || undefined,
          sizeCode: formData.sizeCode.trim() || undefined,
          // 子分类可以有自己的尺寸，没有则继承父分类
          manufacturingLength: formData.manufacturingLength,
          manufacturingWidth: formData.manufacturingWidth,
          manufacturingHeight: formData.manufacturingHeight,
          productSpec: formData.productSpec.trim() || undefined,
          productUsage: formData.productUsage.trim() || undefined,
          // 子分类关联Temu模板
          temuTemplateIds: isChildCategory ? formData.temuTemplateIds : undefined,
        };
        await productCategoryService.createCategoryWithParent(createData);
        toast.success('创建成功');
      }
      setIsDialogOpen(false);
      setAddingChildForParent(null);
      loadCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  // 删除分类
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除分类"${name}"吗？`)) {
      return;
    }

    try {
      await productCategoryService.deleteCategory(id);
      toast.success('删除成功');
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('删除失败');
    }
  };

  // 打开规格配置对话框
  const handleOpenSpecConfig = async (category: ProductCategory) => {
    setCurrentCategoryForSpec(category);
    setIsSpecDialogOpen(true);
    await loadSpecs(category.id);
  };

  // 加载规格列表
  const loadSpecs = async (categoryId: string) => {
    try {
      const data = await productCategorySpecService.getSpecsByCategoryId(categoryId);
      setSpecs(data);
    } catch (error) {
      console.error('Failed to load specs:', error);
      toast.error('加载规格失败');
    }
  };

  // 添加规格
  const handleAddSpec = () => {
    setEditingSpec(null);
    setIsAddingSpec(true);
    setSpecFormData({
      name: '',
      aspectRatio: '',
      width: 1024,
      height: 1024,
      count: 1,
      sortOrder: specs.length + 1,
      isActive: true,
    });
  };

  // 编辑规格
  const handleEditSpec = (spec: ProductCategorySpec) => {
    setEditingSpec(spec);
    setIsAddingSpec(false);
    setSpecFormData({
      name: spec.name,
      aspectRatio: spec.aspectRatio,
      width: spec.width,
      height: spec.height,
      count: spec.count,
      sortOrder: spec.sortOrder,
      isActive: spec.isActive,
    });
  };

  // 保存规格
  const handleSaveSpec = async () => {
    if (!currentCategoryForSpec) return;

    if (!specFormData.name.trim()) {
      toast.error('请输入规格名称');
      return;
    }
    if (!specFormData.aspectRatio.trim()) {
      toast.error('请输入比例');
      return;
    }

    try {
      if (editingSpec) {
        // 更新
        const updateData: UpdateProductCategorySpecRequest = {
          name: specFormData.name.trim(),
          aspectRatio: specFormData.aspectRatio.trim(),
          width: specFormData.width,
          height: specFormData.height,
          count: specFormData.count,
          sortOrder: specFormData.sortOrder,
          isActive: specFormData.isActive,
        };
        await productCategorySpecService.updateSpec(editingSpec.id, updateData);
        toast.success('更新成功');
      } else {
        // 新增
        const createData: CreateProductCategorySpecRequest = {
          categoryId: currentCategoryForSpec.id,
          name: specFormData.name.trim(),
          aspectRatio: specFormData.aspectRatio.trim(),
          width: specFormData.width,
          height: specFormData.height,
          count: specFormData.count,
          sortOrder: specFormData.sortOrder,
          isActive: specFormData.isActive,
        };
        await productCategorySpecService.createSpec(createData);
        toast.success('创建成功');
      }
      setEditingSpec(null);
      setIsAddingSpec(false);
      await loadSpecs(currentCategoryForSpec.id);
    } catch (error: any) {
      console.error('Failed to save spec:', error);
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  // 删除规格
  const handleDeleteSpec = async (id: string, name: string) => {
    if (!currentCategoryForSpec) return;

    if (!confirm(`确定要删除规格"${name}"吗？`)) {
      return;
    }

    try {
      await productCategorySpecService.deleteSpec(id);
      toast.success('删除成功');
      await loadSpecs(currentCategoryForSpec.id);
    } catch (error) {
      console.error('Failed to delete spec:', error);
      toast.error('删除失败');
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">产品分类管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理产品分类，包括手账纸、包装纸、日历、手提纸袋等
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          新增分类
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">分类名称</th>
                <th className="text-left p-4 font-medium">英文名称</th>
                <th className="text-center p-4 font-medium w-24">类型码</th>
                <th className="text-center p-4 font-medium w-24">尺寸码</th>
                <th className="text-center p-4 font-medium">生产尺寸(cm)</th>
                <th className="text-center p-4 font-medium w-24">排序</th>
                <th className="text-center p-4 font-medium w-24">状态</th>
                <th className="text-center p-4 font-medium w-48">操作</th>
              </tr>
            </thead>
            <tbody>
              {!categoryTree || categoryTree.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    暂无数据
                  </td>
                </tr>
              ) : (
                categoryTree.map((category) => (
                  <>
                    {/* 父分类/一级分类行 */}
                    <tr key={category.id} className="border-b hover:bg-muted/30 bg-muted/10">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {category.children && category.children.length > 0 ? (
                            <button
                              onClick={() => toggleExpand(category.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {expandedIds.has(category.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-6" />
                          )}
                          <span className="font-medium">{category.name}</span>
                          {category.children && category.children.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({category.children.length}个子分类)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{category.nameEn || '-'}</td>
                      <td className="p-4 text-center">
                        <span className="font-mono text-sm text-muted-foreground">
                          {category.typeCode || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono text-sm text-muted-foreground">
                          {category.sizeCode || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono text-sm">
                          {formatManufacturingSize(
                            category.manufacturingLength,
                            category.manufacturingWidth,
                            category.manufacturingHeight
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-center">{category.sortOrder}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            category.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {category.isActive ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1">
                          {/* 一级分类不能配置规格，只有二级分类才能配置 */}
                          {/* 添加子分类按钮 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddChild(category)}
                            title="添加子分类"
                          >
                            <Plus className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id, category.name)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {/* 子分类行 */}
                    {expandedIds.has(category.id) && category.children?.map((child) => (
                      <tr key={child.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-2 pl-8">
                            <span className="text-muted-foreground">└</span>
                            <span>{child.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{child.nameEn || '-'}</td>
                        <td className="p-4 text-center">
                          <span className="font-mono text-sm">
                            {child.typeCode || '-'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono text-sm">
                            {child.sizeCode || '-'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-mono text-sm ${child.manufacturingLength || child.manufacturingWidth ? '' : 'text-muted-foreground'}`}>
                            {child.manufacturingLength || child.manufacturingWidth
                              ? formatManufacturingSize(child.manufacturingLength, child.manufacturingWidth, child.manufacturingHeight)
                              : '继承父分类'}
                          </span>
                        </td>
                        <td className="p-4 text-center">{child.sortOrder}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              child.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {child.isActive ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenSpecConfig(child)}
                              title="配置规格"
                            >
                              <Settings className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(child)}
                              title="编辑"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(child.id, child.name)}
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setAddingChildForParent(null);
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? '编辑分类'
                : addingChildForParent
                  ? `新增子分类 - ${addingChildForParent.name}`
                  : '新增分类'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? '修改分类信息'
                : addingChildForParent
                  ? `为"${addingChildForParent.name}"添加子分类`
                  : '创建新的产品分类'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 基础信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">中文名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入中文名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">英文名称</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="如: Scrapbook Paper"
                />
              </div>
            </div>

            {/* 子分类：货号与商品配置 */}
            {(formData.parentId || addingChildForParent) && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                <Label className="text-sm font-medium">货号与商品配置</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="typeCode" className="text-xs">类型码</Label>
                    <Input
                      id="typeCode"
                      value={formData.typeCode}
                      onChange={(e) => setFormData({ ...formData, typeCode: e.target.value.toUpperCase() })}
                      placeholder="如: BJ-01"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sizeCode" className="text-xs">尺寸码</Label>
                    <Input
                      id="sizeCode"
                      value={formData.sizeCode}
                      onChange={(e) => setFormData({ ...formData, sizeCode: e.target.value })}
                      placeholder="如: 21"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="productSpec" className="text-xs">商品规格描述</Label>
                    <Input
                      id="productSpec"
                      value={formData.productSpec}
                      onChange={(e) => setFormData({ ...formData, productSpec: e.target.value })}
                      placeholder="如: 21cm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="productUsage" className="text-xs">商品用途</Label>
                    <Input
                      id="productUsage"
                      value={formData.productUsage}
                      onChange={(e) => setFormData({ ...formData, productUsage: e.target.value })}
                      placeholder="如: 手账装饰"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 一级分类/父分类字段 */}
            {!formData.parentId && !addingChildForParent && (
              <>
                {/* 货号与商品配置 */}
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <Label className="text-sm font-medium">货号与商品配置</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="typeCode" className="text-xs">类型码</Label>
                      <Input
                        id="typeCode"
                        value={formData.typeCode}
                        onChange={(e) => setFormData({ ...formData, typeCode: e.target.value.toUpperCase() })}
                        placeholder="如: SZ, BZ, HR"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sizeCode" className="text-xs">尺寸码</Label>
                      <Input
                        id="sizeCode"
                        value={formData.sizeCode}
                        onChange={(e) => setFormData({ ...formData, sizeCode: e.target.value })}
                        placeholder="如: 15, 21, 30"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="productSpec" className="text-xs">商品规格描述</Label>
                      <Input
                        id="productSpec"
                        value={formData.productSpec}
                        onChange={(e) => setFormData({ ...formData, productSpec: e.target.value })}
                        placeholder="如: 21cm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="productUsage" className="text-xs">商品用途</Label>
                      <Input
                        id="productUsage"
                        value={formData.productUsage}
                        onChange={(e) => setFormData({ ...formData, productUsage: e.target.value })}
                        placeholder="如: 手账装饰"
                      />
                    </div>
                  </div>
                </div>
                {/* 生产尺寸（只有一级分类/父分类才有） */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">生产尺寸 (cm)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="manufacturingLength" className="text-xs text-muted-foreground">长度</Label>
                      <Input
                        id="manufacturingLength"
                        type="number"
                        step="0.1"
                        value={formData.manufacturingLength || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, manufacturingLength: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                        placeholder="如: 29.7"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manufacturingWidth" className="text-xs text-muted-foreground">宽度</Label>
                      <Input
                        id="manufacturingWidth"
                        type="number"
                        step="0.1"
                        value={formData.manufacturingWidth || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, manufacturingWidth: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                        placeholder="如: 21"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manufacturingHeight" className="text-xs text-muted-foreground">高度</Label>
                      <Input
                        id="manufacturingHeight"
                        type="number"
                        step="0.1"
                        value={formData.manufacturingHeight || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, manufacturingHeight: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                        placeholder="如: 0"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    用于PDF导出尺寸，子分类可设置自己的尺寸或留空继承父分类
                  </p>
                </div>
              </>
            )}

            {/* 子分类 Temu 模板关联 */}
            {(formData.parentId || addingChildForParent) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>关联 Temu 模板</Label>
                  {formData.temuTemplateIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      已选择 {formData.temuTemplateIds.length} 个
                    </span>
                  )}
                </div>
                {loadingTemuTemplates ? (
                  <div className="p-4 text-center text-muted-foreground border rounded-lg">
                    加载中...
                  </div>
                ) : allTemuTemplates.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground border rounded-lg">
                    暂无可用模板
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {allTemuTemplates.map((template) => {
                        const isSelected = formData.temuTemplateIds.includes(template.id);
                        return (
                          <div
                            key={template.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted ${
                              isSelected ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setFormData({
                                  ...formData,
                                  temuTemplateIds: formData.temuTemplateIds.filter(id => id !== template.id)
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  temuTemplateIds: [...formData.temuTemplateIds, template.id]
                                });
                              }
                            }}
                          >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm truncate">
                              {template.name || template.catName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">排序顺序</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
                placeholder="数字越小越靠前"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                启用该分类
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 规格配置对话框 */}
      <Dialog open={isSpecDialogOpen} onOpenChange={setIsSpecDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>配置产品规格 - {currentCategoryForSpec?.name}</DialogTitle>
            <DialogDescription>
              配置该分类下产品的规格参数（比例、像素、数量等）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 规格列表 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">规格列表</h3>
                <Button onClick={handleAddSpec} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  新增规格
                </Button>
              </div>

              {specs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                  暂无规格配置，点击"新增规格"开始配置
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">名称</th>
                        <th className="text-center p-3 font-medium">比例</th>
                        <th className="text-center p-3 font-medium">像素</th>
                        <th className="text-center p-3 font-medium">数量</th>
                        <th className="text-center p-3 font-medium">排序</th>
                        <th className="text-center p-3 font-medium">状态</th>
                        <th className="text-center p-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specs.map((spec) => (
                        <tr key={spec.id} className="border-t hover:bg-muted/30">
                          <td className="p-3">{spec.name}</td>
                          <td className="p-3 text-center">{spec.aspectRatio}</td>
                          <td className="p-3 text-center">{spec.width}x{spec.height}</td>
                          <td className="p-3 text-center">{spec.count}</td>
                          <td className="p-3 text-center">{spec.sortOrder}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                spec.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {spec.isActive ? '启用' : '禁用'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSpec(spec)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSpec(spec.id, spec.name)}
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 规格表单 */}
            {(editingSpec || isAddingSpec) && (
              <div className="border rounded-lg p-4 bg-muted/20">
                <h4 className="font-medium mb-3">
                  {editingSpec ? '编辑规格' : '新增规格'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specName">规格名称 *</Label>
                    <Input
                      id="specName"
                      value={specFormData.name}
                      onChange={(e) => setSpecFormData({ ...specFormData, name: e.target.value })}
                      placeholder="如：封面、内页"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio">比例 *</Label>
                    <Input
                      id="aspectRatio"
                      value={specFormData.aspectRatio}
                      onChange={(e) => setSpecFormData({ ...specFormData, aspectRatio: e.target.value })}
                      placeholder="如：1:1、16:9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="width">宽度（像素）*</Label>
                    <Input
                      id="width"
                      type="number"
                      value={specFormData.width}
                      onChange={(e) =>
                        setSpecFormData({ ...specFormData, width: parseInt(e.target.value) || 1024 })
                      }
                      min={256}
                      max={2048}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">高度（像素）*</Label>
                    <Input
                      id="height"
                      type="number"
                      value={specFormData.height}
                      onChange={(e) =>
                        setSpecFormData({ ...specFormData, height: parseInt(e.target.value) || 1024 })
                      }
                      min={256}
                      max={2048}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="count">生成数量 *</Label>
                    <Input
                      id="count"
                      type="number"
                      value={specFormData.count}
                      onChange={(e) =>
                        setSpecFormData({ ...specFormData, count: parseInt(e.target.value) || 1 })
                      }
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">排序</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={specFormData.sortOrder}
                      onChange={(e) =>
                        setSpecFormData({ ...specFormData, sortOrder: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 col-span-2">
                    <input
                      type="checkbox"
                      id="specIsActive"
                      checked={specFormData.isActive}
                      onChange={(e) => setSpecFormData({ ...specFormData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary rounded"
                    />
                    <Label htmlFor="specIsActive" className="cursor-pointer">
                      启用该规格
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSaveSpec}>
                    保存规格
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSpec(null);
                      setIsAddingSpec(false);
                      setSpecFormData({
                        name: '',
                        aspectRatio: '',
                        width: 1024,
                        height: 1024,
                        count: 1,
                        sortOrder: 0,
                        isActive: true,
                      });
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSpecDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
