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
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { productCategoryService } from '@/services/productCategoryService';
import { productCategorySpecService } from '@/services/productCategorySpecService';
import type {
  ProductCategory,
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
} from '@/types/productCategory';
import type {
  ProductCategorySpec,
  CreateProductCategorySpecRequest,
  UpdateProductCategorySpecRequest,
} from '@/types/productCategorySpec';
import { toast } from 'sonner';

export function ProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    sortOrder: 0,
    isActive: true,
    typeCode: '',
    sizeCode: '',
  });

  // 规格配置相关状态
  const [isSpecDialogOpen, setIsSpecDialogOpen] = useState(false);
  const [currentCategoryForSpec, setCurrentCategoryForSpec] = useState<ProductCategory | null>(null);
  const [specs, setSpecs] = useState<ProductCategorySpec[]>([]);
  const [editingSpec, setEditingSpec] = useState<ProductCategorySpec | null>(null);
  const [specFormData, setSpecFormData] = useState({
    name: '',
    aspectRatio: '',
    width: 1024,
    height: 1024,
    count: 1,
    sortOrder: 0,
    isActive: true,
  });

  // 加载分类列表
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await productCategoryService.getAllCategories();
      setCategories(data);
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

  // 打开新增对话框
  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      nameEn: '',
      sortOrder: categories.length + 1,
      isActive: true,
      typeCode: '',
      sizeCode: '',
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      nameEn: category.nameEn || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      typeCode: category.typeCode || '',
      sizeCode: category.sizeCode || '',
    });
    setIsDialogOpen(true);
  };

  // 保存分类
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    try {
      if (editingCategory) {
        // 更新
        const updateData: UpdateProductCategoryRequest = {
          name: formData.name.trim(),
          nameEn: formData.nameEn.trim() || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          typeCode: formData.typeCode.trim() || undefined,
          sizeCode: formData.sizeCode.trim() || undefined,
        };
        await productCategoryService.updateCategory(editingCategory.id, updateData);
        toast.success('更新成功');
      } else {
        // 新增
        const createData: CreateProductCategoryRequest = {
          name: formData.name.trim(),
          nameEn: formData.nameEn.trim() || undefined,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          typeCode: formData.typeCode.trim() || undefined,
          sizeCode: formData.sizeCode.trim() || undefined,
        };
        await productCategoryService.createCategory(createData);
        toast.success('创建成功');
      }
      setIsDialogOpen(false);
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
                <th className="text-left p-4 font-medium">中文名称</th>
                <th className="text-left p-4 font-medium">英文名称</th>
                <th className="text-center p-4 font-medium w-24">类型码</th>
                <th className="text-center p-4 font-medium w-24">尺寸码</th>
                <th className="text-center p-4 font-medium w-24">排序</th>
                <th className="text-center p-4 font-medium w-24">状态</th>
                <th className="text-left p-4 font-medium w-40">创建时间</th>
                <th className="text-center p-4 font-medium w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {!categories || categories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    暂无数据
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4">{category.name}</td>
                    <td className="p-4 text-muted-foreground">{category.nameEn || '-'}</td>
                    <td className="p-4 text-center">
                      <span className="font-mono text-sm">
                        {category.typeCode || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-mono text-sm">
                        {category.sizeCode || '-'}
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
                    <td className="p-4 text-muted-foreground text-sm">
                      {category.createdAt}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSpecConfig(category)}
                          title="配置规格"
                        >
                          <Settings className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id, category.name)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? '编辑分类' : '新增分类'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? '修改分类信息' : '创建新的产品分类'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="typeCode">类型码</Label>
                <Input
                  id="typeCode"
                  value={formData.typeCode}
                  onChange={(e) => setFormData({ ...formData, typeCode: e.target.value.toUpperCase() })}
                  placeholder="如: SZ, BZ, HR"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  用于生成货号（SZ-手账纸, BZ-包装纸, HR-横版日历, SR-竖版日历, ST-手提纸袋）
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sizeCode">尺寸码</Label>
                <Input
                  id="sizeCode"
                  value={formData.sizeCode}
                  onChange={(e) => setFormData({ ...formData, sizeCode: e.target.value })}
                  placeholder="如: 15, 21, 30, 66"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  用于生成货号（15-15cm, 21-21cm, 30-30cm, 66-66cm）
                </p>
              </div>
            </div>
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
            {(editingSpec || specFormData.name !== '' || specFormData.aspectRatio !== '') && (
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
