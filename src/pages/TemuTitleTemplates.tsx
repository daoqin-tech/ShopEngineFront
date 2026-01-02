import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, RefreshCw, FileText, Sparkles, Loader2, Copy, FolderTree, Search, X } from 'lucide-react';
import {
  temuTitleTemplateService,
  type TemuTitleTemplate,
  type CreateTemuTitleTemplateRequest,
  type UpdateTemuTitleTemplateRequest,
  type TitlePreviewResponse,
} from '@/services/temuTitleTemplateService';
import { productCategoryService } from '@/services/productCategoryService';
import type { ProductCategoryWithChildren } from '@/types/productCategory';
import { toast } from 'sonner';

export function TemuTitleTemplates() {
  const [templates, setTemplates] = useState<TemuTitleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemuTitleTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TemuTitleTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState<CreateTemuTitleTemplateRequest>({
    name: '',
    categoryKeywordsZh: '',
    categoryKeywordsEn: '',
    productSpec: '',
    productUsage: '',
  });

  // 示例标题（从预览结果保存）
  const [sampleTitleZh, setSampleTitleZh] = useState('');
  const [sampleTitleEn, setSampleTitleEn] = useState('');

  // 预览状态
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<TitlePreviewResponse | null>(null);

  // 分类选择状态（下拉框 - 用于表单）
  const [productCategories, setProductCategories] = useState<ProductCategoryWithChildren[]>([]);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string>('');
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<string>('');

  // 列表筛选状态（产品分类筛选）
  const [filterParentCategoryId, setFilterParentCategoryId] = useState<string>('');
  const [filterChildCategoryId, setFilterChildCategoryId] = useState<string>('');

  // 加载模板列表
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await temuTitleTemplateService.getAllTemplates();
      setTemplates(response.templates);
    } catch (error) {
      console.error('获取模板列表失败:', error);
      toast.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 加载产品分类树
  useEffect(() => {
    const loadProductCategories = async () => {
      try {
        const data = await productCategoryService.getCategoryTree(true);
        setProductCategories(data);
      } catch (error) {
        console.error('加载产品分类失败:', error);
      }
    };
    loadProductCategories();
  }, []);

  // 获取当前选中一级分类的子分类列表（用于表单）
  const currentChildCategories = React.useMemo(() => {
    const parent = productCategories.find(p => p.id === selectedParentCategoryId);
    return parent?.children || [];
  }, [productCategories, selectedParentCategoryId]);

  // 获取筛选用的二级分类列表
  const filterChildCategories = React.useMemo(() => {
    const parent = productCategories.find(p => p.id === filterParentCategoryId);
    return parent?.children || [];
  }, [productCategories, filterParentCategoryId]);

  // 打开新建对话框
  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      productCategoryId: undefined,
      categoryKeywordsZh: '',
      categoryKeywordsEn: '',
      productSpec: '',
      productUsage: '',
    });
    setSelectedParentCategoryId('');
    setSelectedChildCategoryId('');
    setPreviewResult(null);
    setSampleTitleZh('');
    setSampleTitleEn('');
    setShowDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (template: TemuTitleTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      productCategoryId: template.productCategoryId,
      categoryKeywordsZh: template.categoryKeywordsZh || '',
      categoryKeywordsEn: template.categoryKeywordsEn || '',
      productSpec: template.productSpec || '',
      productUsage: template.productUsage || '',
    });
    // 如果模板已关联分类，找到对应的父子分类并设置
    if (template.productCategoryId) {
      // 先在一级分类中查找
      const parentCategory = productCategories.find(p => p.id === template.productCategoryId);
      if (parentCategory) {
        setSelectedParentCategoryId(template.productCategoryId);
        setSelectedChildCategoryId('');
      } else {
        // 在二级分类中查找
        for (const parent of productCategories) {
          const child = parent.children?.find(c => c.id === template.productCategoryId);
          if (child) {
            setSelectedParentCategoryId(parent.id);
            setSelectedChildCategoryId(template.productCategoryId);
            break;
          }
        }
      }
    } else {
      setSelectedParentCategoryId('');
      setSelectedChildCategoryId('');
    }
    setPreviewResult(null);
    setSampleTitleZh(template.sampleTitleZh || '');
    setSampleTitleEn(template.sampleTitleEn || '');
    setShowDialog(true);
  };

  // 复制模板
  const handleCopy = (template: TemuTitleTemplate) => {
    setEditingTemplate(null); // 设置为 null 表示这是新建
    setFormData({
      name: `${template.name} - 副本`,
      productCategoryId: template.productCategoryId,
      categoryKeywordsZh: template.categoryKeywordsZh || '',
      categoryKeywordsEn: template.categoryKeywordsEn || '',
      productSpec: template.productSpec || '',
      productUsage: template.productUsage || '',
    });
    // 如果模板已关联分类，找到对应的父子分类并设置
    if (template.productCategoryId) {
      // 先在一级分类中查找
      const parentCategory = productCategories.find(p => p.id === template.productCategoryId);
      if (parentCategory) {
        setSelectedParentCategoryId(template.productCategoryId);
        setSelectedChildCategoryId('');
      } else {
        // 在二级分类中查找
        for (const parent of productCategories) {
          const child = parent.children?.find(c => c.id === template.productCategoryId);
          if (child) {
            setSelectedParentCategoryId(parent.id);
            setSelectedChildCategoryId(template.productCategoryId);
            break;
          }
        }
      }
    } else {
      setSelectedParentCategoryId('');
      setSelectedChildCategoryId('');
    }
    setPreviewResult(null);
    setSampleTitleZh(template.sampleTitleZh || '');
    setSampleTitleEn(template.sampleTitleEn || '');
    setShowDialog(true);
    toast.info('已复制模板，请修改名称后保存');
  };

  // 预览标题效果
  const handlePreview = async () => {
    try {
      setPreviewing(true);
      const result = await temuTitleTemplateService.previewTitle({
        categoryKeywordsZh: formData.categoryKeywordsZh,
        categoryKeywordsEn: formData.categoryKeywordsEn,
        productSpec: formData.productSpec,
        productUsage: formData.productUsage,
      });

      setPreviewResult(result);
      // 自动保存预览结果到示例标题
      setSampleTitleZh(result.titleZh);
      setSampleTitleEn(result.titleEn);
    } catch (error: any) {
      console.error('预览生成失败:', error);
      toast.error(error.response?.data?.message || '预览生成失败');
    } finally {
      setPreviewing(false);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入模板名称');
      return;
    }

    try {
      setSubmitting(true);

      // 使用下拉框选择的分类ID
      const productCategoryId = selectedChildCategoryId || selectedParentCategoryId || undefined;

      if (editingTemplate) {
        // 更新
        const updateData: UpdateTemuTitleTemplateRequest = {
          ...formData,
          productCategoryId,
          sampleTitleZh,
          sampleTitleEn,
          isActive: editingTemplate.isActive,
        };
        await temuTitleTemplateService.updateTemplate(editingTemplate.id, updateData);
        toast.success('模板更新成功');
      } else {
        // 创建
        await temuTitleTemplateService.createTemplate({
          ...formData,
          productCategoryId,
        });
        toast.success('模板创建成功');
      }

      setShowDialog(false);
      fetchTemplates();
    } catch (error: any) {
      console.error('保存模板失败:', error);
      toast.error(error.response?.data?.message || '保存模板失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换启用状态
  const handleToggleActive = async (template: TemuTitleTemplate) => {
    try {
      const updateData: UpdateTemuTitleTemplateRequest = {
        name: template.name,
        productCategoryId: template.productCategoryId,
        categoryKeywordsZh: template.categoryKeywordsZh,
        categoryKeywordsEn: template.categoryKeywordsEn,
        productSpec: template.productSpec,
        productUsage: template.productUsage,
        sampleTitleZh: template.sampleTitleZh,
        sampleTitleEn: template.sampleTitleEn,
        isActive: !template.isActive,
      };
      await temuTitleTemplateService.updateTemplate(template.id, updateData);
      fetchTemplates();
    } catch (error: any) {
      console.error('切换状态失败:', error);
      toast.error(error.response?.data?.message || '切换状态失败');
    }
  };

  // 删除模板
  const handleDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await temuTitleTemplateService.deleteTemplate(deletingTemplate.id);
      toast.success('模板删除成功');
      setShowDeleteDialog(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      console.error('删除模板失败:', error);
      toast.error(error.response?.data?.message || '删除模板失败');
    }
  };

  // 过滤模板
  const filteredTemplates = templates.filter(t => {
    // 关键词筛选
    const keyword = searchKeyword.toLowerCase();
    const matchesKeyword = !keyword || (
      t.name.toLowerCase().includes(keyword) ||
      t.categoryKeywordsZh?.toLowerCase().includes(keyword) ||
      t.categoryKeywordsEn?.toLowerCase().includes(keyword)
    );

    // 产品分类筛选
    let matchesCategory = true;
    if (filterChildCategoryId) {
      // 如果选择了二级分类，精确匹配
      matchesCategory = t.productCategoryId === filterChildCategoryId;
    } else if (filterParentCategoryId) {
      // 如果只选择了一级分类，匹配该一级分类及其所有子分类
      const parentCategory = productCategories.find(p => p.id === filterParentCategoryId);
      const childIds = parentCategory?.children?.map(c => c.id) || [];
      matchesCategory = t.productCategoryId === filterParentCategoryId || childIds.includes(t.productCategoryId || '');
    }

    return matchesKeyword && matchesCategory;
  });

  return (
    <div className="flex-1 p-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">标题模板</h1>
          <p className="text-gray-600">管理商品标题的 AI 生成模板</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建模板
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="mb-4 flex items-center gap-4">
        {/* 关键词搜索 */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索模板名称或关键词..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 产品分类筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">分类:</span>
          <Select
            value={filterParentCategoryId}
            onValueChange={(value) => {
              setFilterParentCategoryId(value);
              setFilterChildCategoryId('');
            }}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="一级分类" />
            </SelectTrigger>
            <SelectContent>
              {productCategories.map((parent) => (
                <SelectItem key={parent.id} value={parent.id}>
                  {parent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterChildCategoryId}
            onValueChange={setFilterChildCategoryId}
            disabled={!filterParentCategoryId || filterChildCategories.length === 0}
          >
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="二级分类" />
            </SelectTrigger>
            <SelectContent>
              {filterChildCategories.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterParentCategoryId || filterChildCategoryId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterParentCategoryId('');
                setFilterChildCategoryId('');
              }}
              className="h-9 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 模板列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">模板名称</TableHead>
              <TableHead className="w-32">产品分类</TableHead>
              <TableHead>类目关键词(中文)</TableHead>
              <TableHead>示例标题(中文)</TableHead>
              <TableHead className="w-20">状态</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
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
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无模板</h3>
                  <p>{searchKeyword ? '没有找到匹配的模板' : '点击上方按钮创建第一个模板'}</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {template.productCategoryName || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={template.categoryKeywordsZh}>
                    {template.categoryKeywordsZh || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={template.sampleTitleZh}>
                    {template.sampleTitleZh || <span className="text-gray-400">未生成</span>}
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
                        onClick={() => handleCopy(template)}
                        title="复制模板"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        title="编辑模板"
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
                        title="删除模板"
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

      {/* 新建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTemplate ? '编辑标题模板' : '新建标题模板'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? '修改标题生成模板配置' : '创建新的 AI 标题生成模板'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6">
            {/* 示例标题预览 - 放在最上面 */}
            {(previewResult || sampleTitleZh || sampleTitleEn) && (
              <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  示例标题
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded border bg-white border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">中文</p>
                    <p className="text-sm text-gray-800">{previewResult?.titleZh || sampleTitleZh || '未生成'}</p>
                  </div>
                  <div className="p-3 rounded border bg-white border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">英文</p>
                    <p className="text-sm text-gray-800">{previewResult?.titleEn || sampleTitleEn || '未生成'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">基本信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">模板名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：礼品包装纸模板"
                  />
                </div>

                {/* 产品分类选择器 */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <FolderTree className="h-4 w-4" />
                    关联产品分类
                  </Label>
                  <div className="flex gap-2">
                    {/* 一级分类 */}
                    <Select
                      value={selectedParentCategoryId}
                      onValueChange={(value) => {
                        setSelectedParentCategoryId(value);
                        setSelectedChildCategoryId('');
                      }}
                    >
                      <SelectTrigger className="flex-1 h-9">
                        <SelectValue placeholder="一级分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* 二级分类 */}
                    <Select
                      value={selectedChildCategoryId}
                      onValueChange={setSelectedChildCategoryId}
                      disabled={!selectedParentCategoryId || currentChildCategories.length === 0}
                    >
                      <SelectTrigger className="flex-1 h-9">
                        <SelectValue placeholder="二级分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentChildCategories.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* 清除按钮 */}
                    {(selectedParentCategoryId || selectedChildCategoryId) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedParentCategoryId('');
                          setSelectedChildCategoryId('');
                        }}
                        className="h-9 px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">选择此模板适用的产品分类</p>
                </div>
              </div>
            </div>

            {/* 核心关键词配置 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900">核心关键词配置</h4>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">重要</span>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                类目关键词是标题最核心的部分，可加入节日词提升搜索曝光，如：<span className="text-blue-600 font-medium">Christmas wrapping paper</span>、<span className="text-blue-600 font-medium">Birthday wrapping paper</span>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryKeywordsZh" className="flex items-center gap-1">
                    类目关键词（中文）
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="categoryKeywordsZh"
                    value={formData.categoryKeywordsZh}
                    onChange={(e) => setFormData({ ...formData, categoryKeywordsZh: e.target.value })}
                    placeholder="如：圣诞节礼品包装纸"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryKeywordsEn" className="flex items-center gap-1">
                    类目关键词（英文）
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="categoryKeywordsEn"
                    value={formData.categoryKeywordsEn}
                    onChange={(e) => setFormData({ ...formData, categoryKeywordsEn: e.target.value })}
                    placeholder="如：Christmas wrapping paper"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productSpec">商品规格</Label>
                  <Textarea
                    id="productSpec"
                    value={formData.productSpec}
                    onChange={(e) => setFormData({ ...formData, productSpec: e.target.value })}
                    placeholder="例如：A5尺寸、100页、线圈装订"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productUsage">商品用途</Label>
                  <Textarea
                    id="productUsage"
                    value={formData.productUsage}
                    onChange={(e) => setFormData({ ...formData, productUsage: e.target.value })}
                    placeholder="例如：学习笔记、工作记录、日程规划"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={handlePreview}
              disabled={previewing}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {previewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成示例
                </>
              )}
            </Button>
            {(previewResult || sampleTitleZh || editingTemplate) && (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模板 "{deletingTemplate?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
